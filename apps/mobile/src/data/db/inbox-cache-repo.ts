import type { Db } from './db';

// Single-row cache of the last assistant-api Inbox feed (stored verbatim as JSON) so the read-only
// screen renders the last fetch while offline. Contract-agnostic: the shape lives in the JSON, not
// the schema — the typed parse happens in the store against the (future) generated client types.

const CACHE_KEY = 'inbox';

export interface InboxCache {
  json: string;
  fetchedAt: number;
}

export async function getCache(db: Db): Promise<InboxCache | null> {
  const row = await db.getFirstAsync<{ json: string; fetched_at: number }>(
    `SELECT json, fetched_at FROM inbox_cache WHERE key = ?`,
    [CACHE_KEY],
  );
  return row ? { json: row.json, fetchedAt: row.fetched_at } : null;
}

export async function setCache(db: Db, json: string, fetchedAtMs: number): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO inbox_cache (key, json, fetched_at) VALUES (?, ?, ?)`,
    [CACHE_KEY, json, fetchedAtMs],
  );
}

export async function clearCache(db: Db): Promise<void> {
  await db.runAsync(`DELETE FROM inbox_cache WHERE key = ?`, [CACHE_KEY]);
}
