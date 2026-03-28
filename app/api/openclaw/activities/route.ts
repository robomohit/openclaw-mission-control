import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

/** OpenClaw daily logs (Windows default). */
const LOG_DIR = join('C:', 'tmp', 'openclaw');
const MAX_LINES_READ = 500;
const MAX_ACTIVITIES = 100;
const CACHE_TTL_MS = 30_000;

interface Activity {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
  source: 'openclaw';
}

interface ParsedRow extends Activity {
  dedupeKey: string;
}

/** [YYYY-MM-DD HH:mm:ss] LEVEL ... */
const LINE_RE =
  /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+(INFO|WARN|ERROR)\s*(.*)$/;

/** OpenClaw disk ids (main, cursor) and legacy agent-* slugs in logs */
const AGENT_RE = /\b(?:main|cursor|agent-[a-zA-Z0-9_.-]+)\b/;

let cache: { expiresAt: number; body: { activities: Activity[] } } | null = null;

function stableId(dedupeKey: string): string {
  return `oc-${createHash('sha256').update(dedupeKey).digest('hex').slice(0, 16)}`;
}

function parseLogLine(line: string): ParsedRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const m = trimmed.match(LINE_RE);
  if (!m) return null;

  const [, datePart, _level, rest] = m;
  const ts = new Date(datePart.replace(' ', 'T'));
  if (Number.isNaN(ts.getTime())) return null;

  const agentMatch = trimmed.match(AGENT_RE);
  const agentId = agentMatch ? agentMatch[1] : 'system';
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
    dedupeKey,
  };
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(cache.body);
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const files = await readdir(LOG_DIR);
    const logFiles = files
      .filter((f) => f.startsWith(`openclaw-${today}`) && f.endsWith('.log'))
      .sort();

    let lines: string[] = [];
    for (const file of logFiles) {
      const raw = await readFile(join(LOG_DIR, file), 'utf8');
      lines = lines.concat(raw.split(/\r?\n/));
    }

    const tail = lines.slice(-MAX_LINES_READ);

    const seen = new Set<string>();
    const parsed: ParsedRow[] = [];

    for (const line of tail) {
      const row = parseLogLine(line);
      if (!row) continue;
      if (seen.has(row.dedupeKey)) continue;
      seen.add(row.dedupeKey);
      parsed.push(row);
    }

    const activities: Activity[] = parsed
      .map(({ dedupeKey: _d, ...rest }) => rest)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, MAX_ACTIVITIES);

    const body = { activities };
    cache = { expiresAt: now + CACHE_TTL_MS, body };

    return NextResponse.json(body);
  } catch {
    const body = { activities: [] as Activity[] };
    cache = { expiresAt: now + CACHE_TTL_MS, body };
    return NextResponse.json(body);
  }
}
