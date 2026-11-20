import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, MousePointer2, Lock, MessageCircle } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore.js';
import { useCommentStore } from '../../store/commentStore.js';
import { useViewportStore } from '../../store/viewportStore.js';
import { createId, nodeBounds } from '../../lib/graphOps.js';
import { catalogEntry } from '../../lib/nodeCatalog.js';
import { toast } from '../../store/toastStore.js';
import { Toolbar } from './Toolbar.jsx';
import { NodeCard } from './NodeCard.jsx';
import { EdgeLayer } from './EdgeLayer.jsx';
import { PresenceLayer } from './PresenceLayer.jsx';
import { CommentLayer } from './CommentLayer.jsx';
import { useCursorBroadcast } from '../../hooks/useCursorBroadcast.js';
import { runBoardBenchmark } from '../../lib/boardBenchmark.js';
import { isCommentShortcut, isTextEntryTarget } from '../../lib/commentPlacement.js';
import { getThreadWorldPoint } from '../../lib/commentCoordinates.js';
import { nextGraphItem } from '../../lib/graphKeyboard.js';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.4;

export function Canvas({ readOnly, role, emitOp, boardId, onRegisterCommentJump }) {
  const containerRef = useRef(null);
  const emitRef = useRef(emitOp);
  const dragRef = useRef(null);
  const dragFrameRef = useRef(null);
  const panRef = useRef(null);
  const connectRef = useRef(null);
  const graphItemsRef = useRef([]);
  const keyboardConnectFromIdRef = useRef(null);
  const [size, setSize] = useState({ width: 1200, height: 720 });
  const [tempLine, setTempLine] = useState(null);
  const [keyboardConnectFromId, setKeyboardConnectFromIdState] = useState(null);

  emitRef.current = emitOp;

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedId =
    useCanvasStore((state) => state.selected?.id) ?? null;
  const selectedKind =
    useCanvasStore((state) => state.selected?.kind) ?? null;
  const selected = selectedKind ? { kind: selectedKind, id: selectedId } : null;
  graphItemsRef.current = [
    ...nodes.map((node) => ({ kind: 'node', id: node.id })),
    ...edges.map((edge) => ({ kind: 'edge', id: edge.id })),
  ];
  const zoom = useViewportStore((state) => state.zoom);
  const pan = useViewportStore((state) => state.pan);
  const setSelected = useCanvasStore((state) => state.setSelected);
  const setViewport = useViewportStore((state) => state.setViewport);
  const placementMode = useCommentStore((state) => state.placementMode);
  const setPlacementMode = useCommentStore((state) => state.setPlacementMode);
  const setDraftAnchor = useCommentStore((state) => state.setDraftAnchor);

  const setKeyboardConnectFromId = useCallback((nodeId) => {
    keyboardConnectFromIdRef.current = nodeId;
    setKeyboardConnectFromIdState(nodeId);
  }, []);

  const jumpToComment = useCallback((thread) => {
    const currentNodes = useCanvasStore.getState().nodes;
    const point = getThreadWorldPoint(thread, currentNodes);
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!point || !bounds) return;
    const viewport = useViewportStore.getState();
    setViewport({
      pan: {
        x: bounds.width / 2 - point.x * viewport.zoom,
        y: bounds.height / 2 - point.y * viewport.zoom,
      },
    });
    useCommentStore.getState().setSelectedThread(thread.threadId ?? thread.id);
  }, [setViewport]);

  useEffect(() => {
    onRegisterCommentJump?.(jumpToComment);
    return () => onRegisterCommentJump?.(null);
  }, [jumpToComment, onRegisterCommentJump]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Native wheel listener so zooming can preventDefault (React's is passive).
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const onWheel = (event) => {
      event.preventDefault();
      const viewport = useViewportStore.getState();
      const rect = element.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.004 : 0.0018));
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
      const graphX = (pointerX - viewport.pan.x) / viewport.zoom;
      const graphY = (pointerY - viewport.pan.y) / viewport.zoom;

      useViewportStore.getState().setViewport({
        zoom: nextZoom,
        pan: { x: pointerX - graphX * nextZoom, y: pointerY - graphY * nextZoom },
      });
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const toGraph = useCallback((clientX, clientY) => {
    const viewport = useViewportStore.getState();
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.pan.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.pan.y) / viewport.zoom,
    };
  }, []);

  useCursorBroadcast({ boardId, toGraph });

  const emitNodeUpdate = useCallback((nodeId, patch) => {
    emitRef.current({ type: 'node.update', nodeId, patch });
  }, []);

  const startNodeDrag = useCallback(
    (event, node) => {
      if (event.button !== 0) return;
      if (useCommentStore.getState().placementMode) {
        event.stopPropagation();
        const point = toGraph(event.clientX, event.clientY);
        useCommentStore.getState().setDraftAnchor({
          type: 'node',
          nodeId: node.id,
          offsetX: point.x - node.x,
          offsetY: point.y - node.y,
        });
        useCommentStore.getState().setPlacementMode(false);
        return;
      }
      event.stopPropagation();
      setSelected({ kind: 'node', id: node.id });
      if (readOnly) return;

      const point = toGraph(event.clientX, event.clientY);
      dragRef.current = {
        nodeId: node.id,
        offsetX: point.x - node.x,
        offsetY: point.y - node.y,
        moved: false,
        lastEmit: 0,
        lastPatch: null,
      };
    },
    [readOnly, setSelected, toGraph],
  );

  const handleGraphItemKeyDown = useCallback((event, item) => {
    if (isTextEntryTarget(event.target) || event.target !== event.currentTarget) return;

    const items = graphItemsRef.current;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = nextGraphItem(items, item, step);
      if (!next) return;
      setSelected({ kind: next.kind, id: next.id });
      requestAnimationFrame(() => {
        containerRef.current
          ?.querySelector(`[data-graph-item="${next.kind}:${next.id}"]`)
          ?.focus();
      });
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (keyboardConnectFromIdRef.current && item.kind === 'node') {
        const sourceId = keyboardConnectFromIdRef.current;
        if (sourceId === item.id) return;
        const edge = {
          id: createId('edge'),
          from: sourceId,
          to: item.id,
          label: '',
          kind: 'sync',
          description: '',
        };
        emitRef.current({ type: 'edge.create', edge });
        setKeyboardConnectFromId(null);
        setSelected({ kind: 'edge', id: edge.id });
        return;
      }
      setSelected({ kind: item.kind, id: item.id });
      return;
    }

    if (event.key.toLowerCase() === 'k' && item.kind === 'node' && !readOnly) {
      event.preventDefault();
      setSelected({ kind: 'node', id: item.id });
      setKeyboardConnectFromId(item.id);
    }
  }, [readOnly, setKeyboardConnectFromId, setSelected]);

  const startKeyboardConnect = useCallback((node) => {
    if (readOnly) return;
    setSelected({ kind: 'node', id: node.id });
    setKeyboardConnectFromId(node.id);
  }, [readOnly, setKeyboardConnectFromId, setSelected]);

  const startConnect = useCallback(
    (event, node) => {
      if (readOnly || event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      connectRef.current = { fromId: node.id, pointer: { x: node.x + node.width, y: node.y + node.height / 2 } };
      setSelected({ kind: 'node', id: node.id });
    },
    [readOnly, setSelected],
  );

  useEffect(() => {
    function handlePointerMove(event) {
      if (panRef.current) {
        useViewportStore.getState().setViewport({
          pan: {
            x: panRef.current.origin.x + (event.clientX - panRef.current.startX),
            y: panRef.current.origin.y + (event.clientY - panRef.current.startY),
          },
        });
        return;
      }

      if (dragRef.current) {
        const point = toGraph(event.clientX, event.clientY);
        const nextX = Math.round(point.x - dragRef.current.offsetX);
        const nextY = Math.round(point.y - dragRef.current.offsetY);
        dragRef.current.moved = true;
        dragRef.current.lastPatch = { x: nextX, y: nextY };

        // Queue one React/Zustand update for the next screen frame.
        if (dragFrameRef.current !== null) return;
        dragFrameRef.current = requestAnimationFrame(() => {
          dragFrameRef.current = null;
          if (!dragRef.current) return;
          const patch = dragRef.current.lastPatch;
          if (patch) {
            useCanvasStore.getState().patchNodeLocal(dragRef.current.nodeId, patch);
          }
        });

        const now = performance.now();
        if (now - dragRef.current.lastEmit > 90) {
          dragRef.current.lastEmit = now;
          emitNodeUpdate(dragRef.current.nodeId, { x: nextX, y: nextY });
        }
        return;
      }

      if (connectRef.current) {
        const point = toGraph(event.clientX, event.clientY);
        connectRef.current.pointer = point;
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest?.('[data-node-id]');
        const targetId = target?.getAttribute('data-node-id') ?? null;
        connectRef.current.targetId = targetId && targetId !== connectRef.current.fromId ? targetId : null;
        setTempLine({ fromId: connectRef.current.fromId, to: point, targetId: connectRef.current.targetId });
      }
    }

    function handlePointerUp() {
      if (panRef.current) {
        panRef.current = null;
      }

      if (dragRef.current) {
        const { nodeId, moved, lastPatch } = dragRef.current;
        dragRef.current = null;
        if (dragFrameRef.current !== null) {
          cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
        }
        if (lastPatch) {
          useCanvasStore.getState().patchNodeLocal(nodeId, lastPatch);
        }
        if (moved && lastPatch) emitNodeUpdate(nodeId, lastPatch);
      }

      if (connectRef.current) {
        const { fromId, targetId } = connectRef.current;
        connectRef.current = null;
        setTempLine(null);
        if (targetId && targetId !== fromId) {
          const edge = {
            id: createId('edge'),
            from: fromId,
            to: targetId,
            label: '',
            kind: 'sync',
            description: '',
          };
          emitRef.current({ type: 'edge.create', edge });
          setSelected({ kind: 'edge', id: edge.id });
        }
      }
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (dragFrameRef.current !== null) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    };
  }, [boardId, emitNodeUpdate, setSelected, toGraph]);

  const handleBackgroundPointerDown = (event) => {
    if (event.button !== 0) return;
    if (useCommentStore.getState().placementMode) {
      event.preventDefault();
      setDraftAnchor({ type: 'canvas', ...toGraph(event.clientX, event.clientY) });
      setPlacementMode(false);
      return;
    }
    setSelected(null);
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...useViewportStore.getState().pan },
    };
  };

  const handleCommentPlacementCapture = (event) => {
    if (!useCommentStore.getState().placementMode || event.button !== 0) return;
    if (event.target?.closest?.('[data-comment-ui], [data-comment-pin]')) return;
    const nodeId = event.target?.closest?.('[data-node-id]')?.getAttribute('data-node-id');
    const node = nodes.find((entry) => entry.id === nodeId);
    const point = toGraph(event.clientX, event.clientY);
    const anchor = node
      ? { type: 'node', nodeId: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y }
      : { type: 'canvas', x: point.x, y: point.y };

    event.preventDefault();
    event.stopPropagation();
    setDraftAnchor(anchor);
    setPlacementMode(false);
  };

  const addNode = useCallback(
    (type) => {
      if (readOnly) return;
      const state = useCanvasStore.getState();
      const viewport = useViewportStore.getState();
      const entry = catalogEntry(type);
      const width = type === 'sticky' ? 220 : 216;
      const height = type === 'sticky' ? 180 : 100;
      const centerX = (size.width / 2 - viewport.pan.x) / viewport.zoom - width / 2;
      const centerY = (size.height / 2 - viewport.pan.y) / viewport.zoom - height / 2;
      const cascade = (state.nodes.length % 5) * 22;
      const node = {
        id: createId('node'),
        type,
        label: entry.defaultLabel,
        x: Math.round(centerX + cascade),
        y: Math.round(centerY + cascade),
        width,
        height,
        description: '',
        entities: [],
      };
      emitRef.current({ type: 'node.create', node });
      setSelected({ kind: 'node', id: node.id });
    },
    [readOnly, setSelected, size.height, size.width],
  );

  const deleteSelected = useCallback(() => {
    const state = useCanvasStore.getState();
    if (readOnly || !state.selected) return;
    if (state.selected.kind === 'node') {
      emitRef.current({ type: 'node.delete', nodeId: state.selected.id });
    } else {
      emitRef.current({ type: 'edge.delete', edgeId: state.selected.id });
    }
    setSelected(null);
  }, [readOnly, setSelected]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isTextEntryTarget(document.activeElement)) return;
      if (isCommentShortcut(event, document.activeElement)) {
        event.preventDefault();
        const state = useCommentStore.getState();
        state.setPlacementMode(!state.placementMode);
        state.setDraftAnchor(null);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key === 'Escape') {
        setSelected(null);
        setKeyboardConnectFromId(null);
        useCommentStore.getState().setPlacementMode(false);
        useCommentStore.getState().setDraftAnchor(null);
        connectRef.current = null;
        setTempLine(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected, setKeyboardConnectFromId, setSelected]);

  function zoomBy(factor) {
    const viewport = useViewportStore.getState();
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
    const cx = size.width / 2;
    const cy = size.height / 2;
    const graphX = (cx - viewport.pan.x) / viewport.zoom;
    const graphY = (cy - viewport.pan.y) / viewport.zoom;
    setViewport({ zoom: nextZoom, pan: { x: cx - graphX * nextZoom, y: cy - graphY * nextZoom } });
  }

  function fitToContent() {
    const bounds = nodeBounds(nodes);
    if (!bounds) {
      setViewport({ zoom: 1, pan: { x: 0, y: 0 } });
      return;
    }
    const padding = 96;
    const graphWidth = Math.max(bounds.maxX - bounds.minX, 240);
    const graphHeight = Math.max(bounds.maxY - bounds.minY, 160);
    const nextZoom = Math.min(
      1.3,
      Math.max(MIN_ZOOM, Math.min((size.width - padding * 2) / graphWidth, (size.height - padding * 2) / graphHeight)),
    );
    setViewport({
      zoom: nextZoom,
      pan: {
        x: size.width / 2 - ((bounds.minX + bounds.maxX) / 2) * nextZoom,
        y: size.height / 2 - ((bounds.minY + bounds.maxY) / 2) * nextZoom,
      },
    });
  }

  return (
    <div className="relative flex min-w-0 flex-1">
      <Toolbar readOnly={readOnly} onAdd={addNode} onDelete={deleteSelected} hasSelection={Boolean(selected)} />

      {import.meta.env.DEV ? (
        <button
          type="button"
          onClick={runBoardBenchmark}
          className="absolute bottom-16 left-4 z-40 rounded-lg border border-cyan-400/30 bg-panel px-3 py-2 text-[11px] font-medium text-cyan-200 shadow-panel"
        >
          Run board benchmark
        </button>
      ) : null}

      <div
        ref={containerRef}
        role="region"
        aria-label="Architecture canvas"
        onPointerDownCapture={handleCommentPlacementCapture}
        onPointerDown={handleBackgroundPointerDown}
        className="relative flex-1 touch-none overflow-hidden canvas-grid"
        style={{ cursor: panRef.current ? 'grabbing' : placementMode ? 'crosshair' : 'default' }}
      >
        <EdgeLayer
          nodes={nodes}
          edges={edges}
          zoom={zoom}
          pan={pan}
          selected={selected}
          onSelect={(edgeId) => setSelected({ kind: 'edge', id: edgeId })}
          graphItemTabIndex={(edgeId, edgeIndex) => (selected?.kind === 'edge'
            ? selected.id === edgeId ? 0 : -1
            : !selected && nodes.length === 0 && edgeIndex === 0 ? 0 : -1)}
          onGraphItemKeyDown={handleGraphItemKeyDown}
        />

        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            boardId={boardId}
            zoom={zoom}
            pan={pan}
            selected={selected?.kind === 'node' && selected.id === node.id}
            readOnly={readOnly}
            onPointerDown={startNodeDrag}
            onStartConnect={startConnect}
            onKeyboardConnectStart={startKeyboardConnect}
            connectTargetId={tempLine?.targetId}
            graphItemTabIndex={selected?.kind === 'node'
              ? selected.id === node.id ? 0 : -1
              : !selected && node.id === nodes[0]?.id ? 0 : -1}
            onGraphItemKeyDown={handleGraphItemKeyDown}
          />
        ))}

        {tempLine ? (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {(() => {
              const from = nodes.find((node) => node.id === tempLine.fromId);
              if (!from) return null;
              const startX = (from.x + from.width) * zoom + pan.x;
              const startY = (from.y + from.height / 2) * zoom + pan.y;
              const endX = tempLine.to.x * zoom + pan.x;
              const endY = tempLine.to.y * zoom + pan.y;
              const bend = Math.max(60, Math.abs(endX - startX) * 0.4);
              return (
                <path
                  d={`M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                />
              );
            })()}
          </svg>
        ) : null}

        <PresenceLayer zoom={zoom} pan={pan} />
        <CommentLayer boardId={boardId} role={role} nodes={nodes} zoom={zoom} pan={pan} size={size} />

        {placementMode ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-lg border border-cyan-300/30 bg-panel/95 px-3 py-2 text-[11px] text-cyan-100 shadow-panel">
            Click the canvas or a node to place a comment · Esc to cancel
          </div>
        ) : null}

        {keyboardConnectFromId ? (
          <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-14 z-40 -translate-x-1/2 rounded-lg border border-cyan-300/30 bg-panel/95 px-3 py-2 text-[11px] text-cyan-100 shadow-panel">
            Choose a target component and press Enter · Esc to cancel
          </div>
        ) : null}

        {nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <div className="max-w-sm rounded-2xl border border-dashed border-line bg-panel/70 p-6 text-center backdrop-blur">
              <MousePointer2 className="mx-auto h-5 w-5 text-cyan-300" />
              <h2 className="mt-3 text-sm font-semibold text-slate-100">Start with the system shape</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Add a client, an API gateway and a service from the left, then drag the handle on the
                right of a component to connect it. Scroll to zoom, drag the background to pan.
              </p>
            </div>
          </div>
        ) : null}

        {readOnly ? (
          <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
            <Lock className="h-3 w-3" /> Read-only access
          </div>
        ) : null}

        <div data-comment-ui="true" className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl border border-line bg-panel/90 p-1 shadow-panel backdrop-blur">
          <button
            type="button"
            onClick={() => {
              setDraftAnchor(null);
              setPlacementMode(!placementMode);
            }}
            className={`grid h-8 w-8 place-items-center rounded-lg transition ${placementMode ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
            aria-label={placementMode ? 'Cancel comment placement' : 'Place a comment'}
            title="Place a comment (C)"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-line" />
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.2)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-[11px] tabular-nums text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-line" />
          <button
            type="button"
            onClick={fitToContent}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Fit to content"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 hidden rounded-lg border border-line bg-panel/80 px-2.5 py-1.5 text-[10px] text-slate-500 sm:block">
          Drag background to pan · Scroll to zoom · Del to remove
        </div>
      </div>
    </div>
  );
}
