---
description: Review the current uncommitted diff against the task plan
argument-hint: [task-id]
---
Review `git diff` (and new untracked files) against docs/plans/$ARGUMENTS.md if given,
plus AGENTS.md hard rules and "Code comments" (Russian `///` on every Rust function). Do not edit files.
Check impact: CodeGraph for callers of changed symbols, Repowise `get_change_risk` for the uncommitted work.

Output:
- Blockers (bugs, data-loss risk, path safety, broken acceptance criteria)
- Should fix
- Nits (max 3)
- Verdict: approve / fix then approve / rework
Each item: file:line + one sentence. No praise, no restating the diff.
