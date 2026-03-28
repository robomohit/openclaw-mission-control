'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import type { Project, Task } from '@/lib/types';
import { useMissionControl } from '@/lib/store';

function isTaskLinkedToProject(task: Task, project: Project): boolean {
  return (
    task.projectId === project.id ||
    (task.relatedProjectIds ?? []).includes(project.id) ||
    project.linkedTaskIds.includes(task.id)
  );
}

export function LinkTasksToProjectModal({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project;
  onClose: () => void;
}) {
  const { tasks, linkTasksToProject, addActivity, getProject } =
    useMissionControl();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = useMemo(
    () => tasks.filter((t) => !isTaskLinkedToProject(t, project)),
    [tasks, project],
  );

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, project.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    const ids = [...selected];
    if (ids.length === 0) {
      onClose();
      return;
    }
    linkTasksToProject(project.id, ids);
    addActivity(
      'agent-main',
      `Linked ${ids.length} task(s) to project: ${project.name}`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-black/60 ring-1 ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-tasks-title"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 p-4">
          <h2
            id="link-tasks-title"
            className="text-lg font-semibold text-slate-50"
          >
            Link tasks to {project.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="px-4 pt-3 text-xs text-slate-500">
          Showing tasks not yet tied to this project (primary, related, or
          linked list).
        </p>
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-400">
              No unlinked tasks — every task already references this project.
            </p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggle(t.id)}
                      className="mt-1 accent-sky-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-100">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {t.status.replace('_', ' ')} ·{' '}
                        {getProject(t.projectId)?.name ?? t.projectId}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={confirm}
            disabled={selected.size === 0}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Link {selected.size > 0 ? `${selected.size} ` : ''}task
            {selected.size === 1 ? '' : 's'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
