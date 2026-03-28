'use client';

import { useStore } from '@/lib/store';
import { ProjectCard } from '@/components/ProjectCard';
import { useState } from 'react';

export default function ProjectsPage() {
  const { projects } = useStore();
  const [filter, setFilter] = useState({ priority: '' });

  const filtered = projects.filter(p => !filter.priority || p.priority === filter.priority);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
        <select className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2" value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
