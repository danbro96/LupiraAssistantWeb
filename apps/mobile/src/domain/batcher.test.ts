import { describe, it, expect } from 'vitest';
import { selectBatch, type BatchItem } from './batcher';

function items(n: number, bytesEach = 10): BatchItem[] {
  return Array.from({ length: n }, (_, i) => ({ seq: i + 1, json: 'x'.repeat(bytesEach), bytes: bytesEach }));
}

describe('selectBatch', () => {
  it('caps by line count and preserves seq order', () => {
    const out = selectBatch(items(100), { maxLines: 10, maxBytes: 1_000_000 });
    expect(out).toHaveLength(10);
    expect(out.map((i) => i.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('caps by byte size (accounting for newline separators)', () => {
    // 3 rows = 10+11+11=32B; a 4th (+11=43) exceeds maxBytes 35.
    const out = selectBatch(items(5, 10), { maxLines: 100, maxBytes: 35 });
    expect(out).toHaveLength(3);
  });

  it('always includes at least one row even if it alone exceeds maxBytes', () => {
    const out = selectBatch(items(3, 10_000), { maxLines: 100, maxBytes: 100 });
    expect(out).toHaveLength(1);
  });

  it('returns empty for empty input', () => {
    expect(selectBatch([], { maxLines: 10, maxBytes: 100 })).toEqual([]);
  });
});
