# Handoff

- Done: T-008 (UI: tree sidebar + details panel). Status: done.
- Next task: T-009 (UI: node CRUD, move to parent, status select).
- Next tool: OpenCode, model Kimi K2.7 Code (Build column = K).
- Next command: `/task-build T-009`.
- Blockers: none.
- Notes:
  - `useProject` currently exposes `project`, `selectedId`, `collapsed`, `error`, `pendingCreate`, `open`, `create`, `cancelCreate`, `select`, `toggle`. T-009 adds `update(op)` for pure domain operations; the hook calls `saveProject` and updates local state.
  - Domain operations already exist in `src/domain/tree.ts`: `createNode`, `renameNode`, `deleteNode`, `moveNode`, `setStatus`. `saveProject` is in `src/storage/projectStorage.ts`.
  - `TreeSidebar` and `DetailsPanel` are pure props-driven; T-009 adds callbacks/buttons for add/rename/delete/move/status select.
  - Status labels live in `src/ui/status.ts`; T-009 status select can reuse `STATUS_ORDER` and `STATUS_LABELS`.
  - Manual verification of T-008 needed before ticking `mvp-done.md` items «Создать новый проект…» and «Открыть существующий…».
  - No touching `greet`, `opener`, `react.svg` (T-101).
