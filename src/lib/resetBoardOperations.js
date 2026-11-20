import { useOperationStore } from '../store/operationStore.js';

/** Drop queued optimistic edits when the server replaces the whole board. */
export function resetBoardOperations({
  pendingOpsRef,
  operationEpochRef,
  opQueueRef,
  optimisticRevisionRef,
  revision,
}) {
  // Late acknowledgements and timeout handlers from the previous board state are stale.
  operationEpochRef.current += 1;
  for (const pending of pendingOpsRef.current.values()) clearTimeout(pending.timer);
  pendingOpsRef.current.clear();
  opQueueRef.current = Promise.resolve();
  optimisticRevisionRef.current = revision;
  useOperationStore.getState().reset();
}
