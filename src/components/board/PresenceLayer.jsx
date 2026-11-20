import { memo } from 'react';
import { useCursorStore } from '../../store/cursorStore.js';

export const PresenceLayer = memo(function PresenceLayer({ zoom, pan }) {
  // Subscribe to the stable cursor map. Filtering inside the selector creates
  // a fresh array on every read and can trigger an infinite React render loop.
  const cursorMap = useCursorStore((state) => state.cursors);
  const cursors = Object.values(cursorMap).filter(
    (cursor) => cursor && Number.isFinite(cursor.x) && Number.isFinite(cursor.y),
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cursors.map((cursor) => {
        const left = cursor.x * zoom + pan.x;
        const top = cursor.y * zoom + pan.y;
        return (
          <div
            key={cursor.id}
            className="absolute transition-[left,top] duration-100 ease-linear"
            style={{ left, top, transform: 'translate(-2px, -2px)' }}
          >
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
              <path
                d="M1.5 1.2L14 9.4l-5.4 1.3-2.9 5.1L1.5 1.2z"
                fill={cursor.avatarColor ?? '#22d3ee'}
                stroke="#04121a"
                strokeWidth="1"
              />
            </svg>
            <span
              className="mt-0.5 inline-block max-w-[10rem] truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-950 shadow"
              style={{ backgroundColor: cursor.avatarColor ?? '#22d3ee' }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}
    </div>
  );
});
