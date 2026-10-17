# 0004. Main UI: tree sidebar + details panel

Status: accepted (partially superseded by 0020: editable canvas with React Flow)
Date: 2026-10-13

## Context

MVP optimizes for structure and content editing, not canvas positioning.

## Decision

Left: indented, collapsible tree of nodes (select, add child, move to another parent, delete).
Right: details panel of the selected node — title, status, markdown editor (ADR 0006).

## Consequences

- No graph layout library in MVP.
- Stage 3: editable graph canvas as a second view (ADR 0020); it reuses `src/domain/`, not its own data model.
- Keyboard navigation in the tree: T-313.
