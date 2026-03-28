import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getWorkspaceRoot } from '@/lib/workspaceRoot';

const execFileAsync = promisify(execFile);

export async function GET() {
  const workspaceRoot = getWorkspaceRoot();

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['status', '--porcelain'],
      {
        cwd: workspaceRoot,
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
      }
    );
    const lines = stdout
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    return NextResponse.json({
      experimental: true,
      lines,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'git failed';
    return NextResponse.json(
      { error: msg, experimental: true },
      { status: 500 }
    );
  }
}
