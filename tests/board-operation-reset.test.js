import test from 'node:test';
import assert from 'node:assert/strict';
import { resetBoardOperations } from '../src/lib/resetBoardOperations.js';
import { useCanvasStore } from '../src/store/canvasStore.js';
import { useOperationStore } from '../src/store/operationStore.js';

test('board replacement clears pending inverses and makes old rollbacks harmless', () => {
  useCanvasStore.getState().reset();
  useOperationStore.getState().reset();
  useOperationStore.getState().applyLocalOp({
    type: 'node.create',
    node: { id: 'same-id', type: 'service', label: 'Optimistic node', x: 0, y: 0 },
  }, 'old-operation');

  const pendingOpsRef = { current: new Map() };
  const timer = setTimeout(() => assert.fail('old timeout should be canceled'), 60_000);
  pendingOpsRef.current.set('old-operation', { timer });
  const operationEpochRef = { current: 2 };
  const opQueueRef = { current: Promise.resolve('old queue') };
  const optimisticRevisionRef = { current: 8 };

  resetBoardOperations({
    pendingOpsRef,
    operationEpochRef,
    opQueueRef,
    optimisticRevisionRef,
    revision: 9,
  });
  useCanvasStore.getState().setGraph({
    nodes: [{ id: 'same-id', type: 'service', label: 'Restored node', x: 10, y: 10 }],
    edges: [],
  }, 9);
  useOperationStore.getState().rollbackOp('old-operation', 8);

  assert.equal(operationEpochRef.current, 3);
  assert.equal(pendingOpsRef.current.size, 0);
  assert.equal(useOperationStore.getState().pending.length, 0);
  assert.equal(optimisticRevisionRef.current, 9);
  assert.equal(useCanvasStore.getState().nodes[0].label, 'Restored node');
  console.log('[operation test] Board replacement cleared queued inverses and ignored stale rollback');
});
