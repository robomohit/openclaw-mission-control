import { createHash } from 'crypto';
import { mkdir, readFile, readdir } from 'fs/promises';
import { join } from 'path';

import {
  DATA_DIR,
  isSqliteEnabled,
  readMissionState,
  STATE_JSON_PATH,
} from '@/lib/db';
import type { ActivityItem } from '@/lib/types';

import { getOpenclawLogDir } from '@/lib/openclawLog';

/** [YYYY-MM-DD HH:mm:ss] LEVEL ... */
export const LINE_RE =
  /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+(INFO|WARN|ERROR)\s*(.*)$/;

export const AGENT_RE = /\b(?:main|cursor|agent-[a-zA-Z0-9_.-]+)\b/;

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface OpenClawLogEntry {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
  source: 'openclaw';
  level: LogLevel;
  rawLine: string;
}

export interface LocalActivityEntry extends ActivityItem {
  source: 'local';
}

export type MergedLogEntry = OpenClawLogEntry | LocalActivityEntry;

function stableId(dedupeKey: string): string {
  return `oc-${createHash('sha256').update(dedupeKey).digest('hex').slice(0, 16)}`;
}

export function parseOpenclawLogLine(line: string): OpenClawLogEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const m = trimmed.match(LINE_RE);
  if (!m) return null;

  const [, datePart, level, rest] = m;
  const ts = new Date(datePart.replace(' ', 'T'));
  if (Number.isNaN(ts.getTime())) return null;

  const agentMatch = trimmed.match(AGENT_RE);
  const agentId = agentMatch?.[0] ?? 'system';
  const message = rest.trim() || trimmed;
  const dedupeKey = JSON.stringify({
    ts: ts.toISOString(),
    agent: agentId,
    msg: message,
  });

  return {
    id: stableId(dedupeKey),
    agentId,
    message,
    timestamp: ts.toISOString(),
    source: 'openclaw',
    level: level as LogLevel,
    rawLine: trimmed,
  };
}

export async function readOpenclawLogEntries(options: {
  maxLines?: number;
  maxEntries?: number;
}): Promise<OpenClawLogEntry[]> {
  const maxLines = Math.min(
    Math.max(1, options.maxLines ?? 3000),
    50_000,
  );
  const maxEntries = Math.min(
    Math.max(1, options.maxEntries ?? 500),
    2000,
  );

  const logDir = getOpenclawLogDir();
  const today = new Date().toISOString().slice(0, 10);

  let lines: string[] = [];
  try {
    const names = await readdir(logDir);
    const logFiles = names
      .filter((f) => f.startsWith(`openclaw-${today}`) && f.endsWith('.log'))
      .sort();
    for (const file of logFiles) {
      const raw = await readFile(join(logDir, file), 'utf8');
      lines = lines.concat(raw.split(/\r?\n/));
    }
  } catch {
    return [];
  }

  const tail = lines.slice(-maxLines);
  const seen = new Set<string>();
  const parsed: OpenClawLogEntry[] = [];

  for (const line of tail) {
    const row = parseOpenclawLogLine(line);
    if (!row) continue;
    const key = `${row.timestamp}\0${row.agentId}\0${row.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(row);
  }

  parsed.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return parsed.slice(0, maxEntries);
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function loadLocalActivities(): Promise<ActivityItem[]> {
  try {
    if (isSqliteEnabled()) {
      const s = readMissionState();
      if (s?.activities?.length) return s.activities;
    }
  } catch {
    // fall through
  }
  try {
    await ensureDataDir();
    const raw = await readFile(STATE_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { activities?: ActivityItem[] };
    return Array.isArray(parsed.activities) ? parsed.activities : [];
  } catch {
    return [];
  }
}

export async function loadMergedLogFeed(options: {
  maxLines?: number;
  maxEntriesBeforeFilter?: number;
}): Promise<MergedLogEntry[]> {
  const oc = await readOpenclawLogEntries({
    maxLines: options.maxLines,
    maxEntries: options.maxEntriesBeforeFilter ?? 800,
  });
  const localRaw = await loadLocalActivities();
  const local: LocalActivityEntry[] = localRaw.map((a) => ({
    ...a,
    source: 'local' as const,
  }));

  const combined: MergedLogEntry[] = [...local, ...oc];
  const ts = (iso: string) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
  };
  combined.sort((a, b) => ts(b.timestamp) - ts(a.timestamp));
  return combined;
}

export interface LogFeedFilterParams {
  q?: string;
  agent?: string;
  level?: string;
  source?: 'all' | 'local' | 'openclaw';
  limit?: number;
  since?: string;
  until?: string;
  /** Comma-separated substrings; drop row if message includes any */
  exclude?: string;
  /** If true, drop lines matching heartbeat noise */
  hideHeartbeat?: boolean;
}

function parseLevels(s: string | undefined): Set<LogLevel> | null {
  if (!s?.trim()) return null;
  const parts = s.split(',').map((x) => x.trim().toUpperCase());
  const set = new Set<LogLevel>();
  for (const p of parts) {
    if (p === 'INFO' || p === 'WARN' || p === 'ERROR') set.add(p);
  }
  return set.size ? set : null;
}

export function filterMergedLogFeed(
  items: MergedLogEntry[],
  f: LogFeedFilterParams,
): MergedLogEntry[] {
  let out = items;
  const q = f.q?.trim().toLowerCase();
  if (q) {
    out = out.filter((e) => e.message.toLowerCase().includes(q));
  }
  const agent = f.agent?.trim().toLowerCase();
  if (agent) {
    out = out.filter((e) => e.agentId.toLowerCase().includes(agent));
  }
  const levels = parseLevels(f.level);
  if (levels) {
    out = out.filter((e) => {
      if (e.source === 'local') return true;
      return levels.has(e.level);
    });
  }
  if (f.source === 'local') {
    out = out.filter((e) => e.source === 'local');
  } else if (f.source === 'openclaw') {
    out = out.filter((e) => e.source === 'openclaw');
  }
  if (f.since) {
    const t0 = Date.parse(f.since);
    if (Number.isFinite(t0)) {
      out = out.filter((e) => Date.parse(e.timestamp) >= t0);
    }
  }
  if (f.until) {
    const t1 = Date.parse(f.until);
    if (Number.isFinite(t1)) {
      out = out.filter((e) => Date.parse(e.timestamp) <= t1);
    }
  }
  if (f.hideHeartbeat) {
    out = out.filter(
      (e) => !/\bheartbeat\b/i.test(e.message),
    );
  }
  const excludeParts = f.exclude
    ?.split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (excludeParts?.length) {
    out = out.filter(
      (e) =>
        !excludeParts.some((frag) => e.message.toLowerCase().includes(frag)),
    );
  }
  const limit = Math.min(Math.max(1, f.limit ?? 200), 500);
  return out.slice(0, limit);
}
