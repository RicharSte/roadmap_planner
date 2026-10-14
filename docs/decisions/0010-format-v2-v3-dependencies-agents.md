# 0010. Format v2 (dependencies, blockers) and v3 (agent handoff)

Status: proposed (accept before T-102; v3 part may be revised before T-201)
Date: 2026-10-14

## Context

Post-MVP plan (`docs/later.md`): 1.1 adds dependencies and blockers for humans, 1.2 turns the roadmap
into a file-based pipeline for external agents. MVP stays on format v1 (ADR 0005), untouched.
v1 parser rejects `version != 1` and drops unknown fields, so new fields need an explicit migration.

## Decision

Release → format: MVP = v1, 1.1 = v2, 1.2 = v3. All fields below are required in their version
(written always, explicit `null`/`[]`), like v1. Migrations are pure functions in `src/domain/migrations.ts`,
chained `v1 → v2 → v3`, run on open only after user confirmation, with `roadmap.v<N>.backup.json` written first.

v2 node adds:

- `dependsOn: string[]` — ids that must be `done` first. Stored only on the dependent node.
- `blocker: { reason: string; since: string } | null` — manual blocker, `reason` non-empty, max 500 chars.

v2 validation: ids exist; no self-dependency; no duplicates; no cycles in `dependsOn`; no dependency on an
ancestor or descendant (hierarchy already orders them). New codes: `DEPENDENCY_NOT_FOUND`, `SELF_DEPENDENCY`,
`DEPENDENCY_CYCLE`, `DEPENDENCY_ON_RELATIVE`, `EMPTY_BLOCKER_REASON`.

Readiness is derived, never stored: `getReadiness(project, id)` → first match of
`done` (status done) → `blocked` (blocker set) → `waiting` (any dependency not done) → `active`
(status in progress) → `ready`. Statuses stay the fixed four.

v3 adds top level `agents: Record<role, { title: string; instructionsPath: string }>` (`agents/<role>.md`),
and per node: `assignee: null | "human" | "agent:<role>"`, `outputs: { id, title, path }[]`
(path inside `artifacts/<nodeId>/`), `inputs: { fromNodeId, outputId }[]` (only outputs of nodes in
`dependsOn`), `acceptedRunId: string | null`.

Agent reports: `runs/<nodeId>/<runId>.json`, `"format": "roadmap-run/1"`, state
`running | succeeded | failed | blocked`. Full example in `docs/later.md`.

Write ownership: the app is the only writer of `roadmap.json`, `descriptions/`, `agents/`, `briefs/`,
project `AGENTS.md`. Agents write only `artifacts/<nodeId>/` and `runs/<nodeId>/`. The app reads `runs/`
on open/reload and never changes status without a user action.

## Consequences

- Hierarchy stays a tree; graph needs are covered by `dependsOn`. ADR 0005 "v2 = multiple parents" is
  replaced by this numbering; multiple parents, if ever needed, get a later format version.
- `ParentIndex`/`getParents` signatures unchanged; a `DependentsIndex` is derived the same way (ADR 0008).
- No network, no agent runtime in the app; any external orchestrator can use the files + JSON Schema (T-207).
- Older app versions refuse newer files (version gate) instead of silently dropping data.
