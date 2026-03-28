'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Radio,
  Search,
  Send,
  SlidersHorizontal,
  Terminal,
  User,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  text: string;
  at: string;
}

interface LogFeedRow {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
  source: 'local' | 'openclaw';
  level?: string;
}

const LOG_BUFFER_MAX = 48_000;
const GRID_VIEWPORT = 'lg:min-h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-9rem)]';

function useOpenClawLiveLog(enabled: boolean) {
  const [logText, setLogText] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource('/api/openclaw/live-stream');
    const onOpen = () => {
      setConnected(true);
      setError(null);
    };
    const onError = () => {
      setConnected(false);
      setError('Stream disconnected (retrying…)');
    };
    es.addEventListener('open', onOpen);
    es.addEventListener('error', onError);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          type?: string;
          chunk?: string;
          message?: string;
        };
        if (msg.type === 'ready') {
          setConnected(true);
          setError(null);
          return;
        }
        if (msg.type === 'log' && typeof msg.chunk === 'string') {
          setLogText((prev) => {
            const next = prev + msg.chunk;
            if (next.length <= LOG_BUFFER_MAX) return next;
            return next.slice(-LOG_BUFFER_MAX);
          });
        }
        if (msg.type === 'error' && msg.message) {
          setError(msg.message);
        }
      } catch {
        // ignore malformed
      }
    };
    return () => {
      es.removeEventListener('open', onOpen);
      es.removeEventListener('error', onError);
      es.close();
    };
  }, [enabled]);

  return { logText, connected, error };
}

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

function buildLogFeedUrl(params: {
  q: string;
  source: 'all' | 'local' | 'openclaw';
  hideHeartbeat: boolean;
  level: string;
  limit: number;
}): string {
  const sp = new URLSearchParams();
  if (params.q.trim()) sp.set('q', params.q.trim());
  if (params.source !== 'all') sp.set('source', params.source);
  if (params.hideHeartbeat) sp.set('hideHeartbeat', '1');
  if (params.level.trim()) sp.set('level', params.level.trim());
  sp.set('limit', String(params.limit));
  sp.set('maxLines', '8000');
  sp.set('pool', '1200');
  return `/api/openclaw/log-feed?${sp.toString()}`;
}

function useLogFeed(pollMs: number) {
  const [q, setQ] = useState('');
  const [source, setSource] = useState<'all' | 'local' | 'openclaw'>('all');
  const [hideHeartbeat, setHideHeartbeat] = useState(false);
  const [level, setLevel] = useState('');
  const limit = 250;

  const debouncedQ = useDebounced(q, 350);

  const url = useMemo(
    () =>
      buildLogFeedUrl({
        q: debouncedQ,
        source,
        hideHeartbeat,
        level,
        limit,
      }),
    [debouncedQ, source, hideHeartbeat, level, limit],
  );

  const [rows, setRows] = useState<LogFeedRow[]>([]);
  const [meta, setMeta] = useState<{ poolSize?: number; returned?: number }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'log-feed failed');
        setLoading(false);
        return;
      }
      const list = Array.isArray(json.activities) ? json.activities : [];
      setRows(list as LogFeedRow[]);
      setMeta({
        poolSize: json.meta?.poolSize,
        returned: json.meta?.returned,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network error');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load(), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return {
    rows,
    meta,
    error,
    loading,
    q,
    setQ,
    source,
    setSource,
    hideHeartbeat,
    setHideHeartbeat,
    level,
    setLevel,
    reload: load,
  };
}

export default function ChatPage() {
  const { agents, user } = useStore();
  const {
    rows,
    meta,
    error: feedError,
    loading: feedLoading,
    q,
    setQ,
    source,
    setSource,
    hideHeartbeat,
    setHideHeartbeat,
    level,
    setLevel,
  } = useLogFeed(6000);
  const { logText, connected: logConnected, error: logError } =
    useOpenClawLiveLog(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logText]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendNote = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      {
        id: `u-${Date.now()}`,
        text: t,
        at: new Date().toISOString(),
      },
    ]);
    setInput('');
  }, [input]);

  return (
    <div
      className={cn(
        'mx-auto flex max-w-[1400px] flex-col gap-4',
        'min-h-0 flex-1 lg:min-h-[calc(100dvh-9rem)]',
      )}
    >
      <div className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50">
          Live run
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Filtered feed via{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300">
            GET /api/openclaw/log-feed
          </code>{' '}
          (search, source, level, hide heartbeats, time range). Raw log tail
          streams over SSE below.
        </p>
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6',
          GRID_VIEWPORT,
        )}
      >
        <section
          className={cn(
            'flex min-h-[320px] flex-col rounded-2xl border border-slate-800 bg-slate-900/50 ring-1 ring-white/5',
            'lg:min-h-0 lg:h-full',
          )}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-4 py-3">
            <User className="h-4 w-4 text-sky-400" aria-hidden />
            <span className="text-sm font-medium text-slate-200">
              Your notes
            </span>
            <span className="text-xs text-slate-500">
              {user.name ? `· ${user.name}` : ''}
            </span>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-xs text-slate-500">
                Jot context or goals you want visible beside the live run. To
                push a line into the shared activity feed for agents, use{' '}
                <code className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300">
                  node scripts/mission-control-sync.js --log &quot;…&quot;
                </code>
                .
              </p>
            )}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-slate-100"
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {new Date(msg.at).toLocaleString()}
                </p>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="shrink-0 border-t border-slate-800 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendNote();
                  }
                }}
                rows={2}
                placeholder="Shift+Enter for newline. Enter to send."
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
              <button
                type="button"
                onClick={sendNote}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-500"
                aria-label="Send note"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section
          className={cn(
            'flex min-h-[min(560px,calc(100dvh-12rem))] flex-col gap-3',
            'lg:min-h-0 lg:h-full',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 ring-1 ring-white/5',
            )}
          >
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3">
              <Radio className="h-4 w-4 text-emerald-400" aria-hidden />
              <span className="text-sm font-medium text-slate-200">
                Structured activity
              </span>
              <span className="text-[10px] uppercase text-slate-500">
                /api/openclaw/log-feed
              </span>
              {meta.poolSize != null && (
                <span className="text-[10px] text-slate-600">
                  pool {meta.poolSize} → {meta.returned ?? rows.length} rows
                </span>
              )}
              {feedLoading && (
                <span className="text-[10px] text-slate-500">loading…</span>
              )}
              {feedError && (
                <span className="text-[10px] text-amber-400">{feedError}</span>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-b border-slate-800/80 bg-slate-950/30 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter messages…"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
                  aria-label="Filter log messages"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal
                  className="h-3.5 w-3.5 text-slate-500"
                  aria-hidden
                />
                <select
                  value={source}
                  onChange={(e) =>
                    setSource(e.target.value as 'all' | 'local' | 'openclaw')
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
                  aria-label="Source"
                >
                  <option value="all">All sources</option>
                  <option value="local">Local only</option>
                  <option value="openclaw">OpenClaw log only</option>
                </select>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
                  aria-label="Log level"
                >
                  <option value="">All levels</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                  <option value="WARN,ERROR">WARN + ERROR</option>
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={hideHeartbeat}
                    onChange={(e) => setHideHeartbeat(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900"
                  />
                  Hide heartbeats
                </label>
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
              {rows.length === 0 && !feedLoading && (
                <li className="text-xs text-slate-500">
                  No rows match. Widen filters or check OpenClaw log path (
                  <code className="text-slate-600">OPENCLAW_LOG_DIR</code>).
                </li>
              )}
              {rows.map((a) => {
                const agent = agents.find(
                  (g) =>
                    g.id === a.agentId ||
                    g.openclawAgentId === a.agentId ||
                    (a.agentId === 'main' && g.openclawAgentId === 'main'),
                );
                return (
                  <li
                    key={`${a.source}-${a.id}`}
                    className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: agent?.avatarColor ?? '#94a3b8',
                        }}
                      >
                        {agent?.name ?? a.agentId}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.level && (
                          <span
                            className={cn(
                              'rounded px-1 py-0.5 text-[9px] font-semibold uppercase',
                              a.level === 'ERROR' &&
                                'bg-red-500/15 text-red-400',
                              a.level === 'WARN' &&
                                'bg-amber-500/15 text-amber-400',
                              a.level === 'INFO' &&
                                'bg-slate-700 text-slate-400',
                            )}
                          >
                            {a.level}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {a.source} ·{' '}
                          {new Date(a.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {a.message}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 ring-1 ring-white/5',
            )}
          >
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3">
              <Terminal className="h-4 w-4 text-amber-400" aria-hidden />
              <span className="text-sm font-medium text-slate-200">
                Raw log stream
              </span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                  logConnected
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-800 text-slate-500',
                )}
              >
                {logConnected ? 'sse' : '…'}
              </span>
              {logError && (
                <span className="text-[10px] text-amber-400">{logError}</span>
              )}
            </div>
            <pre className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 font-mono text-[11px] leading-relaxed text-slate-400">
              {logText || (
                <span className="text-slate-600">
                  Waiting for new log bytes under OPENCLAW_LOG_DIR (default{' '}
                  C:\tmp\openclaw)…
                </span>
              )}
              <div ref={logEndRef} />
            </pre>
          </div>

          <div className="flex shrink-0 items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-900/30 px-3 py-2 text-xs text-slate-500">
            <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden />
            <p>
              API query params:{' '}
              <code className="text-slate-400">q</code>,{' '}
              <code className="text-slate-400">source</code>,{' '}
              <code className="text-slate-400">level</code>,{' '}
              <code className="text-slate-400">hideHeartbeat</code>,{' '}
              <code className="text-slate-400">since</code>,{' '}
              <code className="text-slate-400">until</code>,{' '}
              <code className="text-slate-400">exclude</code> (comma substrings),{' '}
              <code className="text-slate-400">limit</code>,{' '}
              <code className="text-slate-400">maxLines</code>,{' '}
              <code className="text-slate-400">pool</code>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
