import { open, readdir, stat } from 'fs/promises';
import { join } from 'path';

import { recordToComputerStep } from '@/lib/computerLogParser';
import { getOpenclawLogDir } from '@/lib/openclawLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POLL_MS = 900;
const HEARTBEAT_MS = 25_000;

/**
 * SSE: newly appended JSONL rows from today's log → structured ComputerStep (Manus-style feed).
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const logDir = getOpenclawLogDir();
  let closed = false;
  let lastPath = '';
  let lastPos = 0;
  let lineCounter = 0;

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
        if (st.size < lastPos) lastPos = 0;
        if (st.size === lastPos) return { path: primary, text: '' };
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

      const processChunk = (text: string) => {
        const parts = text.split(/\r?\n/);
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed) as unknown;
            const step = recordToComputerStep(obj, lineCounter++);
            if (step) send({ type: 'step', step });
          } catch {
            // skip non-JSON fragments
          }
        }
      };

      const tick = async () => {
        if (closed) return;
        try {
          const chunk = await readGrowth();
          if (chunk?.text) processChunk(chunk.text);
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

      send({ type: 'ready', pollMs: POLL_MS });
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
