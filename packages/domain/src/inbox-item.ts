// View-model for the Inbox: what the assistant has queued for the user. The screen renders these
// directly; the cache stores already-mapped view-models. mapInboxResponse reads the hub's /inbox wire
// shape defensively (structural, no generated types — this package stays dependency-free).

export type InboxItemKind = 'proposal' | 'question';

const KINDS: readonly InboxItemKind[] = ['proposal', 'question'];

export interface InboxItemView {
  id: string;
  kind: InboxItemKind;
  title: string;
  /** One-line digest of the proposal payload; null for questions. */
  summary: string | null;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601; questions may expire. */
  expiresAt?: string | null;
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
    expiresAt: typeof r.expiresAt === 'string' ? r.expiresAt : null,
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

/** Map the hub's GET /inbox response (`{items: [...]}`) into view-models; malformed entries drop. */
export function mapInboxResponse(data: unknown): InboxItemView[] {
  if (typeof data !== 'object' || data === null) return [];
  const items = (data as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  return items.map(mapWireItem).filter((x): x is InboxItemView => x !== null);
}

function mapWireItem(raw: unknown): InboxItemView | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.createdAt !== 'string') return null;
  const kind = typeof r.kind === 'string' ? r.kind.toLowerCase() : '';
  if (!isKind(kind)) return null;
  return {
    id: r.id,
    kind,
    title: r.title,
    summary: kind === 'proposal' ? proposalSummary(r.proposal) : null,
    createdAt: r.createdAt,
    expiresAt: typeof r.expiresAt === 'string' ? r.expiresAt : null,
  };
}

/** One human line from the proposal detail: the action kind plus its most concrete facts. */
export function proposalSummary(proposal: unknown): string | null {
  const p = asRecord(proposal);
  if (!p) return null;
  const parts: string[] = [];
  if (typeof p.actionKind === 'string') parts.push(spaceOutKind(p.actionKind));

  const event = asRecord(p.event);
  if (event) {
    const when = str(event.startsAt)?.replace('T', ' ').slice(0, 16) ?? str(event.startDate);
    if (when) parts.push(when);
    const where = str(event.location);
    if (where) parts.push(where);
  }

  const task = asRecord(p.task);
  if (task) {
    const due = str(task.dueAt)?.replace('T', ' ').slice(0, 16);
    if (due) parts.push(`due ${due}`);
    if (asRecord(task.bill)) parts.push('bill');
    if (asRecord(task.delivery)) parts.push('delivery');
    if (asRecord(task.reply)) parts.push('reply');
  }

  const contact = asRecord(p.contact);
  if (contact) {
    const name = [str(contact.givenName), str(contact.familyName)].filter(Boolean).join(' ');
    if (name) parts.push(name);
  }

  const place = asRecord(p.place);
  if (place) {
    const name = str(place.name);
    if (name) parts.push(name);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

/** "CreateEvent" → "Create event". */
function spaceOutKind(kind: string): string {
  const spaced = kind.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0) + spaced.slice(1).toLowerCase();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
