import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const STATE_FILE = join(DATA_DIR, 'state.json');

// Ensure data directory exists on first access
async function ensureDataDir() {
  try {
    await readFile(DATA_DIR, 'utf8');
  } catch {
    // Directory doesn't exist, create it
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    await ensureDataDir();
    const raw = await readFile(STATE_FILE, 'utf8');
    return NextResponse.json(JSON.parse(raw));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // No saved state yet — return 204 No Content to fall back to sample
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json({ error: 'Failed to read state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDataDir();
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    // Read existing state (if any) to merge safely
    let existing: any = {};
    try {
      const raw = await readFile(STATE_FILE, 'utf8');
      existing = JSON.parse(raw);
    } catch (e) {
      // File missing or corrupt — we'll Just use body as new state
    }

    // Shallow merge: incoming body overwrites existing top-level keys
    const merged = { ...existing, ...body };

    // Validate JSON before writing
    const serialized = JSON.stringify(merged, null, 2);
    JSON.parse(serialized); // throws if serialized is invalid

    await writeFile(STATE_FILE, serialized, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('POST /api/state failed:', e);
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}
