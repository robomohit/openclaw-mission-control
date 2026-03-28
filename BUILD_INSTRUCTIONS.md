# Mission Control — Build Instructions

## Overview
Build a comprehensive OpenClaw dashboard in Next.js 14 (App Router, TypeScript, Tailwind). The app runs on localhost only and uses a dark slate theme.

## Key Requirements

1. **Global layout**:
   - Left sidebar with sections: Dashboard, Task Board, Calendar, Projects, Memories, Docs, Team, Office, Settings
   - Top status bar showing: current agent status, active tasks count, scheduled jobs today, recent activity
   - Responsive and modular

2. **Task Board**:
   - Kanban columns: Backlog, In Progress, Review, Done
   - Task cards with: title, description, assignee, priority, project, due date, status, tags, related docs/memories
   - Assign tasks to user or agents
   - Live activity feed on the side (what agents are doing)
   - Create, edit, move, complete tasks
   - Mark items as waiting for human review
   - Search/filter by assignee, project, status, priority

3. **Calendar**:
   - Display scheduled tasks, cron jobs, recurring automations, planned proactive actions
   - Daily, weekly, monthly views
   - Click event → details (what, when, why)
   - Distinguish human tasks vs agent automations
   - Confirm if scheduled actions were actually created
   - Add, edit, pause, remove scheduled jobs

4. **Projects**:
   - Track major goals: name, description, progress, priority, milestones, linked tasks/docs/memories, last worked on, suggested next action
   - Show project health and momentum
   - Highlight neglected projects
   - Suggest one high-leverage next task per project
   - Reverse prompting: “What should we do next?”

5. **Memories**:
   - Browse past memories like a journal
   - Organize by day, show both daily logs and long-term memories
   - Search by keyword, topic, person, project, date
   - Revisit past conversations/decisions
   - Show linked projects, docs, tasks
   - Clean reader view

6. **Docs**:
   - Document center for all generated artifacts: planning, architecture, PRDs, drafts, research notes, content
   - Searchable index with categories/tags
   - Sort by date, project, type, agent
   - Document preview panel
   - Copy, open, link docs to tasks/projects

7. **Team**:
   - Org chart view for AI system: main agent, sub-agents, worker agents
   - Show: role, specialty, capabilities, model, environment, status, current work, handoff rules
   - Mission statement pinned at top
   - Define who handles which tasks

8. **Office**:
   - Fun 2D pixel-art or simple visual office environment
   - Agents appear as characters/avatars, move to desks when active
   - Show what each agent is currently working on
   - Optional meeting zones/collaboration areas

9. **Personalization engine**:
   - After base build, analyze user work patterns and suggest 5–10 custom tools to add
   - Based on workflows, goals, recurring tasks, mission statement, past projects, pain points
   - Then ask which to build next

10. **Data relationships**:
    - Everything interconnected: tasks→projects, projects→docs/memories, docs→tasks/agents, memories→dates/projects/decisions, team→assigned work, calendar→tasks/automations

## First-Run Setup
- Create base UI
- Seed sample data (tasks, projects, agents, docs, memories)
- Explain architecture, storage, extension points
- Ask which screen to refine first

## Design Guidelines
- Clean, modern, Linear-like
- Dark mode with slate palette (slate-950, slate-900, slate-800, slate-400, slate-50)
- Smooth transitions, fast loading, polished feel
- Highly visible and organized
- Modular and easy to extend

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Context for state (keep simple for now)
- Framer Motion for animations (optional but nice)
- Lucide React icons

## Data Storage
- For now, store all data in `data/*.json` (seed data) and use React Context as in-memory store
- Make it easy to later swap in a real backend (API routes + DB)

## Deliverables
After completion, provide:
1. Folder structure
2. Main components list
3. Data model summary
4. First implementation pass (code)
5. Recommended next improvements

Build this step by step, but aim to have a functional prototype with all screens navigable and sample data displayed. Prioritize clarity and visibility over perfection.