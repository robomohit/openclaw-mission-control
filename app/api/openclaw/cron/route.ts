import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

const OPENCLAW_ROOT = join(process.cwd(), '..', '..');
const CRON_FILE = join(OPENCLAW_ROOT, 'cron', 'jobs.json');

function formatDate(ms: number): string {
  return new Date(ms).toISOString();
}

export async function GET() {
  try {
    const raw = await readFile(CRON_FILE, 'utf8');
    const data = JSON.parse(raw);
    const jobs = (data.jobs || []).map((job: any) => {
      const schedule = job?.schedule;
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
      return {
        id: job?.id ?? 'unknown',
        name: job?.name ?? 'Unnamed job',
        description: job?.description,
        enabled: Boolean(job?.enabled),
        scheduleKind,
        scheduleExpr: scheduleExpr || '(invalid or missing schedule)',
        nextRunAt: job?.state?.nextRunAtMs ? formatDate(job.state.nextRunAtMs) : null,
        lastRunAt: job?.state?.lastRunAtMs ? formatDate(job.state.lastRunAtMs) : null,
        lastRunStatus: job?.state?.lastRunStatus ?? null,
      };
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ jobs: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
