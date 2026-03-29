import { NextRequest, NextResponse } from 'next/server';

import {
  type ComputerLane,
  readComputerStepsFromTodayLog,
} from '@/lib/computerLogParser';

export const runtime = 'nodejs';

function parseLanes(sp: URLSearchParams): ComputerLane[] | null {
  const raw = sp.get('lane');
  if (!raw?.trim()) return null;
  const allowed: ComputerLane[] = [
    'agent',
    'browser',
    'tools',
    'cron',
    'channel',
    'system',
    'error',
  ];
  const set = new Set<ComputerLane>();
  for (const p of raw.split(',')) {
    const x = p.trim() as ComputerLane;
    if (allowed.includes(x)) set.add(x);
  }
  return set.size ? [...set] : null;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const maxLines = Math.min(
    Math.max(100, parseInt(sp.get('maxLines') ?? '5000', 10) || 5000),
    30_000,
  );
  const maxSteps = Math.min(
    Math.max(20, parseInt(sp.get('limit') ?? '300', 10) || 300),
    1500,
  );
  const lanes = parseLanes(sp);

  const steps = await readComputerStepsFromTodayLog({ maxLines, maxSteps });
  const filtered = lanes?.length
    ? steps.filter((s) => lanes.includes(s.lane))
    : steps;

  return NextResponse.json({
    steps: filtered,
    meta: {
      returned: filtered.length,
      lanes: lanes ?? 'all',
      maxLines,
    },
  });
}
