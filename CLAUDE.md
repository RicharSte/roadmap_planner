@AGENTS.md

## Claude Code specifics

Claude's role here: **planner for every task, reviewer, hard debugging.** Implementation is done
in OpenCode by the model in the backlog column Build (see `docs/agents/workflow.md`). Build tasks in Claude only
when the user asks or as the last escalation step.

- Plan column `O` → run the plan with Opus 5.5 (`/model opus`); `S` → Sonnet 5.5 (`/model sonnet`).
  If the current model differs, say so before starting.

- Commands: `/task-plan <id>`, `/task-build <id>`, `/task-next`, `/review-diff <id>`.
- Plan reviews go through the Plannotator **file gate** from AGENTS.md, not through plan mode.
  Do not call ExitPlanMode for task plans.
- Subagents are limited by `.claude/settings.json`: all forced to `haiku`;
  `general-purpose` and `Plan` subagents denied. Only `scout` / `Explore` for lookups, one at a time.
- After gate 2 of tasks planned with `O`, the user may run `/review-diff <id>`.
- Do not raise effort to max or use extended thinking unless the user asks.
- Use `/clear` between tasks and `/compact` in long sessions.
