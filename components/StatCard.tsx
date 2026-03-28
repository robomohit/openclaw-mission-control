'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function StatSparkline({
  values,
  strokeClass,
}: {
  values: number[];
  strokeClass: string;
}) {
  const w = 100;
  const h = 28;
  const pad = 2;
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return (
    <svg
      className="mt-3 w-full max-w-[140px] opacity-90"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClass}
        points={pts.join(' ')}
      />
    </svg>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'slate',
  sparkline,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: 'slate' | 'sky' | 'violet' | 'emerald';
  /** Seven values (oldest → newest); rendered as a tiny trend line. */
  sparkline?: number[];
}) {
  const tones: Record<typeof tone, { ring: string; bg: string; icon: string; spark: string }> = {
    slate: {
      ring: 'ring-slate-700/80',
      bg: 'bg-slate-900/70',
      icon: 'text-slate-300',
      spark: 'stroke-slate-500',
    },
    sky: {
      ring: 'ring-sky-500/25',
      bg: 'bg-sky-500/10',
      icon: 'text-sky-400',
      spark: 'stroke-sky-400/80',
    },
    violet: {
      ring: 'ring-violet-500/25',
      bg: 'bg-violet-500/10',
      icon: 'text-violet-300',
      spark: 'stroke-violet-400/80',
    },
    emerald: {
      ring: 'ring-emerald-500/25',
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      spark: 'stroke-emerald-400/80',
    },
  };
  const t = tones[tone];
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-800 p-4 shadow-md shadow-black/20 ring-1',
        t.bg,
        t.ring,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/50 ring-1 ring-slate-800">
          <Icon className={cn('h-5 w-5', t.icon)} aria-hidden />
        </div>
      </div>
      {sparkline && sparkline.length > 0 && (
        <StatSparkline values={sparkline} strokeClass={t.spark} />
      )}
    </div>
  );
}
