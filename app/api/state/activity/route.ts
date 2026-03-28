import { NextRequest, NextResponse } from 'next/server';

import { appendMissionActivity } from '@/lib/appendMissionActivity';

export const runtime = 'nodejs';

function checkIngestAuth(request: NextRequest): boolean {
  const token = process.env.MISSION_CONTROL_INGEST_TOKEN?.trim();
  if (!token) return true;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${token}`;
}

export async function POST(request: NextRequest) {
  if (!checkIngestAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const message = body.message;
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }
    const agentId =
      typeof body.agentId === 'string' ? body.agentId : undefined;
    const id = typeof body.id === 'string' ? body.id : undefined;
    const timestamp =
      typeof body.timestamp === 'string' ? body.timestamp : undefined;

    const item = await appendMissionActivity({
      agentId,
      message,
      id,
      timestamp,
    });
    return NextResponse.json({ ok: true, activity: item });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Append failed';
    console.error('POST /api/state/activity failed:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
