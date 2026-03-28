'use client';

import { X, Bot, Cpu, Clock, Sparkles, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/types';
import { useMissionControl, formatShortDate } from '@/lib/store';

const roleLabel: Record<Agent['role'], string> = {
  main: 'Main agent',
  sub: 'Sub-agent',
  worker: 'Worker',
};

export function AgentDetailModal({
  agent,
  open,
  onClose,
}: {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}) {
  const { activities, tasks } = useMissionControl();

  if (!open || !agent) return null;

  const agentActivities = activities
    .filter((a) => a.agentId === agent.id)
    .slice(0, 5);

  const completedTasks = tasks.filter(
    (t) => t.assigneeId === agent.id && t.status === 'done',
  ).length;

  const currentTask = tasks.find(
    (t) =>
      t.assigneeId === agent.id &&
      (t.status === 'in_progress' || t.status === 'review'),
  );

  const statusColor =
    agent.status === 'active'
      ? 'text-emerald-300 bg-emerald-500/10'
      : agent.status === 'busy'
        ? 'text-sky-300 bg-sky-500/10'
        : agent.status === 'idle'
          ? 'text-slate-300 bg-slate-800/80'
          : 'text-slate-500 bg-slate-900/80';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl ring-1 ring-white/10"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-white/10"
              style={{ backgroundColor: `${agent.avatarColor}22` }}
            >
              <Bot
                className="h-6 w-6"
                style={{ color: agent.avatarColor }}
                aria-hidden
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-50">
                {agent.name}
              </h2>
              <p className="text-xs text-slate-500">{roleLabel[agent.role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
            <p className="text-[11px] text-slate-500">Status</p>
            <span
              className={cn(
                'mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase',
                statusColor,
              )}
            >
              {agent.status}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
            <p className="text-[11px] text-slate-500">Tasks Done</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {completedTasks}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
            <p className="text-[11px] text-slate-500">Model</p>
            <p className="mt-1 truncate text-xs font-medium text-slate-200">
              {agent.model}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <p className="text-[11px] font-medium text-slate-500">
                Specialty
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-200">{agent.specialty}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-violet-400" />
              <p className="text-[11px] font-medium text-slate-500">
                Current Task
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-200">
              {currentTask?.title ?? agent.currentWork ?? 'No active task'}
            </p>
          </div>

          {agent.lastSeen && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <p className="text-[11px] font-medium text-slate-500">
                  Last Seen
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-200">
                {formatShortDate(agent.lastSeen)}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <p className="text-[11px] font-medium text-slate-500">
                Recent Activity
              </p>
            </div>
            {agentActivities.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No recent activity logged.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {agentActivities.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <span className="text-slate-300">{a.message}</span>
                    <span className="shrink-0 text-slate-600">
                      {formatShortDate(a.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {agent.capabilities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {agent.capabilities.map((c) => (
              <span
                key={c}
                className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-700/70"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
