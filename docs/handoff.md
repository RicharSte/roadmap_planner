# Handoff

<!-- Перезаписывается агентом в конце каждой фазы. Стиль: caveman full. -->

- Done: T-004. Domain ready: `src/domain/types.ts`, `ids.ts`, `validate.ts`, `tree.ts` + tests. All 51 tests green. `pnpm typecheck`, `lint`, `format:check` green. Plannotator code review approved.
- Task: T-005 (Rust: open project folder, read/parse `roadmap.json`, path-safety helper + tests)
- Status: todo, ready to start
- Next tool: OpenCode, model Kimi K2.7 Code (Build column = K)
- Next command: `/task-build T-005`
- Blockers: none
- Notes:
  - Domain API fixed. Use `parseProject` / `validateProject` from `src/domain/validate.ts` for JSON semantics. Rust side reads bytes and returns raw JSON to frontend, or validates shape via invoke — see `docs/plans/T-005.md`.
  - Path safety hard rule: paths stay inside opened folder. No `..`, absolute paths, symlink escape. Rust treats frontend input as untrusted.
  - Atomic writes = T-006, do not implement here.
  - New Tauri plugin / permission / capability = ask user first.
  - Follow `tauri-v2` skill. Rust comments `///` in Russian on every function.
  - If same error fails twice, stop and write handoff.
