'use client';

import { useState, useRef } from 'react';
import type { Task, TaskStatus } from '@/lib/types';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { LayoutGrid } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  allTasks: Task[];
  onTaskUpdate: (task: Task) => void;
  onEditTask?: (task: Task) => void;
}

const columns: { status: TaskStatus; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Done' },
];

export function TaskBoard({ tasks, allTasks, onTaskUpdate, onEditTask }: TaskBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    dragIdRef.current = taskId;
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
    dragIdRef.current = null;
  };

  const handleDrop = (targetStatus: TaskStatus) => {
    const id = dragIdRef.current;
    if (!id) return;

    const task = allTasks.find(t => t.id === id);
    if (!task) {
      handleDragEnd();
      return;
    }
    if (task.status !== targetStatus) {
      onTaskUpdate({ ...task, status: targetStatus });
    }
    handleDragEnd();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        const isOver = dragOverCol === col.status;
        return (
          <div
            key={col.status}
            className={cn(
              'flex flex-col rounded-xl border bg-slate-900/60 p-4 min-h-[400px] transition-colors',
              isOver
                ? 'border-sky-500/50 bg-sky-500/5'
                : 'border-slate-800',
            )}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverCol(col.status);
            }}
            onDragLeave={() => {
              setDragOverCol(prev => prev === col.status ? null : prev);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(col.status);
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-200">{col.label}</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {colTasks.length}
              </span>
            </div>
            <div className="flex-1 space-y-3">
              {colTasks.length === 0 && (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-800 p-4">
                  <p className="text-xs text-slate-600">
                    {isOver ? 'Drop here' : 'No tasks'}
                  </p>
                </div>
              )}
              {colTasks.map(task => (
                <div
                  key={task.id}
                  className={cn(
                    'transition-opacity',
                    draggingId === task.id && 'opacity-40',
                  )}
                >
                  <TaskCard
                    task={task}
                    draggable
                    onOpen={onEditTask ? () => onEditTask(task) : undefined}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
