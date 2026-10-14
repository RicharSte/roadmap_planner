# AGENTS.md — roadmap_proj

Local-first desktop app (macOS + Windows) that visually edits **roadmap projects**:
a user-owned folder with `roadmap.json` (structure) + `descriptions/<id>.md` (node texts).
Single user, offline, one project open at a time. Brief: `docs/product-brief.md`.

## Status

Pre-scaffold: no app code yet. Progress: `docs/backlog.md`, `docs/handoff.md`.
After the scaffold exists, replace **Commands** below with real ones.

## Stack

- Tauri 2 + React + TypeScript + Vite, pnpm. Rust (`src-tauri/`) only for file I/O, atomic writes, path checks.
- CodeMirror 6 (`@uiw/react-codemirror`) + react-markdown preview.
- ESLint + Prettier, Vitest + React Testing Library; cargo fmt / clippy / test. No e2e in MVP.
- No server, network calls, telemetry, CDN assets, remote fonts, accounts, cloud sync.

## Layout

```
src/domain/     pure TS: types, tree ops, validation, migrations. No Tauri imports.
src/storage/    storage interface + Tauri adapter (only place that calls invoke()).
src/ui/         React: tree sidebar + details panel.
src-tauri/src/  Tauri commands: open/create/read/write project and .md files.
```

## Hard rules

- Format: `docs/decisions/0005-project-format.md`. Links stored **only** as ordered `childrenIds`
  (+ `rootIds`); `parentId` is derived in memory, never written. JSON has `version`; changes need a migration.
- Tree in v1 (one parent), enforced in `src/domain/`. All code uses domain functions
  (`getParents`, `getChildren`, `moveNode`, ...), never raw JSON — keeps the graph path open.
- `descriptionPath` = `descriptions/<id>.md`, fixed at creation, never renamed.
- Atomic writes (temp + rename). Never leave a half-written file.
- Rust treats frontend input as untrusted; paths stay inside the opened folder (no `..`, absolute paths, escaping symlinks).
- Least-privilege Tauri capabilities. New plugin, permission, capability or dependency = ask first.
- Do not edit `docs/product-brief.md` or `docs/decisions/*` unless asked.
- Post-MVP scope (1.1 / 1.2 / 2.0) lives in `docs/later.md` and ADR 0010 (proposed). Do not implement it
  or add its fields (`dependsOn`, `blocker`, `assignee`, ...) until the user moves tasks into `docs/backlog.md`.
- Post-MVP scope (1.1 / 1.2 / 2.0) lives in `docs/later.md` and ADR 0010 (proposed). Do not implement it
  or add its fields (`dependsOn`, `blocker`, `assignee`, ...) until the user moves tasks into `docs/backlog.md`.
- Do not commit, push, or delete files outside the task unless asked.

## Task loop

Plan → user approves in Plannotator → build → report + user reviews code in Plannotator → handoff.
Run it via `/task-next`, `/task-plan <id>`, `/task-build <id>`; the commands contain the exact steps.
User guide: `docs/guide.md`. Never start building without an `approved` plan.

## Scope (goal: runnable MVP)

- Project is done when every item in `docs/mvp-done.md` is checked. Then stop.
- Task is done when its acceptance criteria pass. No polish, refactors, or "while I'm here" changes.
- Never add backlog tasks. Ideas / tech debt → one line in `docs/later.md`.
- Same error fails twice → write `docs/handoff.md`, stop, ask for escalation.

## Working rules

- Read only task-relevant files. Never read `node_modules/`, `dist/`, `src-tauri/target/`, lockfiles.
- Locate code with grep/glob, not by reading directories.
- Before writing code: not needed → skip; exists in codebase → reuse; stdlib / Tauri API /
  installed dependency → use it; only then write the minimum. Never cut validation, error handling, path safety, tests.
- Never claim a check passed if you did not run it.

## Code comments (the user does not read Rust)

- Every Rust function gets a `///` comment in Russian: what, why, inputs, errors, safety checks.
- Non-obvious blocks: short `//` comment explaining why.
- Exported TS functions in `src/domain/` and `src/storage/`: `/** */` in Russian.
- No comments on trivial lines. Missing required comments = review blocker.

## Language

- Chat: skill `caveman`, level lite. Plans, reports, explanations: normal full Russian.
- `docs/handoff.md`: caveman full. Code identifiers: English.

## Subagents (budget)

Default: **no subagents**. Only `scout` (read-only, cheap) when "where is X" needs > 5 files;
one at a time, never parallel or nested, never on heavy models. Never delegate planning,
implementation, review, or debugging. Details: `docs/agents/budget-policy.md`.

## Skills

- `tdd` (project) — `src/domain/` and Rust logic; test seams from the plan.
- `tauri-v2` (project) — Tauri config, commands, capabilities, IPC.
- `investigate-first` — bug with unknown cause. `verify-and-stop` — final acceptance check.
- `grilling` — via `/task-plan` only. `caveman` — chat style (see Language).
- Forbidden: `implement-spec`, `implement`, `code-review` from external packs (parallel subagents).

## Commands

Verified against `package.json` and `src-tauri/Cargo.toml`.

- Dev: `pnpm tauri dev` · Build: `pnpm tauri build` · Preview (Vite only): `pnpm preview`
- Frontend:
  - `pnpm dev` — Vite dev server, http://localhost:1420
  - `pnpm build` — `tsc && vite build`
  - `pnpm preview` — Vite preview
  - `pnpm typecheck` — `tsc --noEmit`
  - `pnpm lint` — ESLint, `--max-warnings 0`
  - `pnpm format` — Prettier write
  - `pnpm format:check` — Prettier check
  - `pnpm test` — Vitest, один прогон
- Rust (в каталоге `src-tauri/`):
  - `cargo check`
  - `cargo fmt --check`
  - `cargo clippy --all-targets -- -D warnings`
  - `cargo test`
