import { MessageCircle } from 'lucide-react';
import { getCommentPinPositions, worldToScreen } from '../../lib/commentCoordinates.js';
import { useCommentStore } from '../../store/commentStore.js';
import { CommentThreadPopover } from './CommentThreadPopover.jsx';

function CommentPin({ thread, x, y, orphaned, selected, onSelect }) {
  const authorName = thread.authorId?.name ?? 'Board member';
  const label = `Comment by ${authorName}${thread.resolved ? ', resolved' : ''}${orphaned ? ', orphaned' : ''}`;
  return (
    <button
      type="button"
      data-comment-pin="true"
      aria-label={label}
      title={thread.text}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(thread.threadId ?? thread.id);
      }}
      className={`pointer-events-auto absolute grid h-7 w-7 place-items-center rounded-full border shadow-lg transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
        selected
          ? 'border-cyan-200 bg-cyan-300 text-slate-950'
          : orphaned
            ? 'border-amber-200 bg-amber-400 text-slate-950'
            : thread.resolved
              ? 'border-violet-200 bg-violet-400 text-slate-950'
              : 'border-cyan-200 bg-cyan-500 text-slate-950'
      }`}
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {thread.replyCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-slate-950 px-1 text-[9px] font-semibold text-white">
          {thread.replyCount > 9 ? '9+' : thread.replyCount}
        </span>
      ) : null}
    </button>
  );
}

/** Pins stay at a readable CSS size while their world position follows the viewport. */
export function CommentLayer({ boardId, role, nodes, zoom, pan, size }) {
  const threads = useCommentStore((state) => state.threads);
  const selectedThreadId = useCommentStore((state) => state.selectedThreadId);
  const draftAnchor = useCommentStore((state) => state.draftAnchor);
  const setSelectedThread = useCommentStore((state) => state.setSelectedThread);
  const pins = getCommentPinPositions(threads, nodes, { zoom, pan }, size);
  const selectedPin = pins.find(({ thread }) => (thread.threadId ?? thread.id) === selectedThreadId);
  const selectedThread = threads.find((thread) => (thread.threadId ?? thread.id) === selectedThreadId);
  let draftPoint = null;
  if (draftAnchor?.type === 'canvas') draftPoint = { x: draftAnchor.x, y: draftAnchor.y };
  if (draftAnchor?.type === 'node') {
    const node = nodes.find((entry) => entry.id === draftAnchor.nodeId);
    if (node) draftPoint = { x: node.x + draftAnchor.offsetX, y: node.y + draftAnchor.offsetY };
  }
  const draftScreen = draftPoint ? worldToScreen(draftPoint, { zoom, pan }) : null;
  const popoverPoint = selectedPin ?? (draftScreen ? { x: draftScreen.x, y: draftScreen.y } : null);
  const popoverPosition = popoverPoint ? {
    x: Math.max(8, Math.min(popoverPoint.x + 18, size.width - 328)),
    y: Math.max(150, Math.min(popoverPoint.y, size.height - 150)),
  } : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-label="Board comments">
      {pins.map(({ thread, x, y, orphaned }) => {
        const id = thread.threadId ?? thread.id;
        return (
          <CommentPin
            key={id}
            thread={thread}
            x={x}
            y={y}
            orphaned={orphaned}
            selected={selectedThreadId === id}
            onSelect={setSelectedThread}
          />
        );
      })}
      {popoverPosition && (selectedThread || draftAnchor) ? (
        <CommentThreadPopover
          boardId={boardId}
          role={role}
          thread={selectedThread}
          draftAnchor={draftAnchor}
          position={popoverPosition}
        />
      ) : null}
    </div>
  );
}
