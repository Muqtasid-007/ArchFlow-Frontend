import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { getBoardSocket } from '../../lib/socket.js';

function toUint8Array(update) {
  if (update instanceof ArrayBuffer) return new Uint8Array(update);
  if (update?.buffer instanceof ArrayBuffer) return Uint8Array.from(update);
  if (Array.isArray(update)) return Uint8Array.from(update);
  return null;
}

export function StickyNote({ boardId, nodeId, readOnly }) {
  const textareaRef = useRef(null);
  const [doc, setDoc] = useState(() => new Y.Doc());
  const text = doc.getText('text');

  useEffect(() => {
    const socket = getBoardSocket();

    function applyRemoteUpdate(update) {
      const bytes = toUint8Array(update);
      if (!bytes) return;
      Y.applyUpdate(doc, bytes, 'remote');
      console.log('[sticky] Applied remote Yjs update', {
        boardId,
        nodeId,
        bytes: bytes.byteLength,
      });
    }

    function handleJoin(response) {
      if (!response?.ok) {
        console.log('[sticky] Join rejected', response?.error);
        return;
      }
      applyRemoteUpdate(response.update);
      console.log('[sticky] Joined Y.Doc', { boardId, nodeId });
    }

    function handleUpdate({ boardId: updateBoardId, nodeId: updateNodeId, update }) {
      if (updateBoardId !== boardId || updateNodeId !== nodeId) return;
      applyRemoteUpdate(update);
    }

    function handleResync({ boardId: resyncBoardId }) {
      if (resyncBoardId !== boardId) return;
      // A fresh document drops any pre-restore text before requesting server state.
      setDoc(new Y.Doc());
    }

    function handleTextUpdate(update, origin) {
      if (origin === 'remote') return;
      socket.emit('sticky:update', { boardId, nodeId, update }, (response) => {
        if (!response?.ok) console.log('[sticky] Update rejected', response?.error);
      });

      console.log('[sticky] Sent Yjs update', {
        boardId,
        nodeId,
        bytes: update.byteLength,
      });
    }

    socket.on('sticky:update', handleUpdate);
    socket.on('sticky:resync', handleResync);
    doc.on('update', handleTextUpdate);
    socket.emit('sticky:join', { boardId, nodeId }, handleJoin);

    return () => {
      socket.off('sticky:update', handleUpdate);
      socket.off('sticky:resync', handleResync);
      doc.off('update', handleTextUpdate);
      doc.destroy();
    };
  }, [boardId, nodeId, doc]);

  useEffect(() => {
    function updateTextarea() {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (textarea.value !== text.toString()) textarea.value = text.toString();
    }

    updateTextarea();
    text.observe(updateTextarea);
    return () => text.unobserve(updateTextarea);
  }, [text]);

  function handleTextChange(event) {
    if (readOnly) return;
    const textarea = event.target;
    const nextValue = textarea.value;
    const oldValue = text.toString();

    let start = 0;
    while (
      start < oldValue.length
      && start < nextValue.length
      && oldValue[start] === nextValue[start]
    ) start += 1;

    let oldEnd = oldValue.length;
    let nextEnd = nextValue.length;
    while (
      oldEnd > start
      && nextEnd > start
      && oldValue[oldEnd - 1] === nextValue[nextEnd - 1]
    ) {
      oldEnd -= 1;
      nextEnd -= 1;
    }

    doc.transact(() => {
      if (oldEnd > start) text.delete(start, oldEnd - start);
      if (nextEnd > start) text.insert(start, nextValue.slice(start, nextEnd));
    }, 'local');

    console.log('[sticky] Text changed locally', {
      boardId,
      nodeId,
      length: nextValue.length,
    });
  }

  return (
    <textarea
      ref={textareaRef}
      defaultValue=""
      readOnly={readOnly}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={handleTextChange}
      className="h-full w-full resize-none rounded-xl border border-amber-300/30 bg-amber-200/10 p-3 text-sm leading-relaxed text-slate-950 outline-none"
      placeholder="Type a sticky note..."
      aria-label="Sticky note text"
    />
  );
}
