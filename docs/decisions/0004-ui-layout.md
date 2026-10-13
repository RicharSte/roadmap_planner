# 0004. Main UI: tree sidebar + details panel

Status: accepted
Date: 2026-10-13

## Context

MVP optimizes for structure and content editing, not canvas positioning.

## Decision

Left: indented, collapsible tree of nodes (select, add child, move to another parent, delete).
Right: details panel of the selected node — title, status, markdown editor (ADR 0006).

## Consequences

- No graph layout library in MVP.
- A graph canvas (e.g. React Flow + auto layout) may be added later as a second read-only/view mode;
  it must reuse `src/domain/`, not its own data model.
- Keyboard navigation in the tree is desirable.
