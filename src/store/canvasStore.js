import { create } from 'zustand';
import { applyGraphOp } from '../lib/graphOps.js';

export const useCanvasStore = create((set) => ({
  nodes: [],
  edges: [],
  revision: 1,
  selected: null,

  setGraph(graph, revision) {
    set({
      nodes: graph?.nodes ?? [],
      edges: graph?.edges ?? [],
      revision: revision ?? 1,
      selected: null,
    });
  },

  applyOp(op) {
    set((state) => {
      const next = applyGraphOp(state, op);
      let selected = state.selected;
      if (selected?.kind === 'node' && op.type === 'node.delete' && selected.id === op.nodeId) selected = null;
      if (selected?.kind === 'edge' && op.type === 'edge.delete' && selected.id === op.edgeId) selected = null;
      if (selected?.kind === 'edge' && op.type === 'node.delete') {
        const stillExists = next.edges.some((edge) => edge.id === selected.id);
        if (!stillExists) selected = null;
      }
      return { ...next, selected };
    });
  },

  patchNodeLocal(nodeId, patch) {
    set((state) => {
      const index = state.nodes.findIndex((node) => node.id === nodeId);
      if (index === -1) return state;

      const nodes = [...state.nodes];
      nodes[index] = { ...nodes[index], ...patch };
      return { nodes };
    });
  },

  setSelected(selected) {
    set({ selected });
  },

  bumpRevision(revision) {
    if (typeof revision === 'number') set({ revision });
  },

  reset() {
    set({ nodes: [], edges: [], revision: 1, selected: null });
  },
}));
