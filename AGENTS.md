# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Mission Control is a single-service **Next.js 14** (App Router) dashboard for the OpenClaw AI agent system. It uses an embedded SQLite database (`better-sqlite3`) and stores persistent state in `data/mission-control.db` (with `data/state.json` as fallback). No external databases or Docker services are needed.

### Running the dev server

```bash
npm run dev
# Serves on http://localhost:3001 (bound to 0.0.0.0)
```

### Lint / Build / Test

- **Lint:** `npm run lint` (ESLint via `next lint`)
- **Build:** `npm run build`
- There are no automated test suites configured in this repo.

### Key caveats

- The `better-sqlite3` native addon compiles during `npm install`. If `python3`, `make`, or `g++` are missing, it will fail. These are pre-installed in the Cloud Agent VM.
- OpenClaw integration is entirely optional and read-only. Without the OpenClaw runtime, dashboard panels show "Offline" status, but all local features (tasks, projects, calendar, docs, memories, team, office) work fully.
- Environment variables are optional; see `.env.local.example`. No `.env.local` file is required for basic development.
- The dev server port is **3001** (configured in `package.json` scripts), not the default 3000.
- State is persisted in `data/` directory (auto-created). The SQLite DB file and `state.json` are gitignored.

### Reliability

#### Persistence

- **SQLite** (`better-sqlite3`) is the primary store. If unavailable (e.g. Windows without build tools, `--ignore-scripts`), the app falls back to **JSON file** persistence at `data/state.json`.
- When using JSON fallback, a **non-scary banner** appears on the Settings page: "Using JSON file persistence" with the file path. No stack traces are shown to the user.
- JSON writes are **atomic**: data is serialized, written to a temp file, then renamed into place. This prevents partial files from concurrent `POST /api/state` requests or crashes mid-write.
- Corrupt `state.json` is handled gracefully: the file is treated as empty and the app falls back to sample data.
- `GET /api/state/info` returns the current persistence mode, log directory status, and gateway config for diagnostics.

#### POST /api/state merge behavior

- By default, `POST /api/state` performs a **deep merge** of the request body into existing state:
  - Object keys (`user`, `mission`) are shallow-merged (existing fields preserved, incoming fields override).
  - Array keys (`tasks`, `projects`, `agents`, etc.) are **replaced** wholesale when present in the request body (not concatenated).
  - Missing keys in the request body are left untouched from existing state.
- To **replace the entire state** without merging, include `"replace": true` in the request body.
- The merge uses `coerceSampleData()` to normalize the result, ensuring all required fields exist.

#### SSE reconnect

- The client-side state SSE stream (`/api/state/stream`) uses **exponential backoff** with jitter on reconnect (1s initial, 30s max).
- Backoff resets after 60 seconds of stable connection.

#### Log timestamps

- Structured JSONL log records use the embedded `time` field as the timestamp.
- Plain-text log lines have no embedded timestamp; these are labeled `ingestedAt: true` in the `ComputerStep` payload. The UI shows a `~` prefix and a "ingested at" tooltip to distinguish them from actual log times.

#### OpenClaw API validation

- Routes under `app/api/openclaw/*` validate gateway JSON responses with manual type guards. Malformed data returns **502** with a descriptive error message and log line, rather than an unhandled 500 stack trace.
