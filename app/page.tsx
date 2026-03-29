'use client';

import {
  buildSevenDayMetricSeries,
  formatDayLabel,
  formatShortDate,
  useStore,
} from '@/lib/store';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useMemo } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import { useOpenClawStatus } from '@/lib/useOpenClawStatus';

export default function Home() {
  const {
    stats,
    tasks,
    calendarEvents,
    user,
    mission,
    agents,
    statsHistory,
    projects,
  } = useStore();
  const { health, cron, agents: liveAgentsState } = useOpenClawStatus();
  const gatewayHealth = health.status;
  const cronJobs = cron.data;
  const liveAgents = liveAgentsState.data;

  const now = Date.now();
  const overdueJobs = cronJobs.filter(
    (j) =>
      j.enabled &&
      j.nextRunAt &&
      new Date(j.nextRunAt).getTime() < now,
  );
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'done' && new Date(t.dueDate).getTime() < now,
  );
  const reviewTasks = tasks.filter((t) => t.status === 'review');
  const stalledProjects = projects.filter((p) => p.health !== 'healthy');

  const liveActiveCount = liveAgents.filter(
    (a) => a.status === 'active' || a.status === 'busy',
  ).length;
  const liveTotalCount = liveAgents.length;
  const offlineLiveCount = liveAgents.filter(
    (a) => a.status === 'offline',
  ).length;

  const recentTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'in_progress' || t.status === 'review')
        .sort(
          (a, b) =>
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
        )
        .slice(0, 5),
    [tasks],
  );

  const upcomingEvents = useMemo(
    () =>
      calendarEvents
        .filter((e) => e.start >= new Date().toISOString())
        .sort(
          (a, b) =>
            new Date(a.start).getTime() - new Date(b.start).getTime(),
        )
        .slice(0, 5),
    [calendarEvents],
  );

  const sparkActive = useMemo(
    () => buildSevenDayMetricSeries(statsHistory, 'activeTasks'),
    [statsHistory],
  );
  const sparkScheduled = useMemo(
    () => buildSevenDayMetricSeries(statsHistory, 'scheduledToday'),
    [statsHistory],
  );
  const sparkAgents = useMemo(
    () => buildSevenDayMetricSeries(statsHistory, 'agentsActive'),
    [statsHistory],
  );

  const commandQueue = useMemo(
    () => [
      {
        title: 'Human approvals',
        count: reviewTasks.length,
        href: '/tasks',
        tone: 'amber' as const,
        detail:
          reviewTasks.length > 0
            ? `${reviewTasks.length} task${reviewTasks.length === 1 ? '' : 's'} waiting in review`
            : 'No tasks are blocked on human review',
      },
      {
        title: 'Overdue work',
        count: overdueTasks.length,
        href: '/tasks',
        tone: 'rose' as const,
        detail:
          overdueTasks.length > 0
            ? `${overdueTasks[0].title} is the oldest open task`
            : 'No overdue tasks right now',
      },
      {
        title: 'Runtime issues',
        count: overdueJobs.length + offlineLiveCount,
        href: '/team',
        tone: 'sky' as const,
        detail:
          overdueJobs.length + offlineLiveCount > 0
            ? `${offlineLiveCount} offline agent${offlineLiveCount === 1 ? '' : 's'} · ${overdueJobs.length} overdue cron job${overdueJobs.length === 1 ? '' : 's'}`
            : 'Gateway and cron look healthy',
      },
      {
        title: 'Projects needing attention',
        count: stalledProjects.length,
        href: '/projects',
        tone: 'violet' as const,
        detail:
          stalledProjects.length > 0
            ? stalledProjects
                .map((project) => project.name)
                .slice(0, 2)
                .join(' · ')
            : 'All tracked projects are on track',
      },
    ],
    [
      offlineLiveCount,
      overdueJobs.length,
      overdueTasks,
      reviewTasks.length,
      stalledProjects,
    ],
  );

  const recommendedMoves = useMemo(() => {
    const moves: { title: string; detail: string; href: string }[] = [];

    if (reviewTasks.length > 0) {
      moves.push({
        title: 'Clear the review queue',
        detail: `${reviewTasks.length} task${reviewTasks.length === 1 ? '' : 's'} need sign-off before agents can continue.`,
        href: '/tasks',
      });
    }

    if (overdueTasks.length > 0) {
      moves.push({
        title: 'Re-sequence overdue work',
        detail: `${overdueTasks[0].title} is overdue. Reassign it or reduce scope.`,
        href: '/tasks',
      });
    }

    if (stalledProjects.length > 0) {
      moves.push({
        title: 'Recover project momentum',
        detail: `${stalledProjects[0].name} is flagged ${stalledProjects[0].health}. Create a follow-up task from Projects.`,
        href: '/projects',
      });
    }

    if (upcomingEvents.length > 0) {
      moves.push({
        title: 'Protect the next scheduled block',
        detail: `${upcomingEvents[0].title} is the next calendar event on ${formatDayLabel(upcomingEvents[0].start.slice(0, 10))}.`,
        href: '/calendar',
      });
    }

    if (moves.length === 0) {
      moves.push({
        title: 'Keep the board tidy',
        detail:
          'No urgent alerts. Use Tasks to queue the next batch of work.',
        href: '/tasks',
      });
    }

    return moves.slice(0, 4);
  }, [overdueTasks, reviewTasks.length, stalledProjects, upcomingEvents]);

  return (
    <ErrorBoundary fallbackTitle="Dashboard crashed">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-lg">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
              Mission Control
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">{mission.text}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-400 ring-1 ring-sky-500/30">
                {user.agentStatus}
              </span>
              <span>
                Updated {new Date(mission.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {gatewayHealth !== 'unknown' && (
            <div
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                gatewayHealth === 'up'
                  ? 'border border-emerald-800 bg-emerald-900/30 text-emerald-300'
                  : 'border border-rose-800 bg-rose-900/30 text-rose-300'
              }`}
            >
              OpenClaw gateway:{' '}
              {gatewayHealth === 'up' ? 'Online' : 'Offline'}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard
              icon={Zap}
              label="Active Tasks"
              value={String(stats.activeTasks)}
              hint="in progress or review"
              tone="sky"
              sparkline={sparkActive}
            />
            <StatCard
              icon={CalendarClock}
              label="Scheduled Today"
              value={String(stats.scheduledToday)}
              hint="calendar events"
              tone="violet"
              sparkline={sparkScheduled}
            />
            <StatCard
              icon={Users}
              label="Agents Active (OpenClaw)"
              value={String(liveActiveCount)}
              hint={`of ${liveTotalCount} total · trend from saved team state`}
              tone="emerald"
              sparkline={sparkAgents}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-100">
                    Command queue
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    The mission-control layer: approvals, runtime alerts, and
                    recovery work.
                  </p>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  {commandQueue.reduce((sum, item) => sum + item.count, 0)}{' '}
                  open signals
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {commandQueue.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:border-slate-700 ${
                      item.tone === 'amber'
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : item.tone === 'rose'
                          ? 'border-rose-500/20 bg-rose-500/5'
                          : item.tone === 'sky'
                            ? 'border-sky-500/20 bg-sky-500/5'
                            : 'border-violet-500/20 bg-violet-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">
                          {item.title}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.detail}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-sm font-semibold text-slate-100">
                        {item.count}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-100">
                    Recommended next moves
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    A simple operator checklist based on live state and local
                    planning data.
                  </p>
                </div>
              </div>
              <ul className="space-y-3">
                {recommendedMoves.map((move, index) => (
                  <li
                    key={move.title}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100">
                          {move.title}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          {move.detail}
                        </p>
                        <a
                          href={move.href}
                          className="mt-2 inline-flex text-xs font-medium text-sky-400 hover:underline"
                        >
                          Open{' '}
                          {move.href === '/tasks'
                            ? 'task board'
                            : move.href === '/projects'
                              ? 'projects'
                              : move.href === '/calendar'
                                ? 'calendar'
                                : 'team'}
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Your Recent Tasks</h2>
              <a
                href="/tasks"
                className="text-sm text-sky-400 hover:underline"
              >
                Open Task Board →
              </a>
            </div>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks assigned.</p>
            ) : (
              <ul className="space-y-3">
                {recentTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="font-medium text-slate-200">
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatShortDate(t.dueDate)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        t.priority === 'urgent'
                          ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
                          : t.priority === 'high'
                            ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
                            : t.priority === 'medium'
                              ? 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30'
                              : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Upcoming Events</h2>
              <a
                href="/calendar"
                className="text-sm text-sky-400 hover:underline"
              >
                Go to Calendar →
              </a>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming events.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">
                        {e.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          e.confirmed
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {e.confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {formatShortDate(e.start)}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {e.why}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Team Status</h2>
              <a href="/team" className="text-sm text-sky-400 hover:underline">
                View Team →
              </a>
            </div>
            {agents.length === 0 ? (
              <p className="text-sm text-slate-500">No agents configured.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {agents.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/30 p-3"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: a.avatarColor }}
                    >
                      {a.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {a.name}
                      </div>
                      <div className="text-xs text-slate-400">{a.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-2 font-semibold text-slate-100">Cron Jobs</h2>
            {cronJobs.length === 0 ? (
              <p className="text-sm text-slate-500">No cron jobs defined.</p>
            ) : (
              <ul className="space-y-2">
                {cronJobs
                  .filter((j) => !!j.nextRunAt)
                  .sort(
                    (a, b) =>
                      new Date(a.nextRunAt!).getTime() -
                      new Date(b.nextRunAt!).getTime(),
                  )
                  .slice(0, 5)
                  .map((job) => {
                    const next = new Date(job.nextRunAt!);
                    const overdue = next < new Date();
                    return (
                      <li
                        key={job.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="font-medium text-slate-200">
                            {job.name}
                          </span>
                          <span className="ml-2 text-xs text-slate-400">
                            ({job.scheduleExpr})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!job.enabled && (
                            <span className="text-xs text-slate-500">
                              Disabled
                            </span>
                          )}
                          <span
                            className={`text-xs ${overdue ? 'text-rose-400' : 'text-slate-400'}`}
                          >
                            {overdue ? 'Overdue' : 'Next'}{' '}
                            {formatShortDate(job.nextRunAt!)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-6 lg:w-80 xl:w-96">
          <div className="sticky top-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="mb-2 font-semibold text-slate-100">Live Activity</h2>
            <p className="mb-4 text-xs text-slate-500">
              Real-time stream of all agent actions
            </p>
            <ActivityFeed limit={15} showFilters />
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="mb-3 font-semibold text-slate-100">
              Operator watchlist
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                <div>
                  <div className="font-medium text-slate-200">Review queue</div>
                  <p className="text-slate-500">
                    {reviewTasks.length > 0
                      ? `${reviewTasks.length} items need a human decision before the next handoff.`
                      : 'No review bottlenecks right now.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <Users className="mt-0.5 h-4 w-4 text-emerald-300" />
                <div>
                  <div className="font-medium text-slate-200">
                    Live coverage
                  </div>
                  <p className="text-slate-500">
                    {gatewayHealth === 'up'
                      ? `${liveActiveCount} of ${liveTotalCount} OpenClaw agents are active or busy.`
                      : 'Gateway is unavailable, so live runtime coverage is degraded.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </ErrorBoundary>
  );
}
