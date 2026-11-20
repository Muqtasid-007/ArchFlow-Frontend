import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { initials } from '../../lib/format.js';
import { useToastStore } from '../../store/toastStore.js';

const BUTTON_VARIANTS = {
  primary:
    'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.8)] disabled:bg-cyan-400/40',
  secondary: 'border border-line bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]',
  ghost: 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
};

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...props }) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-60',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={loading || props.disabled}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'h-10 w-full rounded-xl border border-line bg-[#0a1220] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-ring',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={clsx(
        'min-h-[84px] w-full resize-y rounded-xl border border-line bg-[#0a1220] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-ring',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={clsx(
        'h-10 w-full rounded-xl border border-line bg-[#0a1220] px-3 text-sm text-slate-100 focus-ring',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={clsx('block space-y-1.5', className)}>
      <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
        {hint ? <span className="normal-case tracking-normal text-slate-500">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="block text-xs text-rose-400">{error}</span> : null}
    </label>
  );
}

export function Badge({ children, className, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line bg-white/[0.04] text-slate-300',
    accent: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    danger: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    violet: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, color = '#38bdf8', size = 'md', className }) {
  const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-slate-950 ring-2 ring-[#070b14]',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-cyan-300', className)} aria-label="Loading" />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={clsx('flex flex-col items-center gap-3 py-10 text-center', className)}>
      {Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white/[0.03]">
          <Icon className="h-5 w-5 text-slate-400" />
        </span>
      ) : null}
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative z-10 w-full overflow-hidden rounded-t-2xl border border-line bg-panel shadow-panel animate-fade-in sm:rounded-2xl',
          widths[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
            {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer ? <footer className="flex items-center justify-end gap-2 border-t border-line/70 px-5 py-3">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

const TOAST_ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TOAST_TONES = {
  success: 'border-emerald-400/30 text-emerald-200',
  error: 'border-rose-400/30 text-rose-200',
  info: 'border-cyan-400/30 text-cyan-100',
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div aria-live="polite" aria-relevant="additions text" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((item) => {
        const Icon = TOAST_ICONS[item.variant] ?? Info;
        return (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
            className={clsx(
              'pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-panel/95 px-3.5 py-3 text-sm shadow-panel animate-fade-in',
              TOAST_TONES[item.variant] ?? TOAST_TONES.info,
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-slate-100">{item.message}</p>
            <button type="button" onClick={() => dismiss(item.id)} className="text-slate-500 hover:text-slate-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
