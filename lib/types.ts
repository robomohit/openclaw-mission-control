export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';

export type AssigneeType = 'user' | 'agent';

export type ProjectHealth = 'healthy' | 'attention' | 'neglected';

export type MemoryKind = 'daily' | 'long_term';

export type DocKind =
  | 'planning'
  | 'architecture'
  | 'prd'
  | 'draft'
  | 'research'
  | 'content';

export type CalendarEventKind =
  | 'human_task'
  | 'agent_automation'
  | 'cron'
  | 'recurring'
  | 'proactive';

export type CalendarEventStatus = 'active' | 'paused';

export type AgentRole = 'main' | 'sub' | 'worker';

export type AgentStatus = 'idle' | 'active' | 'busy' | 'offline';

export interface UserProfile {
  name: string;
  agentStatus: string;
}

export interface Agent {
  id: string;
  /** OpenClaw workspace agent directory id (e.g. main, cursor) for live merge on Team page */
  openclawAgentId?: string;
  name: string;
  role: AgentRole;
  specialty: string;
  capabilities: string[];
  model: string;
  environment: string;
  status: AgentStatus;
  currentWork: string;
  handoffRules: string;
  parentId: string | null;
  avatarColor: string;
  tokenUsage?: number; // cumulative tokens used
  costUsd?: number; // cumulative cost
  /** ISO timestamp from live gateway merge (/api/openclaw/agents) */
  lastSeen?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeType: AssigneeType;
  priority: Priority;
  projectId: string;
  dueDate: string;
  status: TaskStatus;
  tags: string[];
  relatedDocIds: string[];
  /** Additional projects beyond primary `projectId` (e.g. cross-team work). */
  relatedProjectIds?: string[];
  relatedMemoryIds: string[];
  waitingForHumanReview: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  dueDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  priority: Priority;
  milestones: Milestone[];
  linkedTaskIds: string[];
  linkedDocIds: string[];
  linkedMemoryIds: string[];
  lastWorkedOn: string;
  suggestedNextAction: string;
  health: ProjectHealth;
}

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  kind: MemoryKind;
  date: string;
  tags: string[];
  topic: string;
  person: string;
  linkedProjectIds: string[];
  linkedDocIds: string[];
  linkedTaskIds: string[];
}

export interface DocEntry {
  id: string;
  title: string;
  kind: DocKind;
  category: string;
  tags: string[];
  projectId: string | null;
  agentId: string | null;
  updatedAt: string;
  body: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: CalendarEventKind;
  taskId: string | null;
  projectId: string | null;
  why: string;
  confirmed: boolean;
  status: CalendarEventStatus;
}

export interface ActivityItem {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
}

export interface OfficeZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'desk' | 'meeting' | 'collab' | 'hall';
}

export interface AgentPosition {
  agentId: string;
  zoneId: string;
  xPct: number;
  yPct: number;
}

export interface OfficeLayout {
  zones: OfficeZone[];
  agentPositions: AgentPosition[];
}

export interface SuggestedTool {
  id: string;
  title: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high';
}

export interface MissionStatement {
  text: string;
  updatedAt: string;
}

/** One row of dashboard stats for trend history (local calendar day). */
export interface StatsHistoryEntry {
  date: string; // YYYY-MM-DD
  activeTasks: number;
  scheduledToday: number;
  agentsActive: number;
}

export interface SampleData {
  user: UserProfile;
  mission: MissionStatement;
  agents: Agent[];
  tasks: Task[];
  projects: Project[];
  memories: MemoryEntry[];
  docs: DocEntry[];
  calendarEvents: CalendarEvent[];
  activities: ActivityItem[];
  office: OfficeLayout;
  suggestedTools: SuggestedTool[];
  /** Optional; omitted in older sample files — normalized to [] on load. */
  statsHistory?: StatsHistoryEntry[];
}
