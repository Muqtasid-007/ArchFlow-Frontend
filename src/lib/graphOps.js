/** Pure application of a canvas operation, mirroring the server rules. */
export function applyGraphOp(graph, op) {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  switch (op.type) {
    case 'node.create':
      if (nodes.some((node) => node.id === op.node.id)) return { nodes, edges };
      return { nodes: [...nodes, { ...op.node }], edges };

    case 'node.update':
      return {
        nodes: nodes.map((node) => (node.id === op.nodeId ? { ...node, ...op.patch } : node)),
        edges,
      };

    case 'node.delete':
      return {
        nodes: nodes.filter((node) => node.id !== op.nodeId),
        edges: edges.filter((edge) => edge.from !== op.nodeId && edge.to !== op.nodeId),
      };

    case 'edge.create':
      if (edges.some((edge) => edge.id === op.edge.id)) return { nodes, edges };
      return { nodes, edges: [...edges, { ...op.edge }] };

    case 'edge.update':
      return {
        nodes,
        edges: edges.map((edge) => (edge.id === op.edgeId ? { ...edge, ...op.patch } : edge)),
      };

    case 'edge.delete':
      return { nodes, edges: edges.filter((edge) => edge.id !== op.edgeId) };

    default:
      return { nodes, edges };
  }
}

export const createId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Cubic bezier between two nodes, anchored on facing edges. */
export function edgePath(from, to, zoom, pan) {
  const fromCenter = {
    x: (from.x + from.width / 2) * zoom + pan.x,
    y: (from.y + from.height / 2) * zoom + pan.y,
  };
  const toCenter = {
    x: (to.x + to.width / 2) * zoom + pan.x,
    y: (to.y + to.height / 2) * zoom + pan.y,
  };

  const fromRight = fromCenter.x <= toCenter.x;
  const start = {
    x: (fromRight ? from.x + from.width : from.x) * zoom + pan.x,
    y: fromCenter.y,
  };
  const end = {
    x: (fromRight ? to.x : to.x + to.width) * zoom + pan.x,
    y: toCenter.y,
  };

  const bend = Math.max(56, distance(start, end) * 0.32) * (fromRight ? 1 : -1);
  const c1 = { x: start.x + bend, y: start.y };
  const c2 = { x: end.x - bend, y: end.y };
  const midpoint = {
    x: (start.x + 3 * c1.x + 3 * c2.x + end.x) / 8,
    y: (start.y + 3 * c1.y + 3 * c2.y + end.y) / 8,
  };

  return {
    d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
    midpoint,
  };
}

export function nodeBounds(nodes) {
  if (!nodes.length) return null;
  return nodes.reduce(
    (bounds, node) => ({
      minX: Math.min(bounds.minX, node.x),
      minY: Math.min(bounds.minY, node.y),
      maxX: Math.max(bounds.maxX, node.x + (node.width ?? 208)),
      maxY: Math.max(bounds.maxY, node.y + (node.height ?? 96)),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}
