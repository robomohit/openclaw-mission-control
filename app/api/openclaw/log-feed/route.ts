import { NextRequest, NextResponse } from 'next/server';

import {
  filterMergedLogFeed,
  loadMergedLogFeed,
  type MergedLogEntry,
} from '@/lib/openclawLogFeed';

export const runtime = 'nodejs';

function toJsonRow(
  e: MergedLogEntry,
  includeRaw: boolean,
): Record<string, unknown> {
  if (e.source === 'local') {
    return {
      id: e.id,
      agentId: e.agentId,
      message: e.message,
      timestamp: e.timestamp,
      source: 'local',
    };
  }
  const base: Record<string, unknown> = {
    id: e.id,
    agentId: e.agentId,
    message: e.message,
    timestamp: e.timestamp,
    source: 'openclaw',
    level: e.level,
  };
  if (includeRaw) base.rawLine = e.rawLine;
  return base;
}

function parseSource(
  v: string | null,
): 'all' | 'local' | 'openclaw' | undefined {
  if (!v) return undefined;
  if (v === 'all' || v === 'local' || v === 'openclaw') return v;
  return undefined;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const includeRaw = sp.get('raw') === '1' || sp.get('raw') === 'true';

  const maxLines = Math.min(
    Math.max(100, parseInt(sp.get('maxLines') ?? '4000', 10) || 4000),
    50_000,
  );
  const maxBefore = Math.min(
    Math.max(50, parseInt(sp.get('pool') ?? '800', 10) || 800),
    2000,
  );

  const merged = await loadMergedLogFeed({
    maxLines,
    maxEntriesBeforeFilter: maxBefore,
  });

  const hideHb =
    sp.get('hideHeartbeat') === '1' ||
    sp.get('hideHeartbeat') === 'true' ||
    sp.get('heartbeat') === '0';

  const filtered = filterMergedLogFeed(merged, {
    q: sp.get('q') ?? sp.get('search') ?? undefined,
    agent: sp.get('agent') ?? undefined,
    level: sp.get('level') ?? undefined,
    source: parseSource(sp.get('source')) ?? 'all',
    limit: parseInt(sp.get('limit') ?? '200', 10) || 200,
    since: sp.get('since') ?? undefined,
    until: sp.get('until') ?? undefined,
    exclude: sp.get('exclude') ?? undefined,
    hideHeartbeat: hideHb,
  });

  const activities = filtered.map((e) => toJsonRow(e, includeRaw));

  return NextResponse.json({
    activities,
    meta: {
      poolSize: merged.length,
      returned: activities.length,
      maxLines,
      filters: {
        q: sp.get('q') ?? sp.get('search') ?? null,
        agent: sp.get('agent'),
        level: sp.get('level'),
        source: sp.get('source') ?? 'all',
        limit: sp.get('limit'),
        since: sp.get('since'),
        until: sp.get('until'),
        exclude: sp.get('exclude'),
        hideHeartbeat: hideHb,
      },
    },
  });
}
