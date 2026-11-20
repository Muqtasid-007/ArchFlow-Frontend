import { create } from 'zustand';

function threadIdOf(thread) {
  return thread?.threadId ?? thread?.id;
}

function mergeById(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, { ...byId.get(item.id), ...item });
  }
  return [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function filterThreadsByState(threads, filter) {
  return threads.filter((thread) => Boolean(thread.resolved) === (filter === 'resolved'));
}

export const useCommentStore = create((set) => ({
  threads: [],
  repliesByThread: {},
  selectedThreadId: null,
  draftAnchor: null,
  filter: 'open',
  placementMode: false,

  setThreads(threads) {
    set((state) => ({ threads: mergeById(state.threads, threads) }));
  },

  upsertThread(thread) {
    const id = threadIdOf(thread);
    if (!id) return;
    set((state) => {
      const index = state.threads.findIndex((entry) => threadIdOf(entry) === id);
      if (index === -1) return { threads: [...state.threads, thread] };
      const threads = [...state.threads];
      threads[index] = { ...threads[index], ...thread };
      return { threads };
    });
  },

  removeThread(threadId) {
    set((state) => ({
      threads: state.threads.filter((thread) => threadIdOf(thread) !== threadId),
      selectedThreadId: state.selectedThreadId === threadId ? null : state.selectedThreadId,
      repliesByThread: Object.fromEntries(
        Object.entries(state.repliesByThread).filter(([id]) => id !== threadId),
      ),
    }));
  },

  setReplies(threadId, replies, nextCursor = null, append = false) {
    set((state) => {
      const previous = state.repliesByThread[threadId]?.items ?? [];
      return {
        repliesByThread: {
          ...state.repliesByThread,
          [threadId]: {
            items: mergeById(append ? previous : [], replies),
            nextCursor,
          },
        },
      };
    });
  },

  upsertReply(threadId, reply) {
    set((state) => {
      const current = state.repliesByThread[threadId] ?? { items: [], nextCursor: null };
      const isNewReply = !current.items.some((entry) => entry.id === reply.id);
      return {
        repliesByThread: {
          ...state.repliesByThread,
          [threadId]: { ...current, items: mergeById(current.items, [reply]) },
        },
        threads: isNewReply
          ? state.threads.map((thread) => threadIdOf(thread) === threadId
            ? { ...thread, replyCount: (thread.replyCount ?? 0) + 1 }
            : thread)
          : state.threads,
      };
    });
  },

  removeComment(commentId) {
    set((state) => {
      const root = state.threads.find((thread) => threadIdOf(thread) === commentId);
      if (root) {
        return {
          threads: state.threads.filter((thread) => threadIdOf(thread) !== commentId),
          repliesByThread: Object.fromEntries(
            Object.entries(state.repliesByThread).filter(([id]) => id !== commentId),
          ),
          selectedThreadId: state.selectedThreadId === commentId ? null : state.selectedThreadId,
        };
      }

      let removedFromThread = null;
      const repliesByThread = Object.fromEntries(
        Object.entries(state.repliesByThread).map(([id, page]) => {
          if (page.items.some((reply) => reply.id === commentId)) {
            removedFromThread = id;
            return [id, { ...page, items: page.items.filter((reply) => reply.id !== commentId) }];
          }
          return [id, page];
        }),
      );
      return {
        repliesByThread,
        threads: removedFromThread
          ? state.threads.map((thread) => threadIdOf(thread) === removedFromThread
            ? { ...thread, replyCount: Math.max(0, (thread.replyCount ?? 1) - 1) }
            : thread)
          : state.threads,
      };
    });
  },

  setSelectedThread(threadId) {
    set({ selectedThreadId: threadId });
  },

  setDraftAnchor(draftAnchor) {
    set({ draftAnchor });
  },

  setFilter(filter) {
    if (filter === 'open' || filter === 'resolved') set({ filter });
  },

  setPlacementMode(placementMode) {
    set({ placementMode: Boolean(placementMode) });
  },

  clearBoardComments() {
    set({
      threads: [],
      repliesByThread: {},
      selectedThreadId: null,
      draftAnchor: null,
      filter: 'open',
      placementMode: false,
    });
  },
}));
