import { isAbsolute, relative, resolve } from 'path';
import { realpath } from 'fs/promises';

const BLOCKED_SEGMENTS = new Set(['.git', 'node_modules']);

function isBlockedRel(rel: string): boolean {
  const parts = rel.split(/[/\\]/).filter(Boolean);
  for (const p of parts) {
    if (BLOCKED_SEGMENTS.has(p.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve a user-supplied relative path (no .., no absolute) to a real path inside workspaceRoot.
 */
export async function resolveWorkspaceReadPath(
  workspaceRoot: string,
  rawPath: string
): Promise<{ ok: true; absolute: string; rootReal: string } | { ok: false; message: string; status: number }> {
  const decoded = decodeURIComponent(rawPath).trim();
  if (!decoded || decoded.includes('\0')) {
    return { ok: false, message: 'Invalid path', status: 400 };
  }
  const segments = decoded.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.length === 0) {
    return { ok: false, message: 'Path required', status: 400 };
  }
  if (segments.some(s => s === '..')) {
    return { ok: false, message: 'Path traversal not allowed', status: 400 };
  }
  if (isAbsolute(decoded)) {
    return { ok: false, message: 'Absolute paths not allowed', status: 400 };
  }

  const joined = resolve(workspaceRoot, ...segments);
  let rootReal: string;
  let absReal: string;
  try {
    rootReal = await realpath(workspaceRoot);
    absReal = await realpath(joined);
  } catch {
    return { ok: false, message: 'Path not found', status: 404 };
  }

  const rel = relative(rootReal, absReal);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return { ok: false, message: 'Path outside workspace', status: 403 };
  }
  if (isBlockedRel(rel)) {
    return { ok: false, message: 'Path not allowed', status: 403 };
  }

  return { ok: true, absolute: absReal, rootReal };
}
