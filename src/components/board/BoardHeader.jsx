import { ArrowLeft, Bot, Code2, History, Users, Wifi, WifiOff } from 'lucide-react';
import { Avatar, Badge, Button } from '../ui/index.jsx';
import { roleLabel } from '../../lib/format.js';

const ROLE_TONE = { admin: 'accent', editor: 'success', viewer: 'neutral' };

export function BoardHeader({
  board,
  role,
  presence,
  connected,
  pendingOperations = 0,
  revision,
  onOpenTab,
  onGenerate,
  onBack,
}) {
  const visibleUsers = presence.slice(0, 5);
  const overflow = presence.length - visibleUsers.length;
  const connectionLabel = connected
    ? pendingOperations > 0
      ? `Syncing ${pendingOperations} canvas ${pendingOperations === 1 ? 'edit' : 'edits'}`
      : 'Live'
    : pendingOperations > 0
      ? `Offline · ${pendingOperations} ${pendingOperations === 1 ? 'edit' : 'edits'} not synced`
      : 'Offline · reconnecting';

  return (
    <header className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line/70 bg-panel/80 px-4 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-slate-100">{board?.name}</h1>
            <Badge tone={ROLE_TONE[role] ?? 'neutral'}>{roleLabel(role)}</Badge>
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={`inline-flex items-center gap-1 text-[11px] ${connected && pendingOperations === 0 ? 'text-slate-400' : 'text-amber-200'}`}
              title={connectionLabel}
            >
              {connected ? (
                <Wifi className="h-3 w-3 text-emerald-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-amber-400" />
              )}
              {connectionLabel}
            </span>
          </div>
          <p className="truncate text-[11px] text-slate-500">
            {board?.description || 'No description'} · revision {revision ?? board?.revision ?? 1}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="mr-1 hidden items-center sm:flex">
          {visibleUsers.length === 0 ? (
            <span className="text-[11px] text-slate-600">Only you here</span>
          ) : (
            <div className="flex -space-x-2">
              {visibleUsers.map((user) => (
                <Avatar key={user.id} name={user.name} color={user.avatarColor} size="sm" />
              ))}
              {overflow > 0 ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-[10px] font-medium text-slate-300 ring-2 ring-[#070b14]">
                  +{overflow}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <Button variant="secondary" size="sm" onClick={() => onOpenTab('ai')}>
          <Bot className="h-3.5 w-3.5" /> AI Review
        </Button>
        <Button size="sm" onClick={onGenerate}>
          <Code2 className="h-3.5 w-3.5" /> Generate
        </Button>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => onOpenTab('history')}>
          <History className="h-3.5 w-3.5" /> History
        </Button>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => onOpenTab('members')}>
          <Users className="h-3.5 w-3.5" /> Members
        </Button>
        <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => onOpenTab('inspect')}>
          Panel
        </Button>
      </div>
    </header>
  );
}
