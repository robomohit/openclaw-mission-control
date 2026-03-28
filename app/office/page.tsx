'use client';

import { useStore } from '@/lib/store';
import { OfficeAvatar } from '@/components/OfficeAvatar';
import { useEffect, useState } from 'react';
import type { OfficeZone } from '@/lib/types';

export default function OfficePage() {
  const { agents, tasks, office } = useStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Count active/busy agents for meeting zone highlight
  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'busy').length;

  // Build agent position map from state
  const posMap = new Map(office.agentPositions.map(p => [p.agentId, p]));

  // Fallback grid for agents without positions
  const cols = Math.ceil(Math.sqrt(agents.length));
  const cellW = 100 / cols;
  const cellH = 100 / Math.ceil(agents.length / cols);

  const getAgentState = (agentId: string, idx: number) => {
    const task = tasks.find(t => t.assigneeId === agentId && t.status === 'in_progress');
    const pos = posMap.get(agentId);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      active: !!task,
      currentTask: task?.title || null,
      xPct: pos?.xPct ?? (col + 0.5) * cellW,
      yPct: pos?.yPct ?? (row + 0.5) * cellH,
      zoneId: pos?.zoneId ?? 'z-north',
    };
  };

  const zoneMap = new Map(office.zones.map(z => [z.id, z]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Office</h1>
          <p className="text-slate-400">Visual workspace — see agents at work</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500">{activeCount} agent{activeCount !== 1 ? 's' : ''} active</div>
          <div className="text-slate-400 text-sm font-mono">{time.toLocaleTimeString()}</div>
        </div>
      </div>
      <div className="relative h-[600px] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        {/* Background office elements */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 50%)' }}></div>

        {/* Zone outlines */}
        {office.zones.map(zone => (
          <div
            key={zone.id}
            className="absolute rounded-lg border border-dashed border-slate-700/40"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.w}%`,
              height: `${zone.h}%`,
            }}
          >
            <span className="absolute top-1 left-2 text-[9px] text-slate-600 uppercase tracking-wider">{zone.label}</span>
          </div>
        ))}

        {/* Meeting zone highlight — glows when 2+ agents are active */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-16 rounded-lg border flex items-center justify-center transition-colors duration-500 ${
          activeCount >= 2 ? 'bg-sky-900/40 border-sky-500/60 shadow-lg shadow-sky-500/10' : 'bg-slate-800/30 border-slate-700/40'
        }`}>
          <span className="text-slate-400 text-sm">
            {activeCount >= 2 ? `🤝 Huddle — ${activeCount} agents collaborating` : 'Huddle'}
          </span>
        </div>

        {/* Agent avatars */}
        {agents.map((agent, idx) => {
          const state = getAgentState(agent.id, idx);
          const zone = zoneMap.get(state.zoneId) ?? office.zones[0];
          return (
            <div key={agent.id} style={{ position: 'absolute', left: `${zone.x + (zone.w * state.xPct) / 100}%`, top: `${zone.y + (zone.h * state.yPct) / 100}%`, transform: 'translate(-50%, -50%)' }}>
              <OfficeAvatar
                agent={agent}
                zone={zone}
                xPct={state.xPct}
                yPct={state.yPct}
                dimmed={agent.status === 'idle' || agent.status === 'offline'}
              />
            </div>
          );
        })}
      </div>
      <div className="text-sm text-slate-500 flex items-center gap-4">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Active</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-slate-500" /> Idle</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-slate-700" /> Offline</span>
        <span className="ml-auto text-slate-600">Hover an agent for details</span>
      </div>
    </div>
  );
}
