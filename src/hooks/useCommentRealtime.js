import { useEffect } from 'react';
import { apiRequest } from '../lib/api.js';
import { getBoardSocket } from '../lib/socket.js';
import { useCommentStore } from '../store/commentStore.js';

async function loadThreads(boardId) {
  const threads = [];
  for (const state of ['open', 'resolved']) {
    let cursor;
    do {
      const query = new URLSearchParams({ state, limit: '100' });
      if (cursor) query.set('cursor', cursor);
      const result = await apiRequest(`/boards/${boardId}/comments?${query}`);
      threads.push(...(result.threads ?? []));
      cursor = result.nextCursor;
    } while (cursor);
  }
  return threads;
}

/** Keep the board's comment pins and open thread data in sync with REST and sockets. */
export function useCommentRealtime(boardId) {
  useEffect(() => {
    const store = useCommentStore.getState();
    store.clearBoardComments();
    if (!boardId) return undefined;

    const socket = getBoardSocket();
    const belongsHere = (event) => event?.boardId === boardId;

    function handleCreated(event) {
      if (belongsHere(event)) useCommentStore.getState().upsertThread(event.thread);
    }
    function handleReplied(event) {
      if (belongsHere(event)) useCommentStore.getState().upsertReply(event.threadId, event.reply);
    }
    function handleEdited(event) {
      if (!belongsHere(event)) return;
      const comment = event.comment;
      if (comment.parentId) useCommentStore.getState().upsertReply(comment.threadId, comment);
      else useCommentStore.getState().upsertThread(comment);
    }
    function handleThreadChanged(event) {
      if (belongsHere(event)) useCommentStore.getState().upsertThread(event.thread);
    }
    function handleDeleted(event) {
      if (belongsHere(event)) useCommentStore.getState().removeComment(event.commentId);
    }

    socket.on('comment:created', handleCreated);
    socket.on('comment:replied', handleReplied);
    socket.on('comment:edited', handleEdited);
    socket.on('comment:resolved', handleThreadChanged);
    socket.on('comment:reopened', handleThreadChanged);
    socket.on('comment:deleted', handleDeleted);

    let cancelled = false;
    loadThreads(boardId)
      .then((threads) => {
        if (!cancelled) useCommentStore.getState().setThreads(threads);
      })
      .catch((error) => {
        if (!cancelled) console.error('[comments] Could not load board comments:', error.message);
      });

    return () => {
      cancelled = true;
      socket.off('comment:created', handleCreated);
      socket.off('comment:replied', handleReplied);
      socket.off('comment:edited', handleEdited);
      socket.off('comment:resolved', handleThreadChanged);
      socket.off('comment:reopened', handleThreadChanged);
      socket.off('comment:deleted', handleDeleted);
      useCommentStore.getState().clearBoardComments();
    };
  }, [boardId]);
}
