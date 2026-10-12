# Model routing

Task loop steps: `/task-plan`, `/task-build`, `/task-next` commands. User guide: `docs/guide.md`.

| Code in backlog | Tool / model | Use for |
|---|---|---|
| **C** | Claude Code (Pro), Sonnet by default; Opus only if the user asks | Plans for architecture, data, Rust, storage; `/review-diff` for risky diffs; hard bugs |
| **K** | OpenCode + Kimi K2.7 Code | Implementing plans; plans for simple UI tasks |
| **M** | OpenCode + MiniMax M3 or weaker | Scaffold, small UI, docs, scripts, simple fixes |

## Escalation

1. Weaker model fails twice on the same error → writes `docs/handoff.md`, stops.
2. Next: Kimi K2.7 Code → then Claude, giving it only `docs/handoff.md` + the plan.
3. Never escalate by "continue the same chat with a bigger model": start a fresh session.

## Optional extra review

For Rust / storage tasks (T-005, T-006, T-010, T-011) after gate 2 the user may run
`/review-diff <id>` in Claude Code before committing.

## Session hygiene

- One task per session; fresh session for each phase if the context got long.
- Point agents to exact files; paste trimmed errors only.
