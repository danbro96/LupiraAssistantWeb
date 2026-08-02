import { describe, it, expect } from 'vitest';
import { nextSeq, seedValue } from './seq';

describe('nextSeq', () => {
  it('increments by one', () => {
    expect(nextSeq(0)).toBe(1);
    expect(nextSeq(41)).toBe(42);
  });
});

describe('seedValue', () => {
  it('never lets the local counter fall below the server cursor', () => {
    expect(seedValue(5, 10)).toBe(10);
    expect(seedValue(20, 10)).toBe(20);
  });

  it('treats a null cursor as 0', () => {
    expect(seedValue(7, null)).toBe(7);
    expect(seedValue(0, null)).toBe(0);
  });
});
