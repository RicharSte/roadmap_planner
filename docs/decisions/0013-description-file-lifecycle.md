# 0013. Description file lifecycle: create on demand, delete with the branch

Status: accepted
Date: 2026-10-15

## Context

ADR 0005 fixes `descriptionPath = descriptions/<id>.md` but not when the file appears or disappears.
T-010 / T-010b add reading, creating, editing and deleting description files; without fixed rules a later
task could auto-create files, leave a `descriptionPath` to a missing file, or delete files without asking.

## Decision

1. Create on demand: button «Создать описание» when `descriptionPath === null`. File starts **empty**
   (no `# title`: titles change, files never follow them). Order (ADR 0011 rule 8): write `.md` first,
   then `setDescriptionPath` + save `roadmap.json`. File write fails → nothing changes.
2. Read: limit 10 MB (`FILE_TOO_LARGE`), invalid UTF-8 → `NOT_UTF8` and the editor is read-only.
   Missing file is **not** an error: empty editor + notice, the file is recreated on next save.
3. Delete: deleting a node deletes the `.md` files of the whole branch, **permanently** (`fs::remove_file`,
   no trash, no extra crate). Always after an in-app confirmation «Будет удалено N нод и M файлов описаний»
   with «Удалить» / «Отмена».
4. Delete order: save `roadmap.json` without the branch first, then delete files. File deletion fails →
   orphan `.md` stays (harmless), error banner shown. Missing file during delete is skipped.
5. Rust validates **all** paths of a delete batch before removing any file; each path goes through
   `resolve_inside` (no escape via `..` or symlinks).

## Consequences

- Orphan `.md` files are possible after failures; no cleanup tool in MVP.
- Undo of deletion is impossible (brief: no undo/backup in MVP); confirmation is the only guard.
- Moving files to the system trash or keeping deleted descriptions needs a new ADR.
