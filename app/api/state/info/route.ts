import { NextResponse } from 'next/server';

import { getPersistenceInfo } from '@/lib/db';
import { getOpenclawLogDir } from '@/lib/openclawLog';

export const runtime = 'nodejs';

export async function GET() {
  const persistence = getPersistenceInfo();

  const logDir = getOpenclawLogDir();
  let logDirStatus: { readable: boolean; fileCount: number; lastMtime: string | null } = {
    readable: false,
    fileCount: 0,
    lastMtime: null,
  };

  try {
    const { readdir, stat } = await import('fs/promises');
    const files = await readdir(logDir);
    const logFiles = files.filter((f) => f.endsWith('.log'));
    let maxMtime = 0;
    for (const f of logFiles.slice(-10)) {
      try {
        const { join } = await import('path');
        const s = await stat(join(logDir, f));
        if (s.mtimeMs > maxMtime) maxMtime = s.mtimeMs;
      } catch {
        // skip unreadable files
      }
    }
    logDirStatus = {
      readable: true,
      fileCount: logFiles.length,
      lastMtime: maxMtime > 0 ? new Date(maxMtime).toISOString() : null,
    };
  } catch {
    logDirStatus = { readable: false, fileCount: 0, lastMtime: null };
  }

  return NextResponse.json({
    persistence,
    logDir: {
      path: logDir,
      ...logDirStatus,
    },
    gateway: {
      host: process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_HOST?.trim() || '127.0.0.1',
      port: process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_PORT?.trim() || '18789',
    },
  });
}
