# Handoff

- Done: T-006 (Rust atomic write JSON + .md + tests). Status: done.
- Next task: T-007 (Create new project). Plan not approved yet (`docs/plans/T-007.md` missing).
- Next tool: OpenCode, model Kimi K2.7 Code (Build column = K).
- Next command: wait for `/task-plan T-007` approval, then `/task-build T-007`.
- Blockers: none.
- Notes:
  - Atomic write ready: `src-tauri/src/atomic.rs` (`write_inside`, `remove_stale_temps`).
  - Rust commands ready: `save_roadmap`, `write_description` in `src-tauri/src/project.rs` + `lib.rs`.
  - TS adapter ready: `saveProject`, `writeDescription` in `src/storage/projectStorage.ts`.
  - `Cargo.toml`, `capabilities/default.json` unchanged. No new deps.
  - `docs/later.md` has 4 T-006/T-011 lines: conflicts, Windows retry, xattr/ACL/owner loss, warn on close with unsaved.
  - User will move warn-on-close from `docs/later.md` to `docs/backlog.md` T-011 manually later.
  - Keep `greet`, `opener`, demo `App.tsx` untouched (T-101).
