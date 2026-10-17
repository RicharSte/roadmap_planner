# Code intelligence (CodeGraph + Repowise)

Read by `/task-plan`, `/task-build`, `/review-diff`, `/repo-audit`. Short version is in `AGENTS.md`.
Repowise MCP is on only in Claude Code (`.mcp.json`); off in OpenCode (`opencode.json`) to save context.

Local read-only indexes. They help find and assess code; they do not change the task loop,
the plan's file list, Scope, or Subagents rules. If index output disagrees with the code,
AGENTS.md, a plan, or an ADR, the code and those documents win.

- **CodeGraph** — first choice for "where is X", "who calls Y", "what breaks if Y changes" (TS + Rust).
  MCP tool `codegraph_explore`; shell fallback: `codegraph explore "<symbols or question>"`.
  Use it instead of grep plus reading many files.
- **Repowise** (MCP server `repowise`) — history and risk, not navigation: `get_risk` / `get_change_risk`
  (churn, co-change, past fixes), `get_why` (decisions), `get_dead_code`. Use in `/task-plan` (Risks)
  and in code review. Do not call it for every question.
- Indexes can lag behind the working tree. Read the current file before editing it.
  No result in an index is not proof of absence: confirm with grep.
- Index results never widen scope. In `/task-build`, an affected caller outside the plan's files → stop and ask.
- Command output compression: RTK only. Do not use `repowise distill` / `repowise expand`.
- Indexes update themselves (Repowise: git post-commit hook; CodeGraph: its background daemon).
  If CodeGraph results are clearly stale, run `codegraph sync`. Do not run `init`, `index`, `uninit`,
  `update`, `delete`, `hook ...`, and do not edit `.codegraph/` or `.repowise/` unless the user asks.
