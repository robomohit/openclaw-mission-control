import { watch } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

const STATE_FILE = join(process.cwd(), 'data', 'state.json');
const HEARTBEAT_MS = 30_000;
const POLL_MS = 2_000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;
  let cleanupRef: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const sendHeartbeat = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      };

      const sendState = async () => {
        try {
          const raw = await readFile(STATE_FILE, 'utf8');
          const json = JSON.parse(raw);
          sendEvent(json);
        } catch {
          // Ignore transient parse/read errors and wait for next update.
        }
      };

      let watcher: ReturnType<typeof watch> | null = null;
      let pollInterval: ReturnType<typeof setInterval> | null = null;
      const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (watcher) {
          watcher.close();
          watcher = null;
        }
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Stream may already be closed.
        }
      };
      cleanupRef = cleanup;

      request.signal.addEventListener('abort', cleanup);

      const startPolling = () => {
        if (pollInterval) return;
        let lastRaw = '';
        pollInterval = setInterval(async () => {
          try {
            const raw = await readFile(STATE_FILE, 'utf8');
            if (raw !== lastRaw) {
              lastRaw = raw;
              sendEvent(JSON.parse(raw));
            }
          } catch {
            // Ignore until next poll.
          }
        }, POLL_MS);
      };

      if (process.platform === 'win32') {
        startPolling();
      } else {
        try {
          watcher = watch(STATE_FILE, (eventType) => {
            if (eventType === 'change' || eventType === 'rename') {
              void sendState();
            }
          });
        } catch {
          startPolling();
        }
      }

      sendHeartbeat();
    },
    cancel() {
      if (cleanupRef) {
        cleanupRef();
      } else {
        closed = true;
      }
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
