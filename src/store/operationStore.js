import { create } from 'zustand';
import { useCanvasStore } from './canvasStore.js';

function createInversePatch(op, canvas) {
  if (op.type === 'node.create') {
    return { type: 'node.delete', nodeId: op.node.id };
  }
  if (op.type === 'node.delete') {
    const node = canvas.nodes.find((entry) => entry.id === op.nodeId);
    return node ? { type: 'node.create', node } : null;
  }
  if (op.type === 'node.update') {
    const node = canvas.nodes.find((entry) => entry.id === op.nodeId);
    if (!node) return null;
    const inversePatch = {};
    for (const key of Object.keys(op.patch)) inversePatch[key] = node[key];
    return { type: 'node.update', nodeId: op.nodeId, patch: inversePatch };
  }
  if (op.type === 'edge.create') {
    return { type: 'edge.delete', edgeId: op.edge.id };
  }
  if (op.type === 'edge.delete') {
    const edge = canvas.edges.find((entry) => entry.id === op.edgeId);
    return edge ? { type: 'edge.create', edge } : null;
  }
  if (op.type === 'edge.update') {
    const edge = canvas.edges.find((entry) => entry.id === op.edgeId);
    if (!edge) return null;
    const inversePatch = {};
    for (const key of Object.keys(op.patch)) inversePatch[key] = edge[key];
    return { type: 'edge.update', edgeId: op.edgeId, patch: inversePatch };
  }
  return null;
}

export const useOperationStore = create((set) => ({
  pending: [],

  applyLocalOp(op, opId) {
    const canvas = useCanvasStore.getState();
    const inverse = createInversePatch(op, canvas);
    set((state) => ({
      pending: [...state.pending, { opId, inverse }],
    }));
    canvas.applyOp(op);
  },

  confirmOp(opId) {
    set((state) => {
      const pending = state.pending.filter((entry) => entry.opId !== opId);
      return { pending };
    });
  },

  rollbackOp(opId, revision) {
    set((state) => {
      const entry = state.pending.find((item) => item.opId === opId);
      if (!entry) return state;

      // Apply only the inverse of this one operation.
      if (entry.inverse) useCanvasStore.getState().applyOp(entry.inverse);

      const pending = state.pending.filter((item) => item.opId !== opId);
      if (typeof revision === 'number') {
        useCanvasStore.setState({ revision });
      }
      return { pending };
    });
  },

  reset() {
    set({ pending: [] });
  },
}));
