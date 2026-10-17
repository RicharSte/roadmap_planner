# 0011. Atomic writes: one entry point, temp next to target, single writer

Status: accepted (rules 2, 5, 9, 10 superseded by 0018)
Date: 2026-10-14

## Context

ADR 0002 requires atomic writes (temp + rename) but not how. T-006 implements them; T-007, T-010, T-011 and later
write tasks reuse them. Without fixed rules a later task can add a plain `fs::write`, a temp in `/tmp`, or a multi-file write that
leaves a dangling `descriptionPath`.

## Decision

1. Every project file write goes through one Rust function `write_inside(root, rel, bytes)` (`src-tauri/src/atomic.rs`).
   It calls `resolve_inside` itself; no other code uses `fs::write` / `File::create` on project files.
2. Temp file lives in the **same folder** as the target, named `.<name>.tmp` (never `/tmp`: cross-volume rename is not atomic).
3. Temp is created with `create_new` after removing a stale one (never `create` + truncate: no writing through a planted symlink).
4. Order: write → copy permissions → `sync_all` → `rename` → fsync folder (Unix only). Any error deletes the temp.
5. Single writer: writes run synchronously under `Mutex<ProjectState>`. Fixed temp names rely on this; making writes
   async or parallel requires unique temp names and a new ADR.
6. Read-only target → `READ_ONLY`, file untouched (same on macOS and Windows). Existing permissions are copied to the temp.
7. Symlink target inside the project → the real file is written, the link stays. Outside → rejected by `resolve_inside`.
8. Groups of files are **not** atomic. Write dependent files first (`.md`, backups), `roadmap.json` **last**:
   an orphan `.md` is harmless, a `descriptionPath` to a missing file is not.
9. Last writer wins; no conflict detection (ADR 0002: external changes are picked up only via Reload).
10. Names `.<name>.tmp` are reserved by the app; on `commit_project` stale ones in the root and `descriptions/` are deleted
    (best effort). They are never applied: a temp may be incomplete or older than the target.
11. Bytes are written as given (UTF-8, no BOM, line endings untouched). Limit 10 MB per file (`FILE_TOO_LARGE`).

## Consequences

- Lost on rename (accepted): hard links, xattr / Finder tags, ACL, owner.
- Windows: a target held open by another program fails with `IO_ERROR`; the next autosave retries
  (bounded retry inside the write: T-106).
- Changing any rule above needs a new ADR.
