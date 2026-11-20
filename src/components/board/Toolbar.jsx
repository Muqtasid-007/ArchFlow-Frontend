import { Trash2 } from 'lucide-react';
import { TOOLBAR_GROUPS, catalogEntry } from '../../lib/nodeCatalog.js';

export function Toolbar({ readOnly, onAdd, onDelete, hasSelection }) {
  return (
    <aside className="z-10 flex w-14 shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-line/70 bg-panel/60 py-3 scrollbar-thin">
      {TOOLBAR_GROUPS.map((group) => (
        <div key={group.name} className="flex flex-col items-center gap-1.5">
          <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-600">
            {group.name.slice(0, 3)}
          </span>
          {group.types.map((type) => {
            const entry = catalogEntry(type);
            const Icon = entry.icon;
            return (
              <button
                key={type}
                type="button"
                disabled={readOnly}
                onClick={() => onAdd(type)}
                title={readOnly ? 'Read-only access' : `Add ${entry.label} — ${entry.description}`}
                aria-label={`Add ${entry.label}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-400 transition hover:border-line hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                style={{ color: readOnly ? undefined : entry.accent }}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      ))}

      <div className="mt-auto flex flex-col items-center gap-1.5 border-t border-line/70 pt-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={readOnly || !hasSelection}
          title={hasSelection ? 'Delete selection (Del)' : 'Select something to delete'}
          aria-label="Delete selection"
          className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
