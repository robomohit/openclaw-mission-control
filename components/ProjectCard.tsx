'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Gauge,
  Link2,
  ListPlus,
  PlusCircle,
} from 'lucide-react';

import { LinkTasksToProjectModal } from '@/components/LinkTasksToProjectModal';
import { TaskEditorModal } from '@/components/TaskEditorModal';
import { cn } from '@/lib/utils';
import type { Project, Task } from '@/lib/types';
import { formatShortDate, priorityLabel, useMissionControl } from '@/lib/store';

function dueDateOneWeekOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function ProjectCard({
  project,
  onAdjustProgress,
}: {
  project: Project;
  onAdjustProgress?: (id: string, value: number) => void;
}) {
  const { userAssigneeId } = useMissionControl();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [linkTasksOpen, setLinkTasksOpen] = useState(false);
  const [newTaskDefaults, setNewTaskDefaults] = useState<
    Partial<Task> | undefined
  >();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const openCreateTask = () => {
    setMenuOpen(false);
    setNewTaskDefaults({
      projectId: project.id,
      assigneeId: userAssigneeId,
      assigneeType: 'user',
      dueDate: dueDateOneWeekOut(),
    });
    setCreateTaskOpen(true);
  };

  const healthLabel =
    project.health === 'healthy'
      ? 'On track'
      : project.health === 'attention'
        ? 'Needs attention'
        : 'Neglected';

  const healthStyles =
    project.health === 'healthy'
      ? 'text-emerald-300 ring-emerald-500/30 bg-emerald-500/10'
      : project.health === 'attention'
        ? 'text-amber-200 ring-amber-500/30 bg-amber-500/10'
        : 'text-rose-200 ring-rose-500/35 bg-rose-500/10';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/30 ring-1 ring-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">
            {project.name}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{project.description}</p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              Actions
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-slate-400 transition',
                  menuOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 py-1 shadow-xl shadow-black/40 ring-1 ring-white/10"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={openCreateTask}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  <PlusCircle className="h-4 w-4 text-sky-400" aria-hidden />
                  Create task
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setLinkTasksOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  <ListPlus className="h-4 w-4 text-violet-400" aria-hidden />
                  Link existing task
                </button>
              </div>
            )}
          </div>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium ring-1',
              healthStyles,
            )}
          >
            {healthLabel}
          </span>
        </div>
      </div>

      <TaskEditorModal
        open={createTaskOpen}
        initial={null}
        newTaskDefaults={newTaskDefaults}
        onClose={() => {
          setCreateTaskOpen(false);
          setNewTaskDefaults(undefined);
        }}
      />
      <LinkTasksToProjectModal
        open={linkTasksOpen}
        project={project}
        onClose={() => setLinkTasksOpen(false)}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-slate-300 ring-1 ring-slate-700/80">
          Priority {priorityLabel(project.priority)}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Last worked {formatShortDate(project.lastWorkedOn)}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" aria-hidden />
            Progress
          </span>
          <span className="font-semibold text-slate-200">{project.progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {onAdjustProgress && (
          <input
            type="range"
            min={0}
            max={100}
            value={project.progress}
            onChange={(e) =>
              onAdjustProgress(project.id, Number(e.target.value))
            }
            className="mt-3 w-full accent-sky-500"
            aria-label={`Adjust progress for ${project.name}`}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-3 w-3" aria-hidden />
          Tasks {project.linkedTaskIds.length}
        </span>
        <span>Docs {project.linkedDocIds.length}</span>
        <span>Memories {project.linkedMemoryIds.length}</span>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Suggested next action
        </p>
        <p className="mt-1 text-sm text-slate-200">{project.suggestedNextAction}</p>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          What should we do next?
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <Milestones project={project} />

      {project.health === 'neglected' && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            This project has gone quiet recently. Consider a small win this week
            to rebuild momentum.
          </p>
        </div>
      )}
    </motion.article>
  );
}

function Milestones({ project }: { project: Project }) {
  const { tasks } = useMissionControl();
  const doneCount = project.milestones.filter((m) => m.done).length;

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Milestones</span>
        <span>
          {doneCount}/{project.milestones.length} done ·{' '}
          {tasks.filter((t) => project.linkedTaskIds.includes(t.id)).length}{' '}
          linked tasks
        </span>
      </div>
      <ul className="mt-2 space-y-2">
        {project.milestones.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-xs"
          >
            <span
              className={cn(
                'font-medium',
                m.done ? 'text-slate-500 line-through' : 'text-slate-200',
              )}
            >
              {m.title}
            </span>
            <span className="text-slate-500">{m.dueDate}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
