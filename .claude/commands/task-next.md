---
description: Show the next step (task, tool, command) from backlog and handoff
---
Tell the user what to do next. Do not edit code.

0. Load skill `caveman` (full).
1. Read `docs/handoff.md`, `docs/backlog.md`, `docs/msp-done.md`.
2. If every item in `docs/msp-done.md` is checked: say the MSP is done (release 1.0.0) and stop. Do not propose new work.
   Current stage = first stage whose section in `docs/msp-done.md` has unchecked items; take tasks only from it.
3. Otherwise reply in ≤ 6 lines: current task + status, next action, which tool/model
   (from the Plan / Build columns and `docs/agents/workflow.md`; plans always in Claude Code), exact command to run.
   If a task is stuck in `plan-review` or `code-review`, the next action is to finish that gate.
   If the last `done` task just closed a stage section of `docs/msp-done.md`: next action is `/repo-audit`
   in Claude Code (once per stage), then the first task of the next stage.
