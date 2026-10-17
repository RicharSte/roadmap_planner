# Project skills

Read by both Claude Code (`.claude/skills/`) and OpenCode (Claude-compatible path).

| Skill | Source | Commit | License |
|---|---|---|---|
| `tdd` | https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd | 49dd158 (2026-10-09) | MIT |
| `tauri-v2` | https://github.com/nodnarbnitram/claude-code-extensions/tree/main/.claude/skills/tauri-v2 | 35e7f7d (2026-04-20) | MIT |

Local notes:
- `tdd`: test seams come from `docs/plans/<id>.md`; it mentions `codebase-design` / `code-review`
  skills that are not installed here — use `/review-diff` instead.
- `tauri-v2`: covers mobile, updater, HTTP examples — mobile and updater are not in MSP scope; HTTP only as in
  ADR 0021 (Rust side, one host, user action); sidecar per ADR 0017. AGENTS.md rules win (least-privilege capabilities).
- Update: re-copy from source and bump the commit in this table.
