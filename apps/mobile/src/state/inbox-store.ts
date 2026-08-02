import { create } from 'zustand';
import { getDb } from '../data/db/db';
import { getCache, clearCache } from '../data/db/inbox-cache-repo';
import { getAuthStatus } from '../data/api/generated/assistant/auth/auth';
import { parseCachedInbox, type InboxItemView } from '@lupira/assistant-domain/inbox-item';
import { logDebug } from '../debug/log';

// The assistant surface store: the last cached feed plus the on-behalf-of grant status (live via the
// BFF). The feed fetch is wired against the hub's /inbox — see refresh().

/** Server-truth, read via GET /auth/status; `unknown` until the first successful read. */
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
    try {
      const res = await getAuthStatus();
      const grant = res.data;
      set({ grantStatus: grant.hasGrant && grant.status === 'Active' ? 'connected' : 'reauth-needed' });
    } catch (e) {
      // Offline or unauthenticated: keep the last known status rather than flashing the reconnect card.
      logDebug('inbox:refresh-grant-error', e instanceof Error ? e.message : String(e));
    }
  },

  clear: async () => {
    const db = await getDb();
    await clearCache(db);
    set({ items: [], fetchedAt: null, grantStatus: 'unknown' });
  },
}));
