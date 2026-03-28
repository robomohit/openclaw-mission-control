import { NextRequest, NextResponse } from 'next/server';
import { stat, readFile } from 'fs/promises';
import { getWorkspaceRoot } from '@/lib/workspaceRoot';
import { resolveWorkspaceReadPath } from '@/lib/safeWorkspacePath';

const MAX_BYTES = 512 * 1024;

export async function GET(request: NextRequest) {
  const pathParam = request.nextUrl.searchParams.get('path');
  if (!pathParam) {
    return NextResponse.json(
      { error: 'Missing path query', experimental: true },
      { status: 400 }
    );
  }

  const workspaceRoot = getWorkspaceRoot();
  const resolved = await resolveWorkspaceReadPath(workspaceRoot, pathParam);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.message, experimental: true },
      { status: resolved.status }
    );
  }

  try {
    const st = await stat(resolved.absolute);
    if (!st.isFile()) {
      return NextResponse.json(
        { error: 'Not a regular file', experimental: true },
        { status: 400 }
      );
    }
    if (st.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES} bytes)`, experimental: true },
        { status: 413 }
      );
    }
    const content = await readFile(resolved.absolute, 'utf8');
    return NextResponse.json({
      experimental: true,
      path: pathParam.replace(/\\/g, '/'),
      size: st.size,
      content,
    });
  } catch {
    return NextResponse.json(
      { error: 'Read failed', experimental: true },
      { status: 500 }
    );
  }
}
