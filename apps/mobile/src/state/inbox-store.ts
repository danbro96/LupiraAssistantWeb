import { create } from 'zustand';
import { getDb } from '../data/db/db';
import { getCache, clearCache } from '../data/db/inbox-cache-repo';
import { parseCachedInbox, type InboxItemView } from '@lupira/assistant-domain/inbox-item';
import { logDebug } from '../debug/log';

// The assistant surface store. P0 is read-only: it renders the last cached feed and the on-behalf-of
// grant status. The live fetch (refresh/refreshGrant) is wired against the generated assistant-api
// client once the hub publishes its OpenAPI — see TODO(hub-spec) below.

/** Server-truth, read via GET /me; `unknown` until that endpoint exists. */
export type GrantStatus = 'connected' | 'reauth-needed' | 'unknown';

interface InboxState {
  loaded: boolean;
  grantStatus: GrantStatus;
  items: InboxItemView[];
  fetchedAt: number | null;
}

interface InboxActions {
  /** Hydrate from the local cache so the screen renders offline at launch. */
  loadFromCache: () => Promise<void>;
  /** Re-fetch the feed from assistant-api. TODO(hub-spec): wire to the generated client. */
  refresh: () => Promise<void>;
  /** Re-read grant status from GET /me. TODO(hub-spec): wire to the generated client. */
  refreshGrant: () => Promise<void>;
  clear: () => Promise<void>;
}

export const useInbox = create<InboxState & InboxActions>((set) => ({
  loaded: false,
  grantStatus: 'unknown',
  items: [],
  fetchedAt: null,

  loadFromCache: async () => {
    try {
      const db = await getDb();
      const cache = await getCache(db);
      set({
        loaded: true,
        items: cache ? parseCachedInbox(cache.json) : [],
        fetchedAt: cache?.fetchedAt ?? null,
      });
    } catch (e) {
      logDebug('inbox:cache-load-error', e instanceof Error ? e.message : String(e));
      set({ loaded: true });
    }
  },

  refresh: async () => {
    // TODO(hub-spec): GET /inbox via the generated assistant client → map DTOs → setCache → set items.
    logDebug('inbox:refresh', 'skipped — assistant-api OpenAPI not published yet');
  },

  refreshGrant: async () => {
    // TODO(hub-spec): GET /me via the generated assistant client → set grantStatus.
    logDebug('inbox:refresh-grant', 'skipped — assistant-api OpenAPI not published yet');
  },

  clear: async () => {
    const db = await getDb();
    await clearCache(db);
    set({ items: [], fetchedAt: null, grantStatus: 'unknown' });
  },
}));
