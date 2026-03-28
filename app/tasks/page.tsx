'use client';

import { useStore } from '@/lib/store';
import { TaskBoard } from '@/components/TaskBoard';
import { TaskEditorModal } from '@/components/TaskEditorModal';
import { useState } from 'react';
import type { Task } from '@/lib/types';

export default function TasksPage() {
  const { tasks, moveTask, upsertTask } = useStore();
  const [filter, setFilter] = useState({ status: '', assignee: '', priority: '' });
  const [boardTab, setBoardTab] = useState<'all' | 'needs_review'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter(t => {
    if (boardTab === 'needs_review' && t.status !== 'review') return false;
    if (boardTab === 'all' && filter.status && t.status !== filter.status) return false;
    if (filter.assignee && t.assigneeId !== filter.assignee) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Task Board</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Create a new task with sensible defaults
              const now = new Date();
              const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              const dueDate = nextWeek.toISOString().split('T')[0]; // YYYY-MM-DD
              const newTask: Task = {
                id: `task-${Date.now()}`,
                title: 'New Task',
                description: '',
                assigneeId: 'user-mohit',
                assigneeType: 'user',
                priority: 'medium',
                projectId: 'proj-mc', // default project
                dueDate,
                status: 'backlog',
                tags: [],
                relatedDocIds: [],
                relatedProjectIds: [],
                relatedMemoryIds: [],
                waitingForHumanReview: false,
              };
              upsertTask(newTask);
            }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + New Task
          </button>
          <select className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
          <select className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2" value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))}>
            <option value="">All Assignees</option>
            <option value="me">Me</option>
            <option value="agent:main">Agent Main</option>
            <option value="agent:cursor">Agent Cursor</option>
          </select>
          <select className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2" value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setBoardTab('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            boardTab === 'all'
              ? 'bg-violet-600 text-white'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
        >
          All tasks
        </button>
        <button
          type="button"
          onClick={() => setBoardTab('needs_review')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            boardTab === 'needs_review'
              ? 'bg-violet-600 text-white'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
        >
          Needs review
        </button>
      </div>

      <TaskBoard
        tasks={filteredTasks}
        onTaskUpdate={(task) => moveTask(task.id, task.status)}
        onEditTask={(task) => {
          setEditingTask(task);
          setEditorOpen(true);
        }}
      />

      <TaskEditorModal
        open={editorOpen}
        initial={editingTask}
        onClose={() => {
          setEditorOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
