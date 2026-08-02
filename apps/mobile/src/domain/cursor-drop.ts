// Null cursor (nothing accepted yet) drops none.
export function dropSeqsUpTo(bufferSeqs: readonly number[], lastSeq: number | null): number[] {
  if (lastSeq === null) return [];
  return bufferSeqs.filter((s) => s <= lastSeq);
}

export function isCoveredByCursor(seq: number, lastSeq: number | null): boolean {
  return lastSeq !== null && seq <= lastSeq;
}
