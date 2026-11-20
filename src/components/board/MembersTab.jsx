import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, LogOut, ShieldCheck, UserPlus, Users, Wifi } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { roleLabel } from '../../lib/format.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import { Avatar, Badge, Button, EmptyState, Field, Input, Select } from '../ui/index.jsx';

export function MembersTab({ board, role, presence, onBoardUpdated }) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const isAdmin = role === 'admin';
  const onlineIds = new Set((presence ?? []).map((user) => user.id));
  const owner = board?.owner;
  const members = (board?.members ?? []).filter((member) => member.user);
  const isOwner = owner?.id === currentUser?.id;

  async function invite(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const payload = await apiRequest(`/boards/${board.id}/members`, {
        method: 'POST',
        body: { email: email.trim(), role: inviteRole },
      });
      onBoardUpdated?.(payload.board);
      setEmail('');
      toast.success('Teammate added to the board.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(member, nextRole) {
    setPendingUserId(member.user.id);
    try {
      const payload = await apiRequest(`/boards/${board.id}/members/${member.user.id}`, {
        method: 'PATCH',
        body: { role: nextRole },
      });
      onBoardUpdated?.(payload.board);
      toast.success(`${member.user.name} is now ${roleLabel(nextRole).toLowerCase()}.`);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setPendingUserId(null);
    }
  }

  async function removeMember(member) {
    setPendingUserId(member.user.id);
    try {
      await apiRequest(`/boards/${board.id}/members/${member.user.id}`, { method: 'DELETE' });
      onBoardUpdated?.({
        ...board,
        members: members.filter((entry) => entry.user.id !== member.user.id),
      });
      toast.success(`${member.user.name} removed from the board.`);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setPendingUserId(null);
    }
  }

  async function leaveBoard() {
    setPendingUserId(currentUser.id);
    try {
      await apiRequest(`/boards/${board.id}/members/${currentUser.id}`, { method: 'DELETE' });
      toast.success('You left the board.');
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
          <Users className="h-4 w-4 text-cyan-300" /> Board access
        </h2>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Admins manage access and settings, editors draw and restore snapshots, viewers can only read.
        </p>
      </div>

      {isAdmin ? (
        <form onSubmit={invite} className="space-y-2 rounded-xl border border-line bg-white/[0.02] p-3">
          <Field label="Invite by email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
              required
            />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </Select>
            <Button type="submit" loading={inviting}>
              <UserPlus className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="text-[10px] text-slate-500">
            The person needs an ArchFlow account with that email.
          </p>
        </form>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.02] p-3">
          <Avatar name={owner?.name} color={owner?.avatarColor} size="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-100">
              {owner?.name}
              {onlineIds.has(owner?.id) ? <Wifi className="h-3 w-3 text-emerald-400" /> : null}
            </p>
            <p className="truncate text-[10px] text-slate-500">{owner?.email}</p>
          </div>
          <Badge tone="accent">
            <Crown className="h-3 w-3" /> Owner
          </Badge>
        </div>

        {members.map((member) => (
          <div
            key={member.user.id}
            className="flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.02] p-3"
          >
            <Avatar name={member.user.name} color={member.user.avatarColor} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-100">
                {member.user.name}
                {member.user.id === currentUser?.id ? (
                  <span className="text-[10px] text-slate-500">(you)</span>
                ) : null}
                {onlineIds.has(member.user.id) ? <Wifi className="h-3 w-3 text-emerald-400" /> : null}
              </p>
              <p className="truncate text-[10px] text-slate-500">{member.user.email}</p>
            </div>

            {isAdmin ? (
              <Select
                className="h-8 w-[6.5rem] text-[11px]"
                value={member.role}
                disabled={pendingUserId === member.user.id}
                onChange={(event) => changeRole(member, event.target.value)}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </Select>
            ) : (
              <Badge tone={member.role === 'admin' ? 'accent' : member.role === 'editor' ? 'success' : 'neutral'}>
                {roleLabel(member.role)}
              </Badge>
            )}

            {isAdmin ? (
              <button
                type="button"
                onClick={() => removeMember(member)}
                disabled={pendingUserId === member.user.id}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                aria-label={`Remove ${member.user.name}`}
                title="Remove from board"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}

        {members.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Just the owner so far"
            description={
              isAdmin ? 'Invite teammates above to draw together.' : 'Ask an admin to invite the rest of the team.'
            }
          />
        ) : null}
      </div>

      {!isOwner ? (
        <Button variant="danger" size="sm" className="w-full" onClick={leaveBoard} loading={pendingUserId === currentUser?.id}>
          <LogOut className="h-3.5 w-3.5" /> Leave this board
        </Button>
      ) : null}

      <p className="text-[10px] leading-relaxed text-slate-600">
        Roles are enforced on the server for every REST call and every live canvas edit, not just in the UI.
      </p>
    </div>
  );
}
