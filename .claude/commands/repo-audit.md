---
description: Repowise audit — refactoring and tech-debt candidates into docs/later.md (no code changes)
argument-hint: [paths or module, optional]
---
Audit the codebase with Repowise and record candidates. Do not edit code, plans, or `docs/backlog.md`.

0. Load skill `caveman` (full) for chat replies.
1. Scope: $ARGUMENTS if given, else `src/`, `src-tauri/src/`, `mcp/` (if it exists).
2. Repowise: `get_risk` for the scope (hotspots, churn, co-change, past fixes, test gaps), `get_dead_code`.
   Confirm each finding against the current file (read it; indexes can lag). Skip findings already listed in
   `docs/later.md` or covered by a `todo` task in `docs/backlog.md`.
3. Keep only findings that matter for the next stage of `docs/backlog.md` or are data-loss / safety risks.
   Max 8 lines.
4. Append to `docs/later.md`, section «Входящие», one line each:
   `- [audit YYYY-MM-DD] <file or symbol> — <problem: metric/biomarker> — <why it matters for stage N>`
5. Reply in ≤ 6 lines: how many lines added, the top 3, and «Разбери «Входящие» и перенеси нужное в backlog».
   Moving to backlog is the user's decision.
