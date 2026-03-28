'use client';

import { useStore } from '@/lib/store';
import { ProjectCard } from '@/components/ProjectCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/EmptyState';
import { useState } from 'react';
import { Briefcase } from 'lucide-react';

export default function ProjectsPage() {
  const { projects, updateProjectProgress } = useStore();
  const [filter, setFilter] = useState({ priority: '' });

  const filtered = projects.filter(p => !filter.priority || p.priority === filter.priority);

  return (
    <ErrorBoundary fallbackTitle="Projects crashed">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <select
            className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            value={filter.priority}
            onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={filter.priority ? 'No matching projects' : 'No projects yet'}
            message="Projects track progress across multiple tasks and milestones."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(project => (
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
