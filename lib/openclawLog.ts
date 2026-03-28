import { join } from 'path';

/** Default OpenClaw daily log directory (Windows). Override with OPENCLAW_LOG_DIR. */
export function getOpenclawLogDir(): string {
  const env = process.env.OPENCLAW_LOG_DIR?.trim();
  if (env) return env;
  return join('C:', 'tmp', 'openclaw');
}

