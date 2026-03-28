import { NextResponse } from 'next/server';

import { readOpenclawLogEntries } from '@/lib/openclawLogFeed';

export const runtime = 'nodejs';

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

let cache: { expiresAt: number; body: { activities: Activity[] } } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(cache.body);
  }

  try {
    const entries = await readOpenclawLogEntries({
      maxLines: MAX_LINES_READ,
      maxEntries: MAX_ACTIVITIES,
    });
    const activities: Activity[] = entries.map(
      ({ id, agentId, message, timestamp, source }) => ({
        id,
        agentId,
        message,
        timestamp,
        source,
      }),
    );

    const body = { activities };
    cache = { expiresAt: now + CACHE_TTL_MS, body };

    return NextResponse.json(body);
  } catch {
    const body = { activities: [] as Activity[] };
    cache = { expiresAt: now + CACHE_TTL_MS, body };
    return NextResponse.json(body);
  }
}
