# 0022. Export and import: project zip, HTML export

Status: accepted (details refined in T-306/T-307 plans)
Date: 2026-10-17

## Context

Stage 3 needs sharing: zip is the base for the catalog (ADR 0021) and for sending a project to a person;
HTML is a read-only view of the whole roadmap. ADR 0009 allows writes only inside the open project.

## Decision

- **Zip export**: the project folder (`roadmap.json`, `descriptions/`, `plans/`, `reports/`, `handoff.md`,
  `canvas.json`) without backups and temps. Path chosen with a Rust save dialog.
- **Zip import**: only into an **empty** folder chosen with a Rust dialog. Every entry is checked before writing:
  relative, no `..`, no absolute/drive paths, no symlinks, ≤ 1000 entries, ≤ 10 MB per file, ≤ 50 MB total.
  Then `roadmap.json` must pass `parseProject` (+ migration). On any failure the folder is emptied again.
- **HTML export**: whole roadmap only (no single-node export). Two modes: full (clickable nodes with description,
  status, dates, acceptance, dependencies) and titles only. One self-contained file: inline CSS/JS, no external
  requests, Markdown rendered without raw HTML, all text escaped.
- Export writes go only to the path from the Rust save dialog, with a fixed extension (`.zip` / `.html`).

## Consequences

- Amends ADR 0009: the save-dialog path is the only allowed write outside the project root.
- New Rust dependency for zip (chosen in T-307 plan, ask first).
