// Independent offline streams, each with its own monotonic seq: three telemetry uploads plus the
// inbox acks queue (resolve/answer gestures).
export type Stream = 'location' | 'ring' | 'summaries' | 'acks';

export const STREAMS: readonly Stream[] = ['location', 'ring', 'summaries', 'acks'];

// seq is gap-tolerant server-side, so simple increment is enough.
export function nextSeq(current: number): number {
  return current + 1;
}

// Seed to max(local, server cursor) so a reinstall never reuses an already-accepted seq.
export function seedValue(localCurrent: number, serverLastSeq: number | null): number {
  return Math.max(localCurrent, serverLastSeq ?? 0);
}

// ~285,000 years at 1 fix/sec to exceed MAX_SAFE_INTEGER, so a JS number is safe — no bigint needed.
