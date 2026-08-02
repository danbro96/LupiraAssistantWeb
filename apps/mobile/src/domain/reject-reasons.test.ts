import { describe, it, expect } from 'vitest';
import { isPermanentReject } from './reject-reasons';

describe('isPermanentReject', () => {
  it('classifies malformed/invalid rows as permanent', () => {
    for (const r of ['invalid_json', 'missing_seq', 'invalid_ts', 'ts_out_of_range', 'missing_latlon', 'invalid_latlon', 'body_ids_forbidden', 'unknown_kind', 'missing_value']) {
      expect(isPermanentReject(r)).toBe(true);
    }
  });

  it('treats batch_too_large as NOT permanent (per-batch signal)', () => {
    expect(isPermanentReject('batch_too_large')).toBe(false);
  });

  it('treats unknown/future reasons as not permanent (retry-safe default)', () => {
    expect(isPermanentReject('some_future_transient')).toBe(false);
  });
});
