import { useEffect, useRef } from 'react';
import { getBoardSocket } from '../lib/socket.js';

export function useCursorBroadcast({ boardId, toGraph }) {
  const lastEmitRef = useRef(0);

  useEffect(() => {
    function handlePointerMove(event) {
      const now = performance.now();
      if (now - lastEmitRef.current < 33) return;

      lastEmitRef.current = now;
      const point = toGraph(event.clientX, event.clientY);
      const socket = getBoardSocket();
      if (socket.connected && boardId) {
        socket.emit('cursor:move', { boardId, x: point.x, y: point.y });
      }
    }

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [boardId, toGraph]);
}
