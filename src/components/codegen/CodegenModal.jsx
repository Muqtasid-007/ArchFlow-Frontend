import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, FolderTree, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { apiRequest, downloadProjectZip } from '../../lib/api.js';
import { toast } from '../../store/toastStore.js';
import { Badge, Button, Modal } from '../ui/index.jsx';

export function CodegenModal({ open, onClose, boardId, boardName }) {
  const [files, setFiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !boardId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');
    setFiles([]);
    setSummary(null);
    setSelectedPath(null);

    apiRequest(`/boards/${boardId}/generate`, { method: 'POST' })
      .then((payload) => {
        if (cancelled) return;
        setFiles(payload.files ?? []);
        setSummary(payload.summary ?? null);
        const firstJs =
          payload.files?.find((file) => file.path.endsWith('server.js')) ??
          payload.files?.find((file) => file.path.endsWith('.js')) ??
          payload.files?.[0];
        setSelectedPath(firstJs?.path ?? null);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, boardId]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const file of files) {
      const top = file.path.split('/')[0] ?? 'root';
      if (!groups.has(top)) groups.set(top, []);
      groups.get(top).push(file);
    }
    return [...groups.entries()];
  }, [files]);

  const activeFile = files.find((file) => file.path === selectedPath) ?? null;

  async function copyFile() {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      toast.success('File copied to clipboard.');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Clipboard access was blocked by the browser.');
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const filename = await downloadProjectZip(boardId);
      toast.success(`Downloaded ${filename}`);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generated architecture project"
      description={`Scaffolded from "${boardName ?? 'this board'}" using the components and connections on the canvas.`}
      size="xl"
      footer={
        <>
          <span className="mr-auto text-[11px] text-slate-500">
            {summary ? `${summary.fileCount} files · ${summary.resources.length} resources` : '—'}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={download} loading={downloading} disabled={files.length === 0}>
            <Download className="h-4 w-4" /> Download .zip
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          Compiling the architecture into a project…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {summary ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-3">
              <Badge tone="accent">
                <Sparkles className="h-3 w-3" /> {summary.entities.length} models
              </Badge>
              <Badge tone="success">{summary.resources.length} API resources</Badge>
              {summary.hasAuth ? <Badge tone="violet">JWT auth routes</Badge> : null}
              {summary.entities.map((entity) => (
                <Badge key={entity} tone="neutral">
                  {entity}
                </Badge>
              ))}
            </div>
          ) : null}

          {summary?.architecture ? (
            <section className="rounded-xl border border-line bg-white/[0.02] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Detected architecture</p>
              <p className="mt-1 text-[11px] text-slate-300">
                {summary.architecture.components.map((component) => `${component.label} (${component.type})`).join(' · ')}
              </p>
              {summary.architecture.connections.length ? (
                <ul className="mt-2 space-y-1 text-[10px] text-slate-500">
                  {summary.architecture.connections.map((connection, index) => (
                    <li key={`${connection.from}-${connection.to}-${index}`}>
                      {connection.from} → {connection.to} · {connection.kind}{connection.label ? ` · ${connection.label}` : ''}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-1 text-[10px] text-amber-300">No connections detected. Connect components to describe the request and data flow.</p>}
            </section>
          ) : null}

          {summary?.generatedAdapters ? (
            <p className="text-[10px] text-slate-500">
              Generated persistence: {summary.generatedAdapters.map((adapter) => adapter.engine).join(', ')}
              {summary.cache ? ' · Redis cache enabled' : ''}
            </p>
          ) : null}

          {summary?.warnings?.length ? (
            <div className="space-y-1.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] p-3">
              {summary.warnings.map((warning) => (
                <p key={warning} className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-200/90">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-line bg-[#080f1c] p-2 scrollbar-thin">
              {grouped.map(([group, groupFiles]) => (
                <div key={group} className="mb-2">
                  <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <FolderTree className="h-3 w-3" /> {group}
                  </p>
                  <ul className="space-y-0.5">
                    {groupFiles.map((file) => {
                      const short = file.path.split('/').slice(1).join('/') || file.path;
                      const active = file.path === selectedPath;
                      return (
                        <li key={file.path}>
                          <button
                            type="button"
                            onClick={() => setSelectedPath(file.path)}
                            className={`flex w-full items-center gap-1.5 truncate rounded-lg px-2 py-1.5 text-left text-[11px] transition ${
                              active
                                ? 'bg-cyan-400/10 text-cyan-200'
                                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                            }`}
                            title={file.path}
                          >
                            <FileCode2 className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="truncate">{short}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex min-h-[24rem] flex-col overflow-hidden rounded-xl border border-line bg-[#080f1c]">
              <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
                <p className="truncate font-mono text-[11px] text-slate-400">{activeFile?.path ?? 'Select a file'}</p>
                <Button variant="secondary" size="sm" onClick={copyFile} disabled={!activeFile}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="max-h-[42vh] flex-1 overflow-auto p-3 text-[11px] leading-relaxed text-slate-300 scrollbar-thin">
                <code>{activeFile?.content ?? 'No file selected.'}</code>
              </pre>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-600">
            The archive contains separate <span className="font-mono">backend/</span> and{' '}
            <span className="font-mono">frontend/</span> folders with their own package.json, plus setup
            instructions. Review generated schemas before shipping.
          </p>
        </div>
      )}
    </Modal>
  );
}
