import { readFile } from 'fs/promises';
import { join } from 'path';

import {
  coerceSampleData,
  getDb,
  listMemories,
  listProjects,
  listTasks,
  writeMissionState,
} from './db';
import type { SampleData } from './types';

/** One-shot JSON → SQLite import (run manually, e.g. `npx tsx lib/migrate.ts`). */
export async function runMigrationFromStateJson(): Promise<void> {
  const statePath = join(process.cwd(), 'data', 'state.json');
  const jsonData = JSON.parse(await readFile(statePath, 'utf8'));

  if (!getDb()) {
    throw new Error(
      'SQLite is not available; install/build better-sqlite3 or use JSON mode.',
    );
  }

  console.log('Starting migration from JSON to SQLite...');
  const data = coerceSampleData(jsonData as Partial<SampleData>);
  writeMissionState(data);

  const tasks = listTasks();
  const projects = listProjects();
  const memories = listMemories();

  console.log('Migration complete! Migrated:');
  console.log(`- ${tasks.length} tasks`);
  console.log(`- ${projects.length} projects`);
  console.log(`- ${memories.length} memories`);
}
