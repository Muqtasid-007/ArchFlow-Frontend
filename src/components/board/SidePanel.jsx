import clsx from 'clsx';
import { Bot, History, MessageCircle, SlidersHorizontal, Users, X } from 'lucide-react';
import { InspectorTab } from './InspectorTab.jsx';
import { AiTab } from './AiTab.jsx';
import { HistoryTab } from './HistoryTab.jsx';
import { MembersTab } from './MembersTab.jsx';
import { CommentsTab } from './CommentsTab.jsx';

const TABS = [
  { key: 'inspect', label: 'Inspect', icon: SlidersHorizontal },
  { key: 'ai', label: 'AI', icon: Bot },
  { key: 'history', label: 'History', icon: History },
  { key: 'members', label: 'Team', icon: Users },
  { key: 'comments', label: 'Comments', icon: MessageCircle },
];

export function SidePanel({
  open,
  onClose,
  tab,
  onTabChange,
  board,
  role,
  readOnly,
  emitOp,
  onBoardUpdated,
  onReload,
  onGenerate,
  presence,
  onJumpToComment,
}) {
  return (
    <aside
      className={clsx(
        'absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-line bg-panel/95 shadow-panel backdrop-blur-xl transition-transform duration-200 lg:static lg:z-10 lg:w-[22rem] lg:max-w-none lg:translate-x-0 lg:shadow-none',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3 lg:hidden">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Board panel</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="grid grid-cols-5 gap-1 border-b border-line/70 p-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={clsx(
              'flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition',
              tab === key
                ? 'bg-white/[0.07] text-cyan-200'
                : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === 'inspect' ? (
          <InspectorTab
            board={board}
            role={role}
            readOnly={readOnly}
            emitOp={emitOp}
            onTabChange={onTabChange}
          />
        ) : null}
        {tab === 'ai' ? (
          <AiTab board={board} onGenerate={onGenerate} />
        ) : null}
        {tab === 'history' ? (
          <HistoryTab board={board} role={role} readOnly={readOnly} onReload={onReload} />
        ) : null}
        {tab === 'members' ? (
          <MembersTab
            board={board}
            role={role}
            presence={presence}
            onBoardUpdated={onBoardUpdated}
          />
        ) : null}
        {tab === 'comments' ? <CommentsTab onJumpToComment={onJumpToComment} /> : null}
      </div>
    </aside>
  );
}
