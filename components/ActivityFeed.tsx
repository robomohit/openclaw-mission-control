'use client';

import { useMemo, useState } from 'react';
import { Radio, Filter } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useOpenClawStatus } from '@/lib/useOpenClawStatus';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
  source: 'local' | 'openclaw';
  category?: 'task' | 'memory' | 'doc' | 'error' | 'general';
}

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'task', label: 'Tasks' },
  { key: 'memory', label: 'Memories' },
  { key: 'doc', label: 'Docs' },
  { key: 'error', label: 'Errors' },
] as const;

type FilterKey = (typeof filterOptions)[number]['key'];

function categorize(message: string): Activity['category'] {
  const m = message.toLowerCase();
  if (m.includes('task') || m.includes('started work') || m.includes('review')) return 'task';
  if (m.includes('memory') || m.includes('remembered')) return 'memory';
  if (m.includes('doc') || m.includes('updated doc') || m.includes('wrote')) return 'doc';
  if (m.includes('error') || m.includes('fail') || m.includes('crash')) return 'error';
  return 'general';
}

export function ActivityFeed({
  limit = 8,
  showFilters = false,
}: {
  limit?: number;
  showFilters?: boolean;
}) {
  const { agents, activities: localActivities } = useStore();
  const { activities: openclawActivities } = useOpenClawStatus();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const merged = useMemo(() => {
    const openclaw = openclawActivities.error ? [] : openclawActivities.data;
    const combined: Activity[] = [
      ...localActivities.map((a) => ({
        ...a,
        source: 'local' as const,
        category: categorize(a.message),
      })),
      ...openclaw.map((a: Activity) => ({
        ...a,
        category: categorize(a.message),
      })),
    ];
    const ts = (iso: string) => {
      const t = Date.parse(iso);
      return Number.isFinite(t) ? t : 0;
    };
    combined.sort((a, b) => ts(b.timestamp) - ts(a.timestamp));
    return combined;
  }, [localActivities, openclawActivities.data, openclawActivities.error]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return merged;
    return merged.filter((a) => a.category === activeFilter);
  }, [merged, activeFilter]);

  const items = filtered.slice(0, limit);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ring-1 ring-white/5">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-sky-400" aria-hidden />
        <h3 className="text-sm font-semibold text-slate-100">Live activity</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Recent agent actions{' '}
        {items.some((i) => i.source === 'openclaw') && '(including OpenClaw)'}.
      </p>

      {showFilters && (
        <div className="mt-3 flex flex-wrap gap-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveFilter(opt.key)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                activeFilter === opt.key
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center py-8 text-center">
          <Radio className="h-6 w-6 text-slate-700" />
          <p className="mt-2 text-xs text-slate-500">No activity yet</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((a) => {
            const agent = agents.find((g) => g.id === a.agentId);
            return (
              <li
                key={a.id}
                className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: agent?.avatarColor ?? '#94a3b8' }}
                  >
                    {agent?.name ?? a.agentId}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                      {a.source}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(a.timestamp).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
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
      )}
    </div>
  );
}
