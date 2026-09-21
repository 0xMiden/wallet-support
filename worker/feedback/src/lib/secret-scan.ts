/**
 * Pre-storage secret detection.
 *
 * A wallet bug report can contain a seed phrase, a private key, or a
 * screenshot of either. Publishing that to a public GitHub issue is
 * irreversible and immediately indexed. This runs BEFORE anything is
 * stored or drafted.
 *
 * Bias: high recall. A false positive costs one human review. A false
 * negative costs someone their funds. Quarantine, never log the value.
 */

import { BIP39 } from './bip39';

export type ScanHit = { kind: string; note: string };

/**
 * BIP-39 structural detection.
 *
 * We deliberately do not require the 2048-word list to be present. A run of
 * 12/15/18/21/24 consecutive lowercase alpha tokens of 3-8 chars is the
 * structural signature; the wordlist only raises precision. If
 * `wordlist` is supplied, we additionally require a high match ratio.
 */
export function detectMnemonic(text: string, wordlist?: Set<string>): ScanHit | null {
  const VALID_LENGTHS = new Set([12, 15, 18, 21, 24]);
  const tokens = text.toLowerCase().match(/[a-z]+/g) ?? [];

  let run: string[] = [];
  const flush = (): ScanHit | null => {
    if (!VALID_LENGTHS.has(run.length)) return null;
    if (wordlist) {
      const hits = run.filter((w) => wordlist.has(w)).length;
      if (hits / run.length < 0.9) return null;
    }
    return { kind: 'mnemonic', note: `${run.length}-word sequence` };
  };

  for (const t of tokens) {
    if (t.length >= 3 && t.length <= 8) {
      run.push(t);
    } else {
      const hit = flush();
      if (hit) return hit;
      run = [];
    }
  }
  return flush();
}

/** Hex-encoded key material: 32 or 64 bytes, with or without 0x. */
export function detectHexKey(text: string): ScanHit | null {
  const m = text.match(/\b(?:0x)?[0-9a-fA-F]{64}\b|\b(?:0x)?[0-9a-fA-F]{128}\b/);
  return m ? { kind: 'hex_key', note: `${m[0].length} hex chars` } : null;
}

/**
 * Miden-specific and generic wallet artifacts.
 * Extend as the wallet's export formats evolve — keep this list in sync
 * with src/lib/miden/back/ in 0xMiden/wallet.
 */
export function detectWalletArtifacts(text: string): ScanHit | null {
  const patterns: Array<[RegExp, string]> = [
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'pem_private_key'],
    [/\b(seed\s*phrase|recovery\s*phrase|mnemonic)\b\s*[:=]/i, 'labelled_seed'],
    [/\bsecret[_-]?key\b\s*[:=]\s*\S+/i, 'labelled_secret_key'],
    [/\bprivate[_-]?key\b\s*[:=]\s*\S+/i, 'labelled_private_key'],
    [/\bghp_[A-Za-z0-9]{36}\b|\bgho_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/, 'github_token'],
  ];
  for (const [re, kind] of patterns) {
    if (re.test(text)) return { kind, note: 'pattern match' };
  }
  return null;
}

/**
 * The wordlist defaults ON. It is a parameter only so tests can exercise the
 * structural detector in isolation — production must never run without it, or
 * ordinary prose containing a 12-word run gets quarantined and silently lost.
 */
export function scanForSecrets(text: string, wordlist: Set<string> = BIP39): ScanHit[] {
  return [
    detectMnemonic(text, wordlist),
    detectHexKey(text),
    detectWalletArtifacts(text),
  ].filter((h): h is ScanHit => h !== null);
}

/**
 * TODO: OCR pass on image attachments before they leave quarantine.
 * Screenshots of a recovery screen are the highest-risk vector and are
 * invisible to text scanning. Until this exists, images must not be
 * referenced in any draft — hold them in R2 under a quarantine prefix.
 */
