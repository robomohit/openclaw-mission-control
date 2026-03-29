import { NextRequest, NextResponse } from 'next/server';

import {
  atomicWriteStateJson,
  deepMergeState,
  isSqliteEnabled,
  readMissionState,
  safeReadStateJson,
  writeMissionState,
} from '@/lib/db';
import { publishStateUpdate } from '@/lib/stateBroadcast';

import type { SampleData } from '@/lib/types';

export const runtime = 'nodejs';

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

  // JSON fallback
  const state = safeReadStateJson();
  if (state) {
    return NextResponse.json(state);
  }
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    // `replace: true` in the body skips merge and overwrites entirely
    const replaceMode = body.replace === true;

    let existing: Partial<SampleData> = {};
    if (!replaceMode) {
      try {
        if (isSqliteEnabled()) {
          const s = readMissionState();
          if (s) existing = s;
        } else {
          const s = safeReadStateJson();
          if (s) existing = s;
        }
      } catch (e) {
        console.error('POST /api/state: failed to read existing state', e);
      }
    }

    // Deep-merge known top-level keys instead of shallow spread
    const merged = deepMergeState(existing, body as Partial<SampleData>);

    try {
      if (isSqliteEnabled()) {
        writeMissionState(merged);
        publishStateUpdate(merged);
        return NextResponse.json({ ok: true });
      }
    } catch (e) {
      console.error('POST /api/state SQLite write failed, falling back to JSON:', e);
    }

    // Atomic JSON write: temp file + rename
    atomicWriteStateJson(merged);
    publishStateUpdate(merged);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('POST /api/state failed:', e);
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}
