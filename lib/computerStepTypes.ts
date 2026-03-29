/** Shared types for parsed OpenClaw log steps (safe for client + server). */

export type ComputerLane =
  | 'agent'
  | 'browser'
  | 'tools'
  | 'cron'
  | 'channel'
  | 'system'
  | 'error';

export interface ComputerStep {
  id: string;
  lane: ComputerLane;
  title: string;
  detail: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  urls: string[];
  /** True when the timestamp was set at ingestion time (plain-text log line
   *  with no embedded timestamp). The UI should label this "ingested at"
   *  rather than "log time" to avoid confusion. */
  ingestedAt?: boolean;
}
