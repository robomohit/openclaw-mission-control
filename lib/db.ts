import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  ActivityItem,
  Agent,
  CalendarEvent,
  DocEntry,
  MemoryEntry,
  Project,
  SampleData,
  StatsHistoryEntry,
  Task,
} from '@/lib/types';

export const DATA_DIR = join(process.cwd(), 'data');
export const DB_PATH = join(DATA_DIR, 'mission-control.db');
export const STATE_JSON_PATH = join(DATA_DIR, 'state.json');

type BetterSqlite3Database = InstanceType<typeof import('better-sqlite3')>;

let _db: BetterSqlite3Database | null = null;
let _initAttempted = false;
let _lastInitError: unknown = null;

function loadBetterSqlite3():
  | typeof import('better-sqlite3')
  | null {
  try {
    return require('better-sqlite3') as typeof import('better-sqlite3');
  } catch {
    return null;
  }
}

function ensureDataDirSync(): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // ignore if exists
  }
}

function runMigrations(db: BetterSqlite3Database): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      assignee_id TEXT NOT NULL,
      assignee_type TEXT NOT NULL,
      priority TEXT NOT NULL,
      project_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      related_doc_ids TEXT NOT NULL DEFAULT '[]',
      related_memory_ids TEXT NOT NULL DEFAULT '[]',
      related_project_ids TEXT,
      waiting_for_human_review INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      progress REAL NOT NULL,
      priority TEXT NOT NULL,
      milestones TEXT NOT NULL DEFAULT '[]',
      linked_task_ids TEXT NOT NULL DEFAULT '[]',
      linked_doc_ids TEXT NOT NULL DEFAULT '[]',
      linked_memory_ids TEXT NOT NULL DEFAULT '[]',
      last_worked_on TEXT NOT NULL,
      suggested_next_action TEXT NOT NULL DEFAULT '',
      health TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_projects_health ON projects(health);
    CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL,
      date TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      topic TEXT NOT NULL DEFAULT '',
      person TEXT NOT NULL DEFAULT '',
      linked_project_ids TEXT NOT NULL DEFAULT '[]',
      linked_doc_ids TEXT NOT NULL DEFAULT '[]',
      linked_task_ids TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
    CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);

    CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      project_id TEXT,
      agent_id TEXT,
      updated_at TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_docs_project_id ON docs(project_id);
    CREATE INDEX IF NOT EXISTS idx_docs_agent_id ON docs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_docs_kind ON docs(kind);

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      kind TEXT NOT NULL,
      task_id TEXT,
      project_id TEXT,
      why TEXT NOT NULL DEFAULT '',
      confirmed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start);
    CREATE INDEX IF NOT EXISTS idx_calendar_project_id ON calendar_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_task_id ON calendar_events(task_id);

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY NOT NULL,
      agent_id TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activities_agent_id ON activities(agent_id);
    CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY NOT NULL,
      openclaw_agent_id TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      specialty TEXT NOT NULL DEFAULT '',
      capabilities TEXT NOT NULL DEFAULT '[]',
      model TEXT NOT NULL DEFAULT '',
      environment TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      current_work TEXT NOT NULL DEFAULT '',
      handoff_rules TEXT NOT NULL DEFAULT '',
      parent_id TEXT,
      avatar_color TEXT NOT NULL DEFAULT '#64748b',
      token_usage REAL,
      cost_usd REAL,
      last_seen TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    CREATE INDEX IF NOT EXISTS idx_agents_parent_id ON agents(parent_id);

    CREATE TABLE IF NOT EXISTS stats_history (
      date TEXT PRIMARY KEY NOT NULL,
      active_tasks INTEGER NOT NULL,
      scheduled_today INTEGER NOT NULL,
      agents_active INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stats_history_date ON stats_history(date);
  `);
}

function jsonStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function jsonParseArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function emptySampleData(): SampleData {
  return {
    user: { name: '', agentStatus: '' },
    mission: { text: '', updatedAt: new Date().toISOString() },
    agents: [],
    tasks: [],
    projects: [],
    memories: [],
    docs: [],
    calendarEvents: [],
    activities: [],
    office: { zones: [], agentPositions: [] },
    suggestedTools: [],
    statsHistory: [],
  };
}

function parseSampleDataFromJson(raw: string): SampleData {
  const parsed = JSON.parse(raw) as Partial<SampleData>;
  const base = emptySampleData();
  return {
    ...base,
    ...parsed,
    user: { ...base.user, ...parsed.user },
    mission: { ...base.mission, ...parsed.mission },
    office: parsed.office ?? base.office,
    agents: Array.isArray(parsed.agents) ? parsed.agents : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    memories: Array.isArray(parsed.memories) ? parsed.memories : [],
    docs: Array.isArray(parsed.docs) ? parsed.docs : [],
    calendarEvents: Array.isArray(parsed.calendarEvents)
      ? parsed.calendarEvents
      : [],
    activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    suggestedTools: Array.isArray(parsed.suggestedTools)
      ? parsed.suggestedTools
      : [],
    statsHistory: Array.isArray(parsed.statsHistory) ? parsed.statsHistory : [],
  };
}

/** Import rows from data/state.json when the DB file is new (did not exist before open). */
export function migrateFromStateJsonIfNewDb(
  db: BetterSqlite3Database,
  dbFileExistedBeforeOpen: boolean,
): void {
  if (dbFileExistedBeforeOpen) return;
  if (!existsSync(STATE_JSON_PATH)) return;
  let raw: string;
  try {
    raw = readFileSync(STATE_JSON_PATH, 'utf8');
  } catch {
    return;
  }
  try {
    const data = parseSampleDataFromJson(raw);
    writeMissionStateToDb(db, data);
  } catch (e) {
    console.error('migrateFromStateJsonIfNewDb: failed to import state.json', e);
  }
}

export function getDb(): BetterSqlite3Database | null {
  if (_initAttempted) return _db;
  _initAttempted = true;
  _lastInitError = null;
  const BetterSqlite3 = loadBetterSqlite3();
  if (!BetterSqlite3) {
    _lastInitError = new Error('better-sqlite3 not available');
    _db = null;
    return null;
  }
  try {
    ensureDataDirSync();
    const existed = existsSync(DB_PATH);
    _db = new BetterSqlite3(DB_PATH);
    runMigrations(_db);
    migrateFromStateJsonIfNewDb(_db, existed);
    return _db;
  } catch (e) {
    _lastInitError = e;
    console.error('SQLite initialization failed; JSON fallback will be used.', e);
    _db = null;
    return null;
  }
}

export function isSqliteEnabled(): boolean {
  return getDb() !== null;
}

export function getLastSqliteInitError(): unknown {
  return _lastInitError;
}

export function readMissionStateFromDb(db: BetterSqlite3Database): SampleData | null {
  const userRow = db
    .prepare(`SELECT value FROM meta WHERE key = 'user'`)
    .get() as { value: string } | undefined;
  if (!userRow) return null;

  const missionRow = db
    .prepare(`SELECT value FROM meta WHERE key = 'mission'`)
    .get() as { value: string } | undefined;
  const officeRow = db
    .prepare(`SELECT value FROM meta WHERE key = 'office'`)
    .get() as { value: string } | undefined;
  const toolsRow = db
    .prepare(`SELECT value FROM meta WHERE key = 'suggested_tools'`)
    .get() as { value: string } | undefined;

  const tasks = db.prepare(`SELECT * FROM tasks`).all() as TaskRow[];
  const projects = db.prepare(`SELECT * FROM projects`).all() as ProjectRow[];
  const memories = db.prepare(`SELECT * FROM memories`).all() as MemoryRow[];
  const docs = db.prepare(`SELECT * FROM docs`).all() as DocRow[];
  const calendarEvents = db
    .prepare(`SELECT * FROM calendar_events`)
    .all() as CalendarRow[];
  const activities = db.prepare(`SELECT * FROM activities`).all() as ActivityRow[];
  const agents = db.prepare(`SELECT * FROM agents`).all() as AgentRow[];
  const stats = db.prepare(`SELECT * FROM stats_history ORDER BY date`).all() as StatsRow[];

  let user: SampleData['user'];
  let mission: SampleData['mission'];
  let office: SampleData['office'];
  let suggestedTools: SampleData['suggestedTools'];
  try {
    user = JSON.parse(userRow.value) as SampleData['user'];
  } catch {
    return null;
  }
  try {
    mission = missionRow
      ? (JSON.parse(missionRow.value) as SampleData['mission'])
      : emptySampleData().mission;
  } catch {
    mission = emptySampleData().mission;
  }
  try {
    office = officeRow
      ? (JSON.parse(officeRow.value) as SampleData['office'])
      : emptySampleData().office;
  } catch {
    office = emptySampleData().office;
  }
  try {
    suggestedTools = toolsRow
      ? (JSON.parse(toolsRow.value) as SampleData['suggestedTools'])
      : [];
  } catch {
    suggestedTools = [];
  }

  return {
    user,
    mission,
    office,
    suggestedTools,
    agents: agents.map(rowToAgent),
    tasks: tasks.map(rowToTask),
    projects: projects.map(rowToProject),
    memories: memories.map(rowToMemory),
    docs: docs.map(rowToDoc),
    calendarEvents: calendarEvents.map(rowToCalendarEvent),
    activities: activities.map(rowToActivity),
    statsHistory: stats.map(rowToStatsHistory),
  };
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  assignee_id: string;
  assignee_type: string;
  priority: string;
  project_id: string;
  due_date: string;
  status: string;
  tags: string;
  related_doc_ids: string;
  related_memory_ids: string;
  related_project_ids: string | null;
  waiting_for_human_review: number;
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    assigneeId: r.assignee_id,
    assigneeType: r.assignee_type as Task['assigneeType'],
    priority: r.priority as Task['priority'],
    projectId: r.project_id,
    dueDate: r.due_date,
    status: r.status as Task['status'],
    tags: jsonParseArray<string>(r.tags, []),
    relatedDocIds: jsonParseArray<string>(r.related_doc_ids, []),
    relatedMemoryIds: jsonParseArray<string>(r.related_memory_ids, []),
    relatedProjectIds: r.related_project_ids
      ? jsonParseArray<string>(r.related_project_ids, [])
      : undefined,
    waitingForHumanReview: Boolean(r.waiting_for_human_review),
  };
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  progress: number;
  priority: string;
  milestones: string;
  linked_task_ids: string;
  linked_doc_ids: string;
  linked_memory_ids: string;
  last_worked_on: string;
  suggested_next_action: string;
  health: string;
}

function rowToProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    progress: r.progress,
    priority: r.priority as Project['priority'],
    milestones: jsonParseArray(r.milestones, []),
    linkedTaskIds: jsonParseArray<string>(r.linked_task_ids, []),
    linkedDocIds: jsonParseArray<string>(r.linked_doc_ids, []),
    linkedMemoryIds: jsonParseArray<string>(r.linked_memory_ids, []),
    lastWorkedOn: r.last_worked_on,
    suggestedNextAction: r.suggested_next_action,
    health: r.health as Project['health'],
  };
}

interface MemoryRow {
  id: string;
  title: string;
  content: string;
  kind: string;
  date: string;
  tags: string;
  topic: string;
  person: string;
  linked_project_ids: string;
  linked_doc_ids: string;
  linked_task_ids: string;
}

function rowToMemory(r: MemoryRow): MemoryEntry {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    kind: r.kind as MemoryEntry['kind'],
    date: r.date,
    tags: jsonParseArray<string>(r.tags, []),
    topic: r.topic,
    person: r.person,
    linkedProjectIds: jsonParseArray<string>(r.linked_project_ids, []),
    linkedDocIds: jsonParseArray<string>(r.linked_doc_ids, []),
    linkedTaskIds: jsonParseArray<string>(r.linked_task_ids, []),
  };
}

interface DocRow {
  id: string;
  title: string;
  kind: string;
  category: string;
  tags: string;
  project_id: string | null;
  agent_id: string | null;
  updated_at: string;
  body: string;
}

function rowToDoc(r: DocRow): DocEntry {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind as DocEntry['kind'],
    category: r.category,
    tags: jsonParseArray<string>(r.tags, []),
    projectId: r.project_id,
    agentId: r.agent_id,
    updatedAt: r.updated_at,
    body: r.body,
  };
}

interface CalendarRow {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: string;
  task_id: string | null;
  project_id: string | null;
  why: string;
  confirmed: number;
  status: string;
}

function rowToCalendarEvent(r: CalendarRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    start: r.start,
    end: r.end,
    kind: r.kind as CalendarEvent['kind'],
    taskId: r.task_id,
    projectId: r.project_id,
    why: r.why,
    confirmed: Boolean(r.confirmed),
    status: r.status as CalendarEvent['status'],
  };
}

interface ActivityRow {
  id: string;
  agent_id: string;
  message: string;
  timestamp: string;
}

function rowToActivity(r: ActivityRow): ActivityItem {
  return {
    id: r.id,
    agentId: r.agent_id,
    message: r.message,
    timestamp: r.timestamp,
  };
}

interface AgentRow {
  id: string;
  openclaw_agent_id: string | null;
  name: string;
  role: string;
  specialty: string;
  capabilities: string;
  model: string;
  environment: string;
  status: string;
  current_work: string;
  handoff_rules: string;
  parent_id: string | null;
  avatar_color: string;
  token_usage: number | null;
  cost_usd: number | null;
  last_seen: string | null;
}

function rowToAgent(r: AgentRow): Agent {
  const a: Agent = {
    id: r.id,
    name: r.name,
    role: r.role as Agent['role'],
    specialty: r.specialty,
    capabilities: jsonParseArray<string>(r.capabilities, []),
    model: r.model,
    environment: r.environment,
    status: r.status as Agent['status'],
    currentWork: r.current_work,
    handoffRules: r.handoff_rules,
    parentId: r.parent_id,
    avatarColor: r.avatar_color,
  };
  if (r.openclaw_agent_id) a.openclawAgentId = r.openclaw_agent_id;
  if (r.token_usage != null) a.tokenUsage = r.token_usage;
  if (r.cost_usd != null) a.costUsd = r.cost_usd;
  if (r.last_seen) a.lastSeen = r.last_seen;
  return a;
}

interface StatsRow {
  date: string;
  active_tasks: number;
  scheduled_today: number;
  agents_active: number;
}

function rowToStatsHistory(r: StatsRow): StatsHistoryEntry {
  return {
    date: r.date,
    activeTasks: r.active_tasks,
    scheduledToday: r.scheduled_today,
    agentsActive: r.agents_active,
  };
}

export function writeMissionStateToDb(
  db: BetterSqlite3Database,
  data: SampleData,
): void {
  const insMeta = db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  const delTasks = db.prepare(`DELETE FROM tasks`);
  const insTask = db.prepare(`
    INSERT INTO tasks (
      id, title, description, assignee_id, assignee_type, priority, project_id,
      due_date, status, tags, related_doc_ids, related_memory_ids, related_project_ids,
      waiting_for_human_review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const delProjects = db.prepare(`DELETE FROM projects`);
  const insProject = db.prepare(`
    INSERT INTO projects (
      id, name, description, progress, priority, milestones, linked_task_ids,
      linked_doc_ids, linked_memory_ids, last_worked_on, suggested_next_action, health
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const delMem = db.prepare(`DELETE FROM memories`);
  const insMem = db.prepare(`
    INSERT INTO memories (
      id, title, content, kind, date, tags, topic, person,
      linked_project_ids, linked_doc_ids, linked_task_ids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const delDocs = db.prepare(`DELETE FROM docs`);
  const insDoc = db.prepare(`
    INSERT INTO docs (
      id, title, kind, category, tags, project_id, agent_id, updated_at, body
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const delCal = db.prepare(`DELETE FROM calendar_events`);
  const insCal = db.prepare(`
    INSERT INTO calendar_events (
      id, title, start, end, kind, task_id, project_id, why, confirmed, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const delAct = db.prepare(`DELETE FROM activities`);
  const insAct = db.prepare(
    `INSERT INTO activities (id, agent_id, message, timestamp) VALUES (?, ?, ?, ?)`,
  );
  const delAgents = db.prepare(`DELETE FROM agents`);
  const insAgent = db.prepare(`
    INSERT INTO agents (
      id, openclaw_agent_id, name, role, specialty, capabilities, model, environment,
      status, current_work, handoff_rules, parent_id, avatar_color, token_usage, cost_usd, last_seen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const delStats = db.prepare(`DELETE FROM stats_history`);
  const insStats = db.prepare(`
    INSERT INTO stats_history (date, active_tasks, scheduled_today, agents_active)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    insMeta.run('user', jsonStringify(data.user));
    insMeta.run('mission', jsonStringify(data.mission));
    insMeta.run('office', jsonStringify(data.office));
    insMeta.run('suggested_tools', jsonStringify(data.suggestedTools));

    delTasks.run();
    for (const t of data.tasks) {
      insTask.run(
        t.id,
        t.title,
        t.description,
        t.assigneeId,
        t.assigneeType,
        t.priority,
        t.projectId,
        t.dueDate,
        t.status,
        jsonStringify(t.tags),
        jsonStringify(t.relatedDocIds),
        jsonStringify(t.relatedMemoryIds),
        t.relatedProjectIds != null ? jsonStringify(t.relatedProjectIds) : null,
        t.waitingForHumanReview ? 1 : 0,
      );
    }

    delProjects.run();
    for (const p of data.projects) {
      insProject.run(
        p.id,
        p.name,
        p.description,
        p.progress,
        p.priority,
        jsonStringify(p.milestones),
        jsonStringify(p.linkedTaskIds),
        jsonStringify(p.linkedDocIds),
        jsonStringify(p.linkedMemoryIds),
        p.lastWorkedOn,
        p.suggestedNextAction,
        p.health,
      );
    }

    delMem.run();
    for (const m of data.memories) {
      insMem.run(
        m.id,
        m.title,
        m.content,
        m.kind,
        m.date,
        jsonStringify(m.tags),
        m.topic,
        m.person,
        jsonStringify(m.linkedProjectIds),
        jsonStringify(m.linkedDocIds),
        jsonStringify(m.linkedTaskIds),
      );
    }

    delDocs.run();
    for (const d of data.docs) {
      insDoc.run(
        d.id,
        d.title,
        d.kind,
        d.category,
        jsonStringify(d.tags),
        d.projectId,
        d.agentId,
        d.updatedAt,
        d.body,
      );
    }

    delCal.run();
    for (const e of data.calendarEvents) {
      insCal.run(
        e.id,
        e.title,
        e.start,
        e.end,
        e.kind,
        e.taskId,
        e.projectId,
        e.why,
        e.confirmed ? 1 : 0,
        e.status,
      );
    }

    delAct.run();
    for (const a of data.activities) {
      insAct.run(a.id, a.agentId, a.message, a.timestamp);
    }

    delAgents.run();
    for (const a of data.agents) {
      insAgent.run(
        a.id,
        a.openclawAgentId ?? null,
        a.name,
        a.role,
        a.specialty,
        jsonStringify(a.capabilities),
        a.model,
        a.environment,
        a.status,
        a.currentWork,
        a.handoffRules,
        a.parentId,
        a.avatarColor,
        a.tokenUsage ?? null,
        a.costUsd ?? null,
        a.lastSeen ?? null,
      );
    }

    delStats.run();
    for (const s of data.statsHistory ?? []) {
      insStats.run(s.date, s.activeTasks, s.scheduledToday, s.agentsActive);
    }
  });

  tx();
}

export function readMissionState(): SampleData | null {
  const db = getDb();
  if (!db) return null;
  return readMissionStateFromDb(db);
}

export function writeMissionState(data: SampleData): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  writeMissionStateToDb(db, data);
}

/** Normalize shallow-merged payload into a full SampleData for persistence. */
export function coerceSampleData(merged: Partial<SampleData>): SampleData {
  const base = emptySampleData();
  return {
    ...base,
    ...merged,
    user: { ...base.user, ...merged.user },
    mission: { ...base.mission, ...merged.mission },
    office: merged.office ?? base.office,
    agents: Array.isArray(merged.agents) ? merged.agents : base.agents,
    tasks: Array.isArray(merged.tasks) ? merged.tasks : base.tasks,
    projects: Array.isArray(merged.projects) ? merged.projects : base.projects,
    memories: Array.isArray(merged.memories) ? merged.memories : base.memories,
    docs: Array.isArray(merged.docs) ? merged.docs : base.docs,
    calendarEvents: Array.isArray(merged.calendarEvents)
      ? merged.calendarEvents
      : base.calendarEvents,
    activities: Array.isArray(merged.activities)
      ? merged.activities
      : base.activities,
    suggestedTools: Array.isArray(merged.suggestedTools)
      ? merged.suggestedTools
      : base.suggestedTools,
    statsHistory: Array.isArray(merged.statsHistory)
      ? merged.statsHistory
      : base.statsHistory,
  };
}

// --- CRUD helpers (require SQLite) ---

export function listTasks(): Task[] {
  const db = getDb();
  if (!db) return [];
  const rows = db.prepare(`SELECT * FROM tasks ORDER BY due_date`).all() as TaskRow[];
  return rows.map(rowToTask);
}

export function getTaskById(id: string): Task | undefined {
  const db = getDb();
  if (!db) return undefined;
  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : undefined;
}

export function upsertTask(task: Task): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO tasks (
      id, title, description, assignee_id, assignee_type, priority, project_id,
      due_date, status, tags, related_doc_ids, related_memory_ids, related_project_ids,
      waiting_for_human_review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      assignee_id = excluded.assignee_id,
      assignee_type = excluded.assignee_type,
      priority = excluded.priority,
      project_id = excluded.project_id,
      due_date = excluded.due_date,
      status = excluded.status,
      tags = excluded.tags,
      related_doc_ids = excluded.related_doc_ids,
      related_memory_ids = excluded.related_memory_ids,
      related_project_ids = excluded.related_project_ids,
      waiting_for_human_review = excluded.waiting_for_human_review`,
  ).run(
    task.id,
    task.title,
    task.description,
    task.assigneeId,
    task.assigneeType,
    task.priority,
    task.projectId,
    task.dueDate,
    task.status,
    jsonStringify(task.tags),
    jsonStringify(task.relatedDocIds),
    jsonStringify(task.relatedMemoryIds),
    task.relatedProjectIds != null ? jsonStringify(task.relatedProjectIds) : null,
    task.waitingForHumanReview ? 1 : 0,
  );
}

export function deleteTaskById(id: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
}

export function listProjects(): Project[] {
  const db = getDb();
  if (!db) return [];
  const rows = db.prepare(`SELECT * FROM projects ORDER BY name`).all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProjectById(id: string): Project | undefined {
  const db = getDb();
  if (!db) return undefined;
  const row = db
    .prepare(`SELECT * FROM projects WHERE id = ?`)
    .get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : undefined;
}

export function upsertProject(project: Project): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO projects (
      id, name, description, progress, priority, milestones, linked_task_ids,
      linked_doc_ids, linked_memory_ids, last_worked_on, suggested_next_action, health
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      progress = excluded.progress,
      priority = excluded.priority,
      milestones = excluded.milestones,
      linked_task_ids = excluded.linked_task_ids,
      linked_doc_ids = excluded.linked_doc_ids,
      linked_memory_ids = excluded.linked_memory_ids,
      last_worked_on = excluded.last_worked_on,
      suggested_next_action = excluded.suggested_next_action,
      health = excluded.health`,
  ).run(
    project.id,
    project.name,
    project.description,
    project.progress,
    project.priority,
    jsonStringify(project.milestones),
    jsonStringify(project.linkedTaskIds),
    jsonStringify(project.linkedDocIds),
    jsonStringify(project.linkedMemoryIds),
    project.lastWorkedOn,
    project.suggestedNextAction,
    project.health,
  );
}

export function deleteProjectById(id: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}

export function listMemories(): MemoryEntry[] {
  const db = getDb();
  if (!db) return [];
  const rows = db.prepare(`SELECT * FROM memories ORDER BY date DESC`).all() as MemoryRow[];
  return rows.map(rowToMemory);
}

export function getMemoryById(id: string): MemoryEntry | undefined {
  const db = getDb();
  if (!db) return undefined;
  const row = db.prepare(`SELECT * FROM memories WHERE id = ?`).get(id) as MemoryRow | undefined;
  return row ? rowToMemory(row) : undefined;
}

export function upsertMemory(entry: MemoryEntry): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO memories (
      id, title, content, kind, date, tags, topic, person,
      linked_project_ids, linked_doc_ids, linked_task_ids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      kind = excluded.kind,
      date = excluded.date,
      tags = excluded.tags,
      topic = excluded.topic,
      person = excluded.person,
      linked_project_ids = excluded.linked_project_ids,
      linked_doc_ids = excluded.linked_doc_ids,
      linked_task_ids = excluded.linked_task_ids`,
  ).run(
    entry.id,
    entry.title,
    entry.content,
    entry.kind,
    entry.date,
    jsonStringify(entry.tags),
    entry.topic,
    entry.person,
    jsonStringify(entry.linkedProjectIds),
    jsonStringify(entry.linkedDocIds),
    jsonStringify(entry.linkedTaskIds),
  );
}

export function deleteMemoryById(id: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
}

export function listDocs(): DocEntry[] {
  const db = getDb();
  if (!db) return [];
  const rows = db.prepare(`SELECT * FROM docs ORDER BY updated_at DESC`).all() as DocRow[];
  return rows.map(rowToDoc);
}

export function getDocById(id: string): DocEntry | undefined {
  const db = getDb();
  if (!db) return undefined;
  const row = db.prepare(`SELECT * FROM docs WHERE id = ?`).get(id) as DocRow | undefined;
  return row ? rowToDoc(row) : undefined;
}

export function upsertDoc(doc: DocEntry): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO docs (
      id, title, kind, category, tags, project_id, agent_id, updated_at, body
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      kind = excluded.kind,
      category = excluded.category,
      tags = excluded.tags,
      project_id = excluded.project_id,
      agent_id = excluded.agent_id,
      updated_at = excluded.updated_at,
      body = excluded.body`,
  ).run(
    doc.id,
    doc.title,
    doc.kind,
    doc.category,
    jsonStringify(doc.tags),
    doc.projectId,
    doc.agentId,
    doc.updatedAt,
    doc.body,
  );
}

export function deleteDocById(id: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM docs WHERE id = ?`).run(id);
}

export function listCalendarEvents(): CalendarEvent[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(`SELECT * FROM calendar_events ORDER BY start`)
    .all() as CalendarRow[];
  return rows.map(rowToCalendarEvent);
}

export function getCalendarEventById(id: string): CalendarEvent | undefined {
  const db = getDb();
  if (!db) return undefined;
  const row = db
    .prepare(`SELECT * FROM calendar_events WHERE id = ?`)
    .get(id) as CalendarRow | undefined;
  return row ? rowToCalendarEvent(row) : undefined;
}

export function upsertCalendarEvent(ev: CalendarEvent): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO calendar_events (
      id, title, start, end, kind, task_id, project_id, why, confirmed, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      start = excluded.start,
      end = excluded.end,
      kind = excluded.kind,
      task_id = excluded.task_id,
      project_id = excluded.project_id,
      why = excluded.why,
      confirmed = excluded.confirmed,
      status = excluded.status`,
  ).run(
    ev.id,
    ev.title,
    ev.start,
    ev.end,
    ev.kind,
    ev.taskId,
    ev.projectId,
    ev.why,
    ev.confirmed ? 1 : 0,
    ev.status,
  );
}

export function deleteCalendarEventById(id: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM calendar_events WHERE id = ?`).run(id);
}

export function listActivities(limit = 500): ActivityItem[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(`SELECT * FROM activities ORDER BY timestamp DESC LIMIT ?`)
    .all(limit) as ActivityRow[];
  return rows.map(rowToActivity);
}

export function insertActivity(item: ActivityItem): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO activities (id, agent_id, message, timestamp) VALUES (?, ?, ?, ?)`,
  ).run(item.id, item.agentId, item.message, item.timestamp);
}

export function deleteActivityById(id: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM activities WHERE id = ?`).run(id);
}

export function listAgents(): Agent[] {
  const db = getDb();
  if (!db) return [];
  const rows = db.prepare(`SELECT * FROM agents ORDER BY name`).all() as AgentRow[];
  return rows.map(rowToAgent);
}

export function getAgentById(id: string): Agent | undefined {
  const db = getDb();
  if (!db) return undefined;
  const row = db.prepare(`SELECT * FROM agents WHERE id = ?`).get(id) as AgentRow | undefined;
  return row ? rowToAgent(row) : undefined;
}

export function upsertAgent(agent: Agent): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO agents (
      id, openclaw_agent_id, name, role, specialty, capabilities, model, environment,
      status, current_work, handoff_rules, parent_id, avatar_color, token_usage, cost_usd, last_seen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      openclaw_agent_id = excluded.openclaw_agent_id,
      name = excluded.name,
      role = excluded.role,
      specialty = excluded.specialty,
      capabilities = excluded.capabilities,
      model = excluded.model,
      environment = excluded.environment,
      status = excluded.status,
      current_work = excluded.current_work,
      handoff_rules = excluded.handoff_rules,
      parent_id = excluded.parent_id,
      avatar_color = excluded.avatar_color,
      token_usage = excluded.token_usage,
      cost_usd = excluded.cost_usd,
      last_seen = excluded.last_seen`,
  ).run(
    agent.id,
    agent.openclawAgentId ?? null,
    agent.name,
    agent.role,
    agent.specialty,
    jsonStringify(agent.capabilities),
    agent.model,
    agent.environment,
    agent.status,
    agent.currentWork,
    agent.handoffRules,
    agent.parentId,
    agent.avatarColor,
    agent.tokenUsage ?? null,
    agent.costUsd ?? null,
    agent.lastSeen ?? null,
  );
}

export function deleteAgentById(id: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
}

export function listStatsHistory(): StatsHistoryEntry[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(`SELECT * FROM stats_history ORDER BY date`)
    .all() as StatsRow[];
  return rows.map(rowToStatsHistory);
}

export function upsertStatsHistoryEntry(entry: StatsHistoryEntry): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(
    `INSERT INTO stats_history (date, active_tasks, scheduled_today, agents_active)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       active_tasks = excluded.active_tasks,
       scheduled_today = excluded.scheduled_today,
       agents_active = excluded.agents_active`,
  ).run(entry.date, entry.activeTasks, entry.scheduledToday, entry.agentsActive);
}

export function deleteStatsHistoryByDate(date: string): void {
  const db = getDb();
  if (!db) throw new Error('SQLite is not available');
  db.prepare(`DELETE FROM stats_history WHERE date = ?`).run(date);
}

/**
 * Opened SQLite handle, or `null` if better-sqlite3 failed to load or open.
 * Prefer this over ad hoc opens so init/migrations run once.
 */
export const db = {
  get client(): BetterSqlite3Database | null {
    return getDb();
  },
  path: DB_PATH,
};
