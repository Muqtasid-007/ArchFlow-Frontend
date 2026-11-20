import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  Bot,
  Code2,
  Lock,
  Mail,
  Network,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Button, Field, Input } from '../components/ui/index.jsx';
import { useAuthStore } from '../store/authStore.js';
import { toast } from '../store/toastStore.js';

const DEMO = { email: 'demo@archflow.dev', password: 'Demo1234!' };

export default function AuthPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event, credentials) {
    event?.preventDefault();
    // `credentials` lets the demo shortcut bypass async form state updates.
    const values = credentials ?? { email: form.email.trim(), password: form.password };

    if (mode === 'register' && form.name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!values.email.trim() || values.password.length < 8) {
      setError('Enter your email and a password of at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (mode === 'register') {
        await register({ name: form.name.trim(), email: values.email.trim(), password: values.password });
        toast.success('Workspace account created.');
      } else {
        await login({ email: values.email.trim(), password: values.password });
        toast.success('Welcome back.');
      }
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message ?? 'Could not complete that request.');
    } finally {
      setSubmitting(false);
    }
  }

  function useDemo() {
    setMode('login');
    setForm({ name: '', ...DEMO });
    setError('');
    submit(null, DEMO);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line/60 p-12 lg:flex">
        <div className="absolute inset-0 canvas-grid opacity-70" />
        <div className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 text-slate-950">
            <Boxes className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">ArchFlow</span>
        </div>

        <div className="relative max-w-lg space-y-7">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
              <Sparkles className="h-3 w-3" /> Design reviews, in real time
            </span>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white">
              Sketch the system.
              <br />
              Ship the scaffold.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              A shared architecture canvas for engineering teams. Draw services and data flows together,
              get an AI review of what is missing, and export a runnable MERN project from the diagram.
            </p>
          </div>

          <ul className="grid gap-3 text-sm text-slate-300">
            {[
              { icon: Users, text: 'Live multi-user canvas with presence and cursors' },
              { icon: Bot, text: 'Architecture review: reliability, security, scaling gaps' },
              { icon: Code2, text: 'Express routes, Mongoose models and React pages generated from the graph' },
              { icon: Network, text: 'Snapshot history so a redesign is never lost' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.04]">
                  <Icon className="h-3.5 w-3.5 text-cyan-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          Built with React, Express, Socket.IO and MongoDB. Roles, snapshots and generation included.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 text-slate-950">
              <Boxes className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-white">ArchFlow</span>
          </div>

          <div className="mb-6 space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {mode === 'login' ? 'Sign in' : 'Create your account'}
            </h2>
            <p className="text-sm text-slate-400">
              {mode === 'login'
                ? 'Continue to your architecture boards.'
                : 'Start a shared canvas for your team in seconds.'}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-line bg-white/[0.02] p-1">
            {['login', 'register'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError('');
                }}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  mode === value ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {value === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' ? (
              <Field label="Full name">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    className="pl-9"
                  />
                </div>
              </Field>
            ) : null}

            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="pl-9"
                  required
                />
              </div>
            </Field>

            <Field label="Password" hint={mode === 'register' ? '8+ chars, 1 number' : undefined}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="pl-9"
                  required
                />
              </div>
            </Field>

            {error ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-600">
            <span className="h-px flex-1 bg-line" />
            or explore first
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={useDemo} disabled={submitting}>
            Use the demo workspace
          </Button>
          <p className="mt-2 text-center text-xs text-slate-500">
            demo@archflow.dev · Password: Demo1234!
          </p>
        </div>
      </section>
    </div>
  );
}
