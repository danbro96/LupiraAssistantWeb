// View-model for the read-only Inbox: what the assistant has queued for the user. The screen renders
// these directly. The cache stores already-mapped view-models (the DTO→view-model mapper that reads
// the assistant-api response lands with the generated client), so this layer never sees the wire DTO.

export type InboxItemKind = 'proposal' | 'question' | 'reminder' | 'digest';

const KINDS: readonly InboxItemKind[] = ['proposal', 'question', 'reminder', 'digest'];

export interface InboxItemView {
  id: string;
  kind: InboxItemKind;
  title: string;
  summary: string | null;
  /** ISO 8601. */
  createdAt: string;
}

function isKind(v: unknown): v is InboxItemKind {
  return typeof v === 'string' && (KINDS as readonly string[]).includes(v);
}

function toItem(raw: unknown): InboxItemView | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string') return null;
  if (!isKind(r.kind)) return null;
  if (typeof r.createdAt !== 'string') return null;
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    summary: typeof r.summary === 'string' ? r.summary : null,
    createdAt: r.createdAt,
  };
}

/** Defensive parse of the cached blob (an InboxItemView[]); malformed entries are dropped. */
export function parseCachedInbox(json: string): InboxItemView[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map(toItem).filter((x): x is InboxItemView => x !== null);
}
