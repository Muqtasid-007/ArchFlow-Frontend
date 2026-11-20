import { create } from 'zustand';

export const useViewportStore = create((set) => ({
  zoom: 1,
  pan: { x: 0, y: 0 },

  setViewport(next) {
    set((state) => ({
      zoom: next.zoom ?? state.zoom,
      pan: next.pan ?? state.pan,
    }));
  },

  resetViewport() {
    set({ zoom: 1, pan: { x: 0, y: 0 } });
  },
}));
