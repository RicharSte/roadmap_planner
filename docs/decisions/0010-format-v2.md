# 0010. Format v2 (MSP): dependencies, statuses, acceptance, due dates, executors, workflow

Status: accepted (rewritten 2026-10-17; details refined in T-201/T-204/T-205 plans)
Date: 2026-10-17

## Context

Stage 2 (`docs/backlog.md`) makes the roadmap usable by agents (ADR 0017, 0019); stage 3 adds custom statuses.
The earlier draft (v2 humans / v3 agents with `runs/`, `artifacts/`, `briefs/`) is replaced: one bump only.
v1 parser rejects `version != 1` and drops unknown fields, so new fields need an explicit migration.

## Decision

One migration `v1 → v2`, pure function in `src/domain/migrations.ts`, run on open only after user confirmation,
`roadmap.v1.backup.json` written first. All fields are required in v2 (written always, explicit `null`/`[]`).

Top level adds:

- `statuses: { id, title, category, color }[]` — ordered. `category` ∈ `todo | plan-review | approved | active |
review | paused | done`; at least one `todo` and one `done`. `color` ∈ 16 Miro sticky names (`gray`, `light_yellow`,
  `yellow`, `orange`, `light_green`, `green`, `dark_green`, `cyan`, `light_pink`, `pink`, `violet`, `red`,
  `light_blue`, `blue`, `dark_blue`, `black`); hex values live in the UI (T-301). Migration maps the four v1
  statuses to ids `unstarted|in progress|paused|done` with categories `todo|active|paused|done`.
- `executors: { id, title }[]` — e.g. `human`, `claude/sonnet-5.5`, `opencode/kimi-k3`. Id: `[a-z0-9._/-]+`.
- `settings: { gates: { plan: "human" | "agent", review: "human" | "agent" } }` — default `human` (ADR 0019).

Node adds:

- `status` — id from `statuses` (no longer a fixed enum).
- `dependsOn: string[]` — ids that must reach category `done` first. Stored only on the dependent node.
- `blocker: { reason: string; since: string } | null` — manual blocker, `reason` 1–500 chars.
- `acceptance: { text: string; done: boolean }[]` — text 1–500 chars, ≤ 50 items.
- `dueDate: string | null` — local date `YYYY-MM-DD`, no time, no notifications.
- `executorIds: string[]` — who may execute the node (ids from `executors`); `[]` = anyone.
- `planPath`, `reportPath: string | null` — fixed `plans/<id>.md`, `reports/<id>.md` (same rules as `descriptionPath`).

Validation adds: ids exist; no self-dependency, duplicates, cycles; no dependency on an ancestor or descendant;
status / executor ids exist; date is a real calendar date. New codes: `DEPENDENCY_NOT_FOUND`, `SELF_DEPENDENCY`,
`DEPENDENCY_CYCLE`, `DEPENDENCY_ON_RELATIVE`, `EMPTY_BLOCKER_REASON`, `STATUS_NOT_FOUND`, `EXECUTOR_NOT_FOUND`,
`INVALID_DUE_DATE`, `INVALID_STATUSES`.

Readiness is derived, never stored: `getReadiness(project, id)` → first match of `done` (category done) →
`blocked` (blocker set) → `waiting` (any dependency not done) → `active` (any non-todo category) → `ready`.
Overdue is derived too: `dueDate < today` and category ≠ `done`.

## Consequences

- Hierarchy stays a tree; graph needs are covered by `dependsOn`. Multiple parents, if ever needed, get v3.
- Canvas positions are NOT in `roadmap.json` (ADR 0020, own file), so stage 3 needs no format bump.
- `ParentIndex`/`getParents` unchanged; a `DependentsIndex` is derived the same way (ADR 0008).
- Deleting a status in use requires choosing a replacement (domain op); deleting a node removes it from `dependsOn`.
- Older app versions refuse newer files (version gate) instead of silently dropping data.
- Supersedes ADR 0005 "fixed four statuses" and "v2 = multiple parents".
