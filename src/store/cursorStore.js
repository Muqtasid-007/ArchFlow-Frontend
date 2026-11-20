import { create } from 'zustand';

export const useCursorStore = create((set) => ({
  cursors: {},

  setCursor(user, x, y) {
    if (!user?.id) return;
    set((state) => ({
      cursors: {
        ...state.cursors,
        [user.id]: { ...user, x, y, updatedAt: Date.now() },
      },
    }));
  },

  removeCursor(userId) {
    if (!userId) return;
    set((state) => {
      if (!state.cursors[userId]) return state;
      const cursors = { ...state.cursors };
      delete cursors[userId];
      return { cursors };
    });
  },

  removeStaleCursors(maxAgeMs = 6000) {
    set((state) => {
      const cutoff = Date.now() - maxAgeMs;
      let changed = false;
      const cursors = {};
      for (const [id, cursor] of Object.entries(state.cursors)) {
        if (cursor.updatedAt >= cutoff) cursors[id] = cursor;
        else changed = true;
      }
      return changed ? { cursors } : state;
    });
  },

  clearCursors() {
    set({ cursors: {} });
  },
}));
