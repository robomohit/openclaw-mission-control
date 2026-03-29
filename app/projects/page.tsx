'use client';

import { useStore } from '@/lib/store';
import { ProjectCard } from '@/components/ProjectCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/EmptyState';
import { useMemo, useState } from 'react';
import { Briefcase } from 'lucide-react';

export default function ProjectsPage() {
  const { projects, updateProjectProgress } = useStore();
  const [filter, setFilter] = useState({ priority: '', health: '' });

  const filtered = projects.filter(
    (p) =>
      (!filter.priority || p.priority === filter.priority) &&
      (!filter.health || p.health === filter.health),
  );

  const summary = useMemo(() => {
    const onTrack = projects.filter((p) => p.health === 'healthy').length;
    const needsAttention = projects.filter(
      (p) => p.health === 'attention',
    ).length;
    const neglected = projects.filter((p) => p.health === 'neglected').length;
    const avgProgress = projects.length
      ? Math.round(
          projects.reduce((sum, p) => sum + p.progress, 0) / projects.length,
        )
      : 0;
    return { onTrack, needsAttention, neglected, avgProgress };
  }, [projects]);

  return (
    <ErrorBoundary fallbackTitle="Projects crashed">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track momentum, adjust progress, and spin up follow-up work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              value={filter.priority}
              onChange={(e) =>
                setFilter((f) => ({ ...f, priority: e.target.value }))
              }
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              value={filter.health}
              onChange={(e) =>
                setFilter((f) => ({ ...f, health: e.target.value }))
              }
            >
              <option value="">All Health</option>
              <option value="healthy">On track</option>
              <option value="attention">Needs attention</option>
              <option value="neglected">Neglected</option>
            </select>
            <button
              type="button"
              onClick={() => setFilter({ priority: '', health: '' })}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-emerald-200/80">
              On track
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {summary.onTrack}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Projects with healthy delivery momentum.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-amber-200/80">
              Attention
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {summary.needsAttention}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Workstreams that need operator help soon.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-rose-200/80">
              Neglected
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {summary.neglected}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Projects at risk of going stale.
            </p>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-sky-200/80">
              Avg progress
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {summary.avgProgress}%
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Weighted snapshot across tracked projects.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-100">
                Project operations
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use the sliders to keep progress current, then create follow-up
                tasks from each project card.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
              {filtered.length} visible project{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={
              filter.priority || filter.health
                ? 'No matching projects'
                : 'No projects yet'
            }
            message="Projects track progress across multiple tasks and milestones."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onAdjustProgress={updateProjectProgress}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
