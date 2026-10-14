# 0012. Tree drag&drop: native HTML5 API, 3-zone model

Status: accepted
Date: 2026-10-15

## Context

ADR 0004 says the tree supports "move to another parent" but not the mechanism. T-009 adds move +
sibling reorder; without a fixed model each task could reinvent zones, cycle handling, or add a DnD library.

## Decision

- Native HTML5 Drag and Drop API only (`draggable`, `dragstart`/`dragover`/`drop`). No DnD library
  (`@dnd-kit`, `react-dnd`, ...) — desktop-only app, no touch support needed.
- Each tree row is one drop target split into 3 zones by `clientY` vs the row's `getBoundingClientRect`:
  top third / bottom third → insert dragged node as a sibling of the row (before / after) in the row's
  own parent; middle third → make dragged node the last child of the row.
- Invalid targets (the dragged node itself, its descendants) get `not-allowed` cursor; drop is a no-op.
  `DomainError CYCLE` from `moveNode` is a backstop, not the primary guard.
- No keyboard equivalent in MVP (mouse/trackpad only); a keyboard fallback is tracked in `later.md`.

## Consequences

- Any future tree view (e.g. v2 graph) reusing this interaction must keep the 3-zone semantics or
  update this ADR.
- Touch/tablet support would need a different implementation (native HTML5 DnD is unreliable on touch).
- Keyboard-only move/reorder stays a known gap until `later.md` promotes it to a task.
