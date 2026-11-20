import { useEffect, useState } from 'react';
import { Camera, History, RotateCcw, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { formatDateTime, relativeTime } from '../../lib/format.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import { Avatar, Badge, Button, EmptyState, Input, Modal, Spinner } from '../ui/index.jsx';

const KIND_TONE = { manual: 'accent', auto: 'neutral', restore: 'violet' };

export function HistoryTab({ board, readOnly, onReload }) {
  const currentUser = useAuthStore((state) => state.user);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const payload = await apiRequest(`/boards/${board.id}/snapshots`);
      setSnapshots(payload.snapshots ?? []);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [board.id]);

  async function createSnapshot() {
    setCreating(true);
    try {
      await apiRequest(`/boards/${board.id}/snapshots`, {
        method: 'POST',
        body: { name: name.trim() || undefined },
      });
      setName('');
      toast.success('Snapshot saved.');
      await load();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setCreating(false);
    }
  }

  async function restore() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await apiRequest(`/boards/${board.id}/snapshots/${restoreTarget.id}/restore`, { method: 'POST' });
      toast.success(`Restored "${restoreTarget.name}".`);
      setRestoreTarget(null);
      await Promise.all([load(), onReload?.()]);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setRestoring(false);
    }
  }

  async function remove(snapshot) {
    setDeletingId(snapshot.id);
    try {
      await apiRequest(`/boards/${board.id}/snapshots/${snapshot.id}`, { method: 'DELETE' });
      setSnapshots((current) => current.filter((entry) => entry.id !== snapshot.id));
      toast.success('Snapshot deleted.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
          <History className="h-4 w-4 text-cyan-300" /> Version history
        </h2>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Each snapshot stores the full canvas. Restoring keeps the current state as an automatic
          snapshot first, so nothing is lost.
        </p>
      </div>

      {!readOnly ? (
        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Snapshot name (optional)"
            maxLength={120}
          />
          <Button size="sm" className="mt-2 w-full" onClick={createSnapshot} loading={creating}>
            <Camera className="h-3.5 w-3.5" /> Save current canvas
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
          <Spinner /> Loading history…
        </div>
      ) : snapshots.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No snapshots yet"
          description="Save a snapshot before a big redesign so the team can roll back to it later."
        />
      ) : (
        <ol className="relative space-y-2 border-l border-line/70 pl-4">
          {snapshots.map((snapshot) => (
            <li key={snapshot.id} className="relative">
              <span className="absolute -left-[21px] top-3 h-2 w-2 rounded-full border border-line bg-panel-soft" />
              <div className="rounded-xl border border-line bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-100">{snapshot.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500" title={formatDateTime(snapshot.createdAt)}>
                      {relativeTime(snapshot.createdAt)} · rev {snapshot.revision} · {snapshot.nodeCount} nodes ·{' '}
                      {snapshot.edgeCount} links
                    </p>
                  </div>
                  <Badge tone={KIND_TONE[snapshot.kind] ?? 'neutral'}>{snapshot.kind}</Badge>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Avatar
                      name={snapshot.createdBy?.name ?? 'Unknown'}
                      color={snapshot.createdBy?.avatarColor}
                      size="xs"
                    />
                    {snapshot.createdBy?.name ?? 'Unknown'}
                  </span>
                  <div className="flex items-center gap-1">
                    {!readOnly ? (
                      <Button variant="secondary" size="sm" onClick={() => setRestoreTarget(snapshot)}>
                        <RotateCcw className="h-3 w-3" /> Restore
                      </Button>
                    ) : null}
                    {snapshot.createdBy?.id === currentUser?.id ? (
                      <button
                        type="button"
                        onClick={() => remove(snapshot)}
                        disabled={deletingId === snapshot.id}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                        aria-label={`Delete snapshot ${snapshot.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Modal
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        title="Restore this snapshot?"
        description={restoreTarget ? `"${restoreTarget.name}" from ${relativeTime(restoreTarget.createdAt)}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button onClick={restore} loading={restoring}>
              <RotateCcw className="h-4 w-4" /> Restore canvas
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          The current canvas will be saved as an automatic snapshot before this version replaces it.
          Everyone on the board sees the change immediately.
        </p>
      </Modal>
    </div>
  );
}
