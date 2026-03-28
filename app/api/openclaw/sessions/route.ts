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
  skillsSnapshot?: any; // skip
  sessionFile?: string; // skip
  contextTokens?: number; // skip
  // There are many; we'll only include safe ones
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

    const allSessions: any[] = [];

    for (const agentId of agentIds) {
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      try {
        const raw = await readFile(sessionsFile, 'utf8');
        const sessions: SessionEntry = JSON.parse(raw);
        for (const sessionKey in sessions) {
          const sess = sessions[sessionKey];
          allSessions.push({
            sessionKey,
            agentId,
            sessionId: sess.sessionId,
            updatedAt: toIsoDate(sess.updatedAt),
            model: sess.model ?? null,
          });
        }
      } catch (e) {
        // skip agent if no sessions
      }
    }

    // Sort by most recent first
    allSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ sessions: allSessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
