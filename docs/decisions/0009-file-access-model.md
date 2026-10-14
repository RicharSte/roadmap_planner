# 0009. File access: Rust owns the project root, relative paths only, two-phase open

Status: accepted
Date: 2026-10-14

## Context

AGENTS requires paths to stay inside the project folder but not how. T-006, T-007, T-010, T-012 all touch files;
without one model each task could take absolute paths from JS or bypass validation. Scope: the **Tauri adapter only**
(`src-tauri/` + Tauri implementation in `src/storage/`); the `src/storage/` interface stays platform-neutral (web later, ADR 0001).

## Decision

- Rust keeps `ProjectState { pending, root }`. The frontend never sends absolute paths; every file command takes a
  relative path and resolves it with `resolve_inside` (no `..`, `.`, `\`, `:`, absolute; symlink escape rejected).
- Folder pickers run only in Rust (`tauri-plugin-dialog`); no `dialog:*` JS permissions.
- Open is two-phase: `open_project` → `pending` (kind `Roadmap`, or `Empty` for an empty folder) → TS `parseProject`
  → `commit_project` sets `root`. Writes go only to `root`. A failed open keeps the previous project open.
- Single exception (T-007): `create_project(json)` writes only into a `pending` of kind `Empty`, re-checks emptiness
  right before writing, creates `descriptions/`, writes `roadmap.json` atomically (T-006), then sets `root`.
  The initial JSON comes from the domain and must pass `parseProject` first.
- Rust checks files (location, size ≤ 10 MB, UTF-8); only the domain validates the JSON schema.
- Errors: `{ code, message }`, English message; Russian texts live in the UI (T-013).

## Consequences

- One mechanism for all file tasks; untrusted paths from JS never reach the filesystem.
- Recent projects / reopen last project (after MVP, `docs/later.md`): Rust stores the path list itself; the frontend
  sends an index/id, never a path; reopening goes through the same `read → parseProject → commit` flow.
- Changing any rule above needs a new ADR.
