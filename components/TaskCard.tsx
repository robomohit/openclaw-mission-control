'use client';

import {
  AlertCircle,
  Calendar,
  FolderKanban,
  Tag,
  User,
  Bot,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import {
  formatDayLabel,
  priorityLabel,
  taskStatusLabel,
  useMissionControl,
} from '@/lib/store';

export function TaskCard({
  task,
  onOpen,
  compact,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onOpen?: () => void;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const { getAgent, getProject, user } = useMissionControl();

  const assigneeName =
    task.assigneeType === 'user'
      ? user.name
      : getAgent(task.assigneeId)?.name ?? task.assigneeId;

  const project = getProject(task.projectId);

  const priorityStyles: Record<Task['priority'], string> = {
    low: 'bg-slate-700/80 text-slate-200 ring-slate-600/60',
    medium: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    high: 'bg-orange-500/15 text-orange-200 ring-orange-500/35',
    urgent: 'bg-rose-500/15 text-rose-100 ring-rose-500/40',
  };

  return (
    <article
      className={cn(
        'group rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20 ring-1 ring-white/5 transition hover:border-slate-700 hover:ring-slate-800/80',
        compact && 'p-3',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold leading-snug text-slate-50">
            {task.title}
          </h3>
          {!compact && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
              {task.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
            priorityStyles[task.priority],
          )}
        >
          {priorityLabel(task.priority)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-300 ring-1 ring-slate-700/80">
          {task.assigneeType === 'user' ? (
            <User className="h-3 w-3" aria-hidden />
          ) : (
            <Bot className="h-3 w-3" aria-hidden />
          )}
          {assigneeName}
        </span>
        {project && (
          <span className="inline-flex items-center gap-1">
            <FolderKanban className="h-3 w-3" aria-hidden />
            {project.name}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" aria-hidden />
          {formatDayLabel(task.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-400">
          {taskStatusLabel(task.status)}
        </span>
      </div>

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-700/60"
            >
              <Tag className="h-3 w-3 opacity-70" aria-hidden />
              {tag}
            </span>
          ))}
        </div>
      )}

      {(task.status === 'review' ||
        task.relatedDocIds.length > 0 ||
        (task.relatedProjectIds?.length ?? 0) > 0 ||
        task.relatedMemoryIds.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800/90 pt-3 text-[11px] text-slate-500">
          {task.status === 'review' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-200 ring-1 ring-amber-500/30">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              Awaiting human review
            </span>
          )}
          {task.relatedDocIds.length > 0 && (
            <span className="text-slate-500">
              Docs linked: {task.relatedDocIds.length}
            </span>
          )}
          {(task.relatedProjectIds?.length ?? 0) > 0 && (
            <span className="text-slate-500">
              Related projects: {task.relatedProjectIds?.length}
            </span>
          )}
          {task.relatedMemoryIds.length > 0 && (
            <span className="text-slate-500">
              Memories linked: {task.relatedMemoryIds.length}
            </span>
          )}
        </div>
      )}

      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="mt-3 w-full rounded-lg border border-slate-700/80 bg-slate-800/40 py-1.5 text-xs font-medium text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-800"
        >
          Edit
        </button>
      )}
    </article>
  );
}
