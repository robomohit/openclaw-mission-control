import { watch } from 'fs';
import { readFile } from 'fs/promises';

import { isSqliteEnabled, readMissionState, STATE_JSON_PATH } from '@/lib/db';
import { subscribeToStateUpdates } from '@/lib/stateBroadcast';

const HEARTBEAT_MS = 30_000;
const POLL_MS = 2_000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadPersistedState(): Promise<unknown | null> {
  try {
    if (isSqliteEnabled()) {
      return readMissionState();
    }
  } catch {
    // fall through to JSON
  }
  try {
    const raw = await readFile(STATE_JSON_PATH, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

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
        const json = await loadPersistedState();
        if (json != null) sendEvent(json);
      };

      let watcher: ReturnType<typeof watch> | null = null;
      let pollInterval: ReturnType<typeof setInterval> | null = null;
      const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_MS);
      const unsubscribe = subscribeToStateUpdates((payload) => {
        sendEvent(payload);
      });

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
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

      const startPollingJsonFile = () => {
        if (pollInterval) return;
        let lastRaw = '';
        pollInterval = setInterval(async () => {
          try {
            const raw = await readFile(STATE_JSON_PATH, 'utf8');
            if (raw !== lastRaw) {
              lastRaw = raw;
              sendEvent(JSON.parse(raw));
            }
          } catch {
            // Ignore until next poll.
          }
        }, POLL_MS);
      };

      void sendState();

      const sqlite = isSqliteEnabled();
      if (!sqlite) {
        if (process.platform === 'win32') {
          startPollingJsonFile();
        } else {
          try {
            watcher = watch(STATE_JSON_PATH, (eventType) => {
              if (eventType === 'change' || eventType === 'rename') {
                void sendState();
              }
            });
          } catch {
            startPollingJsonFile();
          }
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
