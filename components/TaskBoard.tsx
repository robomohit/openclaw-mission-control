'use client';

import { useState } from 'react';
import { Task, TaskStatus } from '@/lib/types';
import { TaskCard } from './TaskCard';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdate: (task: Task) => void;
  onEditTask?: (task: Task) => void;
}

const columns: { status: TaskStatus; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Done' },
];

export function TaskBoard({ tasks, onTaskUpdate, onEditTask }: TaskBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDrop = (targetStatus: TaskStatus) => {
    if (!draggingId) return;
    const task = tasks.find(t => t.id === draggingId);
    if (!task) { setDraggingId(null); return; }
    if (task.status === targetStatus) {
      setDraggingId(null);
      return; // no change
    }
    onTaskUpdate({ ...task, status: targetStatus });
    setDraggingId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        return (
          <div
            key={col.status}
            className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 min-h-[400px]"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.status)}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-200">{col.label}</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {colTasks.length}
              </span>
            </div>
            <div className="flex-1 space-y-3">
              <AnimatePresence>
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    draggable
                    onOpen={onEditTask ? () => onEditTask(task) : undefined}
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => setDraggingId(null)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
