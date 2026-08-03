import { describe, expect, it } from 'vitest';
import { compareChronological, dayBreakLabel, mergeThreadPage } from './thread-page';

const m = (id: string, timestamp: string) => ({ id, timestamp });

describe('mergeThreadPage', () => {
  it('prepends an older page in chronological order', () => {
    const loaded = [m('c', '2026-07-01T12:00:00Z'), m('d', '2026-07-01T13:00:00Z')];
    const page = [m('a', '2026-07-01T10:00:00Z'), m('b', '2026-07-01T11:00:00Z')];

    expect(mergeThreadPage(loaded, page).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('dedups an overlapping boundary message', () => {
    const loaded = [m('b', '2026-07-01T11:00:00Z'), m('c', '2026-07-01T12:00:00Z')];
    const page = [m('a', '2026-07-01T10:00:00Z'), m('b', '2026-07-01T11:00:00Z')];

    expect(mergeThreadPage(loaded, page).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks same-instant ties by id, matching the server order', () => {
    const same = '2026-07-01T10:00:00Z';
    expect(mergeThreadPage([m('b', same)], [m('a', same)]).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('falls back to id order when a timestamp is unparseable', () => {
    expect(compareChronological(m('a', 'nonsense'), m('b', 'nonsense'))).toBeLessThan(0);
  });
});

describe('dayBreakLabel', () => {
  it('labels the first message and each new day only', () => {
    const first = m('a', '2026-07-01T10:00:00Z');
    const sameDay = m('b', '2026-07-01T23:00:00Z');
    const nextDay = m('c', '2026-07-02T01:00:00Z');

    expect(dayBreakLabel(first, undefined)).toBe('2026-07-01');
    expect(dayBreakLabel(sameDay, first)).toBeNull();
    expect(dayBreakLabel(nextDay, sameDay)).toBe('2026-07-02');
  });
});
