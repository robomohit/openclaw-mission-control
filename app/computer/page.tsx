'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  MonitorPlay,
  Radio,
  RefreshCw,
  Terminal,
  Globe,
} from 'lucide-react';

import { cn } from '@/lib/utils';

type ComputerLane =
  | 'agent'
  | 'browser'
  | 'tools'
  | 'cron'
  | 'channel'
  | 'system'
  | 'error';

interface ComputerStep {
  id: string;
  lane: ComputerLane;
  title: string;
  detail: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  urls: string[];
  ingestedAt?: boolean;
}

const LANES: { id: ComputerLane | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'agent', label: 'Agent' },
  { id: 'browser', label: 'Browser' },
  { id: 'tools', label: 'Tools' },
  { id: 'cron', label: 'Cron' },
  { id: 'channel', label: 'Channels' },
  { id: 'system', label: 'System' },
  { id: 'error', label: 'Errors' },
];

const STEP_BUFFER = 400;

function gatewayHost(): string {
  return (
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_HOST?.trim() || '127.0.0.1'
  );
}

function gatewayHttpPort(): string {
  return (
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_PORT?.trim() || '18789'
  );
}

function browserControlPort(): string {
  return (
    process.env.NEXT_PUBLIC_OPENCLAW_BROWSER_PORT?.trim() || '18791'
  );
}

function canvasUrl(): string {
  const custom = process.env.NEXT_PUBLIC_OPENCLAW_CANVAS_URL?.trim();
  if (custom) return custom;
  return `http://${gatewayHost()}:${gatewayHttpPort()}/__openclaw__/canvas/`;
}

function browserControlUrl(): string {
  const custom = process.env.NEXT_PUBLIC_OPENCLAW_BROWSER_URL?.trim();
  if (custom) return custom;
  return `http://${gatewayHost()}:${browserControlPort()}/`;
}

function laneStyles(lane: ComputerLane): string {
  switch (lane) {
    case 'agent':
      return 'bg-sky-500/15 text-sky-300 ring-sky-500/30';
    case 'browser':
      return 'bg-violet-500/15 text-violet-300 ring-violet-500/30';
    case 'tools':
      return 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
    case 'cron':
      return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
    case 'channel':
      return 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30';
    case 'error':
      return 'bg-rose-500/20 text-rose-200 ring-rose-500/40';
    default:
      return 'bg-slate-500/15 text-slate-300 ring-slate-600/40';
  }
}

export default function ComputerPage() {
  const [steps, setSteps] = useState<ComputerStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lane, setLane] = useState<ComputerLane | 'all'>('all');
  const [live, setLive] = useState(true);
  const [streamOk, setStreamOk] = useState(false);
  const [streamErr, setStreamErr] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const sp = new URLSearchParams();
      sp.set('limit', '350');
      sp.set('maxLines', '8000');
      if (lane !== 'all') sp.set('lane', lane);
      const r = await fetch(`/api/openclaw/computer-steps?${sp}`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = (await r.json()) as { steps?: ComputerStep[] };
      const list = Array.isArray(j.steps) ? j.steps : [];
      setSteps(list);
      seenIds.current = new Set(list.map((s) => s.id));
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Load failed');
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [lane]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) {
      setStreamOk(false);
      return;
    }
    const es = new EventSource('/api/openclaw/computer-stream');
    const onErr = () => {
      setStreamOk(false);
      setStreamErr('Stream disconnected (retrying…)');
    };
    es.addEventListener('open', () => {
      setStreamOk(true);
      setStreamErr(null);
    });
    es.addEventListener('error', onErr);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          type?: string;
          step?: ComputerStep;
          message?: string;
        };
        if (msg.type === 'ready') {
          setStreamOk(true);
          setStreamErr(null);
          return;
        }
        if (msg.type === 'error' && msg.message) {
          setStreamErr(msg.message);
          return;
        }
        if (msg.type === 'step' && msg.step) {
          const s = msg.step;
          if (lane !== 'all' && s.lane !== lane) return;
          if (seenIds.current.has(s.id)) return;
          seenIds.current.add(s.id);
          setSteps((prev) => {
            const next = [s, ...prev];
            return next.length > STEP_BUFFER ? next.slice(0, STEP_BUFFER) : next;
          });
        }
      } catch {
        // ignore
      }
    };
    return () => {
      es.removeEventListener('error', onErr);
      es.close();
    };
  }, [live, lane]);

  const filtered = useMemo(() => {
    if (lane === 'all') return steps;
    return steps.filter((s) => s.lane === lane);
  }, [steps, lane]);

  const externalLinks = useMemo(
    () => [
      {
        href: canvasUrl(),
        label: 'Gateway canvas',
        hint: 'Hosted UI surface on the gateway',
        icon: MonitorPlay,
      },
      {
        href: browserControlUrl(),
        label: 'Browser control',
        hint: 'Often blocked in iframes; open in a new tab',
        icon: Globe,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 lg:px-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/35">
            <MonitorPlay className="h-5 w-5 text-violet-300" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-50">
              Computer
            </h1>
            <p className="text-sm text-slate-500">
              Structured lanes from today&apos;s OpenClaw JSONL log — similar in spirit to
              Manus&apos;s live computer panel and Perplexity Computer&apos;s multi-surface
              view (local, read-only).
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {LANES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setLane(id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors',
              lane === id
                ? 'bg-slate-100 text-slate-900 ring-slate-200'
                : 'bg-slate-800/80 text-slate-400 ring-slate-700 hover:text-slate-200',
            )}
          >
            {label}
          </button>
        ))}
        <span className="mx-2 hidden h-4 w-px bg-slate-700 sm:inline" />
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1',
            live
              ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/35'
              : 'bg-slate-800 text-slate-400 ring-slate-700',
          )}
        >
          <Radio className="h-3.5 w-3.5" aria-hidden />
          Live {live ? 'on' : 'off'}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-600 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            aria-hidden
          />
          Refresh
        </button>
        <span className="text-xs text-slate-500">
          {live && (
            <>
              SSE {streamOk ? 'connected' : 'connecting…'}
              {streamErr ? ` · ${streamErr}` : ''}
            </>
          )}
        </span>
      </div>

      {fetchError && (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {fetchError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="min-h-[420px] rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-medium text-slate-200">Activity</h2>
            <p className="text-xs text-slate-500">
              {filtered.length} step{filtered.length === 1 ? '' : 's'} · newest first
            </p>
          </div>
          <ul className="max-h-[min(70vh,720px)] divide-y divide-slate-800/80 overflow-y-auto">
            {loading && !steps.length ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                Loading…
              </li>
            ) : filtered.length === 0 ? (
              <li className="px-4 py-10 text-center">
                <p className="text-sm text-slate-400 font-medium">No steps for this filter</p>
                <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
                  OpenClaw logs must exist under <code className="text-slate-400">OPENCLAW_LOG_DIR</code>.
                  The default path is <code className="text-slate-400">C:\tmp\openclaw</code>.
                  Set <code className="text-slate-400">OPENCLAW_LOG_DIR</code> in{' '}
                  <code className="text-slate-400">.env.local</code> if your logs are elsewhere.
                </p>
                <a
                  href="/settings"
                  className="mt-3 inline-block text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-2"
                >
                  Check log directory in Settings
                </a>
              </li>
            ) : (
              filtered.map((s) => (
                <li key={s.id} className="px-4 py-3 hover:bg-slate-800/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
                        laneStyles(s.lane),
                      )}
                    >
                      {s.lane}
                    </span>
                    <span className="text-sm font-medium text-slate-100">
                      {s.title}
                    </span>
                    <span className="text-[11px] text-slate-500" title={s.ingestedAt ? 'Ingested at (no log timestamp available)' : 'Log time'}>
                      {s.ingestedAt ? '~' : ''}{s.timestamp || '—'}
                    </span>
                  </div>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-400">
                    {s.detail}
                  </pre>
                  {s.urls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.urls.map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                        >
                          {u}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-sm font-medium text-slate-200">Surfaces</h2>
            <p className="mt-1 text-xs text-slate-500">
              Open in new tabs. Embedding localhost in iframes often fails (X-Frame-Options /
              mixed content).
            </p>
            <ul className="mt-3 space-y-2">
              {externalLinks.map(({ href, label, hint, icon: Icon }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 transition-colors hover:border-slate-600 hover:bg-slate-800/40"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <span className="block text-sm font-medium text-slate-200">
                        {label}
                      </span>
                      <span className="text-[11px] text-slate-500">{hint}</span>
                    </span>
                    <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-600" />
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/chat"
                  className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 transition-colors hover:border-slate-600 hover:bg-slate-800/40"
                >
                  <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    <span className="block text-sm font-medium text-slate-200">
                      Live run
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Raw log + chat in Mission Control
                    </span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-4 text-xs text-slate-500">
            <p className="font-medium text-slate-400">Skills & automation</p>
            <p className="mt-2">
              Use workspace skill <code className="text-slate-400">computer-use-mission-control</code>{' '}
              for agent-browser CLI, Playwright MCP, and this dashboard.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
