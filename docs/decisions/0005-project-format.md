# 0005. Project format v1: childrenIds-only links, descriptions/<id>.md
Status: accepted
Date: 2026-10-13

## Context
Tree in MVP, directed graph later. Avoid storing the same link twice. Keep JSON human-readable.

## Decision
Project folder:
```
<project>/
  roadmap.json           # structure, source of truth
  descriptions/<id>.md   # node descriptions, created by the app
```
`roadmap.json` (v1):
```json
{
  "version": 1,
  "rootIds": ["n_a"],
  "nodes": {
    "n_a": {
      "id": "n_a",
      "title": "Auth",
      "childrenIds": ["n_b"],
      "status": "in progress",
      "descriptionPath": "descriptions/n_a.md",
      "createdAt": "2026-10-13T10:00:00Z",
      "updatedAt": "2026-10-13T10:00:00Z"
    },
    "n_b": {
      "id": "n_b",
      "title": "Login form",
      "childrenIds": [],
      "status": "unstarted",
      "descriptionPath": null,
      "createdAt": "2026-10-13T10:00:00Z",
      "updatedAt": "2026-10-13T10:00:00Z"
    }
  }
}
```
Rules:
- Links are stored only in the parent's ordered `childrenIds`. `rootIds` lists top-level nodes in order.
- `parentId` is NOT stored; `src/domain/` derives a parent index on load (brief field kept in memory).
- `title` is the human-readable name; file names never depend on it.
- `descriptionPath` is relative to the project folder: `descriptions/<id>.md` or `null`.
  Fixed at creation, never renamed.
- `status` ∈ `unstarted | in progress | paused | done`.
- Timestamps: ISO 8601 UTC strings.
- Node ids: short random, prefix `n_`, safe for file names on macOS/Windows.

Validation on load (v1): every id in `childrenIds`/`rootIds` exists; each node has at most one
parent; a node is either in `rootIds` or has a parent; no cycles; paths stay inside `descriptions/`.

## Consequences
- No duplicated link data → no consistency repair.
- Graph migration (v2): allow multiple parents by relaxing validation (keep cycle check);
  format stays the same. Bump `version` only if fields change.
- All code accesses structure via domain functions (`getParents`, `getChildren`, `moveNode`, ...).
- File name `roadmap.json` is the default; can be changed before T-005.
