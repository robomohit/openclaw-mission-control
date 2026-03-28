'use client';

import { useStore } from '@/lib/store';
import { TaskBoard } from '@/components/TaskBoard';
import { TaskEditorModal } from '@/components/TaskEditorModal';
import { AlertTriangle, Clock3, Send, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Task } from '@/lib/types';

export default function TasksPage() {
  const { tasks, moveTask, agents, projects, userAssigneeId } = useStore();
  const [filter, setFilter] = useState({ status: '', assignee: '', priority: '' });
  const [boardTab, setBoardTab] = useState<'all' | 'mine' | 'needs_review' | 'overdue'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDefaults, setNewTaskDefaults] = useState<Partial<Task> | undefined>();

  const defaultProjectId = projects[0]?.id ?? '';
  const defaultAgentId = agents[0]?.id ?? 'agent-main';
  const now = Date.now();

  const reviewCount = tasks.filter((task) => task.status === 'review').length;
  const overdueCount = tasks.filter(
    (task) => task.status !== 'done' && new Date(task.dueDate).getTime() < now,
  ).length;
  const activeCount = tasks.filter((task) => task.status === 'in_progress').length;
  const myQueueCount = tasks.filter(
    (task) => task.assigneeType === 'user' && task.assigneeId === userAssigneeId,
  ).length;

  const assigneeOptions = useMemo(
    () => [
      { label: 'You', value: `user:${userAssigneeId}` },
      ...agents.map((agent) => ({
        label: agent.name,
        value: `agent:${agent.id}`,
      })),
    ],
    [agents, userAssigneeId],
  );

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (boardTab === 'needs_review' && task.status !== 'review') return false;
          if (boardTab === 'mine' && `user:${userAssigneeId}` !== `${task.assigneeType}:${task.assigneeId}`) return false;
          if (
            boardTab === 'overdue' &&
            (task.status === 'done' || new Date(task.dueDate).getTime() >= now)
          ) {
            return false;
          }
          if (filter.status && task.status !== filter.status) return false;
          if (filter.assignee && `${task.assigneeType}:${task.assigneeId}` !== filter.assignee) return false;
          if (filter.priority && task.priority !== filter.priority) return false;
          return true;
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [boardTab, filter.assignee, filter.priority, filter.status, now, tasks, userAssigneeId],
  );

  const quickDispatch = [
    {
      title: 'Review request',
      description: 'Queue a human approval item with the right defaults.',
      icon: ShieldCheck,
      defaults: {
        title: 'Review latest OpenClaw run',
        description: 'Check output, validate safety, and unblock the next handoff.',
        assigneeId: userAssigneeId,
        assigneeType: 'user' as const,
        priority: 'high' as const,
        projectId: defaultProjectId,
        status: 'review' as const,
        tags: ['review', 'human-loop'],
      },
    },
    {
      title: 'Agent dispatch',
      description: 'Send a focused follow-up task to a worker agent.',
      icon: Send,
      defaults: {
        title: 'Investigate OpenClaw runtime signal',
        description: 'Triage the issue, collect evidence, and post a concise summary back to Mission Control.',
        assigneeId: defaultAgentId,
        assigneeType: 'agent' as const,
        priority: 'medium' as const,
        projectId: defaultProjectId,
        status: 'backlog' as const,
        tags: ['dispatch', 'ops'],
      },
    },
    {
      title: 'Recovery task',
      description: 'Create an urgent response item for drift or runtime regressions.',
      icon: AlertTriangle,
      defaults: {
        title: 'Recover stalled automation',
        description: 'Identify the blocker, restore the path to green, and note what changed.',
        assigneeId: defaultAgentId,
        assigneeType: 'agent' as const,
        priority: 'urgent' as const,
        projectId: defaultProjectId,
        status: 'in_progress' as const,
        tags: ['recovery', 'incident'],
      },
    },
  ];

  const openNewTask = (defaults?: Partial<Task>) => {
    setEditingTask(null);
    setNewTaskDefaults({
      assigneeId: userAssigneeId,
      assigneeType: 'user',
      projectId: defaultProjectId,
      ...defaults,
    });
    setEditorOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Task Board</h1>
          <p className="mt-1 text-sm text-slate-400">
            Plan, dispatch, and review work across your OpenClaw team.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openNewTask()}
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
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2" value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            type="button"
            onClick={() => setFilter({ status: '', assignee: '', priority: '' })}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">In progress</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{activeCount}</div>
          <p className="mt-1 text-sm text-slate-500">Work currently being executed.</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-xs uppercase tracking-wide text-amber-200/80">Needs review</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{reviewCount}</div>
          <p className="mt-1 text-sm text-slate-400">Human-in-the-loop sign-offs waiting.</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="text-xs uppercase tracking-wide text-rose-200/80">Overdue</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{overdueCount}</div>
          <p className="mt-1 text-sm text-slate-400">Tasks that have slipped past due date.</p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="text-xs uppercase tracking-wide text-sky-200/80">My queue</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{myQueueCount}</div>
          <p className="mt-1 text-sm text-slate-400">Items assigned directly to you.</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-100">Quick dispatch</h2>
            <p className="mt-1 text-sm text-slate-500">
              Common mission-control task templates for approvals, dispatch, and recovery.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {quickDispatch.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.title}
                type="button"
                onClick={() => openNewTask(template.defaults)}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-slate-700 hover:bg-slate-950"
              >
                <div className="inline-flex rounded-lg bg-slate-800 p-2 text-sky-400">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-medium text-slate-100">{template.title}</div>
                <p className="mt-1 text-sm text-slate-400">{template.description}</p>
              </button>
            );
          })}
        </div>
      </section>

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
          onClick={() => setBoardTab('mine')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            boardTab === 'mine'
              ? 'bg-violet-600 text-white'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
        >
          My queue
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
        <button
          type="button"
          onClick={() => setBoardTab('overdue')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            boardTab === 'overdue'
              ? 'bg-violet-600 text-white'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
        >
          Overdue
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          {filteredTasks.length} visible task{filteredTasks.length === 1 ? '' : 's'}
        </div>
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
        newTaskDefaults={newTaskDefaults}
        onClose={() => {
          setEditorOpen(false);
          setEditingTask(null);
          setNewTaskDefaults(undefined);
        }}
      />
    </div>
  );
}
