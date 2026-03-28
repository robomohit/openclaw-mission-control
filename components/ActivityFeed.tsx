'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useOpenClawStatus } from '@/lib/useOpenClawStatus';

interface Activity {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
  source: 'local' | 'openclaw';
}

export function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const { agents, activities: localActivities } = useStore();
  const { activities: openclawActivities } = useOpenClawStatus();

  const merged = useMemo(() => {
    const openclaw = openclawActivities.error ? [] : openclawActivities.data;
    const combined: Activity[] = [
      ...localActivities.map((a) => ({ ...a, source: 'local' as const })),
      ...openclaw,
    ];
    const ts = (iso: string) => {
      const t = Date.parse(iso);
      return Number.isFinite(t) ? t : 0;
    };
    combined.sort((a, b) => ts(b.timestamp) - ts(a.timestamp));
    return combined;
  }, [localActivities, openclawActivities.data, openclawActivities.error]);

  const items = merged.slice(0, limit);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ring-1 ring-white/5">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-sky-400" aria-hidden />
        <h3 className="text-sm font-semibold text-slate-100">Live activity</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Recent agent actions {items.some(i => i.source === 'openclaw') && '(including OpenClaw)'}.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((a) => {
          const agent = agents.find((g) => g.id === a.agentId);
          return (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
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
                  <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {a.source}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(a.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {a.message}
              </p>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
