import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  Clock3,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { relativeTime, roleLabel } from '../lib/format.js';
import { useAuthStore } from '../store/authStore.js';
import { toast } from '../store/toastStore.js';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Spinner,
  Textarea,
} from '../components/ui/index.jsx';

function BoardCard({ board, currentUserId, onOpen, onDelete }) {
  const isOwner = board.owner?.id === currentUserId;
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(board.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(board.id);
      }}
      className="group relative flex cursor-pointer flex-col gap-4 rounded-2xl border border-line bg-panel/80 p-5 transition hover:border-cyan-400/40 hover:bg-panel-soft focus-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.04] text-cyan-300">
            <LayoutGrid className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-100">{board.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
              {board.description || 'No description yet.'}
            </p>
          </div>
        </div>
        {isOwner ? (
          <button
            type="button"
            aria-label={`Delete ${board.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(board);
            }}
            className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {(board.members ?? []).slice(0, 3).map((member) => (
              <Avatar
                key={member.user?.id ?? member.user?.email}
                name={member.user?.name ?? 'Member'}
                color={member.user?.avatarColor}
                size="xs"
              />
            ))}
            <Avatar name={board.owner?.name ?? 'Owner'} color={board.owner?.avatarColor} size="xs" />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Users className="h-3 w-3" /> {board.memberCount + 1}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Clock3 className="h-3 w-3" /> {relativeTime(board.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={board.role === 'admin' ? 'accent' : board.role === 'editor' ? 'success' : 'neutral'}>
            {roleLabel(board.role)}
          </Badge>
          <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadBoards() {
    try {
      setLoading(true);
      const payload = await apiRequest('/boards');
      setBoards(payload.boards ?? []);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoards();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return boards;
    return boards.filter((board) =>
      `${board.name} ${board.description}`.toLowerCase().includes(term),
    );
  }, [boards, search]);

  async function handleCreate(event) {
    event.preventDefault();
    if (form.name.trim().length < 2) return;
    setCreating(true);
    try {
      const payload = await apiRequest('/boards', {
        method: 'POST',
        body: { name: form.name.trim(), description: form.description.trim() },
      });
      toast.success('Board created.');
      setCreateOpen(false);
      setForm({ name: '', description: '' });
      navigate(`/boards/${payload.board.id}`);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/boards/${deleteTarget.id}`, { method: 'DELETE' });
      setBoards((current) => current.filter((board) => board.id !== deleteTarget.id));
      toast.success('Board deleted.');
      setDeleteTarget(null);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 text-slate-950">
              <Boxes className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-white">ArchFlow</p>
              <p className="text-[11px] text-slate-500">Architecture workspace</p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-line bg-white/[0.03] py-1 pl-1 pr-3 transition hover:bg-white/[0.06]"
            >
              <Avatar name={user?.name} color={user?.avatarColor} size="sm" />
              <span className="hidden text-xs font-medium text-slate-200 sm:block">{user?.name}</span>
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-panel shadow-panel animate-fade-in">
                  <div className="border-b border-line/70 px-4 py-3">
                    <p className="truncate text-sm font-medium text-slate-100">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge tone="violet">
              <Sparkles className="h-3 w-3" /> Live collaboration + AI review
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Your boards</h1>
            <p className="max-w-xl text-sm text-slate-400">
              Shared canvases for system design. Invite the team, review the architecture, and export a
              starter project.
            </p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New board
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search boards"
              className="pl-9"
            />
          </div>
          <span className="text-xs text-slate-500">
            {boards.length} board{boards.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-sm text-slate-400">
            <Spinner /> Loading boards…
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
            <button type="button" onClick={loadBoards} className="ml-3 underline underline-offset-2">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-panel/40 p-6">
            <EmptyState
              icon={LayoutGrid}
              title={boards.length === 0 ? 'No boards yet' : 'No boards match that search'}
              description={
                boards.length === 0
                  ? 'Create your first board and drop a client, a service and a database onto the canvas.'
                  : 'Try a different name or clear the search field.'
              }
              action={
                boards.length === 0 ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" /> Create board
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                currentUserId={user?.id}
                onOpen={(id) => navigate(`/boards/${id}`)}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </main>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New architecture board"
        description="Name the system you are designing. You can invite the team once it exists."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button form="create-board-form" type="submit" loading={creating}>
              Create board
            </Button>
          </>
        }
      >
        <form id="create-board-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Board name">
            <Input
              autoFocus
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Payments Platform Redesign"
              maxLength={80}
              required
            />
          </Field>
          <Field label="Description" hint="optional">
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="What is being designed, and for whom?"
              maxLength={300}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this board?"
        description={`"${deleteTarget?.name ?? ''}" and its entire snapshot history will be permanently removed.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep board
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          This cannot be undone. Members will lose access immediately.
        </p>
      </Modal>
    </div>
  );
}
