import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore.js';
import { toast } from '../store/toastStore.js';
import { refreshAccessToken } from '../lib/api.js';
import { useCursorStore } from '../store/cursorStore.js';
import {
  connectBoardSocket,
  disconnectBoardSocket,
} from '../lib/socket.js';

export function useBoardRealtime({
  activeBoardId,
  boardIdRef,
  navigate,
  loadBoard,
  setBoard,
  setRole,
  setConnected,
  setPresence,
  onBoardReplaced,
}) {
  useEffect(() => {
    if (!activeBoardId) return undefined;

    const socket = connectBoardSocket();
    let disposed = false;
    let refreshAttempted = false;

    function removeRemoteUser(userId) {
      useCursorStore.getState().removeCursor(userId);
    }

    async function handleConnect() {
      setConnected(true);
      socket.emit('board:join', { boardId: boardIdRef.current }, (response) => {
        if (disposed) return;
        if (!response?.ok) {
          setConnected(false);
          toast.error(response?.error ?? 'Could not join this board.');
          return;
        }
        setRole(response.role);
      });
    }

    function handleDisconnect() {
      setConnected(false);
      setPresence([]);
      useCursorStore.getState().clearCursors();
    }

    async function handleConnectError(socketError) {
      setConnected(false);
      if (/unauthorized/i.test(socketError?.message ?? '') && !refreshAttempted) {
        refreshAttempted = true;
        const refreshed = await refreshAccessToken();
        if (refreshed && !disposed) {
          socket.auth = { token: refreshed.accessToken };
          socket.connect();
        }
      }
    }

    function handlePresence({ users }) {
      setPresence(users ?? []);
    }

    function handleOp({ op, revision }) {
      const state = useCanvasStore.getState();
      if (typeof revision !== 'number' || revision <= state.revision) return;
      if (revision !== state.revision + 1) {
        loadBoard().catch(() => {});
        return;
      }
      state.applyOp(op);
      state.bumpRevision(revision);
    }

    function handleReplaced({ graph, revision, snapshotName }) {
      onBoardReplaced?.(revision);
      useCanvasStore.getState().setGraph(graph, revision);
      toast.info(snapshotName ? `Restored "${snapshotName}".` : 'Board restored from a snapshot.');
    }

    function handleUpdated({ name, description }) {
      setBoard((current) => (current ? { ...current, name, description } : current));
    }

    function handleDeleted() {
      disconnectBoardSocket();
      toast.error('This board was deleted by its owner.');
      navigate('/dashboard', { replace: true });
    }

    function handleCursor({ user, x, y }) {
      useCursorStore.getState().setCursor(user, x, y);
    }

    function handleUserLeave({ userId, name }) {
      removeRemoteUser(userId);
      if (name) toast.info(`${name} left the board.`);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('presence:update', handlePresence);
    socket.on('canvas:op', handleOp);
    socket.on('board:replaced', handleReplaced);
    socket.on('board:updated', handleUpdated);
    socket.on('board:deleted', handleDeleted);
    socket.on('cursor:move', handleCursor);
    socket.on('presence:leave', handleUserLeave);
    socket.on('cursor:leave', handleUserLeave);

    if (socket.connected) handleConnect();
    else socket.connect();

    return () => {
      disposed = true;
      if (socket.connected) socket.emit('board:leave', { boardId: boardIdRef.current });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('presence:update', handlePresence);
      socket.off('canvas:op', handleOp);
      socket.off('board:replaced', handleReplaced);
      socket.off('board:updated', handleUpdated);
      socket.off('board:deleted', handleDeleted);
      socket.off('cursor:move', handleCursor);
      socket.off('presence:leave', handleUserLeave);
      socket.off('cursor:leave', handleUserLeave);
      disconnectBoardSocket();
      useCursorStore.getState().clearCursors();
      setPresence([]);
    };
  }, [activeBoardId, boardIdRef, navigate, loadBoard, setBoard, setRole, setConnected, setPresence, onBoardReplaced]);

  useEffect(() => {
    const interval = setInterval(() => {
      useCursorStore.getState().removeStaleCursors();
    }, 2500);
    return () => clearInterval(interval);
  }, []);
}
