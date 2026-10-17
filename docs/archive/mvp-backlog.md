# Backlog MVP (архив, закрыт)

Frozen list for MVP. Agents never add rows — new ideas go to `docs/later.md`.
Status flow: `todo` → `plan-review` → `approved` → `in-progress` → `code-review` → `done`.

Plan / Build: **C** = Claude Code, **K** = OpenCode + Kimi K2.7 Code, **M** = OpenCode + MiniMax M3 or weaker.

| ID     | Task                                                                                                          | Plan | Build | Status |
| ------ | ------------------------------------------------------------------------------------------------------------- | ---- | ----- | ------ |
| T-000  | Toolchain: Rust, pnpm, Xcode CLT, `claude`, `opencode`                                                        | —    | user  | done   |
| T-001  | Scaffold Tauri 2 app, React + TS template (`pnpm create tauri-app`), dev build runs                           | M    | M     | done   |
| T-002  | ESLint + Prettier + Vitest + RTL, package.json scripts; real **Commands** in AGENTS.md                        | C    | K     | done   |
| T-003  | JSON schema + `.md` location → ADR 0005                                                                       | C    | —     | done   |
| T-004  | `src/domain/`: types, parent index, create/rename/delete/move node, validation (ADR 0005) + tests             | C    | K     | done   |
| T-005  | Rust: open project folder, read/parse `roadmap.json`, path-safety helper + tests                              | C    | K     | done   |
| T-006  | Rust: atomic write for JSON and `.md` + tests                                                                 | C    | K     | done   |
| T-007  | Create new project (folder picker, initial `roadmap.json`, `descriptions/`)                                   | K    | K     | done   |
| T-008  | UI: tree sidebar + details panel (ADR 0004)                                                                   | C    | K     | done   |
| T-009  | UI: node CRUD, move to parent, status select                                                                  | K    | K     | done   |
| T-010  | Fix DnD from T-009; Rust + storage: read / delete `descriptions/<id>.md` + tests                              | C    | K     | done   |
| T-010b | UI: create description, CodeMirror editor + preview (ADR 0006), delete confirmation with file count           | C    | K     | done   |
| T-011  | Autosave (debounced) with error display; предупреждение при закрытии с несохранёнными правками                | K    | K     | done   |
| T-012  | Reload project from disk; invalid JSON on reload → autosave must not overwrite the file (T-005 risk, test it) | C    | M     | done   |
| T-013  | User-readable errors pass (delete confirmation moved to T-010b)                                               | C    | M     | done   |
| T-014  | macOS build `.app`/`.dmg`, README «Как установить», full manual run of `docs/mvp-done.md`                     | C    | M     | done   |
| T-015  | Windows build (`.msi`/`.exe`) — method decided by user                                                        | C    | M     | done   |

Acceptance criteria for each task live in `docs/plans/<id>.md`.
