# 0002. Roadmap project = user-owned folder (JSON + Markdown)
Status: accepted
Date: 2026-10-13

## Context
Local-first, transparent, portable data. Single user.

## Decision
A project is a folder chosen by the user. It contains one roadmap JSON file
(source of truth for structure) and Markdown description files created by the app.
Autosave. External changes are picked up only via explicit "Reload".

## Consequences
- Rust must restrict all file operations to the opened folder.
- Writes must be atomic (temp + rename).
- JSON carries a `version` field for future migrations (tree → graph).
- Exact file names and schema: see open questions Q3, Q4.
