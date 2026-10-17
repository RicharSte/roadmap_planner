# 0018. Multiple writers: revision check, unique temp names, folder watching

Status: accepted (details refined in T-206/T-207 plans)
Date: 2026-10-17

## Context

ADR 0002 and 0011 assume one writer (the app) and "last writer wins". With the MCP server (ADR 0017) the app
and an agent write the same project at the same time; silent loss becomes likely.

## Decision

- **Revision** = SHA-256 of the `roadmap.json` bytes. Every writer remembers the revision it loaded.
  A write of `roadmap.json` passes the expected revision; if the file on disk differs → `CONFLICT`, nothing written.
  Check and rename happen inside one write call (small race window accepted; no OS file locks).
- MCP server on `CONFLICT`: reload, re-apply the same domain operation once, else return the error to the agent.
- **Temp names are unique**: `.<name>.<random>.tmp`. Stale cleanup on commit deletes only temps older than 10 min.
- **Watching**: Rust watches the project root (`notify` crate, debounced ~300 ms), ignores its own writes
  (revision equal to last written), emits an event to the UI.
  - No unsaved changes → auto-reload (structure and open description).
  - Unsaved changes → dialog: «Загрузить изменения с диска» (local edits dropped) or «Оставить мои» (overwrite).
- Description `.md` files: same rule per file (revision = hash of that file).
- Manual «Перезагрузить» stays.

## Consequences

- Supersedes ADR 0002 "external changes only via Reload" and ADR 0011 rules 2 (temp name), 5 (single writer),
  9 (last writer wins), 10 (reserved names). Other ADR 0011 rules stay.
- Removes "live sync is not needed" from the product brief.
- New dependency: `notify` (Rust).
