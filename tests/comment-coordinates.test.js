import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommentPinPositions,
  getThreadWorldPoint,
  screenToWorld,
  worldToScreen,
} from '../src/lib/commentCoordinates.js';
import { filterThreadsByState, useCommentStore } from '../src/store/commentStore.js';
import { isCommentShortcut, isTextEntryTarget } from '../src/lib/commentPlacement.js';
import { nextGraphItem } from '../src/lib/graphKeyboard.js';

test('world and screen coordinates use the canvas pan and zoom formulas', () => {
  const viewport = { zoom: 2, pan: { x: 30, y: -10 } };
  assert.deepEqual(worldToScreen({ x: 40, y: 25 }, viewport), { x: 110, y: 40 });
  assert.deepEqual(screenToWorld({ x: 110, y: 40 }, viewport), { x: 40, y: 25 });
  console.log('[comment coordinates test] World/screen conversion matches canvas pan and zoom');
});

test('world and screen conversions round-trip across several zoom levels', () => {
  for (const zoom of [0.25, 0.5, 1, 1.75, 2.4]) {
    const viewport = { zoom, pan: { x: -132.5, y: 88.25 } };
    const world = { x: 123.75, y: -48.5 };
    const roundTrip = screenToWorld(worldToScreen(world, viewport), viewport);
    assert.ok(Math.abs(roundTrip.x - world.x) < 1e-9);
    assert.ok(Math.abs(roundTrip.y - world.y) < 1e-9);
  }
  assert.throws(() => worldToScreen({ x: 0, y: 0 }, { zoom: 0, pan: { x: 0, y: 0 } }), /positive number/);
  console.log('[comment coordinates test] Round-trip stays accurate at all supported zoom levels');
});

test('node-attached pins follow node movement and orphan pins use their last world point', () => {
  const thread = {
    id: 'node-thread',
    anchor: { type: 'node', nodeId: 'node-1', offsetX: 10, offsetY: -5 },
  };
  const viewport = { zoom: 2, pan: { x: 20, y: 10 } };
  const first = getCommentPinPositions(
    [thread], [{ id: 'node-1', x: 100, y: 50 }], viewport, { width: 400, height: 300 },
  );
  assert.deepEqual({ x: first[0].x, y: first[0].y }, { x: 240, y: 100 });

  const moved = getCommentPinPositions(
    [thread], [{ id: 'node-1', x: 120, y: 70 }], viewport, { width: 400, height: 300 },
  );
  assert.deepEqual({ x: moved[0].x, y: moved[0].y }, { x: 280, y: 140 });

  const orphan = getCommentPinPositions(
    [{ ...thread, lastWorldX: 140, lastWorldY: 80, orphanedAt: new Date() }],
    [], viewport, { width: 400, height: 300 },
  );
  assert.equal(orphan.length, 1);
  assert.equal(orphan[0].orphaned, true);
  assert.deepEqual({ x: orphan[0].x, y: orphan[0].y }, { x: 300, y: 170 });
  console.log('[comment layer test] Node pins follow moves and orphan pins retain their last position');
});

test('comment pins outside the visible canvas are culled', () => {
  const threads = [
    { id: 'visible', anchor: { type: 'canvas', x: 20, y: 25 } },
    { id: 'outside', anchor: { type: 'canvas', x: -100, y: 25 } },
  ];
  const visible = getCommentPinPositions(
    threads,
    [],
    { zoom: 1, pan: { x: 0, y: 0 } },
    { width: 100, height: 100 },
  );
  assert.deepEqual(visible.map(({ thread }) => thread.id), ['visible']);
  console.log('[comment layer test] Offscreen pins were culled from the canvas layer');
});

test('jump coordinates use the current node location or the orphan fallback', () => {
  const nodeThread = {
    anchor: { type: 'node', nodeId: 'node-1', offsetX: 15, offsetY: 25 },
    lastWorldX: 1,
    lastWorldY: 2,
  };
  assert.deepEqual(getThreadWorldPoint(nodeThread, [{ id: 'node-1', x: 100, y: 200 }]), { x: 115, y: 225 });
  assert.deepEqual(getThreadWorldPoint(nodeThread, []), { x: 1, y: 2 });
  assert.deepEqual(getThreadWorldPoint({ anchor: { type: 'canvas', x: 9, y: 12 } }, []), { x: 9, y: 12 });
  console.log('[comment panel test] Jump target follows its node and falls back for orphan threads');
});

test('comment store upserts threads and replies without duplicate socket entries', () => {
  const store = useCommentStore.getState();
  store.clearBoardComments();
  store.upsertThread({ id: 'thread-1', text: 'First version', resolved: false });
  store.upsertThread({ id: 'thread-1', text: 'Updated version', resolved: true });
  store.setReplies('thread-1', [{ id: 'reply-1', text: 'Hello' }], 'next');
  store.upsertReply('thread-1', { id: 'reply-1', text: 'Hello again' });
  store.upsertReply('thread-1', { id: 'reply-2', text: 'Second reply' });
  store.setSelectedThread('thread-1');
  store.setFilter('resolved');

  const current = useCommentStore.getState();
  assert.equal(current.threads.length, 1);
  assert.equal(current.threads[0].text, 'Updated version');
  assert.equal(current.threads[0].resolved, true);
  assert.deepEqual(current.repliesByThread['thread-1'].items.map((reply) => reply.id), ['reply-1', 'reply-2']);
  assert.equal(current.repliesByThread['thread-1'].nextCursor, 'next');
  assert.equal(current.selectedThreadId, 'thread-1');
  assert.equal(current.filter, 'resolved');
  console.log('[comment store test] Thread and reply updates are idempotent and filters persist');
  useCommentStore.getState().clearBoardComments();
});

test('C toggles comment placement except while typing or using a modified shortcut', () => {
  const key = { key: 'c', ctrlKey: false, metaKey: false, altKey: false, repeat: false };
  assert.equal(isCommentShortcut(key, { tagName: 'DIV', isContentEditable: false }), true);
  assert.equal(isCommentShortcut(key, { tagName: 'INPUT' }), false);
  assert.equal(isCommentShortcut(key, { tagName: 'TEXTAREA' }), false);
  assert.equal(isCommentShortcut(key, { tagName: 'DIV', isContentEditable: true }), false);
  assert.equal(isTextEntryTarget({ tagName: 'INPUT' }), true);
  assert.equal(isTextEntryTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTextEntryTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isCommentShortcut({ ...key, ctrlKey: true }, { tagName: 'DIV' }), false);
  console.log('[comment placement test] C shortcut is ignored in inputs, textareas, editable areas, and modified keys');
});

test('keyboard graph navigation moves through nodes and edges in both directions', () => {
  const items = [
    { kind: 'node', id: 'n1' },
    { kind: 'node', id: 'n2' },
    { kind: 'edge', id: 'e1' },
  ];
  assert.deepEqual(nextGraphItem(items, items[0], 1), items[1]);
  assert.deepEqual(nextGraphItem(items, items[2], 1), items[0]);
  assert.deepEqual(nextGraphItem(items, items[0], -1), items[2]);
  assert.equal(nextGraphItem(items, { kind: 'node', id: 'missing' }, 1), null);
  console.log('[keyboard accessibility test] Arrow navigation cycles through graph objects in order');
});

test('Open and Resolved filters divide the thread list correctly', () => {
  const threads = [{ id: 'open-1', resolved: false }, { id: 'resolved-1', resolved: true }];
  assert.deepEqual(filterThreadsByState(threads, 'open').map((thread) => thread.id), ['open-1']);
  assert.deepEqual(filterThreadsByState(threads, 'resolved').map((thread) => thread.id), ['resolved-1']);
  console.log('[comment panel test] Open and Resolved filters return the matching threads');
});
