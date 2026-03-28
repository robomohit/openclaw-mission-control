'use client';

import { motion } from 'framer-motion';
import { Bot, Clock, Activity } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import type { Agent, OfficeZone } from '@/lib/types';

const statusLabel: Record<string, string> = {
  active: 'Active',
  busy: 'Busy',
  idle: 'Idle',
  offline: 'Offline',
};

export function OfficeAvatar({
  agent,
  zone,
  xPct,
  yPct,
  dimmed,
}: {
  agent: Agent;
  zone: OfficeZone;
  xPct: number;
  yPct: number;
  dimmed?: boolean;
}) {
  const active = agent.status === 'active' || agent.status === 'busy';
  const idle = agent.status === 'idle';
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{
        left: `${zone.x + (zone.w * xPct) / 100}%`,
        top: `${zone.y + (zone.h * yPct) / 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      animate={{
        scale: active ? 1 : 0.96,
        opacity: dimmed ? 0.4 : 1,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-xl border bg-slate-900/90 shadow-lg shadow-black/40 ring-2 ring-white/10 transition-all duration-300',
          active
            ? 'border-emerald-500/50 ring-emerald-400/40 animate-pulse-slow'
            : idle
              ? 'border-slate-700/60 animate-idle-glow'
              : 'border-slate-700',
        )}
        style={{ backgroundColor: `${agent.avatarColor}33` }}
      >
        <Bot className="h-7 w-7" style={{ color: agent.avatarColor }} aria-hidden />
        {active && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        )}
      </div>
      <div className="mt-1 max-w-[120px] text-center">
        <p className="text-[10px] font-semibold text-slate-100">{agent.name}</p>
        <p className="line-clamp-2 text-[9px] text-slate-500">{agent.currentWork}</p>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-20 left-1/2 z-50 w-56 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: agent.avatarColor }}>
              <Bot className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-slate-100">{agent.name}</span>
            <span className={cn(
              'ml-auto text-[10px] px-1.5 py-0.5 rounded-full',
              active ? 'bg-emerald-500/20 text-emerald-400' : idle ? 'bg-slate-600/40 text-slate-400' : 'bg-slate-700 text-slate-500'
            )}>
              {statusLabel[agent.status]}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <Activity className="h-3 w-3 text-slate-500" />
              <span className="truncate">{agent.currentWork}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Clock className="h-3 w-3" />
              <span>{agent.model}</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
