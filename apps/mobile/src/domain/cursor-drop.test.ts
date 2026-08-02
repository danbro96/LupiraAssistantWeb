import { describe, it, expect } from 'vitest';
import { dropSeqsUpTo, isCoveredByCursor } from './cursor-drop';

describe('dropSeqsUpTo', () => {
  it('drops seqs at or below the cursor (inclusive boundary)', () => {
    expect(dropSeqsUpTo([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
  });

  it('drops nothing for a null cursor (nothing accepted yet)', () => {
    expect(dropSeqsUpTo([1, 2, 3], null)).toEqual([]);
  });

  it('drops nothing when all seqs are above the cursor', () => {
    expect(dropSeqsUpTo([5, 6], 3)).toEqual([]);
  });
});

describe('isCoveredByCursor', () => {
  it('is inclusive of lastSeq and false for null', () => {
    expect(isCoveredByCursor(3, 3)).toBe(true);
    expect(isCoveredByCursor(4, 3)).toBe(false);
    expect(isCoveredByCursor(1, null)).toBe(false);
  });
});
