// Permanent (drop) vs transient (retry). `batch_too_large` is excluded — it's a per-BATCH signal.
export const PERMANENT_REJECTS: ReadonlySet<string> = new Set([
  'invalid_json',
  'missing_seq',
  'invalid_ts',
  'ts_out_of_range',
  'missing_latlon',
  'invalid_latlon',
  'body_ids_forbidden',
  'unknown_kind',
  'missing_value',
  'missing_kind',
  'invalid_period_start',
  'invalid_period_end',
  'missing_payload',
]);

export function isPermanentReject(reason: string): boolean {
  return PERMANENT_REJECTS.has(reason);
}
