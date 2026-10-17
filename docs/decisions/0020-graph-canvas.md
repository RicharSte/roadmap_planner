# 0020. Graph canvas: React Flow, editable, positions in canvas.json

Status: accepted (library versions and interactions refined in T-303/T-304 plans)
Date: 2026-10-17

## Context

Stage 3 adds a Miro-like canvas. ADR 0004 allowed only a read-only graph view and no graph library in MVP.

## Decision

- Library `@xyflow/react` (React Flow, MIT); auto-layout with `@dagrejs/dagre` (MIT).
- Canvas is a second view next to the tree; both edit the same domain project (ADR 0008).
- Two edge kinds: parent → child (from `childrenIds`) and depends-on (from `dependsOn`), visually distinct.
- Editing: create node, drag, connect (choose edge kind), delete with the same confirmation rules as the tree.
- Positions: `canvas.json` in the project root `{ "version": 1, "positions": { "<id>": { "x", "y" } } }`.
  Written only by the app; nodes without a position get auto-layout; unknown ids are dropped on save.
  Button «Авторазложить» recalculates all positions.
- Due date and status colour are shown on the node card.

## Consequences

- Supersedes ADR 0004 "no graph library" and "read-only view mode". The tree stays.
- `roadmap.json` format unchanged (no v3). Losing `canvas.json` loses only positions.
- ADR 0012 (tree DnD) is not used on the canvas.
