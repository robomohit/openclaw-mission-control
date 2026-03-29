import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

const OPENCLAW_ROOT = join(process.cwd(), '..', '..');
const CRON_FILE = join(OPENCLAW_ROOT, 'cron', 'jobs.json');

interface CronJobResponse {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  scheduleKind: string;
  scheduleExpr: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString();
}

function parseCronJob(job: unknown): CronJobResponse | null {
  if (!job || typeof job !== 'object') return null;
  const j = job as Record<string, unknown>;
  const schedule = j.schedule as Record<string, unknown> | undefined;
  let scheduleExpr = '';
  let scheduleKind = 'unknown';
  if (schedule && typeof schedule === 'object' && typeof schedule.kind === 'string') {
    scheduleKind = schedule.kind;
    if (schedule.kind === 'cron') {
      scheduleExpr = typeof schedule.expr === 'string' ? schedule.expr : '';
    } else if (schedule.kind === 'every') {
      scheduleExpr =
        typeof schedule.everyMs === 'number' ? `every ${schedule.everyMs}ms` : '';
    } else if (schedule.kind === 'at') {
      scheduleExpr = typeof schedule.at === 'string' ? `at ${schedule.at}` : '';
    }
  }
  const state = j.state as Record<string, unknown> | undefined;
  return {
    id: typeof j.id === 'string' ? j.id : 'unknown',
    name: typeof j.name === 'string' ? j.name : 'Unnamed job',
    description: typeof j.description === 'string' ? j.description : undefined,
    enabled: Boolean(j.enabled),
    scheduleKind,
    scheduleExpr: scheduleExpr || '(invalid or missing schedule)',
    nextRunAt: state && typeof state.nextRunAtMs === 'number' ? formatDate(state.nextRunAtMs) : null,
    lastRunAt: state && typeof state.lastRunAtMs === 'number' ? formatDate(state.lastRunAtMs) : null,
    lastRunStatus: state && typeof state.lastRunStatus === 'string' ? state.lastRunStatus : null,
  };
}

export async function GET() {
  try {
    const raw = await readFile(CRON_FILE, 'utf8');
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') {
      console.warn('GET /api/openclaw/cron: jobs.json has unexpected shape');
      return NextResponse.json({ jobs: [] });
    }
    const rawJobs = (data as Record<string, unknown>).jobs;
    const jobsArr = Array.isArray(rawJobs) ? rawJobs : [];
    const jobs: CronJobResponse[] = jobsArr
      .map(parseCronJob)
      .filter((j): j is CronJobResponse => j !== null);

    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error
      ? (error as NodeJS.ErrnoException).code
      : undefined;
    if (code === 'ENOENT') {
      return NextResponse.json({ jobs: [] });
    }
    const message = error instanceof Error ? error.message : 'Failed to read cron jobs';
    console.error('GET /api/openclaw/cron failed:', message);
    return NextResponse.json(
      { error: message, hint: 'Ensure cron/jobs.json exists in the OpenClaw workspace.' },
      { status: 502 },
    );
  }
}
