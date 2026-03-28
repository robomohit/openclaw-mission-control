'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { AgentStatus } from '@/lib/types';

export type OpenClawGatewayStatus = 'up' | 'down' | 'unknown';

export interface OpenClawLiveAgent {
  id: string;
  name: string;
  model?: string;
  lastSeen?: string | null;
  status: AgentStatus;
}

export interface OpenClawSessionRow {
  sessionKey: string;
  agentId: string;
  sessionId: string;
  updatedAt: string;
  model: string | null;
}

export interface OpenClawCronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  scheduleKind: string;
  scheduleExpr: string;
  nextRunAt: string | null;
  lastRunAt?: string | null;
  lastRunStatus?: string | null;
}

export interface OpenClawActivity {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
  source: 'openclaw';
}

export interface EndpointSlice<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export interface OpenClawHealthSlice {
  status: OpenClawGatewayStatus;
  loading: boolean;
  error: string | null;
}

export interface OpenClawStatus {
  health: OpenClawHealthSlice;
  agents: EndpointSlice<OpenClawLiveAgent[]>;
  sessions: EndpointSlice<OpenClawSessionRow[]>;
  cron: EndpointSlice<OpenClawCronJob[]>;
  activities: EndpointSlice<OpenClawActivity[]>;
}

const INTERVAL_SLOW_MS = 30_000;
const INTERVAL_AGENTS_MS = 10_000;

type InternalState = {
  health: OpenClawHealthSlice;
  agents: EndpointSlice<OpenClawLiveAgent[]>;
  sessions: EndpointSlice<OpenClawSessionRow[]>;
  cron: EndpointSlice<OpenClawCronJob[]>;
  activities: EndpointSlice<OpenClawActivity[]>;
};

const internal: InternalState = {
  health: { status: 'unknown', loading: false, error: null },
  agents: { data: [], loading: false, error: null },
  sessions: { data: [], loading: false, error: null },
  cron: { data: [], loading: false, error: null },
  activities: { data: [], loading: false, error: null },
};

const listeners = new Set<() => void>();

/** Bumped on every store mutation so useSyncExternalStore can cache getSnapshot. */
let storeVersion = 0;
let snapshotCache: OpenClawStatus | null = null;
let snapshotCacheVersion = -1;

function emit() {
  storeVersion += 1;
  for (const l of listeners) l();
}

function buildSnapshot(): OpenClawStatus {
  return {
    health: { ...internal.health },
    agents: {
      data: [...internal.agents.data],
      loading: internal.agents.loading,
      error: internal.agents.error,
    },
    sessions: {
      data: [...internal.sessions.data],
      loading: internal.sessions.loading,
      error: internal.sessions.error,
    },
    cron: {
      data: [...internal.cron.data],
      loading: internal.cron.loading,
      error: internal.cron.error,
    },
    activities: {
      data: [...internal.activities.data],
      loading: internal.activities.loading,
      error: internal.activities.error,
    },
  };
}

/**
 * React requires getSnapshot to return a stable reference when the store has not changed.
 * Returning new objects every call causes "Maximum update depth exceeded".
 */
function snapshot(): OpenClawStatus {
  if (snapshotCache === null || snapshotCacheVersion !== storeVersion) {
    snapshotCache = buildSnapshot();
    snapshotCacheVersion = storeVersion;
  }
  return snapshotCache;
}

let subscriberCount = 0;
let intervalSlow: ReturnType<typeof setInterval> | null = null;
let intervalAgents: ReturnType<typeof setInterval> | null = null;

async function fetchHealth() {
  internal.health = { ...internal.health, loading: true, error: null };
  emit();
  try {
    const res = await fetch('/api/openclaw/health');
    const data = await res.json().catch(() => ({}));
    const status: OpenClawGatewayStatus =
      res.ok && data.ok && data.gateway === 'up' ? 'up' : res.ok ? 'down' : 'down';
    internal.health = { status, loading: false, error: res.ok ? null : 'Request failed' };
  } catch (e) {
    internal.health = {
      status: 'down',
      loading: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
  emit();
}

async function fetchCron() {
  internal.cron = { ...internal.cron, loading: true, error: null };
  emit();
  try {
    const res = await fetch('/api/openclaw/cron');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      internal.cron = {
        data: [],
        loading: false,
        error: typeof data.error === 'string' ? data.error : 'Request failed',
      };
    } else {
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      internal.cron = { data: jobs, loading: false, error: null };
    }
  } catch (e) {
    internal.cron = {
      data: internal.cron.data,
      loading: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
  emit();
}

async function fetchSessions() {
  internal.sessions = { ...internal.sessions, loading: true, error: null };
  emit();
  try {
    const res = await fetch('/api/openclaw/sessions');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      internal.sessions = {
        data: [],
        loading: false,
        error: typeof data.error === 'string' ? data.error : 'Request failed',
      };
    } else {
      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      internal.sessions = { data: sessions, loading: false, error: null };
    }
  } catch (e) {
    internal.sessions = {
      data: internal.sessions.data,
      loading: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
  emit();
}

async function fetchActivities() {
  internal.activities = { ...internal.activities, loading: true, error: null };
  emit();
  try {
    const res = await fetch('/api/openclaw/activities');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      internal.activities = {
        data: [],
        loading: false,
        error: 'Request failed',
      };
    } else {
      const activities = Array.isArray(data.activities) ? data.activities : [];
      internal.activities = { data: activities, loading: false, error: null };
    }
  } catch (e) {
    internal.activities = {
      data: internal.activities.data,
      loading: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
  emit();
}

async function fetchAgents() {
  internal.agents = { ...internal.agents, loading: true, error: null };
  emit();
  try {
    const res = await fetch('/api/openclaw/agents');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      internal.agents = {
        data: [],
        loading: false,
        error: typeof data.error === 'string' ? data.error : 'Request failed',
      };
    } else {
      const agents = Array.isArray(data.agents) ? data.agents : [];
      internal.agents = { data: agents, loading: false, error: null };
    }
  } catch (e) {
    internal.agents = {
      data: internal.agents.data,
      loading: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
  emit();
}

function runSlowTick() {
  void Promise.all([fetchHealth(), fetchCron(), fetchSessions(), fetchActivities()]);
}

function startPolling() {
  runSlowTick();
  void fetchAgents();
  intervalSlow = setInterval(runSlowTick, INTERVAL_SLOW_MS);
  intervalAgents = setInterval(() => {
    void fetchAgents();
  }, INTERVAL_AGENTS_MS);
}

function stopPolling() {
  if (intervalSlow) {
    clearInterval(intervalSlow);
    intervalSlow = null;
  }
  if (intervalAgents) {
    clearInterval(intervalAgents);
    intervalAgents = null;
  }
}

function subscribeStore(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Shared OpenClaw REST polling: one 30s tick (health, cron, sessions, activities) and one 10s tick (agents).
 * Safe to call from multiple components; intervals are shared.
 */
export function useOpenClawStatus(): OpenClawStatus {
  useEffect(() => {
    subscriberCount += 1;
    if (subscriberCount === 1) startPolling();
    return () => {
      subscriberCount -= 1;
      if (subscriberCount === 0) stopPolling();
    };
  }, []);

  return useSyncExternalStore(subscribeStore, snapshot, snapshot);
}
