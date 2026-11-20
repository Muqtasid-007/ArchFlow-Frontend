import { useCanvasStore } from '../store/canvasStore.js';

function waitForAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function measureAverageFps(frames = 60) {
  const frameTimes = [];

  for (let index = 0; index < frames; index += 1) {
    const startedAt = performance.now();
    await waitForAnimationFrame();
    frameTimes.push(performance.now() - startedAt);
  }

  const averageFrameMs =
    frameTimes.reduce((total, frameMs) => total + frameMs, 0) / frameTimes.length;
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const lowIndex = Math.floor(sorted.length * 0.99);
  const lowFrameMs = sorted[lowIndex] ?? sorted.at(-1) ?? 16.67;

  return {
    averageFps: 1000 / averageFrameMs,
    lowFps: 1000 / lowFrameMs,
  };
}

export async function runBoardBenchmark() {
  const store = useCanvasStore.getState();
  const oldNodes = store.nodes;
  const oldEdges = store.edges;
  const counts = [500, 2000, 5000];
  const results = [];

  console.log('[board benchmark] Starting before/after benchmark');

  for (const count of counts) {
    const columns = 50;
    const nodes = Array.from({ length: count }, (_, index) => ({
      id: `bench-${index}`,
      type: 'service',
      label: `Benchmark ${index}`,
      x: (index % columns) * 260,
      y: Math.floor(index / columns) * 150,
      width: 216,
      height: 100,
      description: '',
      entities: [],
    }));

    const edges = nodes.slice(1).map((node, index) => ({
      id: `bench-edge-${index}`,
      from: nodes[index].id,
      to: node.id,
      label: '',
      kind: 'sync',
      description: '',
    }));

    const start = performance.now();
    useCanvasStore.setState({ nodes, edges, revision: 1 });
    await waitForAnimationFrame();
    const renderTimeMs = performance.now() - start;

    const fps = await measureAverageFps(60);
    results.push({
      nodes: count,
      edges: edges.length,
      renderTimeMs: Math.round(renderTimeMs),
      averageFps: Math.round(fps.averageFps),
      lowFps: Math.round(fps.lowFps),
      domNodesBefore: document.querySelectorAll('[data-node-id]').length,
      domEdgesBefore: document.querySelectorAll('.edge-path-hit-area').length,
    });

    console.table(results);
  }

  useCanvasStore.setState({
    nodes: oldNodes,
    edges: oldEdges,
  });
  await waitForAnimationFrame();

  console.log('[board benchmark] Restored the original board');
  console.table(results);
  return results;
}
