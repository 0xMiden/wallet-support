/**
 * Flood detection: the same person sending substantially the same report over
 * and over inside a window.
 *
 * This is a JUNK FILTER, not an abuse control. `reporter_key` is derived from
 * an install_id the client supplies, or from an IP when it does not — neither
 * is a credential, and a determined flooder can reset both. What this stops is
 * the common case: a stuck retry loop, a frustrated person hitting submit
 * eleven times, a script with no imagination. Anything that adapts is out of
 * scope by construction, and calling it an abuse control would be a lie that
 * shapes later decisions badly.
 *
 * Everything here fails OPEN. That is the opposite of the publish caps in
 * gate.ts, and the difference matters: a missing cap must fail tight because
 * failing tight withholds a WRITE. A missing flood threshold failing tight
 * would flag every report as suspected, which destroys signal rather than
 * withholding action — and buries real user reports behind a review queue.
 */

import { sha256Hex } from './validate';

/** Zero-width and BOM characters. Invisible, so they must not change a hash. */
const ZERO_WIDTH = /[​-‍﻿]/g;
/** Three or more of the SAME punctuation mark collapse to one: "!!!!" → "!". */
const PUNCT_RUN = /([^\w\s])\1{2,}/g;

/**
 * Normalize a body down to what a human would call "the same message".
 *
 * Applied to the RAW body, never the sanitized one. sanitize() injects its own
 * zero-width joiners into @mentions and #refs, so hashing its output would let
 * a flooder perturb the hash simply by mentioning a different username — and
 * would make the hash depend on sanitize()'s implementation, which is free to
 * change for reasons that have nothing to do with spam.
 *
 * Deliberately conservative. It collapses noise a person adds without meaning
 * to (case, spacing, "!!!!!"), and nothing else. Aggressive normalization —
 * stemming, stopword removal, punctuation stripping — would collapse genuinely
 * different reports onto one hash, and a false flood match parks a real report.
 */
export function normalizeForFlood(raw: string): string {
  return raw
    .replace(ZERO_WIDTH, '')
    .toLowerCase()
    .replace(PUNCT_RUN, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The flood key stored on every row as `normalized_hash`. */
export function floodHash(raw: string): Promise<string> {
  return sha256Hex(normalizeForFlood(raw));
}

/**
 * Which identity `reporter_key` was derived from.
 *
 * reporter_key is a sha256 of "i:<install_id>" or "ip:<addr>" and the two are
 * INDISTINGUISHABLE once hashed (migration 0004). Two rules depend on telling
 * them apart: repeated submissions count as spam evidence only from the same
 * install_id, and an IP-only match must never be sufficient to CONFIRM spam —
 * one NAT egress is not one person.
 */
export function reporterKind(installId: unknown): 'install' | 'ip' {
  return typeof installId === 'string' && installId ? 'install' : 'ip';
}

export interface FloodConfig {
  threshold: number;
  windowMs: number;
}

const DEFAULT_THRESHOLD = 4;
const DEFAULT_WINDOW_MS = 3_600_000; // 1 hour
const MIN_WINDOW_MS = 60_000;        // 1 minute
const MAX_WINDOW_MS = 86_400_000;    // 24 hours

function intOr(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Read the flood config, clamped so no configuration mistake can make it
 * harsher than intended.
 *
 * - The threshold floors at 2, so it can never be set to flag a FIRST
 *   submission. A threshold of 1 or 0 would flag every report ever sent.
 * - The window is clamped at both ends. The ceiling is the one that matters:
 *   an accidental extra zero turns "one hour" into "eleven days", and every
 *   honest resubmit inside that span becomes a flood. Both clamps push
 *   towards flagging LESS, which is the fail-open direction for this check.
 */
export function floodConfig(env: { FLOOD_THRESHOLD?: string; FLOOD_WINDOW_MS?: string }): FloodConfig {
  return {
    threshold: Math.max(2, intOr(env.FLOOD_THRESHOLD, DEFAULT_THRESHOLD)),
    windowMs: Math.min(MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, intOr(env.FLOOD_WINDOW_MS, DEFAULT_WINDOW_MS))),
  };
}

/**
 * The spam layer's kill switch.
 *
 * Anything other than the literal "true" — including unset, including a typo —
 * means OFF, so the safe state is the default and a missing var cannot silently
 * arm a filter that parks user reports. Mirrors the SHADOW convention this
 * project already uses.
 */
export function spamGateEnabled(env: { SPAM_GATE_ENABLED?: string }): boolean {
  return env.SPAM_GATE_ENABLED === 'true';
}

export interface FloodResult {
  /** Prior submissions from this reporter with this hash, inside the window. */
  priorCount: number;
  /** True when THIS submission is the Nth identical one, N >= threshold. */
  flagged: boolean;
}

/**
 * One indexed D1 read, covered by idx_sub_flood.
 *
 * Counts PRIOR rows only — this submission is not inserted yet — so with a
 * threshold of 4 we flag when three already exist and this is the fourth.
 *
 * On a D1 error this returns `flagged: false` rather than throwing. A database
 * hiccup must not decide that a report is spam, and it must not fail the whole
 * submission either: the report is the thing worth protecting.
 */
export async function checkFlood(
  db: D1Database,
  reporterKey: string,
  normalizedHash: string,
  now: number,
  cfg: FloodConfig
): Promise<FloodResult> {
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM submissions
          WHERE reporter_key = ? AND normalized_hash = ? AND received_at > ?`
      )
      .bind(reporterKey, normalizedHash, now - cfg.windowMs)
      .first<{ n: number }>();

    const priorCount = row?.n ?? 0;
    return { priorCount, flagged: priorCount >= cfg.threshold - 1 };
  } catch (err) {
    console.warn('flood check failed, treating as clean', (err as Error)?.message);
    return { priorCount: 0, flagged: false };
  }
}

// ---------------------------------------------------------------------------
// Reason codes
// ---------------------------------------------------------------------------

/**
 * What the MODEL may assign. Anything outside this list is dropped, exactly as
 * `suggested_labels` already is — a model that invents a reason code would
 * otherwise write free text into a column the review page renders.
 */
export const MODEL_REASON_CODES = [
  'promotional', 'scam', 'malicious_link', 'nonsense',
  'spam_phrase', 'automated', 'abusive',
] as const;

/**
 * What only CODE may assign. These are the corroborating signals: a model
 * cannot claim them, so it cannot manufacture its own corroboration by
 * returning the code that would confirm its verdict.
 */
export const CODE_REASON_CODES = [
  'flood_repeat', 'link_heavy_no_feedback', 'known_pattern',
] as const;

export type SpamReason = (typeof MODEL_REASON_CODES)[number] | (typeof CODE_REASON_CODES)[number];

const MODEL_REASON_SET: ReadonlySet<string> = new Set(MODEL_REASON_CODES);

/** Filter a model's reason array down to the codes it is allowed to assign. */
export function filterModelReasons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter((r): r is string => typeof r === 'string' && MODEL_REASON_SET.has(r));
}

// ---------------------------------------------------------------------------
// Deterministic evidence
// ---------------------------------------------------------------------------

/**
 * Phrases that are unambiguous solicitation. Versioned deliberately: this list
 * is the thing most likely to need tuning, and a change to it changes what can
 * be CONFIRMED as spam, so it must be reviewable on its own.
 *
 * Ruthlessly narrow, because the cost is asymmetric. A missed spam report
 * costs a maintainer ten seconds. A false `known_pattern` hit is the second
 * half of a `spam` confirmation, which buries a real user's report.
 *
 * Specifically NOT here, though every naive spam list contains them:
 *   - "airdrop", "free tokens" — this wallet HAS a faucet, and asking about
 *     free testnet tokens is a completely ordinary support question.
 *   - "casino", "betting", "forex" — a user may legitimately report a bug
 *     hit while using a dapp of that kind.
 * Each of those would flag real reports, and a list that flags real reports is
 * worse than no list at all.
 */
export const SPAM_PHRASE_VERSION = '2026-08-25.1';

const SPAM_PHRASES: RegExp[] = [
  // Recovery-phrase solicitation. Nobody debugging a wallet asks a stranger to
  // send them a seed phrase.
  /\b(seed|recovery)\s+phrase\b[^.]{0,60}\b(send|share|dm|message|contact|whats ?app|telegram)\b/i,
  /\bprivate\s+key\b[^.]{0,60}\b(send|share|dm|message|contact|whats ?app|telegram)\b/i,
  // Off-platform contact plus a money verb. Either alone is innocent.
  /\b(whats ?app|telegram|t\.me|wa\.me)\b[^.]{0,50}\b(invest|profit|earn|trading|recover(y|ing)?)\b/i,
  /\b(invest|profit|earn|trading|recover(y|ing)?)\b[^.]{0,50}\b(whats ?app|telegram|t\.me|wa\.me)\b/i,
  // Guaranteed-return promises.
  /\bguaranteed\s+(profits?|returns?|roi)\b/i,
  /\b100%\s+(profit|return|guaranteed)\b/i,
  // Social/SEO services.
  /\b(cheap|buy|purchase)\s+(followers|likes|views|backlinks|subscribers)\b/i,
  /\bseo\s+(services?|ranking|backlinks)\b/i,
  // Explicit ad calls to action.
  /\bclick\s+(here|this\s+link)\b[^.]{0,30}\b(win|claim|earn|prize|reward)\b/i,
  // "Recovery expert" scams, which specifically target people who lost funds
  // and therefore specifically target this pipeline's real audience.
  /\b(recovery|crypto)\s+(expert|specialist|agent|hacker)\b/i,
];

/**
 * Words that mean the text is about this product. Backs
 * `link_heavy_no_feedback`: a body full of links that never once mentions the
 * wallet is not a bug report.
 */
const WALLET_VOCABULARY = [
  'wallet', 'note', 'notes', 'balance', 'send', 'sent', 'sync', 'seed', 'faucet',
  'transaction', 'tx', 'prove', 'proving', 'consume', 'import', 'export',
  'account', 'address', 'token', 'network', 'testnet', 'devnet', 'node',
  'miden', 'qr', 'scan', 'crash', 'freeze', 'error', 'screen', 'button', 'app',
];

const LINK_RE = /https?:\/\/\S+/gi;

export function countLinks(text: string): number {
  return (text.match(LINK_RE) ?? []).length;
}

export function mentionsWalletVocabulary(text: string): boolean {
  const lower = text.toLowerCase();
  return WALLET_VOCABULARY.some((w) => new RegExp(`\\b${w}\\b`).test(lower));
}

export function matchesKnownSpamPhrase(text: string): boolean {
  return SPAM_PHRASES.some((re) => re.test(text));
}

export interface EvidenceInput {
  body: string;
  errorCode: string | null;
  reporterKind: string | null;
  /** True only when the flood query confirmed it. Computed by the caller. */
  floodConfirmed: boolean;
}

/**
 * Corroboration for a model's `spam` verdict. Returns reason CODES; an empty
 * array means no corroboration, which caps the outcome at `suspected_spam`.
 *
 * This is the load-bearing half of decision #1. Spam status now arrives in the
 * same JSON an injection-prone prompt returns, so a crafted body can try to
 * declare itself clean — or try to get a legitimate rival's report declared
 * spam. Requiring a signal the MODEL CANNOT SET before anything is confirmed
 * is what stops the model's opinion being the whole decision.
 *
 * Explicitly NOT evidence: missing platform, version, or error metadata. The
 * standalone form supplies none of those, so treating their absence as
 * evidence would corroborate spam for essentially every report the public page
 * receives. Decision #1 names this directly.
 */
export function evaluateDeterministicEvidence(input: EvidenceInput): SpamReason[] {
  const evidence: SpamReason[] = [];

  if (matchesKnownSpamPhrase(input.body)) evidence.push('known_pattern');

  // Two or more links, nothing this pipeline can bucket, and not one word
  // about the product. All three, or it is just a report with links in it.
  if (countLinks(input.body) >= 2 && !input.errorCode && !mentionsWalletVocabulary(input.body)) {
    evidence.push('link_heavy_no_feedback');
  }

  // An IP-derived flood can never corroborate. One NAT egress is not one
  // person, and confirming spam on it would punish a shared network.
  if (input.floodConfirmed && input.reporterKind === 'install') evidence.push('flood_repeat');

  return evidence;
}

/**
 * Does this row's reporter have `threshold` or more identical submissions in
 * the window? Counts the row itself, so the comparison is `>=` rather than the
 * ingest check's `>= threshold - 1`.
 *
 * Runs only when the model has already said `spam` — evidence is never
 * consulted otherwise, so clean reports cost no extra read.
 */
export async function confirmFloodAtDrain(
  db: D1Database,
  reporterKey: string | null,
  normalizedHash: string | null,
  receivedAt: number,
  cfg: FloodConfig
): Promise<boolean> {
  if (!reporterKey || !normalizedHash) return false;
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM submissions
          WHERE reporter_key = ? AND normalized_hash = ?
            AND received_at > ? AND received_at <= ?`
      )
      .bind(reporterKey, normalizedHash, receivedAt - cfg.windowMs, receivedAt)
      .first<{ n: number }>();
    return (row?.n ?? 0) >= cfg.threshold;
  } catch (err) {
    // A database hiccup must not manufacture corroboration.
    console.warn('flood evidence query failed, no corroboration', (err as Error)?.message);
    return false;
  }
}
