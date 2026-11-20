function validateViewport(viewport) {
  if (!Number.isFinite(viewport?.zoom) || viewport.zoom <= 0) {
    throw new RangeError('Viewport zoom must be a positive number');
  }
}

/** Convert a board-world point to the same screen space used by canvas nodes. */
export function worldToScreen(point, viewport) {
  validateViewport(viewport);
  return {
    x: point.x * viewport.zoom + (viewport.pan?.x ?? 0),
    y: point.y * viewport.zoom + (viewport.pan?.y ?? 0),
  };
}

/** Convert a screen-space point back to board-world coordinates. */
export function screenToWorld(point, viewport) {
  validateViewport(viewport);
  return {
    x: (point.x - (viewport.pan?.x ?? 0)) / viewport.zoom,
    y: (point.y - (viewport.pan?.y ?? 0)) / viewport.zoom,
  };
}

/** Resolve comment anchors into visible, fixed-size screen positions. */
export function getCommentPinPositions(threads, nodes, viewport, canvasSize, pinSize = 28) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const margin = pinSize / 2;
  const positions = [];

  for (const thread of threads) {
    const anchor = thread.anchor;
    const worldPoint = getThreadWorldPoint(thread, nodes, nodeById);
    let orphaned = Boolean(thread.orphaned || thread.orphanedAt);
    if (!worldPoint) continue;
    if (anchor?.type === 'node') orphaned = !nodeById.has(anchor.nodeId);
    const screenPoint = worldToScreen(worldPoint, viewport);
    const inside = screenPoint.x >= -margin
      && screenPoint.x <= canvasSize.width + margin
      && screenPoint.y >= -margin
      && screenPoint.y <= canvasSize.height + margin;
    if (inside) positions.push({ thread, ...screenPoint, orphaned });
  }

  return positions;
}

/** Find the current world position for a comment so panels can jump to its pin. */
export function getThreadWorldPoint(thread, nodes, nodeById = new Map(nodes.map((node) => [node.id, node]))) {
  const anchor = thread?.anchor;
  if (anchor?.type === 'canvas' && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
    return { x: anchor.x, y: anchor.y };
  }
  if (anchor?.type !== 'node') return null;

  const node = nodeById.get(anchor.nodeId);
  if (node) {
    // Add offsets after reading the current node position so pins follow moves.
    return { x: node.x + anchor.offsetX, y: node.y + anchor.offsetY };
  }
  if (Number.isFinite(thread.lastWorldX) && Number.isFinite(thread.lastWorldY)) {
    return { x: thread.lastWorldX, y: thread.lastWorldY };
  }
  return null;
}
