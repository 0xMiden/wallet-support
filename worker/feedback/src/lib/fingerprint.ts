/**
 * Deterministic bucketing — stage 1 of dedup, before any embedding or model
 * call. Cheap, explainable, and catches the high-frequency tail.
 *
 * Keyed on the 12-code QA error taxonomy. This is the structured signal in
 * a sea of free text; keep it in sync with the taxonomy of record.
 */

export const ERROR_CODES = [
  'NTL_TIMEOUT',
  'STUCK_NOTE',
  'BALANCE_MISMATCH',
  'MISSING_PRIVATE_NOTE',
  'CONSUME_STUCK',
  'SYNC_CURSOR_RESET',
  'NODE_UNREACHABLE',
  'TX_SUBMIT_FAILED',
  'PROVE_TIMEOUT',
  'IMPORT_EXPORT_FAILED',
  'BIOMETRIC_AUTH_FAILED',
  'UI_RENDER_DEFECT',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Keyword → code. Deliberately conservative: returns null rather than
 * guessing. An unclassified report goes to the model with no prior, which is
 * better than a confidently wrong bucket.
 */
const SIGNALS: Array<[ErrorCode, RegExp]> = [
  ['NODE_UNREACHABLE',     /cannot reach|can'?t reach|unreachable|no connection to (the )?node/i],
  ['CONSUME_STUCK',        /stuck (in )?consum|consuming forever|won'?t consume/i],
  ['STUCK_NOTE',           /note (is )?stuck|pending note|note never arriv/i],
  ['BALANCE_MISMATCH',     /balance (is )?(wrong|incorrect|mismatch)|missing (funds|tokens)/i],
  ['MISSING_PRIVATE_NOTE', /private note (missing|not received|never)/i],
  ['NTL_TIMEOUT',          /transport (timeout|timed out)|ntl.*(timeout|fail)/i],
  ['SYNC_CURSOR_RESET',    /sync (stuck|reset|stopped)|cursor/i],
  ['TX_SUBMIT_FAILED',     /submit.*(fail|error)|transaction (failed|rejected)/i],
  ['PROVE_TIMEOUT',        /prov(ing|e).*(timeout|slow|stuck|hang)/i],
  ['IMPORT_EXPORT_FAILED', /(import|export|recover).*(fail|error)|seed.*(not work|invalid)/i],
  ['BIOMETRIC_AUTH_FAILED',/(face ?id|touch ?id|fingerprint|biometric).*(fail|not work)/i],
  ['UI_RENDER_DEFECT',     /(clipped|cut ?off|overlap|misaligned|blank screen|not visible)/i],
];

export function inferErrorCode(text: string): ErrorCode | null {
  for (const [code, re] of SIGNALS) if (re.test(text)) return code;
  return null;
}

/** Coarse version bucket — patch noise should not fragment buckets. */
function minorVersion(v?: string | null): string {
  const m = v?.match(/^(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}` : 'unknown';
}

export function fingerprint(input: {
  errorCode: string | null;
  walletVersion?: string | null;
  platform?: string | null;
  route?: string | null;
}): string {
  return [
    input.errorCode ?? 'UNCLASSIFIED',
    minorVersion(input.walletVersion),
    (input.platform ?? 'unknown').toLowerCase(),
    (input.route ?? 'unknown').toLowerCase(),
  ].join('|');
}
