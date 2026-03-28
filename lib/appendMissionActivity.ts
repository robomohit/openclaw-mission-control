import { mkdir, readFile, writeFile } from 'fs/promises';

import {
  coerceSampleData,
  DATA_DIR,
  isSqliteEnabled,
  readMissionState,
  STATE_JSON_PATH,
  writeMissionState,
} from '@/lib/db';
import type { ActivityItem } from '@/lib/types';
import { publishStateUpdate } from '@/lib/stateBroadcast';

export const MAX_ACTIVITIES_STORED = 500;

const AGENT_ALIAS = 'agent:main';
const MAIN_AGENT_ID = 'agent-main';

function resolveAgentId(agentId: string): string {
  if (agentId === AGENT_ALIAS) return MAIN_AGENT_ID;
  return agentId;
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function loadExistingState(): Promise<Record<string, unknown>> {
  try {
    if (isSqliteEnabled()) {
      const s = readMissionState();
      if (s) return s as unknown as Record<string, unknown>;
    }
  } catch (e) {
    console.error('appendMissionActivity: SQLite read failed', e);
  }
  try {
    await ensureDataDir();
    const raw = await readFile(STATE_JSON_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Prepend one activity and persist (same storage as POST /api/state).
 */
export async function appendMissionActivity(input: {
  agentId?: string;
  message: string;
  id?: string;
  timestamp?: string;
}): Promise<ActivityItem> {
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!message) {
    throw new Error('message is required');
  }
  const agentId = resolveAgentId(
    typeof input.agentId === 'string' && input.agentId.trim()
      ? input.agentId.trim()
      : MAIN_AGENT_ID,
  );
  const id =
    typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp =
    typeof input.timestamp === 'string' && input.timestamp.trim()
      ? input.timestamp.trim()
      : new Date().toISOString();

  const item: ActivityItem = { id, agentId, message, timestamp };

  const existing = await loadExistingState();
  const prev = Array.isArray(existing.activities)
    ? (existing.activities as ActivityItem[])
    : [];
  const nextActivities = [item, ...prev].slice(0, MAX_ACTIVITIES_STORED);

  const merged = coerceSampleData({
    ...existing,
    activities: nextActivities,
  } as Parameters<typeof coerceSampleData>[0]);

  const serialized = JSON.stringify(merged, null, 2);
  JSON.parse(serialized);

  try {
    if (isSqliteEnabled()) {
      writeMissionState(merged);
      publishStateUpdate(merged);
      return item;
    }
  } catch (e) {
    console.error('appendMissionActivity: SQLite write failed, JSON fallback', e);
  }

  await ensureDataDir();
  await writeFile(STATE_JSON_PATH, serialized, 'utf-8');
  publishStateUpdate(merged);
  return item;
}
