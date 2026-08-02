import { describe, expect, it } from 'vitest';
import { mapInboxResponse, parseCachedInbox, proposalSummary, type InboxItemView } from './inbox-item';

const item: InboxItemView = {
  id: 'p1',
  kind: 'proposal',
  title: 'Create event: Dentist',
  summary: 'Tue 14:00, from Telegram',
  createdAt: '2026-06-28T10:00:00.000Z',
  expiresAt: null,
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

describe('mapInboxResponse', () => {
  const wireProposal = {
    id: 'a1',
    kind: 'Proposal',
    title: 'Create event "Dinner"?',
    createdAt: '2026-08-01T18:00:00+00:00',
    proposal: {
      actionKind: 'CreateEvent',
      event: { title: 'Dinner', startsAt: '2026-08-07T19:00:00+02:00', location: 'Café Pascal' },
    },
  };
  const wireQuestion = {
    id: 'q1',
    kind: 'Question',
    title: 'How was the dinner?',
    createdAt: '2026-08-02T08:00:00+00:00',
    expiresAt: '2026-08-03T08:00:00+00:00',
  };

  it('maps hub items into view-models', () => {
    expect(mapInboxResponse({ items: [wireProposal, wireQuestion] })).toEqual([
      {
        id: 'a1',
        kind: 'proposal',
        title: 'Create event "Dinner"?',
        summary: 'Create event · 2026-08-07 19:00 · Café Pascal',
        createdAt: '2026-08-01T18:00:00+00:00',
        expiresAt: null,
      },
      {
        id: 'q1',
        kind: 'question',
        title: 'How was the dinner?',
        summary: null,
        createdAt: '2026-08-02T08:00:00+00:00',
        expiresAt: '2026-08-03T08:00:00+00:00',
      },
    ]);
  });

  it('drops malformed items and tolerates a non-object response', () => {
    expect(mapInboxResponse({ items: [{ id: 'x' }, wireQuestion] })).toHaveLength(1);
    expect(mapInboxResponse(null)).toEqual([]);
    expect(mapInboxResponse({ items: 'nope' })).toEqual([]);
  });
});

describe('proposalSummary', () => {
  it('summarises a bill task by due date and marker', () => {
    expect(
      proposalSummary({
        actionKind: 'CreateTask',
        task: { title: 'Pay invoice', dueAt: '2026-08-10T00:00:00+02:00', bill: { amount: 120 } },
      }),
    ).toBe('Create task · due 2026-08-10 00:00 · bill');
  });

  it('summarises a contact by name', () => {
    expect(
      proposalSummary({ actionKind: 'UpdateContact', contact: { givenName: 'Anna', familyName: 'Berg' } }),
    ).toBe('Update contact · Anna Berg');
  });

  it('falls back to an all-day start date', () => {
    expect(
      proposalSummary({ actionKind: 'CreateEvent', event: { startDate: '2026-08-09' } }),
    ).toBe('Create event · 2026-08-09');
  });

  it('returns null when nothing concrete is present', () => {
    expect(proposalSummary({})).toBeNull();
    expect(proposalSummary(undefined)).toBeNull();
  });
});
