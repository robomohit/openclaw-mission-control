import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

const OPENCLAW_ROOT = join(process.cwd(), '..', '..');
const AGENTS_DIR = join(OPENCLAW_ROOT, 'agents');

interface SessionMeta {
  sessionId: string;
  updatedAt: number;
  model?: string;
  status?: string;
}

interface SessionEntry {
  [key: string]: SessionMeta;
}

interface AgentInfo {
  id: string;
  name: string;
  model?: string;
  lastSeen: string | null;
  status: string;
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString();
}

function isSessionEntry(v: unknown): v is SessionEntry {
  if (!v || typeof v !== 'object') return false;
  for (const key of Object.keys(v as Record<string, unknown>)) {
    const sess = (v as Record<string, unknown>)[key];
    if (!sess || typeof sess !== 'object') return false;
    const s = sess as Record<string, unknown>;
    if (typeof s.updatedAt !== 'number') return false;
  }
  return true;
}

export async function GET() {
  try {
    const agentDirs = await readdir(AGENTS_DIR, { withFileTypes: true });
    const agentIds = agentDirs.filter(de => de.isDirectory()).map(de => de.name);

    const agents: AgentInfo[] = [];

    for (const agentId of agentIds) {
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      let lastSeen: string | null = null;
      let model: string | undefined;
      try {
        const raw = await readFile(sessionsFile, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        if (!isSessionEntry(parsed)) {
          console.warn(`agents/${agentId}/sessions/sessions.json has unexpected shape, skipping`);
          continue;
        }
        const sessions = parsed;
        let maxTime = 0;
        let best: SessionMeta | null = null;
        for (const key in sessions) {
          const sess = sessions[key];
          if (sess.updatedAt > maxTime) {
            maxTime = sess.updatedAt;
            best = sess;
          }
        }
        if (best) {
          lastSeen = toIsoDate(best.updatedAt);
          model = best.model;
        }
      } catch {
        // No sessions yet
      }

      agents.push({
        id: agentId,
        name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
        model: model ?? undefined,
        lastSeen: lastSeen,
        status: lastSeen ? (Date.now() - Date.parse(lastSeen) < 5 * 60 * 1000 ? 'active' : 'idle') : 'offline',
      });
    }

    return NextResponse.json({ agents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read agents directory';
    console.error('GET /api/openclaw/agents failed:', message);
    return NextResponse.json(
      { error: message, hint: 'Ensure the OpenClaw agents directory exists two levels above this project.' },
      { status: 502 },
    );
  }
}
