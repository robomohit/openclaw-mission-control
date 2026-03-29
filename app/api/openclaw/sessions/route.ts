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
}

interface SessionRow {
  sessionKey: string;
  agentId: string;
  sessionId: string;
  updatedAt: string;
  model: string | null;
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString();
}

export async function GET() {
  try {
    const agentDirs = await readdir(AGENTS_DIR, { withFileTypes: true });
    const agentIds = agentDirs.filter(de => de.isDirectory()).map(de => de.name);

    const allSessions: SessionRow[] = [];

    for (const agentId of agentIds) {
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      try {
        const raw = await readFile(sessionsFile, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
          console.warn(`agents/${agentId}/sessions/sessions.json is not an object, skipping`);
          continue;
        }
        const sessions = parsed as Record<string, unknown>;
        for (const sessionKey of Object.keys(sessions)) {
          const sess = sessions[sessionKey];
          if (!sess || typeof sess !== 'object') continue;
          const s = sess as Record<string, unknown>;
          if (typeof s.updatedAt !== 'number') continue;
          allSessions.push({
            sessionKey,
            agentId,
            sessionId: typeof s.sessionId === 'string' ? s.sessionId : sessionKey,
            updatedAt: toIsoDate(s.updatedAt),
            model: typeof s.model === 'string' ? s.model : null,
          });
        }
      } catch {
        // skip agent if no sessions
      }
    }

    allSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ sessions: allSessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read sessions';
    console.error('GET /api/openclaw/sessions failed:', message);
    return NextResponse.json(
      { error: message, hint: 'Ensure the OpenClaw agents directory exists two levels above this project.' },
      { status: 502 },
    );
  }
}
