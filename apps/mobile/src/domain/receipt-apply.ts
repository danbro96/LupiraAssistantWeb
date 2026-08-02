import type { IngestReceipt } from './receipts';
import { isPermanentReject } from './reject-reasons';

// inserted+duplicates are both server-confirmed (idempotent) → delete; permanent rejects → drop.
export interface ApplyPlan {
  deleteSeqs: number[]; // confirmed (inserted or duplicate)
  dropRejectSeqs: number[]; // permanently rejected; mark rejected, kept for diagnostics
  advanceTo: number | null; // highest resolved seq for the high-water
  paused: boolean; // location receipts only; false for ring/summaries
  batchTooLarge: boolean; // batch-level signal, not a per-row drop
}

export function applyReceipt(receipt: IngestReceipt, sentSeqs: readonly number[]): ApplyPlan {
  const paused = receipt.paused === true;
  if (paused) {
    // Body discarded server-side; keep buffered rows for upload on resume.
    return { deleteSeqs: [], dropRejectSeqs: [], advanceTo: null, paused: true, batchTooLarge: false };
  }

  const rejectBySeq = new Map<number, string>();
  let batchTooLarge = false;
  for (const r of receipt.rejects) {
    if (r.reason === 'batch_too_large') {
      batchTooLarge = true;
      continue;
    }
    if (r.seq != null) rejectBySeq.set(r.seq, r.reason);
  }

  const deleteSeqs: number[] = [];
  const dropRejectSeqs: number[] = [];
  for (const seq of sentSeqs) {
    const reason = rejectBySeq.get(seq);
    if (reason === undefined) {
      deleteSeqs.push(seq);
    } else if (isPermanentReject(reason)) {
      dropRejectSeqs.push(seq);
    }
    // transient reject → leave buffered for retry
  }

  const resolved = [...deleteSeqs, ...dropRejectSeqs];
  const advanceTo = resolved.length > 0 ? Math.max(...resolved) : null;
  return { deleteSeqs, dropRejectSeqs, advanceTo, paused: false, batchTooLarge };
}
