---
description: Show the next step (task, tool, command) from backlog and handoff
---
Tell the user what to do next. Do not edit code.

0. Load skill `caveman` (lite).
1. Read `docs/handoff.md`, `docs/backlog.md`, `docs/mvp-done.md`.
2. If every item in `docs/mvp-done.md` is checked: say the MVP is done and stop. Do not propose new work.
3. Otherwise reply in ≤ 6 lines: current task + status, next action, which tool/model
   (from the "Who" column and `docs/agents/workflow.md`), exact command to run.
   If a task is stuck in `plan-review` or `code-review`, the next action is to finish that gate.
