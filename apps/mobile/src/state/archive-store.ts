import { create } from 'zustand';
import {
  search,
  listConversations,
  listMessages,
} from '../data/api/generated/comms/archive/archive';
import type {
  ArchiveSearchHitDto,
  ConversationsResponse,
  ConversationSummaryDto,
  ConversationMessagesResponse,
  ConversationMessageDto,
  MessageSource,
} from '../data/api/generated/comms/models';
import { mergeThreadPage } from '@lupira/assistant-domain/thread-page';
import { logDebug } from '../debug/log';

// The generated response types union success with ProblemDetails; a non-2xx already threw by the time
// these resolve (see http.ts), so the success arm is the only reachable shape — narrow it here.
const ok = <T,>(res: { data: unknown }): T => res.data as T;

// The comms archive browser: hybrid search, the conversation list, and a chat-style thread reader.
// Online-only by design — research is a deliberate act, not something the offline cache serves.

export interface SearchFilters {
  q: string;
  source?: MessageSource;
  participant?: string;
  from?: string;
  to?: string;
}

interface ArchiveState {
  searching: boolean;
  hits: ArchiveSearchHitDto[];
  searchError: string | null;

  conversations: ConversationSummaryDto[];
  conversationsCursor: string | null;
  loadingConversations: boolean;

  threadId: string | null;
  threadTitle: string | null;
  threadMessages: ConversationMessageDto[];
  loadingThread: boolean;
}

interface ArchiveActions {
  search: (filters: SearchFilters) => Promise<void>;
  clearSearch: () => void;
  loadConversations: (opts?: { more?: boolean; q?: string }) => Promise<void>;
  /** Open a thread: the latest page, or centred on a message (the search-hit jump). */
  openThread: (conversationId: string, aroundMessageId?: string) => Promise<void>;
  /** Page further back from the oldest loaded message. */
  loadOlder: () => Promise<void>;
  closeThread: () => void;
}

export const useArchive = create<ArchiveState & ArchiveActions>((set, get) => ({
  searching: false,
  hits: [],
  searchError: null,
  conversations: [],
  conversationsCursor: null,
  loadingConversations: false,
  threadId: null,
  threadTitle: null,
  threadMessages: [],
  loadingThread: false,

  search: async (filters) => {
    if (filters.q.trim().length === 0) {
      set({ hits: [], searchError: null });
      return;
    }
    set({ searching: true, searchError: null });
    try {
      const res = await search({
        q: filters.q.trim(),
        source: filters.source,
        participant: filters.participant,
        from: filters.from,
        to: filters.to,
      });
      set({ hits: ok<ArchiveSearchHitDto[]>(res), searching: false });
    } catch (e) {
      logDebug('archive:search-error', e instanceof Error ? e.message : String(e));
      set({ searching: false, searchError: 'Search unavailable.', hits: [] });
    }
  },

  clearSearch: () => set({ hits: [], searchError: null }),

  loadConversations: async (opts = {}) => {
    if (get().loadingConversations) return;
    set({ loadingConversations: true });
    try {
      const cursor = opts.more ? (get().conversationsCursor ?? undefined) : undefined;
      const data = ok<ConversationsResponse>(await listConversations({ cursor, q: opts.q }));
      const page = data.items;
      set({
        conversations: opts.more ? [...get().conversations, ...page] : page,
        conversationsCursor: data.nextCursor ?? null,
        loadingConversations: false,
      });
    } catch (e) {
      logDebug('archive:conversations-error', e instanceof Error ? e.message : String(e));
      set({ loadingConversations: false });
    }
  },

  openThread: async (conversationId, aroundMessageId) => {
    set({ threadId: conversationId, threadMessages: [], threadTitle: null, loadingThread: true });
    try {
      const data = ok<ConversationMessagesResponse>(
        await listMessages(conversationId, { around: aroundMessageId }),
      );
      set({ threadTitle: data.title ?? null, threadMessages: data.items, loadingThread: false });
    } catch (e) {
      logDebug('archive:thread-error', e instanceof Error ? e.message : String(e));
      set({ loadingThread: false });
    }
  },

  loadOlder: async () => {
    const { threadId, threadMessages, loadingThread } = get();
    if (!threadId || loadingThread || threadMessages.length === 0) return;
    set({ loadingThread: true });
    try {
      const data = ok<ConversationMessagesResponse>(
        await listMessages(threadId, { before: threadMessages[0].id }),
      );
      set({ threadMessages: mergeThreadPage(threadMessages, data.items), loadingThread: false });
    } catch (e) {
      logDebug('archive:older-error', e instanceof Error ? e.message : String(e));
      set({ loadingThread: false });
    }
  },

  closeThread: () => set({ threadId: null, threadTitle: null, threadMessages: [] }),
}));
