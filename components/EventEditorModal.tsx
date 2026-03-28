'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import type { CalendarEvent, CalendarEventKind } from '@/lib/types';
import { useMissionControl } from '@/lib/store';

function emptyEvent(): CalendarEvent {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    id: `cal-${Date.now()}`,
    title: '',
    start: start.toISOString(),
    end: end.toISOString(),
    kind: 'human_task',
    taskId: null,
    projectId: null,
    why: '',
    confirmed: true,
    status: 'active',
  };
}

const kinds: CalendarEventKind[] = [
  'human_task',
  'agent_automation',
  'cron',
  'recurring',
  'proactive',
];

export function EventEditorModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: CalendarEvent | null;
  onClose: () => void;
}) {
  const {
    upsertCalendarEvent,
    deleteCalendarEvent,
    tasks,
    projects,
    addActivity,
  } = useMissionControl();

  const [form, setForm] = useState<CalendarEvent>(() =>
    initial ?? emptyEvent(),
  );

  useEffect(() => {
    if (open) {
      setForm(initial ?? emptyEvent());
    }
  }, [open, initial]);

  if (!open) return null;

  const isNew = !initial;

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fromLocalInput = (s: string) => new Date(s).toISOString();

  const save = () => {
    if (!form.title.trim()) return;
    upsertCalendarEvent(form);
    addActivity(
      'agent-ops',
      `${isNew ? 'Scheduled' : 'Updated'} event: ${form.title}`,
    );
    onClose();
  };

  const remove = () => {
    if (initial) deleteCalendarEvent(initial.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-50">
            {isNew ? 'New schedule' : 'Edit schedule'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Title</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Kind</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.kind}
              onChange={(e) =>
                setForm({
                  ...form,
                  kind: e.target.value as CalendarEventKind,
                })
              }
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Start</span>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                value={toLocalInput(form.start)}
                onChange={(e) =>
                  setForm({ ...form, start: fromLocalInput(e.target.value) })
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">End</span>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                value={toLocalInput(form.end)}
                onChange={(e) =>
                  setForm({ ...form, end: fromLocalInput(e.target.value) })
                }
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Why / notes</span>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.why}
              onChange={(e) => setForm({ ...form, why: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Project (optional)</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.projectId ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  projectId: e.target.value || null,
                })
              }
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Linked task (optional)</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={form.taskId ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  taskId: e.target.value || null,
                })
              }
            >
              <option value="">None</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) =>
                setForm({ ...form, confirmed: e.target.checked })
              }
            />
            Confirmed on calendar
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.status === 'paused'}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.checked ? 'paused' : 'active',
                })
              }
            />
            Paused
          </label>
        </div>

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
              Remove
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
