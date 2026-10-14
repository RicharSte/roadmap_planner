# Handoff

<!-- Перезаписывается агентом в конце каждой фазы. Стиль: caveman full. -->

- Done: T-005. Code review approved. Merged? No — user did not ask commit.
- Task: T-006 (Rust: atomic write JSON + .md + tests)
- Status: todo, no `docs/plans/T-006.md` yet. Need plan before build.
- Next tool: OpenCode, model Kimi K2.7 Code (Build column = K)
- Next command: wait for `/task-plan T-006` or approved plan, then `/task-build T-006`
- Blockers: missing approved plan for T-006
- Notes:
  - T-005 left ready state:
    - `src-tauri/src/project.rs`: `ProjectState` with `pending`/`root`, `read_roadmap`, commands `open_project`/`commit_project`/`reload_project`.
    - `src-tauri/src/paths.rs`: `resolve_inside` path-safety helper, `AppError`.
    - `src/storage/projectStorage.ts`: `openProject`, `reloadProject`, adapter pattern.
  - T-006 will add write side: atomic temp + rename for `roadmap.json` and `descriptions/<id>.md`. Reuse `resolve_inside` for path checks.
  - Keep `greet`, `opener`, `App.tsx` untouched — deferred to later.
  - `docs/later.md` has row for removing demo stuff after MVP.
  - Suggest commit message for T-005 changes: `feat(T-005): open project folder, read roadmap.json, path-safety helper + tests`
