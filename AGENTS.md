# AGENTS.md — roadmap_proj

Local-first desktop app (macOS + Windows) that visually edits **roadmap projects**: a user-owned folder with
`roadmap.json` (structure) + `descriptions/<id>.md` (node texts). Single user, one project open at a time.
AI agents edit projects through the bundled MCP server (stage 2). Brief: `docs/product-brief.md`.

## Status

MVP done. Goal: MSP 1.0.0 — stages 1 → 2 → 3 in `docs/backlog.md`, finish line `docs/msp-done.md`.
Current state: `docs/handoff.md`.

## Stack and layout

Tauri 2 + React + TypeScript + Vite, pnpm. CodeMirror 6 + react-markdown. ESLint + Prettier, Vitest + RTL,
cargo fmt / clippy / test. No e2e. Later stages add `mcp/` (ADR 0017) and a React Flow canvas (ADR 0020).

```
src/domain/     pure TS: types, tree ops, validation, migrations. No Tauri imports.
src/storage/    storage interface + Tauri adapter (only place that calls invoke()).
src/ui/         React UI.
src-tauri/src/  Rust: file I/O, atomic writes, path checks only.
mcp/            MCP server (from T-210): imports src/domain/, own Node fs adapter.
```

## Hard rules

- Format: v1 ADR 0005, v2 ADR 0010 (from T-201). Links only as ordered `childrenIds` + `rootIds`; `parentId` is
  derived, never written. JSON has `version`; any change needs a migration.
- Hierarchy is a tree, enforced in `src/domain/`. All code uses domain functions, never raw JSON.
- `descriptionPath` = `descriptions/<id>.md`, fixed at creation, never renamed.
- Atomic writes only (ADR 0011); from stage 2 two writers with revision check (ADR 0018).
- Input from the frontend (Rust) and from agents (MCP) is untrusted: paths stay inside the project folder
  (no `..`, absolute paths, escaping symlinks). Only exception: save-dialog exports (ADR 0022).
- No server, telemetry, CDN assets, remote fonts, accounts, cloud sync. Network: only the catalog (ADR 0021).
- Least-privilege Tauri capabilities. New plugin, permission, capability or dependency = ask first.
- Do not edit `docs/product-brief.md` or `docs/decisions/*` unless asked.
- Work only on the current stage of `docs/backlog.md`. Nothing from `docs/later.md` until it is in the backlog.
- Do not commit, push, or delete files outside the task unless asked.

## Task loop and scope

- Plan (Claude Code) → user approves in Plannotator → build (OpenCode) → report + code review in Plannotator
  → handoff. Via `/task-next`, `/task-plan <id>`, `/task-build <id>`; the commands contain the exact steps.
  Never build without an `approved` plan. Models: `docs/agents/workflow.md`. User guide: `docs/guide.md`.
- Task is done when its acceptance criteria pass. No polish, refactors, or "while I'm here" changes.
- Stage is closed when its section in `docs/msp-done.md` is checked; MSP done when all are checked. Then stop.
- Never add backlog tasks. Ideas / tech debt → one line in `docs/later.md`, section «Входящие».
- Same error fails twice → write `docs/handoff.md`, stop, ask for escalation.

## Working rules

- Read only task-relevant files. Never read `node_modules/`, `dist/`, `src-tauri/target/`, lockfiles.
- Locate code with CodeGraph (`codegraph_explore`) first, then grep. Index results never widen scope;
  read the current file before editing. Repowise: only in Claude Code (plan risks, `/review-diff`, `/repo-audit`).
  Full rules: `docs/agents/code-intelligence.md`.
- Before writing code: not needed → skip; exists → reuse; stdlib / Tauri API / installed dependency → use it;
  only then write the minimum. Never cut validation, error handling, path safety, tests.
- Never claim a check passed if you did not run it.

## Code comments (the user does not read Rust)

- Every Rust function: `///` in Russian — what, why, inputs, errors, safety checks.
- Exported TS functions in `src/domain/`, `src/storage/`, `mcp/`: `/** */` in Russian.
- Non-obvious blocks: short `//` why. No comments on trivial lines. Missing required comments = review blocker.

## Language

Chat and `docs/handoff.md`: skill `caveman` full. Plans, reports, explanations: normal full Russian.
Code identifiers: English.

## Subagents and skills

- Default: no subagents. Only `scout` (read-only, cheap) when "where is X" needs > 5 files; one at a time.
  Never delegate planning, implementation, review, debugging. Details: `docs/agents/budget-policy.md`.
- Skills: `tdd` (domain and Rust logic), `tauri-v2` (Tauri config, IPC), `investigate-first` (unknown bug cause),
  `verify-and-stop` (final check), `grilling` (only via `/task-plan`), `caveman` (chat).
  Forbidden: `implement-spec`, `implement`, `code-review` from external packs.

## Commands

- App: `pnpm tauri dev` · `pnpm tauri build`
- Checks: `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm format:check` (fix: `pnpm format`)
- Rust (in `src-tauri/`): `cargo fmt --check` · `cargo clippy --all-targets -- -D warnings` · `cargo test`
- MCP (`mcp/`): added by T-210 / T-215.
