import clsx from 'clsx';
import { memo } from 'react';
import { catalogEntry } from '../../lib/nodeCatalog.js';
import { StickyNote } from './StickyNote.jsx';

export const NodeCard = memo(function NodeCard({
  node,
  zoom,
  pan,
  selected,
  readOnly,
  onPointerDown,
  onStartConnect,
  onKeyboardConnectStart,
  connectTargetId,
  boardId,
  graphItemTabIndex = -1,
  onGraphItemKeyDown,
}) {
  const entry = catalogEntry(node.type);
  const Icon = entry.icon;
  const left = node.x * zoom + pan.x;
  const top = node.y * zoom + pan.y;
  const width = (node.width ?? 208) * zoom;
  const height = (node.height ?? 96) * zoom;
  const isTarget = connectTargetId === node.id;
  const entities = node.entities ?? [];

  if (node.type === 'sticky') {
    return (
      <div
        data-node-id={node.id}
        data-graph-item={`node:${node.id}`}
        role="group"
        aria-label={`${node.label}, ${entry.label}`}
        aria-description={readOnly
          ? 'Press Enter or Space to select. Use arrow keys to move through components and connections.'
          : 'Press Enter or Space to select. Press K, then focus another component and press Enter to connect. Use arrow keys to move through components and connections.'}
        aria-keyshortcuts={readOnly ? 'Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown' : 'Enter Space K ArrowLeft ArrowRight ArrowUp ArrowDown'}
        tabIndex={graphItemTabIndex}
        onKeyDown={(event) => onGraphItemKeyDown?.(event, { kind: 'node', id: node.id })}
        onPointerDown={(event) => onPointerDown(event, node)}
        className={clsx(
          'group absolute select-none rounded-2xl border bg-amber-200 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        )}
        style={{
          left,
          top,
          width,
          height,
          borderColor: selected || isTarget ? entry.accent : 'rgba(250,204,21,0.45)',
          zIndex: selected ? 20 : 10,
        }}
      >
        <div className="h-full w-full p-2">
          <StickyNote
            boardId={boardId}
            nodeId={node.id}
            readOnly={readOnly}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-node-id={node.id}
      data-graph-item={`node:${node.id}`}
      role="group"
      aria-label={`${node.label}, ${entry.label}`}
      aria-description={readOnly
        ? 'Press Enter or Space to select. Use arrow keys to move through components and connections.'
        : 'Press Enter or Space to select. Press K, then focus another component and press Enter to connect. Use arrow keys to move through components and connections.'}
      aria-keyshortcuts={readOnly ? 'Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown' : 'Enter Space K ArrowLeft ArrowRight ArrowUp ArrowDown'}
      tabIndex={graphItemTabIndex}
      onKeyDown={(event) => onGraphItemKeyDown?.(event, { kind: 'node', id: node.id })}
      onPointerDown={(event) => onPointerDown(event, node)}
      className={clsx(
        'group absolute select-none rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      )}
      style={{
        left,
        top,
        width,
        height,
        borderColor: selected || isTarget ? entry.accent : 'rgba(148,163,184,0.20)',
        background: 'linear-gradient(155deg, rgba(19,30,50,0.97), rgba(9,14,26,0.97))',
        boxShadow: selected
          ? `0 0 0 1px ${entry.accent}, 0 22px 50px -24px rgba(0,0,0,0.95)`
          : '0 18px 36px -26px rgba(0,0,0,0.9)',
        zIndex: selected ? 20 : 10,
        outline: isTarget ? `2px dashed ${entry.accent}` : 'none',
        outlineOffset: 4,
      }}
    >
      <div
        className="flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl p-3.5 pointer-events-none"
        style={{
          width: node.width ?? 208,
          height: node.height ?? 96,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="flex items-start gap-2.5">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border"
            style={{ backgroundColor: entry.tint, borderColor: `${entry.accent}33`, color: entry.accent }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-100">{node.label}</p>
            <p
              className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-wider"
              style={{ color: entry.accent }}
            >
              {entry.label}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {entities.slice(0, 2).map((entity) => (
              <span
                key={entity}
                className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-400"
              >
                {entity}
              </span>
            ))}
            {entities.length > 2 ? (
              <span className="rounded border border-line px-1.5 py-0.5 text-[9px] text-slate-500">
                +{entities.length - 2}
              </span>
            ) : null}
          </div>
          {node.description ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full opacity-70"
              style={{ backgroundColor: entry.accent }}
              title={node.description}
            />
          ) : null}
        </div>
      </div>

      {!readOnly ? (
        <button
          type="button"
          title="Drag to another component to connect"
          aria-label={`Connect from ${node.label}`}
          onPointerDown={(event) => onStartConnect(event, node)}
          onClick={(event) => {
            // Pointer down begins the drag; a keyboard-generated click activates it with Enter.
            if (event.detail === 0) onKeyboardConnectStart?.(node);
          }}
          className="absolute grid place-items-center rounded-full border border-slate-500/60 bg-[#0b1424] text-slate-300 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:border-cyan-300 hover:text-cyan-300"
          style={{
            width: 14,
            height: 14,
            right: -7,
            top: height / 2 - 7,
            cursor: 'crosshair',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </button>
      ) : null}
    </div>
  );
});
