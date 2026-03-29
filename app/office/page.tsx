'use client';

import { useStore } from '@/lib/store';
import { OfficeAvatar } from '@/components/OfficeAvatar';
import { AgentDetailModal } from '@/components/AgentDetailModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect, useMemo, useState } from 'react';
import type { Agent } from '@/lib/types';

export default function OfficePage() {
  const { agents, tasks, office } = useStore();
  const [time, setTime] = useState(new Date());
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeCount = agents.filter(
    (a) => a.status === 'active' || a.status === 'busy',
  ).length;
  const reviewCount = tasks.filter((task) => task.status === 'review').length;
  const overdueCount = tasks.filter(
    (task) => task.status !== 'done' && new Date(task.dueDate).getTime() < Date.now(),
  ).length;

  const posMap = useMemo(
    () => new Map(office.agentPositions.map((p) => [p.agentId, p])),
    [office.agentPositions],
  );

  const cols = Math.max(Math.ceil(Math.sqrt(agents.length)), 1);
  const cellW = 100 / cols;
  const cellH = 100 / Math.max(Math.ceil(agents.length / cols), 1);

  const getAgentState = (agentId: string, idx: number) => {
    const task = tasks.find(
      (t) => t.assigneeId === agentId && t.status === 'in_progress',
    );
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

  const zoneMap = useMemo(
    () => new Map(office.zones.map((z) => [z.id, z])),
    [office.zones],
  );

  const zoneSummaries = useMemo(
    () =>
      office.zones.map((zone) => {
        const zoneAgents = agents.filter(
          (agent) => posMap.get(agent.id)?.zoneId === zone.id,
        );
        const activeZoneAgents = zoneAgents.filter(
          (agent) => agent.status === 'active' || agent.status === 'busy',
        ).length;
        return {
          zone,
          total: zoneAgents.length,
          active: activeZoneAgents,
        };
      }),
    [agents, office.zones, posMap],
  );

  return (
    <ErrorBoundary fallbackTitle="Office crashed">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-100">Office</h1>
            <p className="text-slate-400">
              Visual workspace — see where live work is clustering
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500">
              {activeCount} agent{activeCount !== 1 ? 's' : ''} active
            </div>
            <div className="font-mono text-sm text-slate-400">
              {time.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-sky-200/80">
              Live execution
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {activeCount}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Agents currently active or busy in the workspace.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-amber-200/80">
              Review handoffs
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {reviewCount}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Tasks that likely pull people into the huddle zone.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-rose-200/80">
              Recovery items
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {overdueCount}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Overdue tasks that need triage or reassignment.
            </p>
          </div>
        </div>

        <div className="relative h-[600px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 50%)',
            }}
          />

          {office.zones.map((zone) => (
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
              <span className="absolute left-2 top-1 text-[9px] uppercase tracking-wider text-slate-600">
                {zone.label}
              </span>
            </div>
          ))}

          <div
            className={`absolute bottom-8 left-1/2 flex h-16 w-2/3 -translate-x-1/2 items-center justify-center rounded-lg border transition-colors duration-500 ${
              activeCount >= 2
                ? 'border-sky-500/60 bg-sky-900/40 shadow-lg shadow-sky-500/10'
                : 'border-slate-700/40 bg-slate-800/30'
            }`}
          >
            <span className="text-sm text-slate-400">
              {activeCount >= 2
                ? `Huddle — ${activeCount} agents collaborating`
                : 'Huddle'}
            </span>
          </div>

          {agents.map((agent, idx) => {
            const state = getAgentState(agent.id, idx);
            const zone = zoneMap.get(state.zoneId) ?? office.zones[0];
            if (!zone) return null;
            return (
              <div
                key={agent.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedAgent(agent)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedAgent(agent);
                  }
                }}
                className="cursor-pointer"
                style={{
                  position: 'absolute',
                  left: `${zone.x + (zone.w * state.xPct) / 100}%`,
                  top: `${zone.y + (zone.h * state.yPct) / 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <OfficeAvatar
                  agent={agent}
                  zone={zone}
                  xPct={state.xPct}
                  yPct={state.yPct}
                  dimmed={
                    agent.status === 'idle' || agent.status === 'offline'
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {zoneSummaries.map(({ zone, total, active }) => (
            <div
              key={zone.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
            >
              <div className="text-sm font-medium text-slate-100">
                {zone.label}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {active} active · {total} assigned
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />{' '}
            Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />{' '}
            Idle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-700" />{' '}
            Offline
          </span>
          <span className="ml-auto text-slate-600">
            Click an agent for details
          </span>
        </div>

        <AgentDetailModal
          agent={selectedAgent}
          open={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      </div>
    </ErrorBoundary>
  );
}
