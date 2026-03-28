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
