import { describe, expect, it } from 'vitest';
import { parseCachedInbox, type InboxItemView } from './inbox-item';

const item: InboxItemView = {
  id: 'p1',
  kind: 'proposal',
  title: 'Create event: Dentist',
  summary: 'Tue 14:00, from Telegram',
  createdAt: '2026-06-28T10:00:00.000Z',
};

describe('parseCachedInbox', () => {
  it('round-trips valid view-models', () => {
    expect(parseCachedInbox(JSON.stringify([item]))).toEqual([item]);
  });

  it('returns [] for malformed JSON', () => {
    expect(parseCachedInbox('not json')).toEqual([]);
  });

  it('returns [] when the blob is not an array', () => {
    expect(parseCachedInbox(JSON.stringify({ items: [item] }))).toEqual([]);
  });

  it('drops entries with an unknown kind or missing fields', () => {
    const blob = JSON.stringify([
      item,
      { ...item, id: 'p2', kind: 'bogus' },
      { id: 'p3', title: 'no kind', createdAt: '2026-06-28T10:00:00.000Z' },
      { ...item, id: undefined },
    ]);
    expect(parseCachedInbox(blob)).toEqual([item]);
  });

  it('coerces a missing summary to null', () => {
    const blob = JSON.stringify([{ ...item, summary: undefined }]);
    expect(parseCachedInbox(blob)).toEqual([{ ...item, summary: null }]);
  });
});
