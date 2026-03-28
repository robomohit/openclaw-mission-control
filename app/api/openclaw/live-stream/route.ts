import { open, readdir, stat } from 'fs/promises';
import { join } from 'path';

import { getOpenclawLogDir } from '@/lib/openclawLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POLL_MS = 1200;
const HEARTBEAT_MS = 25_000;

/**
 * SSE: incremental UTF-8 chunks from today's OpenClaw log file(s).
 * Near–real-time “computer use” mirror without exposing the gateway token.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const logDir = getOpenclawLogDir();
  let closed = false;
  let lastPath = '';
  let lastPos = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
        );
      };

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, HEARTBEAT_MS);

      const pickTodayFiles = async (): Promise<string[]> => {
        const today = new Date().toISOString().slice(0, 10);
        try {
          const names = await readdir(logDir);
          return names
            .filter((f) => f.startsWith(`openclaw-${today}`) && f.endsWith('.log'))
            .sort()
            .map((f) => join(logDir, f));
        } catch {
          return [];
        }
      };

      const readGrowth = async (): Promise<{ path: string; text: string } | null> => {
        const files = await pickTodayFiles();
        const primary = files[files.length - 1];
        if (!primary) {
          if (lastPath) {
            lastPath = '';
            lastPos = 0;
          }
          return null;
        }
        if (primary !== lastPath) {
          lastPath = primary;
          lastPos = 0;
        }
        let st;
        try {
          st = await stat(primary);
        } catch {
          return null;
        }
        if (st.size < lastPos) {
          lastPos = 0;
        }
        if (st.size === lastPos) {
          return { path: primary, text: '' };
        }
        const fh = await open(primary, 'r');
        try {
          const len = st.size - lastPos;
          const buf = Buffer.alloc(len);
          await fh.read(buf, 0, len, lastPos);
          lastPos = st.size;
          return { path: primary, text: buf.toString('utf8') };
        } finally {
          await fh.close();
        }
      };

      const tick = async () => {
        if (closed) return;
        try {
          const chunk = await readGrowth();
          if (chunk && chunk.text) {
            send({ type: 'log', path: chunk.path, chunk: chunk.text });
          }
        } catch (e) {
          send({
            type: 'error',
            message: e instanceof Error ? e.message : 'read failed',
          });
        }
      };

      const interval = setInterval(() => void tick(), POLL_MS);
      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });

      send({ type: 'ready', logDir, pollMs: POLL_MS });
      void tick();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
