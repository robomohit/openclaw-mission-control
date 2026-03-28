import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile, writeFile } from 'fs/promises';

import {
  coerceSampleData,
  DATA_DIR,
  isSqliteEnabled,
  readMissionState,
  STATE_JSON_PATH,
  writeMissionState,
} from '@/lib/db';
import { publishStateUpdate } from '@/lib/stateBroadcast';

export const runtime = 'nodejs';

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function GET() {
  try {
    if (isSqliteEnabled()) {
      const state = readMissionState();
      if (state) {
        return NextResponse.json(state);
      }
      return new NextResponse(null, { status: 204 });
    }
  } catch (e) {
    console.error('GET /api/state SQLite read failed, falling back to JSON:', e);
  }

  try {
    await ensureDataDir();
    const raw = await readFile(STATE_JSON_PATH, 'utf8');
    return NextResponse.json(JSON.parse(raw));
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === 'ENOENT') {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json({ error: 'Failed to read state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    let existing: Record<string, unknown> = {};
    try {
      if (isSqliteEnabled()) {
        const s = readMissionState();
        if (s) existing = s as unknown as Record<string, unknown>;
      } else {
        try {
          await ensureDataDir();
          const raw = await readFile(STATE_JSON_PATH, 'utf8');
          existing = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // File missing or corrupt — use body as new state
        }
      }
    } catch (e) {
      console.error('POST /api/state: failed to read existing state', e);
    }

    const merged = coerceSampleData({
      ...existing,
      ...body,
    } as Parameters<typeof coerceSampleData>[0]);

    const serialized = JSON.stringify(merged, null, 2);
    JSON.parse(serialized);

    try {
      if (isSqliteEnabled()) {
        writeMissionState(merged);
        publishStateUpdate(merged);
        return NextResponse.json({ ok: true });
      }
    } catch (e) {
      console.error('POST /api/state SQLite write failed, falling back to JSON:', e);
    }

    await ensureDataDir();
    await writeFile(STATE_JSON_PATH, serialized, 'utf-8');
    publishStateUpdate(merged);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('POST /api/state failed:', e);
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}
