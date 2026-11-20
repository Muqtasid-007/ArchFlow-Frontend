import { useEffect, useState } from 'react';
import { Check, LoaderCircle, MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { getBoardSocket } from '../../lib/socket.js';
import { useAuthStore } from '../../store/authStore.js';
import { useCommentStore } from '../../store/commentStore.js';

function userIdOf(user) {
  return String(user?._id ?? user?.id ?? user ?? '');
}

function CommentMessage({ message }) {
  return (
    <article className="rounded-lg bg-white/[0.035] px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="truncate font-medium text-slate-300">{message.authorId?.name ?? 'Board member'}</span>
        {message.editedAt ? <span>edited</span> : null}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">
        {message.deletedAt ? 'This comment was deleted.' : message.text}
      </p>
    </article>
  );
}

export function CommentThreadPopover({ boardId, thread, draftAnchor, role, position, onClose }) {
  const currentUser = useAuthStore((state) => state.user);
  const repliesPage = useCommentStore((state) => (
    thread ? state.repliesByThread[thread.threadId ?? thread.id] : null
  ));
  const setReplies = useCommentStore((state) => state.setReplies);
  const upsertThread = useCommentStore((state) => state.upsertThread);
  const upsertReply = useCommentStore((state) => state.upsertReply);
  const setDraftAnchor = useCommentStore((state) => state.setDraftAnchor);
  const setSelectedThread = useCommentStore((state) => state.setSelectedThread);
  const [replyText, setReplyText] = useState('');
  const [newThreadText, setNewThreadText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const threadId = thread?.threadId ?? thread?.id;

  useEffect(() => {
    if (!threadId) return undefined;
    let cancelled = false;
    setError('');
    setLoadingReplies(true);
    apiRequest(`/boards/${boardId}/comments/${threadId}/replies`)
      .then((result) => {
        if (!cancelled) setReplies(threadId, result.replies ?? [], result.nextCursor ?? null);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingReplies(false);
      });
    return () => { cancelled = true; };
  }, [boardId, setReplies, threadId]);

  function close() {
    if (draftAnchor) setDraftAnchor(null);
    setSelectedThread(null);
    onClose?.();
  }

  function emitWithAck(eventName, payload) {
    const socket = getBoardSocket();
    if (!socket.connected) return Promise.reject(new Error('Reconnect to the board before commenting.'));
    return new Promise((resolve, reject) => {
      socket.emit(eventName, payload, (response) => {
        if (response?.ok) resolve(response);
        else reject(new Error(response?.error ?? 'Comment could not be saved.'));
      });
    });
  }

  async function submitNewThread(event) {
    event.preventDefault();
    const text = newThreadText.trim();
    if (!text || !draftAnchor) return;
    setSending(true);
    setError('');
    try {
      const result = await emitWithAck('comment:create', { boardId, anchor: draftAnchor, text });
      upsertThread(result.thread);
      setDraftAnchor(null);
      setSelectedThread(result.thread.threadId ?? result.thread.id);
      setNewThreadText('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function submitReply(event) {
    event.preventDefault();
    const text = replyText.trim();
    if (!text || !threadId) return;
    setSending(true);
    setError('');
    try {
      const result = await emitWithAck('comment:reply', { boardId, threadId, text });
      upsertReply(threadId, result.reply);
      setReplyText('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleResolved() {
    setSending(true);
    setError('');
    try {
      const eventName = thread.resolved ? 'comment:reopen' : 'comment:resolve';
      const result = await emitWithAck(eventName, { boardId, threadId });
      upsertThread(result.thread);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function loadMoreReplies() {
    if (!repliesPage?.nextCursor || !threadId) return;
    setLoadingReplies(true);
    setError('');
    try {
      const query = new URLSearchParams({ cursor: repliesPage.nextCursor });
      const result = await apiRequest(`/boards/${boardId}/comments/${threadId}/replies?${query}`);
      setReplies(threadId, result.replies ?? [], result.nextCursor ?? null, true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingReplies(false);
    }
  }

  const canResolve = thread && (
    userIdOf(thread.authorId) === userIdOf(currentUser)
    || role === 'editor'
    || role === 'admin'
  );

  return (
    <section
      data-comment-ui="true"
      className="pointer-events-auto absolute z-40 flex max-h-[min(30rem,calc(100%-1rem))] w-[min(20rem,calc(100vw-2rem))] -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-panel/95 shadow-panel backdrop-blur"
      style={{ left: position.x, top: position.y }}
      aria-label={draftAnchor ? 'Write a comment' : 'Comment thread'}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-3 border-b border-line/70 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-100">
            {draftAnchor ? 'New comment' : thread?.authorId?.name ?? 'Comment thread'}
          </p>
          {thread ? (
            <p className="mt-0.5 text-[10px] text-slate-500">
              {thread.resolved ? 'Resolved' : 'Open'}{thread.orphaned ? ' · original node deleted' : ''}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={close} className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Close comment">
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {draftAnchor ? (
        <form onSubmit={submitNewThread} className="space-y-2 p-3">
          <textarea
            autoFocus
            value={newThreadText}
            onChange={(event) => setNewThreadText(event.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Write a comment…"
            className="w-full resize-y rounded-lg border border-line bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400/60"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-500">{newThreadText.length}/5000</span>
            <button disabled={sending || !newThreadText.trim()} className="inline-flex items-center gap-1 rounded-md bg-cyan-400 px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-50">
              {sending ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Post comment
            </button>
          </div>
        </form>
      ) : thread ? (
        <>
          <div className="space-y-2 overflow-y-auto p-3">
            <CommentMessage message={thread} />
            {loadingReplies ? <p className="text-[11px] text-slate-500">Loading replies…</p> : null}
            {(repliesPage?.items ?? []).map((reply) => <CommentMessage key={reply.id} message={reply} />)}
            {repliesPage?.nextCursor ? (
              <button type="button" onClick={loadMoreReplies} disabled={loadingReplies} className="text-[10px] text-cyan-300 hover:text-cyan-200">
                Load older replies
              </button>
            ) : null}
          </div>
          <form onSubmit={submitReply} className="space-y-2 border-t border-line/70 p-3">
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              maxLength={5000}
              rows={2}
              placeholder="Write a reply…"
              className="w-full resize-y rounded-lg border border-line bg-slate-950/60 p-2 text-xs text-slate-100 outline-none focus:border-cyan-400/60"
            />
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={toggleResolved} disabled={sending || !canResolve} className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-40">
                {thread.resolved ? <RotateCcw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {thread.resolved ? 'Reopen' : 'Resolve'}
              </button>
              <button disabled={sending || !replyText.trim()} className="inline-flex items-center gap-1 rounded-md bg-cyan-400 px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-50">
                {sending ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
                Reply
              </button>
            </div>
          </form>
        </>
      ) : null}
      {error ? <p role="alert" className="border-t border-rose-400/20 px-3 py-2 text-[11px] text-rose-300">{error}</p> : null}
    </section>
  );
}
