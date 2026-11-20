import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Info, Link2, Sparkles, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore.js';
import { EDGE_KINDS, NODE_CATALOG, catalogEntry } from '../../lib/nodeCatalog.js';
import { roleLabel } from '../../lib/format.js';
import { Badge, Button, Field, Input, Select, Textarea } from '../ui/index.jsx';

const ENTITY_TYPES = new Set(['database', 'storage']);

export function InspectorTab({ board, role, readOnly, emitOp, onTabChange }) {
  const selectedId = useCanvasStore((state) => state.selected?.id) ?? null;
  const selectedKind = useCanvasStore((state) => state.selected?.kind) ?? null;
  const selected = selectedKind ? { kind: selectedKind, id: selectedId } : null;
  const selectedNode = useCanvasStore((state) =>
    state.selected?.kind === 'node'
      ? state.nodes.find((node) => node.id === state.selected.id) ?? null
      : null,
  );
  const selectedEdge = useCanvasStore((state) =>
    state.selected?.kind === 'edge'
      ? state.edges.find((edge) => edge.id === state.selected.id) ?? null
      : null,
  );
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setSelected = useCanvasStore((state) => state.setSelected);
  const patchNodeLocal = useCanvasStore((state) => state.patchNodeLocal);

  const node = selectedNode;
  const edge = selectedEdge;
  const [entitiesText, setEntitiesText] = useState('');

  useEffect(() => {
    if (node) setEntitiesText((node.entities ?? []).join(', '));
  }, [node?.id, node?.entities]);

  const nodeMap = useMemo(() => new Map(nodes.map((entry) => [entry.id, entry])), [nodes]);

  if (!node && !edge) {
    return (
      <div className="space-y-5 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-100">{board?.name}</h2>
          <p className="text-xs leading-relaxed text-slate-400">{board?.description || 'No description yet.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-line bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Your role</p>
            <p className="mt-1 font-medium text-slate-200">{roleLabel(role)}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Revision</p>
            <p className="mt-1 font-medium text-slate-200">#{board?.revision ?? 1}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Components</p>
            <p className="mt-1 font-medium text-slate-200">{nodes.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Connections</p>
            <p className="mt-1 font-medium text-slate-200">{edges.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white/[0.02] p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
            <Info className="h-3.5 w-3.5 text-cyan-300" /> How to work the canvas
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-400">
            <li>Add components from the left toolbar.</li>
            <li>Drag a component to move it; grab the right dot and drop on another to connect.</li>
            <li>Select a component or connection to edit its properties here.</li>
            <li>Scroll to zoom, drag the background to pan, press Delete to remove.</li>
            <li>Keyboard: Tab into the diagram, use arrow keys to move, and Enter to select{readOnly ? '.' : '; press K on a component, then Enter on another to connect.'}</li>
          </ul>
        </div>

        <Button variant="secondary" className="w-full" onClick={() => onTabChange('ai')}>
          <Sparkles className="h-4 w-4 text-cyan-300" /> Review this architecture
        </Button>
      </div>
    );
  }

  if (node) {
    const entry = catalogEntry(node.type);
    const Icon = entry.icon;
    const outgoing = edges.filter((item) => item.from === node.id);
    const incoming = edges.filter((item) => item.to === node.id);

    const updateLocal = (patch) => patchNodeLocal(node.id, patch);
    const commit = (patch) => emitOp({ type: 'node.update', nodeId: node.id, patch });
    const commitEntities = () => {
      const entities = entitiesText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 10);
      updateLocal({ entities });
      commit({ entities });
    };

    return (
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
            style={{ backgroundColor: entry.tint, borderColor: `${entry.accent}44`, color: entry.accent }}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{node.label}</p>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: entry.accent }}>
              {entry.label}
            </p>
          </div>
        </div>

        <Field label="Component type">
          <Select
            value={node.type}
            disabled={readOnly}
            onChange={(event) => {
              const type = event.target.value;
              updateLocal({ type });
              commit({ type });
            }}
          >
            {Object.entries(NODE_CATALOG).map(([value, catalog]) => (
              <option key={value} value={value}>
                {catalog.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Name">
          <Input
            value={node.label}
            disabled={readOnly}
            maxLength={80}
            onChange={(event) => updateLocal({ label: event.target.value })}
            onBlur={(event) => {
              const label = event.target.value.trim();
              if (!label) {
                updateLocal({ label: entry.defaultLabel });
                commit({ label: entry.defaultLabel });
                return;
              }
              commit({ label });
            }}
          />
        </Field>

        <Field label="Description" hint="optional">
          <Textarea
            value={node.description ?? ''}
            disabled={readOnly}
            maxLength={500}
            placeholder="What is this component responsible for?"
            onChange={(event) => updateLocal({ description: event.target.value })}
            onBlur={(event) => commit({ description: event.target.value })}
          />
        </Field>

        {ENTITY_TYPES.has(node.type) ? (
          <Field label="Data entities" hint="comma separated">
            <Input
              value={entitiesText}
              disabled={readOnly}
              placeholder="Users, Orders, Payments"
              onChange={(event) => setEntitiesText(event.target.value)}
              onBlur={commitEntities}
            />
          </Field>
        ) : null}

        <div className="space-y-2 border-t border-line/70 pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            <Link2 className="h-3 w-3" /> Connections ({outgoing.length + incoming.length})
          </p>
          {incoming.length + outgoing.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              Not connected yet. Drag from the dot on this component to another one.
            </p>
          ) : (
            <ul className="space-y-1">
              {incoming.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected({ kind: 'edge', id: item.id })}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
                  >
                    <ArrowRight className="h-3 w-3 rotate-180 text-slate-600" />
                    {nodeMap.get(item.from)?.label ?? 'Unknown'}
                    {item.label ? <span className="text-slate-600">· {item.label}</span> : null}
                  </button>
                </li>
              ))}
              {outgoing.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected({ kind: 'edge', id: item.id })}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
                  >
                    <ArrowRight className="h-3 w-3 text-slate-600" />
                    {nodeMap.get(item.to)?.label ?? 'Unknown'}
                    {item.label ? <span className="text-slate-600">· {item.label}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!readOnly ? (
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={() => {
              emitOp({ type: 'node.delete', nodeId: node.id });
              setSelected(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete component
          </Button>
        ) : null}
      </div>
    );
  }

  const from = nodeMap.get(edge.from);
  const to = nodeMap.get(edge.to);

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-100">Connection</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5">
            {from?.label ?? 'Unknown'}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-600" />
          <span className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5">
            {to?.label ?? 'Unknown'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="From">
          <Select
            value={edge.from}
            disabled={readOnly}
            onChange={(event) => {
              const value = event.target.value;
              if (value === edge.to) return;
              emitOp({ type: 'edge.update', edgeId: edge.id, patch: { from: value } });
            }}
          >
            {nodes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="To">
          <Select
            value={edge.to}
            disabled={readOnly}
            onChange={(event) => {
              const value = event.target.value;
              if (value === edge.from) return;
              emitOp({ type: 'edge.update', edgeId: edge.id, patch: { to: value } });
            }}
          >
            {nodes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Flow type">
        <Select
          value={edge.kind}
          disabled={readOnly}
          onChange={(event) => emitOp({ type: 'edge.update', edgeId: edge.id, patch: { kind: event.target.value } })}
        >
          {Object.entries(EDGE_KINDS).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Label" hint="e.g. payment.captured">
        <Input
          defaultValue={edge.label ?? ''}
          disabled={readOnly}
          maxLength={80}
          placeholder="What flows across this connection?"
          onBlur={(event) => emitOp({ type: 'edge.update', edgeId: edge.id, patch: { label: event.target.value } })}
        />
      </Field>

      <Field label="Notes" hint="optional">
        <Textarea
          defaultValue={edge.description ?? ''}
          disabled={readOnly}
          maxLength={500}
          onBlur={(event) => emitOp({ type: 'edge.update', edgeId: edge.id, patch: { description: event.target.value } })}
        />
      </Field>

      <div className="flex items-center gap-2">
        <Badge tone="neutral">#{edge.id}</Badge>
        <span className="text-[10px] text-slate-500">Selection can be removed with Delete.</span>
      </div>

      {!readOnly ? (
        <Button
          variant="danger"
          size="sm"
          className="w-full"
          onClick={() => {
            emitOp({ type: 'edge.delete', edgeId: edge.id });
            setSelected(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete connection
        </Button>
      ) : null}
    </div>
  );
}
