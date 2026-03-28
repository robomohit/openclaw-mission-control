'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import type { Priority, Task, TaskStatus } from '@/lib/types';
import {
  priorityLabel,
  taskStatusLabel,
  useMissionControl,
} from '@/lib/store';

function emptyTask(defaults: { userAssigneeId: string }): Task {
  return {
    id: `task-${Date.now()}`,
    title: '',
    description: '',
    assigneeId: defaults.userAssigneeId,
    assigneeType: 'user',
    priority: 'medium',
    projectId: '',
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'backlog',
    tags: [],
    relatedDocIds: [],
    relatedProjectIds: [],
    relatedMemoryIds: [],
    waitingForHumanReview: false,
  };
}

function mergeNewTask(
  userAssigneeId: string,
  partial?: Partial<Task>,
): Task {
  const base = emptyTask({ userAssigneeId });
  if (!partial) return base;
  const merged: Task = {
    ...base,
    ...partial,
    id: base.id,
    relatedDocIds: partial.relatedDocIds ?? base.relatedDocIds,
    relatedMemoryIds: partial.relatedMemoryIds ?? base.relatedMemoryIds,
    relatedProjectIds:
      partial.relatedProjectIds ?? base.relatedProjectIds ?? [],
    tags: partial.tags ?? base.tags,
  };
  return merged;
}

export function TaskEditorModal({
  open,
  initial,
  newTaskDefaults,
  onClose,
}: {
  open: boolean;
  initial: Task | null;
  /** When creating (`initial` is null), shallow-merge onto the empty task template. */
  newTaskDefaults?: Partial<Task>;
  onClose: () => void;
}) {
  const {
    upsertTask,
    moveTask,
    deleteTask,
    projects,
    agents,
    userAssigneeId,
    addActivity,
  } = useMissionControl();

  const [form, setForm] = useState<Task>(() =>
    initial
      ? { ...initial, relatedProjectIds: initial.relatedProjectIds ?? [] }
      : mergeNewTask(userAssigneeId, newTaskDefaults),
  );

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { ...initial, relatedProjectIds: initial.relatedProjectIds ?? [] }
          : mergeNewTask(userAssigneeId, newTaskDefaults),
      );
    }
  }, [open, initial, newTaskDefaults, userAssigneeId]);

  if (!open) return null;

  const isNew = !initial;

  const save = () => {
    if (!form.title.trim() || !form.projectId) return;
    upsertTask(form);
    addActivity(
      form.assigneeType === 'agent' ? form.assigneeId : 'agent-main',
      `${isNew ? 'Created' : 'Updated'} task: ${form.title}`,
    );
    onClose();
  };

  const remove = () => {
    if (initial) deleteTask(initial.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl shadow-black/60 ring-1 ring-white/10"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-50">
            {isNew ? 'New task' : 'Edit task'}
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

        <div className="mt-4 space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Title</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-0 focus:border-sky-500"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Description</span>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Status</span>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as TaskStatus })
                }
              >
                {(
                  [
                    'backlog',
                    'in_progress',
                    'review',
                    'done',
                  ] as TaskStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {taskStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Priority</span>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as Priority })
                }
              >
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {priorityLabel(p)}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Project</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.projectId}
              onChange={(e) => {
                const projectId = e.target.value;
                setForm({
                  ...form,
                  projectId,
                  relatedProjectIds: (form.relatedProjectIds ?? []).filter(
                    (id) => id !== projectId,
                  ),
                });
              }}
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <legend className="px-1 text-xs text-slate-500">
              Related projects
            </legend>
            <p className="text-[11px] text-slate-600">
              Optional extra projects (primary is above). Same pattern as linked
              docs.
            </p>
            <ul className="max-h-32 space-y-1.5 overflow-y-auto">
              {projects
                .filter((p) => p.id !== form.projectId)
                .map((p) => {
                  const checked = (form.relatedProjectIds ?? []).includes(p.id);
                  return (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const cur = new Set(form.relatedProjectIds ?? []);
                            if (checked) cur.delete(p.id);
                            else cur.add(p.id);
                            setForm({
                              ...form,
                              relatedProjectIds: [...cur],
                            });
                          }}
                          className="accent-sky-500"
                        />
                        {p.name}
                      </label>
                    </li>
                  );
                })}
            </ul>
            {projects.filter((p) => p.id !== form.projectId).length === 0 && (
              <p className="text-xs text-slate-500">
                Pick a primary project to link others here.
              </p>
            )}
          </fieldset>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Assignee</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={`${form.assigneeType}:${form.assigneeId}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split(':') as [
                  'user' | 'agent',
                  string,
                ];
                setForm({
                  ...form,
                  assigneeType: type,
                  assigneeId: id,
                });
              }}
            >
              <option value={`user:${userAssigneeId}`}>You</option>
              {agents.map((a) => (
                <option key={a.id} value={`agent:${a.id}`}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Due date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Tags (comma separated)</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.tags.join(', ')}
              onChange={(e) =>
                setForm({
                  ...form,
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>

        {!isNew && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => {
                if (!form.title.trim() || !form.projectId) return;
                upsertTask(form);
                moveTask(form.id, 'review');
                addActivity(
                  form.assigneeType === 'agent' ? form.assigneeId : 'agent-main',
                  `Requested review: ${form.title}`,
                );
                onClose();
              }}
              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/25"
            >
              Request review
            </button>
            <button
              type="button"
              onClick={() => {
                if (!form.title.trim() || !form.projectId) return;
                upsertTask(form);
                moveTask(form.id, 'in_progress');
                addActivity(
                  form.assigneeType === 'agent' ? form.assigneeId : 'agent-main',
                  `Started work: ${form.title}`,
                );
                onClose();
              }}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25"
            >
              Start work
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Save
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={remove}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20"
            >
              Delete
            </button>
          )}
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
