import { createHash } from 'crypto';

import { getOpenclawLogDir } from '@/lib/openclawLog';
import type { ComputerLane, ComputerStep } from '@/lib/computerStepTypes';

export type { ComputerLane, ComputerStep } from '@/lib/computerStepTypes';

const URL_RE = /https?:\/\/[^\s"'<>[\]()]+/gi;

function stableId(s: string): string {
  return `cs-${createHash('sha256').update(s).digest('hex').slice(0, 16)}`;
}

function extractUrls(text: string): string[] {
  const m = text.match(URL_RE);
  if (!m) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of m) {
    const clean = u.replace(/[),.]+$/g, '');
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out.slice(0, 8);
}

/** Normalize OpenClaw JSONL log record (winston-style "0","1","2" + _meta). */
export function flattenOpenclawLogRecord(obj: unknown): {
  time: string;
  text: string;
  level: 'info' | 'warn' | 'error';
} | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const time = typeof o.time === 'string' ? o.time : '';
  const meta = o._meta as Record<string, unknown> | undefined;
  const ln = meta?.logLevelName;
  let level: 'info' | 'warn' | 'error' = 'info';
  if (ln === 'ERROR' || ln === 'FATAL') level = 'error';
  else if (ln === 'WARN') level = 'warn';

  const seg = (v: unknown): string => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  const parts = [seg(o['0']), seg(o['1']), seg(o['2'])].filter(Boolean);
  const text = parts.join(' ').trim();
  if (!text) return null;
  return { time, text, level };
}

export function classifyComputerStep(
  text: string,
  level: 'info' | 'warn' | 'error',
): { lane: ComputerLane; title: string } {
  const t = text;
  if (level === 'error' || /\bERROR\b|\bfailed\b|\bspawn failed\b/i.test(t)) {
    return { lane: 'error', title: 'Error / failure' };
  }
  if (/browser\/server|Browser control listening|browser\.executable/i.test(t)) {
    return { lane: 'browser', title: 'Browser runtime' };
  }
  if (/\[tools\]|"subsystem":"tools"|tools\.profile/i.test(t)) {
    return { lane: 'tools', title: 'Tools' };
  }
  if (/gateway\/ws|⇄ res|sessions\.patch|\bagent\b.*runId/i.test(t)) {
    return { lane: 'agent', title: 'Gateway / agent' };
  }
  if (/cron:|"module":"cron"/i.test(t)) {
    return { lane: 'cron', title: 'Cron' };
  }
  if (/telegram|discord|slack|channels?\//i.test(t)) {
    return { lane: 'channel', title: 'Channels' };
  }
  if (/canvas|__openclaw__\/canvas/i.test(t)) {
    return { lane: 'browser', title: 'Canvas / UI host' };
  }
  return { lane: 'system', title: 'System' };
}

export function recordToComputerStep(
  obj: unknown,
  lineIndex: number,
): ComputerStep | null {
  const flat = flattenOpenclawLogRecord(obj);
  if (!flat) return null;
  const { lane, title } = classifyComputerStep(flat.text, flat.level);
  const urls = extractUrls(flat.text);
  const ts = flat.time || new Date().toISOString();
  const id = stableId(`${ts}\0${lineIndex}\0${flat.text.slice(0, 200)}`);
  const detail =
    flat.text.length > 600 ? `${flat.text.slice(0, 597)}…` : flat.text;
  return {
    id,
    lane,
    title,
    detail,
    timestamp: ts,
    level: flat.level,
    urls,
  };
}

export async function readComputerStepsFromTodayLog(options: {
  maxLines?: number;
  maxSteps?: number;
}): Promise<ComputerStep[]> {
  const maxLines = Math.min(Math.max(200, options.maxLines ?? 4000), 30_000);
  const maxSteps = Math.min(Math.max(50, options.maxSteps ?? 400), 2000);
  const logDir = getOpenclawLogDir();
  const today = new Date().toISOString().slice(0, 10);
  const { readdir, readFile } = await import('fs/promises');
  const { join } = await import('path');

  let lines: string[] = [];
  try {
    const names = await readdir(logDir);
    const files = names
      .filter((f) => f.startsWith(`openclaw-${today}`) && f.endsWith('.log'))
      .sort();
    for (const f of files) {
      const raw = await readFile(join(logDir, f), 'utf8');
      lines = lines.concat(raw.split(/\r?\n/));
    }
  } catch {
    return [];
  }

  const tail = lines.slice(-maxLines);
  const steps: ComputerStep[] = [];
  let i = 0;
  for (const line of tail) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as unknown;
      const step = recordToComputerStep(obj, i++);
      if (step) steps.push(step);
    } catch {
      // plain text line — no embedded timestamp available; mark as ingested time
      const c = classifyComputerStep(trimmed, 'info');
      const ingestedAt = new Date().toISOString();
      const step: ComputerStep = {
        id: stableId(`${i++}\0${trimmed.slice(0, 120)}`),
        lane: c.lane,
        title: c.title,
        detail: trimmed.length > 500 ? `${trimmed.slice(0, 497)}…` : trimmed,
        timestamp: ingestedAt,
        level: 'info',
        urls: extractUrls(trimmed),
        ingestedAt: true,
      };
      steps.push(step);
    }
  }

  const ts = (s: string) => {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  };
  steps.sort((a, b) => ts(b.timestamp) - ts(a.timestamp));
  return steps.slice(0, maxSteps);
}
