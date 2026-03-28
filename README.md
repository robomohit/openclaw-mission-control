# Mission Control

Unified dashboard for OpenClaw, built with Next.js 14 App Router and React Context.

## Data Sources

| Feature               | Source                | Notes                                                                 |
|-----------------------|----------------------|-----------------------------------------------------------------------|
| Gateway health        | OpenClaw (`openclaw.json` + socket) | Read-only; no tokens exposed                                         |
| Agents (status/model) | OpenClaw (`agents/*/sessions.json`) | Live list; local Mission Control profiles overlay (via `openclawAgentId`) |
| Sessions              | OpenClaw (`agents/*/sessions.json`) | Metadata only; no full transcripts                                    |
| Cron jobs             | OpenClaw (`cron/jobs.json`)        | Schedule + state                                                       |
| Activities            | OpenClaw logs (`C:\tmp\openclaw\`) + session hints | Parsed, deduped, limited to 100 items                                 |
| Tasks, Projects       | Local (`data/state.json`)          | Not synced to OpenClaw                                                 |
| Memories, Docs        | Local (`data/state.json`)          | Not synced                                                             |
| Calendar              | Local (`data/state.json`)          | Not synced                                                             |
| Office layout         | Local (`data/state.json`)          | Not synced                                                             |
| Stats history         | Local (`data/state.json`)          | Derived snapshots                                                     |
| Tools (read/git)      | Experimental server actions       | Read whitelisted workspace files; git status only                     |

## What is Live vs Local

- **Live (OpenClaw integration)**: Real-time data from the OpenClaw runtime via server-side API routes:
  - `/api/openclaw/health` — Gateway status and sanitized channel info
  - `/api/openclaw/agents` — Agent list with current status, model, lastSeen
  - `/api/openclaw/sessions` — Session metadata (keys, updatedAt)
  - `/api/openclaw/cron` — Cron jobs schedule and state
  - `/api/openclaw/activities` — OpenClaw log tail + session activity (merged with local in UI)
- **Local-only**: Persistent state stored in `data/state.json` (tasks, projects, memories, docs, calendar, office layout, suggested tools, activity feed). Synced in real-time via `/api/state` and `/api/state/stream` (SSE).
- **Experimental**: `/api/tools/read` (safe workspace file read) and `/api/tools/git-status` (git status JSON). Labeled in UI.

## Required Environment Variables

Optional overrides (create `.env.local` based on `.env.local.example`):
- `MISSION_CONTROL_GATEWAY_TOKEN` — for future wake/auth (not used yet)
- `OPENCLAW_ROOT` — path to `.openclaw` directory (default resolves relative to workspace)
- `OPENCLAW_GATEWAY_PORT` — gateway port (default `18789`)
- `MISSION_CONTROL_WORKSPACE_ROOT` — workspace root for experimental tools endpoints (defaults to nearest parent containing `.git`)

## Running

```bash
npm install
npm run dev
# Open http://localhost:3000
```

If port 3000 is busy: `npm run dev -- -p 3001`

## Windows Note

The SSE fallback uses polling on Windows, which is already implemented in `/api/state/stream`.

## Architecture

- State lives in `lib/store.tsx` (React Context). Hydrated from `/api/state`.
- Real-time updates via EventSource to `/api/state/stream`.
- OpenClaw integration is read-only server-side; no writes to OpenClaw yet.
- Polling intervals (via `useOpenClawStatus`):
  - agents: 10s
  - health, cron, sessions, activities: 30s

## API Routes

### OpenClaw
- `GET /api/openclaw/health` → `{ ok, gateway:'up'|'down', configLoaded, channels:{ telegram:{enabled,label} } }`
- `GET /api/openclaw/agents` → `{ agents: { id, name, model?, lastSeen?, status }[] }`
- `GET /api/openclaw/sessions` → `{ sessions: { sessionKey, agentId, sessionId, updatedAt, model? }[] }`
- `GET /api/openclaw/cron` → `{ jobs: { id, name, description?, enabled, scheduleKind, scheduleExpr, nextRunAt?, lastRunAt?, lastRunStatus? }[] }`
- `GET /api/openclaw/activities` → `{ activities: { id, agentId, message, timestamp, source:'openclaw' }[] }` (max 100, from logs)

### Tools (experimental)
- `GET /api/tools/read?path=...` → `{ experimental:true, content:string }` or error
- `GET /api/tools/git-status` → `{ experimental:true, lines:string[] }`

## Limitations

- Polling intervals: agents (10s), other OpenClaw endpoints (30s). Full log tail capped at 500 lines, max 100 activities returned.
- No full transcript streaming from sessions; only metadata.
- Token/cost shown as “unknown” until real ingestion added.
- Team “Live agents” only includes OpenClaw runtime agents; Mission Control roles without `openclawAgentId` are shown separately under “Roles”.

## OpenClaw Write Integration

`POST /api/openclaw/wake` is not implemented; use Telegram or CLI to wake the agent.

