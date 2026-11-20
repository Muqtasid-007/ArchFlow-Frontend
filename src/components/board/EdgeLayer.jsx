import { edgePath } from '../../lib/graphOps.js';
import { EDGE_KINDS } from '../../lib/nodeCatalog.js';
import { memo } from 'react';

function labelWidth(text) {
  return Math.max(38, text.length * 6.2 + 14);
}

export const EdgeLayer = memo(function EdgeLayer({
  nodes,
  edges,
  zoom,
  pan,
  selected,
  onSelect,
  graphItemTabIndex,
  onGraphItemKeyDown,
}) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="false">
      <defs>
        {Object.entries(EDGE_KINDS).map(([kind, config]) => (
          <marker
            key={kind}
            id={`archflow-arrow-${kind}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={config.color} />
          </marker>
        ))}
      </defs>

      {edges.map((edge, edgeIndex) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;

        const { d, midpoint } = edgePath(from, to, zoom, pan);
        const config = EDGE_KINDS[edge.kind] ?? EDGE_KINDS.sync;
        const isSelected = selected?.kind === 'edge' && selected.id === edge.id;
        const label = edge.label?.trim();

        return (
          <g key={edge.id}>
            <path
              data-graph-item={`edge:${edge.id}`}
              role="button"
              tabIndex={graphItemTabIndex?.(edge.id, edgeIndex) ?? -1}
              aria-label={`Connection from ${from.label} to ${to.label}${label ? `, label ${label}` : ''}, ${config.label}`}
              aria-keyshortcuts="Enter Space Delete ArrowLeft ArrowRight ArrowUp ArrowDown"
              className="edge-path-hit-area"
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(edge.id);
              }}
              onKeyDown={(event) => onGraphItemKeyDown?.(event, { kind: 'edge', id: edge.id })}
            >
              <title>
                {`${from.label} → ${to.label} (${config.label})`}
              </title>
            </path>

            <path
              d={d}
              fill="none"
              stroke={isSelected ? '#22d3ee' : config.color}
              strokeWidth={isSelected ? 2.6 : 1.8}
              strokeDasharray={config.dash}
              strokeLinecap="round"
              opacity={isSelected ? 1 : 0.85}
              markerEnd={`url(#archflow-arrow-${edge.kind ?? 'sync'})`}
              style={{ pointerEvents: 'none' }}
            />

            {label ? (
              <g transform={`translate(${midpoint.x}, ${midpoint.y})`} style={{ pointerEvents: 'none' }}>
                <rect
                  x={-labelWidth(label) / 2}
                  y={-9}
                  width={labelWidth(label)}
                  height={18}
                  rx={6}
                  fill="#0b1322"
                  stroke={isSelected ? '#22d3ee' : '#1d2942'}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill={isSelected ? '#a5f3fc' : '#94a3b8'}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
});
