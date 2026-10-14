# 0008. Domain API: pure functions, DomainError codes, parent index outside

Status: accepted
Date: 2026-10-14

## Context

ADR 0005 fixes the file format but not how `src/domain/` is called. T-005…T-011 (Rust storage, UI, autosave)
all depend on one stable API. React needs change detection; v2 graph must not break signatures.

## Decision

- Operations are pure functions `(project, args) => Project`, никогда не мутируют вход. Structural sharing:
  new project object, new `nodes` map, new objects only on the changed path. Deep cloning is forbidden.
- Mutating operations throw `DomainError` with a machine `code` + short English message. User-facing Russian
  texts live in the UI (T-013), not in the domain.
- Load-time checks never throw: `parseProject(raw: unknown)` and `validateProject(project)` return
  `{ ok: true, project } | { ok: false, problems }` and collect **all** problems. No auto-repair.
- Parent links are derived: `buildParentIndex(project)` is pure, `ParentIndex = Map<string, string[]>`
  (array already, though v1 validates "at most one parent"). Callers memoize it (`useMemo` on project ref).
- Timestamps enter through an optional `now?: string` parameter (default: current UTC time).
- Node ids: own generator on `crypto.getRandomValues`, prefix `n_` + 10 chars of `0-9a-z` without `i l o u`.

## Consequences

- React re-renders by reference comparison; undo/redo after MVP stays possible without a rewrite.
- No cached state inside the domain → no stale-index bugs; the scan cost is O(N), fine at MVP scale.
- v2 graph relaxes validation only; `getParents` and `ParentIndex` signatures stay as they are.
- `src/domain/` imports nothing from Tauri or React; checked by grep in T-004 acceptance criteria.
