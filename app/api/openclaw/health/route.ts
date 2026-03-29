import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createConnection } from 'net';

export const runtime = 'nodejs';

const OPENCLAW_ROOT = join(process.cwd(), '..', '..');
const OPENCLAW_CONFIG = join(OPENCLAW_ROOT, 'openclaw.json');
const GATEWAY_HOST = '127.0.0.1';
const GATEWAY_TIMEOUT_MS = 1000;
const DEFAULT_GATEWAY_PORT = 18789;

type SanitizedChannel = { enabled: boolean; label: string };

function sanitizedChannelsFromConfig(config: Record<string, unknown>): {
  channels: { telegram: SanitizedChannel };
} {
  const channels = config.channels as Record<string, unknown> | undefined;
  const telegramRaw =
    channels && typeof channels === 'object' && channels !== null
      ? (channels.telegram as Record<string, unknown> | undefined)
      : undefined;

  let enabled = false;
  let label = 'Telegram';

  if (telegramRaw && typeof telegramRaw === 'object') {
    if (typeof telegramRaw.label === 'string' && telegramRaw.label.trim()) {
      label = telegramRaw.label.trim();
    }
    if (telegramRaw.enabled === true) {
      enabled = true;
    } else {
      const tokenLike = ['botToken', 'token', 'apiKey', 'secret'] as const;
      for (const k of tokenLike) {
        const v = telegramRaw[k];
        if (typeof v === 'string' && v.length > 0) {
          enabled = true;
          break;
        }
      }
    }
  }

  return {
    channels: {
      telegram: { enabled, label },
    },
  };
}

export async function GET() {
  const result: Record<string, unknown> = { ok: false };

  // Check config presence and parse
  let config;
  try {
    const configRaw = await readFile(OPENCLAW_CONFIG, 'utf8');
    result.configLoaded = true;
    try {
      config = JSON.parse(configRaw);
    } catch {
      result.configParseError = true;
      Object.assign(result, sanitizedChannelsFromConfig({}));
      return NextResponse.json(result, { status: 503 });
    }
    Object.assign(result, sanitizedChannelsFromConfig(config as Record<string, unknown>));
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e
      ? (e as NodeJS.ErrnoException).code
      : undefined;
    if (code === 'ENOENT') {
      result.configMissing = true;
    }
    Object.assign(result, sanitizedChannelsFromConfig({}));
    return NextResponse.json(result, { status: 503 });
  }

  const port = config.gateway?.port ?? DEFAULT_GATEWAY_PORT;

  // Check gateway socket
  return new Promise<Response>((resolve) => {
    const socket = createConnection({ host: GATEWAY_HOST, port }, () => {
      socket.end();
      result.gateway = 'up';
      result.ok = true;
      resolve(NextResponse.json(result));
    });

    socket.on('error', () => {
      result.gateway = 'down';
      resolve(NextResponse.json(result, { status: 503 }));
    });

    socket.setTimeout(GATEWAY_TIMEOUT_MS, () => {
      socket.destroy();
      result.gateway = 'timeout';
      resolve(NextResponse.json(result, { status: 503 }));
    });
  });
}
