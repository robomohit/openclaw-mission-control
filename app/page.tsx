'use client';

import { buildSevenDayMetricSeries, useStore } from '@/lib/store';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useMemo } from 'react';
import { formatShortDate } from '@/lib/store';
import { Zap, CalendarClock, Users } from 'lucide-react';
import { useOpenClawStatus } from '@/lib/useOpenClawStatus';

export default function Home() {
  const { stats, tasks, calendarEvents, user, mission, agents, statsHistory } = useStore();
  const { health, cron, agents: liveAgentsState } = useOpenClawStatus();
  const gatewayHealth = health.status;
  const cronJobs = cron.data;
  const liveAgents = liveAgentsState.data;

  const now = Date.now();
  const overdueJobs = cronJobs.filter(j => j.enabled && j.nextRunAt && new Date(j.nextRunAt).getTime() < now);

  const liveActiveCount = liveAgents.filter(a => a.status === 'active' || a.status === 'busy').length;
  const liveTotalCount = liveAgents.length;

  const recentTasks = useMemo(() =>
    tasks
      .filter(t => t.status === 'in_progress' || t.status === 'review')
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, 5)
  , [tasks]);

  const upcomingEvents = useMemo(() =>
    calendarEvents
      .filter(e => e.start >= new Date().toISOString())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5)
  , [calendarEvents]);

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

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content area */}
      <div className="flex-1 space-y-6">
        {/* Hero */}
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-lg">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Mission Control</h1>
          <p className="mt-2 text-slate-400 max-w-2xl">{mission.text}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-400 ring-1 ring-sky-500/30">
              {user.agentStatus}
            </span>
            <span>Updated {new Date(mission.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Gateway health banner */}
        {gatewayHealth !== 'unknown' && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            gatewayHealth === 'up' ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800' :
            'bg-rose-900/30 text-rose-300 border border-rose-800'
          }`}>
            OpenClaw gateway: {gatewayHealth === 'up' ? 'Online' : 'Offline'}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Recent Tasks */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Your Recent Tasks</h2>
            <a href="/tasks" className="text-sm text-sky-400 hover:underline">Open Task Board →</a>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-slate-500 text-sm">No tasks assigned.</p>
          ) : (
            <ul className="space-y-3">
              {recentTasks.map(t => (
                <li key={t.id} className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-slate-200">{t.title}</div>
                    <div className="text-xs text-slate-500">{formatShortDate(t.dueDate)}</div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    t.priority === 'urgent' ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' :
                    t.priority === 'high' ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30' :
                    t.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30' :
                    'bg-slate-700 text-slate-300'
                  }`}>{t.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Upcoming Events</h2>
            <a href="/calendar" className="text-sm text-sky-400 hover:underline">Go to Calendar →</a>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-slate-500 text-sm">No upcoming events.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map(e => (
                <div key={e.id} className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{e.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${e.confirmed ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-300'}`}>
                      {e.confirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{formatShortDate(e.start)}</div>
                  <div className="text-xs text-slate-500 truncate">{e.why}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team snapshot */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Team Status</h2>
            <a href="/team" className="text-sm text-sky-400 hover:underline">View Team →</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agents.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/30 p-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: a.avatarColor }}>
                  {a.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">{a.name}</div>
                  <div className="text-xs text-slate-400">{a.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cron Jobs */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="font-semibold text-slate-100 mb-2">Cron Jobs</h2>
          {cronJobs.length === 0 ? (
            <p className="text-slate-500 text-sm">No cron jobs defined.</p>
          ) : (
            <ul className="space-y-2">
              {cronJobs
                .filter(j => !!j.nextRunAt)
                .sort((a, b) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime())
                .slice(0, 5)
                .map(job => {
                  const next = new Date(job.nextRunAt!);
                  const overdue = next < new Date();
                  return (
                    <li key={job.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-slate-200">{job.name}</span>
                        <span className="text-slate-400 text-xs ml-2">({job.scheduleExpr})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!job.enabled && <span className="text-xs text-slate-500">Disabled</span>}
                        <span className={`text-xs ${overdue ? 'text-rose-400' : 'text-slate-400'}`}>
                          {overdue ? 'Overdue' : 'Next'} {formatShortDate(job.nextRunAt!)}
                        </span>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      {/* Right sidebar - Live Activity Feed */}
      <aside className="w-full lg:w-80 xl:w-96 space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sticky top-6">
          <h2 className="font-semibold text-slate-100 mb-2">Live Activity</h2>
          <p className="text-xs text-slate-500 mb-4">Real-time stream of all agent actions</p>
          <ActivityFeed limit={15} />
        </div>
      </aside>
    </div>
  );
}
