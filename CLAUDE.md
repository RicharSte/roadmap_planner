@AGENTS.md

## Claude Code specifics

Claude's role here: **planner for C-tasks, reviewer, hard debugging.** Most implementation
is done in OpenCode by cheaper models (see `docs/agents/workflow.md`).

- Commands: `/task-plan <id>`, `/task-build <id>`, `/task-next`, `/review-diff <id>`.
- Plan reviews go through the Plannotator **file gate** from AGENTS.md, not through plan mode.
  Do not call ExitPlanMode for task plans.
- Subagents are limited by `.claude/settings.json`: all forced to `haiku`;
  `general-purpose` and `Plan` subagents denied. Only `scout` / `Explore` for lookups, one at a time.
- Do not raise effort to max or use extended thinking unless the user asks.
- Use `/clear` between tasks and `/compact` in long sessions.
