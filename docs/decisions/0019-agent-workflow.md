# 0019. Agent workflow inside a project: plans, reports, handoff, gates

Status: accepted (details refined in T-213 plan)
Date: 2026-10-17

## Context

Scenario 2.3: an agent uses a roadmap the way this repo uses `docs/backlog.md`, `plans/`, `reports/`, `handoff.md`.
Single-agent and multi-agent (several sessions, different executors) must work; automation must be possible.

## Decision

- Files inside the project: `plans/<id>.md`, `reports/<id>.md` (linked by `planPath`/`reportPath`, ADR 0010),
  `handoff.md` in the root (overwritten, ≤ 40 lines, like this repo).
- Flow by status **category**: `todo → plan-review → approved → active → review → done` (`paused` anywhere).
  The status used for each step = first status of that category in `statuses`; a category missing in the
  project → the step is skipped.
- MCP tools: `next_task(executorId?)` → first `ready` node (ADR 0010 readiness) the executor may take, with
  description, acceptance, dependency reports, `handoff.md`; `start_task`; `submit_plan(text)`;
  `submit_report(text)`; `write_handoff(text)`.
- Gates: `settings.gates.plan` / `settings.gates.review`. `human` (default) → node waits in `plan-review` / `review`
  until the user clicks «Одобрить» or «Вернуть» in the app. `agent` → the server moves it on.
- Several agents: `start_task` fails with `TASK_TAKEN` if the node is already `active`; conflicts per ADR 0018.

## Consequences

- The app does **not** run agents. Automation = external loop (`scripts/roadmap-loop.sh` with `opencode run` /
  `claude -p`, T-216). A built-in runner is post-MSP (`docs/later.md`).
- Replaces the old draft (`runs/`, `artifacts/`, `briefs/`, `agents/<role>.md`).
