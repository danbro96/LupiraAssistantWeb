import { describe, it, expect } from 'vitest';
import { applyReceipt } from './receipt-apply';
import type { IngestReceipt } from './receipts';

function locReceipt(over: Partial<IngestReceipt> = {}): IngestReceipt {
  return { rejects: [], paused: false, ...over };
}

describe('applyReceipt', () => {
  it('deletes confirmed rows (inserted AND duplicates) and advances to the max seq', () => {
    const plan = applyReceipt(locReceipt(), [1, 2, 3]);
    expect(plan.deleteSeqs).toEqual([1, 2, 3]);
    expect(plan.dropRejectSeqs).toEqual([]);
    expect(plan.advanceTo).toBe(3);
    expect(plan.paused).toBe(false);
  });

  it('drops permanently-rejected rows and confirms the rest', () => {
    const plan = applyReceipt(locReceipt({ rejects: [{ seq: 2, reason: 'invalid_latlon' }] }), [1, 2, 3]);
    expect(plan.deleteSeqs).toEqual([1, 3]);
    expect(plan.dropRejectSeqs).toEqual([2]);
    expect(plan.advanceTo).toBe(3);
  });

  it('leaves transient (non-permanent) rejects buffered for retry', () => {
    const plan = applyReceipt(locReceipt({ rejects: [{ seq: 2, reason: 'rate_limited' }] }), [1, 2, 3]);
    expect(plan.deleteSeqs).toEqual([1, 3]);
    expect(plan.dropRejectSeqs).toEqual([]);
    expect(plan.advanceTo).toBe(3);
  });

  it('treats batch_too_large as a batch signal, never a per-row drop', () => {
    const plan = applyReceipt(locReceipt({ rejects: [{ seq: null, reason: 'batch_too_large' }] }), [1, 2]);
    expect(plan.batchTooLarge).toBe(true);
    expect(plan.deleteSeqs).toEqual([1, 2]);
    expect(plan.dropRejectSeqs).toEqual([]);
  });

  it('on pause: no deletes, paused flag set, no advance', () => {
    const plan = applyReceipt(locReceipt({ paused: true }), [1, 2, 3]);
    expect(plan).toEqual({ deleteSeqs: [], dropRejectSeqs: [], advanceTo: null, paused: true, batchTooLarge: false });
  });

  it('ring receipt (no paused field) is treated as not paused', () => {
    const plan = applyReceipt({ rejects: [] }, [9]);
    expect(plan.paused).toBe(false);
    expect(plan.deleteSeqs).toEqual([9]);
  });

  it('advanceTo is null when nothing resolves', () => {
    const plan = applyReceipt(locReceipt({ rejects: [{ seq: 1, reason: 'rate_limited' }] }), [1]);
    expect(plan.advanceTo).toBeNull();
  });
});
