'use client';

import { motion } from 'framer-motion';
import {
  Bot,
  Clock,
  Coins,
  Cpu,
  GitBranch,
  Link2,
  Server,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/types';

const roleLabel: Record<Agent['role'], string> = {
  main: 'Main agent',
  sub: 'Sub-agent',
  worker: 'Worker',
};

function formatLastSeen(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diffMin = Math.round((Date.now() - t) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 48) return `${diffH}h ago`;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(t));
}

function isLastSeenStale(iso: string | undefined): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t > 15 * 60_000;
}

export function AgentCard({
  agent,
  depth = 0,
  /** When true, emphasize gateway status / model / last seen (live merge from OpenClaw). */
  liveTelemetry = false,
}: {
  agent: Agent;
  depth?: number;
  liveTelemetry?: boolean;
}) {
  const statusColor =
    agent.status === 'active'
      ? 'text-emerald-300 ring-emerald-500/35 bg-emerald-500/10'
      : agent.status === 'busy'
        ? 'text-sky-300 ring-sky-500/35 bg-sky-500/10'
        : agent.status === 'idle'
          ? 'text-slate-300 ring-slate-600 bg-slate-800/80'
          : 'text-slate-500 ring-slate-700 bg-slate-900/80';

  const lastSeenStale = isLastSeenStale(agent.lastSeen);
  const tokenUnknown =
    agent.tokenUsage === undefined || agent.tokenUsage === null || agent.tokenUsage === 0;
  const costUnknown =
    agent.costUsd === undefined || agent.costUsd === null || agent.costUsd === 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ marginLeft: depth * 16 }}
      className={cn(
        'rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/25 ring-1 ring-white/5 transition-opacity',
        depth > 0 && 'border-l-2 border-l-sky-500/40',
        lastSeenStale && 'opacity-60 border-amber-900/35 ring-amber-900/20',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-white/10"
            style={{ backgroundColor: `${agent.avatarColor}22` }}
          >
            <Bot className="h-6 w-6" style={{ color: agent.avatarColor }} aria-hidden />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {roleLabel[agent.role]}
            </p>
            <h3 className="text-base font-semibold text-slate-50">{agent.name}</h3>
            {agent.openclawAgentId ? (
              <p className="mt-0.5 font-mono text-[10px] text-slate-500">openclaw / {agent.openclawAgentId}</p>
            ) : null}
            <p className="mt-1 text-sm text-slate-400">{agent.specialty}</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1',
            statusColor,
          )}
        >
          {agent.status}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div
          className={cn(
            'rounded-xl border border-slate-800 bg-slate-950/40 p-3',
            lastSeenStale && 'border-amber-900/30 bg-amber-950/10',
            liveTelemetry && 'ring-1 ring-sky-500/20',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500">Model</p>
                <p
                  className={cn(
                    'break-words text-sm font-medium text-slate-100',
                    liveTelemetry && 'text-sky-100',
                  )}
                >
                  {agent.model}
                </p>
              </div>
            </div>
            {agent.lastSeen ? (
              <div
                className={cn(
                  'flex shrink-0 items-start gap-1.5 rounded-lg px-2 py-1 text-right',
                  lastSeenStale ? 'bg-amber-950/40 text-amber-200/90' : 'bg-slate-800/60 text-slate-300',
                )}
              >
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Last seen
                  </p>
                  <p className="text-[11px] font-medium tabular-nums">
                    {formatLastSeen(agent.lastSeen)}
                    {lastSeenStale ? <span className="ml-1 text-amber-400/90">· stale</span> : null}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:col-span-1">
            <Server className="mt-0.5 h-4 w-4 text-indigo-300" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500">Environment</p>
              <p className="text-slate-200">{agent.environment}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <Cpu className="mt-0.5 h-4 w-4 text-violet-300" aria-hidden />
            <div>
              <p className="text-[11px] font-medium text-slate-500">Token usage</p>
              <p className={cn('font-medium', tokenUnknown ? 'text-slate-500' : 'text-slate-200')}>
                {tokenUnknown ? 'unknown' : agent.tokenUsage!.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <Coins className="mt-0.5 h-4 w-4 text-amber-300/90" aria-hidden />
            <div>
              <p className="text-[11px] font-medium text-slate-500">Cost (USD)</p>
              <p className={cn('font-medium', costUnknown ? 'text-slate-500' : 'text-slate-200')}>
                {costUnknown
                  ? 'unknown'
                  : new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    }).format(agent.costUsd!)}
              </p>
            </div>
          </div>
        </div>

        {(tokenUnknown || costUnknown) && (
          <p className="text-[11px] leading-snug text-slate-500">
            Token and cost show as unknown when not set or zero — placeholder until real usage
            ingestion is wired.
          </p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Current work
        </p>
        <p className="mt-1 text-sm text-slate-100">{agent.currentWork}</p>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/30 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Handoff rules
        </p>
        <p className="mt-1 text-sm text-slate-300">{agent.handoffRules}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {agent.capabilities.map((c) => (
          <span
            key={c}
            className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-700/70"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
        <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Handles routed tasks via Mission Control assignments.</span>
        <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {agent.parentId ? (
          <span className="text-slate-500">Reports to parent agent</span>
        ) : (
          <span className="text-slate-500">Root orchestrator</span>
        )}
        <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </div>
    </motion.article>
  );
}
