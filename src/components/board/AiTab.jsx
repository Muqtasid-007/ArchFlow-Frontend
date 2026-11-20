import { useState } from 'react';
import { Bot, Code2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { useCanvasStore } from '../../store/canvasStore.js';
import { RATING_LABELS, SEVERITY_STYLES } from '../../lib/nodeCatalog.js';
import { Badge, Button, EmptyState, Spinner } from '../ui/index.jsx';
import { toast } from '../../store/toastStore.js';

function ScoreRing({ score }) {
  const value = score ?? 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 85 ? '#34d399' : value >= 70 ? '#22d3ee' : value >= 50 ? '#fbbf24' : '#fb7185';

  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#1d2942" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="text-center">
        <p className="text-xl font-semibold leading-none text-white">{value}</p>
        <p className="text-[9px] uppercase tracking-wider text-slate-500">score</p>
      </div>
    </div>
  );
}

export function AiTab({ board, onGenerate }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setSelected = useCanvasStore((state) => state.setSelected);
  const nodes = useCanvasStore((state) => state.nodes);

  async function analyze() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest(`/boards/${board.id}/ai/analyze`, { method: 'POST' });
      setReview(payload.review);
      toast.success('Architecture review updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Spinner className="h-6 w-6" />
        <p className="text-sm text-slate-300">Reviewing the architecture…</p>
        <p className="max-w-xs text-[11px] text-slate-500">
          Checking data ownership, service coupling, entry points, security and scaling.
        </p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="space-y-4 p-4">
        <EmptyState
          icon={Bot}
          title="AI architecture review"
          description="Send the current diagram for a senior-architect style critique. The built-in rules always run; adding a Gemini or OpenAI key enables model-written commentary too."
          action={
            <Button onClick={analyze} loading={loading}>
              <Sparkles className="h-4 w-4" /> Analyze architecture
            </Button>
          }
        />
        {error ? <p className="text-center text-xs text-rose-300">{error}</p> : null}
        <p className="text-center text-[10px] leading-relaxed text-slate-600">
          Reviews are read-only and never modify the board.
        </p>
      </div>
    );
  }

  const findings = review.findings ?? [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-white/[0.02] p-3.5">
        <ScoreRing score={review.score} />
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{RATING_LABELS[review.rating] ?? review.rating}</Badge>
            <Badge tone="neutral" className="capitalize">
              {review.provider}
            </Badge>
            {review.cached ? <Badge tone="neutral">cached</Badge> : null}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">{review.summary}</p>
        </div>
      </div>

      {review.warning ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-[11px] leading-relaxed text-amber-200/90">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {review.warning}
        </p>
      ) : null}

      {findings.length === 0 ? (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-200">
          No structural issues found by the current rules.
        </p>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {findings.length} finding{findings.length === 1 ? '' : 's'}
          </p>
          {findings.map((finding) => {
            const severity = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.medium;
            const related = (finding.nodeIds ?? [])
              .map((id) => nodes.find((node) => node.id === id))
              .filter(Boolean);

            return (
              <article key={finding.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-semibold leading-snug text-slate-100">{finding.title}</h3>
                  <Badge className={severity.className}>{severity.label}</Badge>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{finding.detail}</p>
                {finding.recommendation ? (
                  <p className="mt-2 rounded-lg border border-line/70 bg-black/20 px-2.5 py-2 text-[11px] leading-relaxed text-slate-300">
                    <span className="font-medium text-cyan-300">Suggested: </span>
                    {finding.recommendation}
                  </p>
                ) : null}
                {related.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {related.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelected({ kind: 'node', id: node.id })}
                        className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200"
                      >
                        {node.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-line/70 pt-3">
        <Button size="sm" onClick={analyze}>
          <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
        </Button>
        <Button variant="secondary" size="sm" onClick={onGenerate}>
          <Code2 className="h-3.5 w-3.5" /> Generate project
        </Button>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <p className="text-[10px] leading-relaxed text-slate-600">
        Node count: {review.stats?.nodes ?? nodes.length} · Connections: {review.stats?.edges ?? 0}. Scoring
        is rule-based and deterministic, so repeated reviews stay comparable.
      </p>
    </div>
  );
}
