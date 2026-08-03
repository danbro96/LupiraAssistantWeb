// Thread paging for the archive reader: pages arrive chronological and may overlap (an anchor page
// re-fetched, or a `before` page whose boundary the client already holds), so merging is dedup +
// chronological order rather than plain concatenation.

/** The minimum a thread row must carry to be ordered and deduped. */
export interface ThreadMessage {
  id: string;
  timestamp: string;
}

/**
 * Merge a freshly-fetched page into the loaded window: dedup by id (loaded copy wins), then order by
 * (timestamp, id) — the same total order the server pages on, so the seam never jumbles.
 */
export function mergeThreadPage<T extends ThreadMessage>(loaded: readonly T[], page: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const m of page) byId.set(m.id, m);
  for (const m of loaded) byId.set(m.id, m);
  return [...byId.values()].sort(compareChronological);
}

export function compareChronological(a: ThreadMessage, b: ThreadMessage): number {
  const ta = Date.parse(a.timestamp);
  const tb = Date.parse(b.timestamp);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  if (ta !== tb) return ta - tb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Day-boundary label for a separator row, or null when the previous message is the same day. */
export function dayBreakLabel(current: ThreadMessage, previous: ThreadMessage | undefined): string | null {
  const day = current.timestamp.slice(0, 10);
  if (previous && previous.timestamp.slice(0, 10) === day) return null;
  return day;
}
