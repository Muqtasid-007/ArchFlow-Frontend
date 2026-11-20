import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { getBoardSocket } from '../lib/socket.js';
import { useBoardRealtime } from '../hooks/useBoardRealtime.js';
import { useCommentRealtime } from '../hooks/useCommentRealtime.js';
import { useCanvasStore } from '../store/canvasStore.js';
import { useOperationStore } from '../store/operationStore.js';
import { resetBoardOperations } from '../lib/resetBoardOperations.js';
import { toast } from '../store/toastStore.js';
import { BoardHeader } from '../components/board/BoardHeader.jsx';
import { Canvas } from '../components/board/Canvas.jsx';
import { SidePanel } from '../components/board/SidePanel.jsx';
import { CodegenModal } from '../components/codegen/CodegenModal.jsx';
import { Button, Spinner } from '../components/ui/index.jsx';
import { CircleSlash } from 'lucide-react';

function createOpId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState([]);
  const [activeTab, setActiveTab] = useState('inspect');
  const [panelOpen, setPanelOpen] = useState(false);
  const [codegenOpen, setCodegenOpen] = useState(false);
  const pendingOperationCount = useOperationStore((state) => state.pending.length);
  const emitRef = useRef(null);
  const pendingOpsRef = useRef(new Map());
  const opQueueRef = useRef(Promise.resolve());
  const optimisticRevisionRef = useRef(1);
  const operationEpochRef = useRef(0);
  const commentJumpRef = useRef(null);
  const boardIdRef = useRef(boardId);

  boardIdRef.current = boardId;
  useCommentRealtime(boardId);

  const loadBoard = useCallback(async () => {
    const payload = await apiRequest(`/boards/${boardId}`);
    setBoard(payload.board);
    setRole(payload.role);
    useCanvasStore.getState().setGraph(payload.board.graph, payload.board.revision);
    optimisticRevisionRef.current = payload.board.revision;
    return payload;
  }, [boardId]);

  const handleBoardReplaced = useCallback((revision) => {
    resetBoardOperations({
      pendingOpsRef,
      operationEpochRef,
      opQueueRef,
      optimisticRevisionRef,
      revision,
    });
  }, []);

  const registerCommentJump = useCallback((jumpToComment) => {
    commentJumpRef.current = jumpToComment;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    useCanvasStore.getState().reset();
    useOperationStore.getState().reset();

    loadBoard()
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      useCanvasStore.getState().reset();
      useOperationStore.getState().reset();
    };
  }, [loadBoard]);

  const emitOp = useCallback(
    (op) => {
      const socket = getBoardSocket();
      if (!socket.connected) {
        toast.error('Reconnecting — try that again in a moment.');
        return Promise.resolve({ ok: false });
      }

      const state = useCanvasStore.getState();
      const opId = createOpId();
      const operationEpoch = operationEpochRef.current;
      const baseRevision = Math.max(state.revision, optimisticRevisionRef.current);
      optimisticRevisionRef.current = baseRevision + 1;
      pendingOpsRef.current.set(opId, { baseRevision, op, timer: null });

      // Optimistic local application keeps drawing snappy.
      useOperationStore.getState().applyLocalOp(op, opId);

      return new Promise((resolve) => {
        const send = () =>
          new Promise((finish) => {
            if (operationEpoch !== operationEpochRef.current) {
              pendingOpsRef.current.delete(opId);
              resolve({ ok: false, stale: true });
              finish();
              return;
            }
            let settled = false;
            let timer;
            const settle = (response) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              pendingOpsRef.current.delete(opId);

              // Ignore acknowledgements for operations sent before a restore.
              if (operationEpoch !== operationEpochRef.current) {
                resolve({ ok: false, stale: true });
                finish();
                return;
              }

              if (response?.opId !== opId) {
                useOperationStore.getState().rollbackOp(opId, response?.revision ?? baseRevision);
                toast.error('The server returned an invalid operation acknowledgement.');
                loadBoard().catch(() => {});
                resolve({ ok: false });
              } else if (response?.ok) {
                useOperationStore.getState().confirmOp(opId);
                useCanvasStore.getState().bumpRevision(response.revision);
                optimisticRevisionRef.current = response.revision;
                resolve(response);
              } else {
                useOperationStore.getState().rollbackOp(opId, response?.revision ?? baseRevision);
                toast.error(response?.error ?? 'That change was rejected.');
                loadBoard().catch(() => {});
                resolve(response ?? { ok: false });
              }
              finish();
            };

            if (!socket.connected) {
              toast.error('Reconnecting — try that again in a moment.');
              settle({ ok: false, opId, revision: baseRevision });
              return;
            }

            timer = setTimeout(() => {
              if (operationEpoch !== operationEpochRef.current) {
                settle({ ok: false, stale: true });
                return;
              }
              toast.error('The server did not confirm that change.');
              useOperationStore.getState().rollbackOp(opId, baseRevision);
              loadBoard().catch(() => {});
              settle({ ok: false, opId, revision: baseRevision });
            }, 7000);
            const pending = pendingOpsRef.current.get(opId);
            if (pending) pending.timer = timer;

            socket.emit('canvas:op', { boardId: boardIdRef.current, opId, baseRevision, op }, settle);
          });

        opQueueRef.current = opQueueRef.current.then(send, send);
      });
    },
    [loadBoard],
  );

  emitRef.current = emitOp;

  const activeBoardId = board?.id;

  useBoardRealtime({
    activeBoardId,
    boardIdRef,
    navigate,
    loadBoard,
    setBoard,
    setRole,
    setConnected,
    setPresence,
    onBoardReplaced: handleBoardReplaced,
  });

  const readOnly = role === 'viewer';

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Spinner /> Loading board…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <CircleSlash className="mx-auto h-6 w-6 text-rose-300" />
          <h1 className="mt-3 text-lg font-semibold text-white">Board unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-rose-200/80">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Back to dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BoardHeader
        board={board}
        role={role}
        presence={presence}
        connected={connected}
        pendingOperations={pendingOperationCount}
        revision={board?.revision}
        onOpenTab={(tab) => {
          setActiveTab(tab);
          setPanelOpen(true);
        }}
        onGenerate={() => setCodegenOpen(true)}
        onBack={() => navigate('/dashboard')}
      />

      <div className="relative flex min-h-0 flex-1">
        <Canvas
          readOnly={readOnly}
          role={role}
          emitOp={emitOp}
          boardId={boardId}
          onRegisterCommentJump={registerCommentJump}
        />

        <SidePanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          tab={activeTab}
          onTabChange={setActiveTab}
          board={board}
          role={role}
          readOnly={readOnly}
          emitOp={emitOp}
          onBoardUpdated={setBoard}
          onReload={loadBoard}
          onGenerate={() => setCodegenOpen(true)}
          presence={presence}
          onJumpToComment={(thread) => commentJumpRef.current?.(thread)}
        />
      </div>

      <CodegenModal
        open={codegenOpen}
        onClose={() => setCodegenOpen(false)}
        boardId={boardId}
        boardName={board?.name}
      />
    </div>
  );
}
