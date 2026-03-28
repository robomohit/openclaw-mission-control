'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import sampleData from '@/data/sample.json';

import type {
  ActivityItem,
  Agent,
  CalendarEvent,
  CalendarEventStatus,
  DocEntry,
  MemoryEntry,
  Priority,
  Project,
  SampleData,
  StatsHistoryEntry,
  Task,
  TaskStatus,
  UserProfile,
} from '@/lib/types';

/** Debounce helper */
function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

const STATS_SNAPSHOT_DEBOUNCE_MS = 120_000;
const STATS_HISTORY_MAX_DAYS = 366;

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameLocalDay(iso: string, day: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

export interface MissionControlState {
  user: UserProfile;
  mission: SampleData['mission'];
  agents: Agent[];
  tasks: Task[];
  projects: Project[];
  memories: MemoryEntry[];
  docs: DocEntry[];
  calendarEvents: CalendarEvent[];
  activities: ActivityItem[];
  office: SampleData['office'];
  suggestedTools: SampleData['suggestedTools'];
  statsHistory: StatsHistoryEntry[];
}

function cloneSample(): MissionControlState {
  const base = JSON.parse(JSON.stringify(sampleData)) as SampleData;
  return {
    ...base,
    statsHistory: Array.isArray(base.statsHistory) ? base.statsHistory : [],
  };
}

function normalizeStatsHistory(raw: unknown): StatsHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: StatsHistoryEntry[] = [];
  for (const row of raw) {
    if (
      row &&
      typeof row === 'object' &&
      typeof (row as StatsHistoryEntry).date === 'string' &&
      typeof (row as StatsHistoryEntry).activeTasks === 'number' &&
      typeof (row as StatsHistoryEntry).scheduledToday === 'number' &&
      typeof (row as StatsHistoryEntry).agentsActive === 'number'
    ) {
      out.push(row as StatsHistoryEntry);
    }
  }
  return out;
}

function hydrateMissionState(saved: MissionControlState): MissionControlState {
  // Migrate agents: add openclawAgentId for known legacy ids
  const agents = migrateAgents(saved.agents);
  // Normalize tasks: derive waitingForHumanReview from status; sanitize relatedProjectIds
  const tasks = saved.tasks.map(normalizeTask);
  return {
    ...saved,
    agents,
    tasks,
    statsHistory: normalizeStatsHistory(saved.statsHistory),
  };
}

/** Migrate legacy state: inject openclawAgentId for known agents */
function migrateAgents(agents: Agent[]): Agent[] {
  const mapping: Record<string, string> = {
    'agent-main': 'main',
    'agent-coder': 'cursor',
  };
  return agents.map((a) => {
    if (!a.openclawAgentId && mapping[a.id]) {
      return { ...a, openclawAgentId: mapping[a.id] };
    }
    return a;
  });
}

/** Last 7 local days (oldest → newest) for one metric; missing days reuse previous or 0. */
export function buildSevenDayMetricSeries(
  history: StatsHistoryEntry[] | undefined,
  key: keyof Pick<StatsHistoryEntry, 'activeTasks' | 'scheduledToday' | 'agentsActive'>,
): number[] {
  const list = history ?? [];
  const byDate = new Map(list.map((h) => [h.date, h[key]]));
  const series: number[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ymd = localYmd(d);
    const v = byDate.get(ymd);
    const prev = series[series.length - 1];
    series.push(v !== undefined ? v : prev !== undefined ? prev : 0);
  }
  if (list.length === 0) {
    return Array(7).fill(0);
  }
  const uniq = new Set(series);
  if (uniq.size <= 1) {
    const flat = series[6] ?? 0;
    return Array(7).fill(flat);
  }
  return series;
}

function mergeStatsHistoryToday(
  history: StatsHistoryEntry[],
  snapshot: Omit<StatsHistoryEntry, 'date'>,
  todayYmd: string,
): StatsHistoryEntry[] {
  const rest = history.filter((h) => h.date !== todayYmd);
  const next = [...rest, { date: todayYmd, ...snapshot }];
  next.sort((a, b) => a.date.localeCompare(b.date));
  return next.slice(-STATS_HISTORY_MAX_DAYS);
}

function computeStatsSnapshot(state: MissionControlState): Omit<StatsHistoryEntry, 'date'> {
  const today = new Date();
  const activeTasks = state.tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'review',
  ).length;
  const scheduledToday = state.calendarEvents.filter((e) =>
    isSameLocalDay(e.start, today),
  ).length;
  const agentsActive = state.agents.filter(
    (a) => a.status === 'active' || a.status === 'busy',
  ).length;
  return { activeTasks, scheduledToday, agentsActive };
}

async function persistMissionState(s: MissionControlState) {
  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
  } catch (e) {
    console.error('Failed to save state to server', e);
  }
}

/** Normalize task review semantics: waitingForHumanReview is derived from status */
function normalizeTask(task: Task): Task {
  const relatedProjectIds = (task.relatedProjectIds ?? []).filter(
    (id) => id && id !== task.projectId,
  );
  const base = { ...task, relatedProjectIds };
  if (base.status === 'review') {
    return { ...base, waitingForHumanReview: true };
  }
  return { ...base, waitingForHumanReview: false };
}

export interface MissionControlContextValue extends MissionControlState {
  /** Stable id for human assignee lookups */
  userAssigneeId: string;
  addActivity: (agentId: string, message: string) => void;
  updateUserProfile: (partial: Partial<UserProfile>) => void;
  upsertTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  toggleTaskReview: (id: string) => void;
  upsertCalendarEvent: (ev: CalendarEvent) => void;
  deleteCalendarEvent: (id: string) => void;
  setCalendarEventStatus: (id: string, status: CalendarEventStatus) => void;
  toggleCalendarConfirmed: (id: string) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  /** Add secondary project links and register tasks on the project’s linked list. */
  linkTasksToProject: (projectId: string, taskIds: string[]) => void;
  resetStore: () => void;
  getAgent: (id: string) => Agent | undefined;
  getProject: (id: string) => Project | undefined;
  stats: {
    activeTasks: number;
    scheduledToday: number;
    agentsActive: number;
  };
}

const MissionControlContext = createContext<MissionControlContextValue | null>(
  null,
);

const USER_ASSIGNEE_ID = 'user-mohit';

export function MissionControlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MissionControlState>(() => cloneSample());
  const [hydrated, setHydrated] = useState(false);
  const skipNextPersistRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved state from server on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const saved = JSON.parse(text) as MissionControlState;
            setState(hydrateMissionState(saved));
          } else {
            // Empty file => treat as no saved state
            throw new Error('empty');
          }
        } else {
          throw new Error('not ok');
        }
      } catch (e) {
        // No saved state or error; POST initial sample to persist
        const initial = cloneSample();
        setState(initial);
        try {
          await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initial),
          });
        } catch (postErr) {
          console.error('Failed to persist initial state', postErr);
        }
      } finally {
        setHydrated(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let source: EventSource | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      source = new EventSource('/api/state/stream');

      source.onmessage = (event) => {
        if (event.data === 'heartbeat') return;
        try {
          const nextState = JSON.parse(event.data) as MissionControlState;
          skipNextPersistRef.current = true;
          setState(hydrateMissionState(nextState));
        } catch (err) {
          console.error('Failed to parse SSE state payload', err);
        }
      };

      source.onerror = () => {
        if (source) {
          source.close();
          source = null;
        }
        if (stopped) return;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 2_000);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (source) {
        source.close();
        source = null;
      }
    };
  }, [hydrated]);

  // Persist state to server on change (debounced)
  const debouncedPersist = useMemo(
    () => debounce((newState: MissionControlState) => void persistMissionState(newState), 500),
    [],
  );

  /** After tasks/calendar/agents change, snapshot today’s stats into history (2 min idle). */
  const debouncedStatsSnapshot = useMemo(
    () =>
      debounce(() => {
        setState((prev) => {
          const todayYmd = localYmd(new Date());
          const snap = computeStatsSnapshot(prev);
          const hist = prev.statsHistory ?? [];
          const existing = hist.find((h) => h.date === todayYmd);
          if (
            existing &&
            existing.activeTasks === snap.activeTasks &&
            existing.scheduledToday === snap.scheduledToday &&
            existing.agentsActive === snap.agentsActive
          ) {
            return prev;
          }
          const nextHistory = mergeStatsHistoryToday(hist, snap, todayYmd);
          const next: MissionControlState = { ...prev, statsHistory: nextHistory };
          skipNextPersistRef.current = true;
          queueMicrotask(() => {
            void persistMissionState(next);
          });
          return next;
        });
      }, STATS_SNAPSHOT_DEBOUNCE_MS),
    [],
  );

  useEffect(() => {
    if (hydrated) {
      if (skipNextPersistRef.current) {
        skipNextPersistRef.current = false;
        return;
      }
      debouncedPersist(state);
    }
  }, [state, hydrated, debouncedPersist]);

  useEffect(() => {
    if (!hydrated) return;
    debouncedStatsSnapshot();
  }, [state.tasks, state.calendarEvents, state.agents, hydrated, debouncedStatsSnapshot]);

  const resetStore = useCallback(() => {
    const s = cloneSample();
    setState({
      user: s.user,
      mission: s.mission,
      agents: s.agents,
      tasks: s.tasks,
      projects: s.projects,
      memories: s.memories,
      docs: s.docs,
      calendarEvents: s.calendarEvents,
      activities: s.activities,
      office: s.office,
      suggestedTools: s.suggestedTools,
      statsHistory: s.statsHistory,
    });
  }, []);

  const addActivity = useCallback((agentId: string, message: string) => {
    const id = `act-${Date.now()}`;
    const timestamp = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      activities: [{ id, agentId, message, timestamp }, ...prev.activities],
    }));
  }, []);

  const updateUserProfile = useCallback((partial: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      user: { ...prev.user, ...partial },
    }));
  }, []);

  const upsertTask = useCallback((task: Task) => {
    const normalized = normalizeTask(task);
    setState((prev) => {
      const prevTask = prev.tasks.find((t) => t.id === normalized.id);
      let projects = prev.projects;

      if (prevTask?.projectId && prevTask.projectId !== normalized.projectId) {
        projects = projects.map((p) =>
          p.id === prevTask.projectId
            ? {
                ...p,
                linkedTaskIds: p.linkedTaskIds.filter((tid) => tid !== normalized.id),
              }
            : p,
        );
      }

      if (normalized.projectId) {
        projects = projects.map((p) =>
          p.id === normalized.projectId
            ? {
                ...p,
                linkedTaskIds: p.linkedTaskIds.includes(normalized.id)
                  ? p.linkedTaskIds
                  : [...p.linkedTaskIds, normalized.id],
              }
            : p,
        );
      }

      const idx = prev.tasks.findIndex((t) => t.id === normalized.id);
      const tasks =
        idx === -1
          ? [...prev.tasks, normalized]
          : prev.tasks.map((t) => (t.id === normalized.id ? normalized : t));
      return { ...prev, tasks, projects };
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
      projects: prev.projects.map((p) => ({
        ...p,
        linkedTaskIds: p.linkedTaskIds.filter((tid) => tid !== id),
      })),
    }));
  }, []);

  const moveTask = useCallback((id: string, status: TaskStatus) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? normalizeTask({ ...t, status }) : t,
      ),
    }));
  }, []);

  const toggleTaskReview = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id
          ? normalizeTask({ ...t, status: t.status === 'review' ? 'in_progress' : 'review' })
          : t,
      ),
    }));
  }, []);

  const upsertCalendarEvent = useCallback((ev: CalendarEvent) => {
    setState((prev) => {
      const idx = prev.calendarEvents.findIndex((e) => e.id === ev.id);
      const calendarEvents =
        idx === -1
          ? [...prev.calendarEvents, ev]
          : prev.calendarEvents.map((e) => (e.id === ev.id ? ev : e));
      return { ...prev, calendarEvents };
    });
  }, []);

  const deleteCalendarEvent = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.filter((e) => e.id !== id),
    }));
  }, []);

  const setCalendarEventStatus = useCallback(
    (id: string, status: CalendarEventStatus) => {
      setState((prev) => ({
        ...prev,
        calendarEvents: prev.calendarEvents.map((e) =>
          e.id === id ? { ...e, status } : e,
        ),
      }));
    },
    [],
  );

  const toggleCalendarConfirmed = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map((e) =>
        e.id === id ? { ...e, confirmed: !e.confirmed } : e,
      ),
    }));
  }, []);

  const updateProjectProgress = useCallback((id: string, progress: number) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, progress } : p,
      ),
    }));
  }, []);

  const linkTasksToProject = useCallback(
    (projectId: string, taskIds: string[]) => {
      const uniqueIds = [...new Set(taskIds)];
      if (!projectId || uniqueIds.length === 0) return;
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (!uniqueIds.includes(t.id)) return t;
          const rel = new Set([...(t.relatedProjectIds ?? []), projectId]);
          rel.delete(t.projectId);
          return normalizeTask({
            ...t,
            relatedProjectIds: [...rel],
          });
        }),
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                linkedTaskIds: [...new Set([...p.linkedTaskIds, ...uniqueIds])],
              }
            : p,
        ),
      }));
    },
    [],
  );

  const getAgent = useCallback(
    (id: string) => state.agents.find((a) => a.id === id),
    [state.agents],
  );

  const getProject = useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects],
  );

  const stats = useMemo(() => {
    const today = new Date();
    const activeTasks = state.tasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'review',
    ).length;
    const scheduledToday = state.calendarEvents.filter((e) =>
      isSameLocalDay(e.start, today),
    ).length;
    const agentsActive = state.agents.filter(
      (a) => a.status === 'active' || a.status === 'busy',
    ).length;
    return { activeTasks, scheduledToday, agentsActive };
  }, [state.tasks, state.calendarEvents, state.agents]);

  const value = useMemo<MissionControlContextValue>(
    () => ({
      ...state,
      userAssigneeId: USER_ASSIGNEE_ID,
      addActivity,
      updateUserProfile,
      upsertTask,
      deleteTask,
      moveTask,
      toggleTaskReview,
      upsertCalendarEvent,
      deleteCalendarEvent,
      setCalendarEventStatus,
      toggleCalendarConfirmed,
      updateProjectProgress,
      linkTasksToProject,
      resetStore,
      getAgent,
      getProject,
      stats,
    }),
    [
      state,
      addActivity,
      updateUserProfile,
      upsertTask,
      deleteTask,
      moveTask,
      toggleTaskReview,
      upsertCalendarEvent,
      deleteCalendarEvent,
      setCalendarEventStatus,
      toggleCalendarConfirmed,
      updateProjectProgress,
      linkTasksToProject,
      resetStore,
      getAgent,
      getProject,
      stats,
    ],
  );

  return (
    <MissionControlContext.Provider value={value}>
      {children}
    </MissionControlContext.Provider>
  );
}

export function useMissionControl(): MissionControlContextValue {
  const ctx = useContext(MissionControlContext);
  if (!ctx) {
    throw new Error('useMissionControl must be used within MissionControlProvider');
  }
  return ctx;
}

// Alias for convenience
export const useStore = useMissionControl;

export function priorityLabel(p: Priority): string {
  const map: Record<Priority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  return map[p];
}

export function taskStatusLabel(s: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    backlog: 'Backlog',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
  };
  return map[s];
}

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatDayLabel(ymd: string): string {
  try {
    return new Date(ymd + 'T12:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return ymd;
  }
}
