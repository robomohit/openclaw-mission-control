'use client';

import { Activity, Bot, CalendarClock, Zap } from 'lucide-react';

import { formatShortDate, useMissionControl } from '@/lib/store';

export function TopBar() {
  const { user, stats, activities } = useMissionControl();
  const latest = activities[0];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/25">
            <Bot className="h-5 w-5 text-emerald-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">
              {user.agentStatus}
            </p>
            <p className="truncate text-xs text-slate-500">
              Logged in as {user.name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <StatPill
            icon={Zap}
            label="Active tasks"
            value={String(stats.activeTasks)}
            tone="sky"
          />
          <StatPill
            icon={CalendarClock}
            label="Scheduled today"
            value={String(stats.scheduledToday)}
            tone="violet"
          />
          <StatPill
            icon={Activity}
            label="Agents active"
            value={String(stats.agentsActive)}
            tone="emerald"
          />
        </div>
        <div className="hidden w-full max-w-md text-right text-xs text-slate-500 lg:block">
          {latest ? (
            <span>
              Recent: {latest.message}{' '}
              <span className="text-slate-600">
                · {formatShortDate(latest.timestamp)}
              </span>
            </span>
          ) : (
            <span>No recent activity yet.</span>
          )}
        </div>
      </div>
    </header>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  tone: 'sky' | 'violet' | 'emerald';
}) {
  const tones: Record<
    typeof tone,
    { ring: string; bg: string; icon: string }
  > = {
    sky: {
      ring: 'ring-sky-500/25',
      bg: 'bg-sky-500/10',
      icon: 'text-sky-400',
    },
    violet: {
      ring: 'ring-violet-500/25',
      bg: 'bg-violet-500/10',
      icon: 'text-violet-300',
    },
    emerald: {
      ring: 'ring-emerald-500/25',
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
    },
  };
  const t = tones[tone];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${t.bg} ring-1 ${t.ring}`}
    >
      <Icon className={`h-3.5 w-3.5 ${t.icon}`} aria-hidden />
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-100">{value}</span>
    </div>
  );
}
