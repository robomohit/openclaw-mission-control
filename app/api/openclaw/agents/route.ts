import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join, parse } from 'path';

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

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString();
}

export async function GET() {
  try {
    const agentDirs = await readdir(AGENTS_DIR, { withFileTypes: true });
    const agentIds = agentDirs.filter(de => de.isDirectory()).map(de => de.name);

    const agents: any[] = [];

    for (const agentId of agentIds) {
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      let lastSeen: string | null = null;
      let model: string | undefined;
      try {
        const raw = await readFile(sessionsFile, 'utf8');
        const sessions: SessionEntry = JSON.parse(raw);
        // Find the most recently updated session
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
      } catch (e) {
        // No sessions yet
      }

      agents.push({
        id: agentId,
        name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
        model: model ?? undefined,
        lastSeen: lastSeen,
        status: lastSeen ? (Date.now() - Date.parse(lastSeen) < 5 * 60 * 1000 ? 'active' : 'idle') : 'offline',
        // channels: not easily inferable; leave empty
      });
    }

    return NextResponse.json({ agents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
