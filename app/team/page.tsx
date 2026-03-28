'use client';

import { useStore } from '@/lib/store';
import { AgentCard } from '@/components/AgentCard';
import { AgentDetailModal } from '@/components/AgentDetailModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/EmptyState';
import { useMemo, useState } from 'react';
import type { Agent } from '@/lib/types';
import { useOpenClawStatus, type OpenClawLiveAgent } from '@/lib/useOpenClawStatus';
import { Users } from 'lucide-react';

function formatMissionUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function minimalAgentFromLive(live: OpenClawLiveAgent): Agent {
  return {
    id: `live-${live.id}`,
    openclawAgentId: live.id,
    name: live.name,
    role: 'worker',
    specialty: 'OpenClaw workspace agent (no Mission Control profile)',
    capabilities: [],
    model: live.model?.trim() || '—',
    environment: 'OpenClaw',
    status: live.status,
    currentWork: '—',
    handoffRules: 'Add openclawAgentId in state to link this runtime agent to a role card.',
    parentId: null,
    avatarColor: '#64748b',
    lastSeen: live.lastSeen ?? undefined,
  };
}

function mergeLiveWithDefinition(live: OpenClawLiveAgent, def: Agent | undefined): Agent {
  if (def) {
    return {
      ...def,
      status: live.status,
      model: live.model?.trim() ? live.model : def.model,
      lastSeen: live.lastSeen ?? def.lastSeen,
    };
  }
  return minimalAgentFromLive(live);
}

export default function TeamPage() {
  const { agents: localAgents, mission } = useStore();
  const { health, agents: liveAgentsState } = useOpenClawStatus();
  const gatewayHealth = health.status;
  const liveAgents = liveAgentsState.data;
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { definitionsByOpenclawId, demoRoles } = useMemo(() => {
    const definitionsByOpenclawId: Record<string, Agent> = {};
    for (const a of localAgents) {
      if (a.openclawAgentId) definitionsByOpenclawId[a.openclawAgentId] = a;
    }
    const demoRoles = localAgents.filter((a) => !a.openclawAgentId);
    return { definitionsByOpenclawId, demoRoles };
  }, [localAgents]);

  const liveRows = useMemo(() => {
    const seen = new Set(liveAgents.map((l) => l.id));
    const missingMapped: OpenClawLiveAgent[] = localAgents
      .filter((a) => a.openclawAgentId && !seen.has(a.openclawAgentId))
      .map((a) => ({
        id: a.openclawAgentId!,
        name: a.name,
        status: 'offline' as const,
        model: undefined,
        lastSeen: null,
      }));
    return [...liveAgents, ...missingMapped];
  }, [liveAgents, localAgents]);

  const liveMerged = useMemo(
    () => liveRows.map((live) => mergeLiveWithDefinition(live, definitionsByOpenclawId[live.id])),
    [liveRows, definitionsByOpenclawId],
  );

  return (
    <ErrorBoundary fallbackTitle="Team page crashed">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Team</h1>
          <p className="text-slate-400">AI agents and their responsibilities</p>
        </div>

        <section
          className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/40 to-slate-900/60 p-5 shadow-lg shadow-black/20 ring-1 ring-sky-500/10"
          aria-labelledby="team-mission-heading"
        >
          <h2 id="team-mission-heading" className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">
            Mission
          </h2>
          <p className="mt-3 text-lg font-medium leading-relaxed text-slate-50 md:text-xl">{mission.text}</p>
          <p className="mt-4 text-xs text-slate-500">Updated {formatMissionUpdatedAt(mission.updatedAt)}</p>
        </section>

        <div
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            gatewayHealth === 'up'
              ? 'border-emerald-800 bg-emerald-900/30 text-emerald-300'
              : gatewayHealth === 'down'
                ? 'border-rose-800 bg-rose-900/30 text-rose-300'
                : 'border-slate-700 bg-slate-800 text-slate-300'
          }`}
        >
          OpenClaw gateway: {gatewayHealth === 'up' ? 'Online' : gatewayHealth === 'down' ? 'Offline' : 'Unknown'}
        </div>

        <section className="space-y-4" aria-labelledby="live-agents-heading">
          <h2 id="live-agents-heading" className="text-lg font-semibold text-slate-100">
            Live agents
          </h2>
          <p className="text-sm text-slate-500">
            Runtime agents from the OpenClaw workspace, merged with Mission Control profiles where{' '}
            <code className="rounded bg-slate-800 px-1 text-slate-300">openclawAgentId</code> matches.
          </p>
          {liveMerged.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No agents"
              message="No OpenClaw runtime entries and no mapped profiles."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {liveMerged.map((agent) => (
                <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="cursor-pointer">
                  <AgentCard agent={agent} liveTelemetry />
                </div>
              ))}
            </div>
          )}
        </section>

        {demoRoles.length > 0 && (
          <section className="space-y-4" aria-labelledby="demo-roles-heading">
            <h2 id="demo-roles-heading" className="text-lg font-semibold text-slate-100">
              Roles
            </h2>
            <p className="text-sm text-slate-500">
              Demo / template roles with no OpenClaw mapping.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {demoRoles.map((agent) => (
                <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="cursor-pointer">
                  <AgentCard agent={agent} />
                </div>
              ))}
            </div>
          </section>
        )}

        <AgentDetailModal
          agent={selectedAgent}
          open={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      </div>
    </ErrorBoundary>
  );
}
