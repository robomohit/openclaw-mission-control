import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Root of the OpenClaw git workspace (parent of mission-control when dev server cwd is the app).
 * Override with MISSION_CONTROL_WORKSPACE_ROOT if auto-detection is wrong.
 */
export function getWorkspaceRoot(): string {
  const env = process.env.MISSION_CONTROL_WORKSPACE_ROOT?.trim();
  if (env) {
    return resolve(env);
  }
  let dir = resolve(process.cwd());
  for (;;) {
    if (existsSync(resolve(dir, '.git'))) {
      return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return resolve(process.cwd());
}
