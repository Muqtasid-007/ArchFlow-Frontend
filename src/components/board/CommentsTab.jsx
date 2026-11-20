import { Check, MapPin, MessageCircle, RotateCcw } from 'lucide-react';
import { relativeTime } from '../../lib/format.js';
import { filterThreadsByState, useCommentStore } from '../../store/commentStore.js';

export function CommentsTab({ onJumpToComment }) {
  const threads = useCommentStore((state) => state.threads);
  const filter = useCommentStore((state) => state.filter);
  const setFilter = useCommentStore((state) => state.setFilter);
  const setSelectedThread = useCommentStore((state) => state.setSelectedThread);
  const visibleThreads = filterThreadsByState(threads, filter)
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

  function jumpTo(thread) {
    const threadId = thread.threadId ?? thread.id;
    setSelectedThread(threadId);
    onJumpToComment?.(thread);
  }

  return (
    <section className="space-y-3 p-3" aria-label="Board comments">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
          <MessageCircle className="h-4 w-4 text-cyan-300" /> Comments
        </h2>
        <span className="text-[10px] text-slate-500">{visibleThreads.length} shown</span>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-slate-950/40 p-1">
        {['open', 'resolved'].map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => setFilter(state)}
            aria-pressed={filter === state}
            className={`rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition ${
              filter === state ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            {state}
          </button>
        ))}
      </div>

      {visibleThreads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-4 text-center">
          <p className="text-xs font-medium text-slate-300">No {filter} comments</p>
          <p className="mt-1 text-[10px] text-slate-500">Press C or choose the comment button to start one.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleThreads.map((thread) => (
            <li key={thread.threadId ?? thread.id}>
              <article className="rounded-lg border border-line bg-white/[0.025] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-medium text-slate-300">
                    {thread.authorId?.name ?? 'Board member'}
                  </span>
                  <time className="shrink-0 text-[10px] text-slate-600">
                    {relativeTime(thread.createdAt)}
                  </time>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">
                  {thread.deletedAt ? 'This comment was deleted.' : thread.text}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] ${thread.orphaned ? 'text-amber-300' : 'text-slate-500'}`}>
                    {thread.resolved ? <Check className="h-3 w-3" /> : thread.orphaned ? <MapPin className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                    {thread.orphaned ? 'Orphaned' : thread.resolved ? 'Resolved' : `${thread.replyCount ?? 0} replies`}
                  </span>
                  <button
                    type="button"
                    onClick={() => jumpTo(thread)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-cyan-200 hover:bg-cyan-400/10"
                  >
                    {thread.resolved ? <RotateCcw className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                    Jump to pin
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
