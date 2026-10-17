# Product Brief — roadmap_proj

## Product

A local-first desktop application for macOS and Windows for creating, editing and executing roadmap projects —
by a person and by AI agents.

A roadmap project is a user-owned folder on disk containing:

- a main JSON file that stores the roadmap structure;
- Markdown (`.md`) files used as node descriptions (and, since stage 2, task plans, reports and a handoff note).

The app is a visual editor and viewer for that JSON + Markdown project structure.

## Releases

| Release         | Status  | Finish line                 |
| --------------- | ------- | --------------------------- |
| MVP (0.1)       | done    | `docs/archive/mvp-done.md`  |
| MSP 1.0.0       | current | `docs/msp-done.md`          |
| Web (after MSP) | context | not planned yet (see «Web») |

MSP = Minimum Selling Product: the first public release. Stages: 1 tech debt (0.2), 2 MCP and agents (0.3),
3 UX/UI, QoL and release (0.4 → 1.0.0). Tasks: `docs/backlog.md`.

## Target user

A single user on their own computer, working alone or together with AI agents (Claude Code, OpenCode).
No teams, no accounts, no collaboration between people.

## MVP baseline (done)

- create a new project; open an existing one by selecting its folder; one project at a time;
- create, edit, delete nodes; parent/child relationships (tree); move and reorder;
- autosave; atomic writes; user-readable errors; delete confirmations;
- Markdown descriptions created and edited in the app;
- manual reload of external changes.

## MSP scope

Stage 1 — tech debt: refactor hotspots, direct Rust tests, CI on macOS and Windows. No new user features.

Stage 2 — MCP and agents (ADR 0010, 0017, 0018, 0019):

- format v2: dependencies and blockers, acceptance criteria, due dates (visible in the UI), executors
  (which model or person may do a node), status registry, plan/report links, gate settings;
- MCP server bundled with the app: an agent can create a roadmap from an idea (2.1), improve an existing one (2.2),
  and use it as a development plan with plans, reports, handoff and gates (2.3);
- gates need a human by default; a project can let the agent pass them (automation);
- the app and agents may write at the same time: changes on disk are detected, no silent loss.

Stage 3 — UX/UI and QoL (ADR 0020, 0021, 0022):

- new design; editable graph canvas (Miro-like) next to the tree; manual positions with auto-layout;
- custom statuses with a 16-colour palette;
- export: whole roadmap to HTML (full and clickable, or titles only); project zip export/import;
- catalog of official roadmaps: find by title, download, start working;
- recent projects, English UI, onboarding, keyboard navigation;
- public release: GitHub Releases `.dmg` / `.msi`, licence.

## Data model

- Hierarchy is a tree (one parent). Graph needs are covered by `dependsOn` (ADR 0010).
- Node fields: `id`, `title`, `childrenIds`, `descriptionPath`, `status`, `createdAt`, `updatedAt`
  (+ v2 fields from ADR 0010). `parentId` is derived in memory, not stored (ADR 0005).
- Statuses: fixed four in v1; a project registry with categories and colours in v2.

## Storage model

- A roadmap project is a normal folder; `roadmap.json` is the structured source of truth.
- Data stays transparent, portable, file-based. Canvas positions live in a separate `canvas.json`.
- The core workflow needs no cloud services, accounts or internet. The only network feature is the official
  catalog, used only on user action (ADR 0021).

## UX principles

- One open project at a time; folder-based open/create; autosave.
- Structure and content editing first; the canvas adds manual positioning, auto-layout stays available.
- Agents are first-class editors, but the user stays in control: gates, backups, visible changes.

## Safety and error handling

- Confirmation before destructive deletion; atomic writes; user-readable errors.
- Path safety for every writer (app and MCP server).
- Change detection between writers (ADR 0018); one backup before the first agent write of a session.
- Imported zips and catalog downloads are validated before anything is written.

## Out of scope for MSP

Collaboration between people, accounts, cloud sync, multiple open projects, multiple parents, built-in agent runner,
full undo/redo, auto-update, code signing / Homebrew, publishing to the catalog from the app, payments.
These live in `docs/later.md`.

## Web (context only, not planned)

After MSP the product is expected to move to the web, where people create and follow their own roadmaps, can
sell them, and monetization is based on not completing a roadmap (a commitment the user loses if they miss it).
Desktop stays free. Consequences for today: keep `src/domain/` platform-neutral, keep the format documented and
versioned, keep due dates and acceptance criteria machine-readable. Ideas: `docs/later.md`, section «Web».

## One-sentence summary

A local-first desktop app that visually edits roadmap projects stored as JSON plus Markdown in a user-owned folder,
and lets AI agents create, improve and execute them through a bundled MCP server.
