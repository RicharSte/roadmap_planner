# 0014. Window close confirmation: native confirm() + core:window:allow-destroy

Status: accepted
Date: 2026-10-15

## Context

T-011 needs to warn the user and block window close when there is unsaved work (an edited description
not yet written, or a failed save). Without fixed rules a later task (T-012 reload, future window/menu
work) could add a second dialog mechanism or a second permission for the same problem.

## Decision

1. Listening to the close request needs no new permission: `getCurrentWindow().onCloseRequested(...)`
   is a plain JS event listener.
2. If there is unsaved work, call `event.preventDefault()`, then ask with the native, blocking
   `window.confirm(...)` — not the `dialog` plugin (`ask`/`confirm`), which would need its own permission.
3. If the user confirms, call `getCurrentWindow().destroy()` (not `close()`, which would re-fire
   `onCloseRequested` and loop). `destroy()` needs `core:window:allow-destroy`, added once to
   `src-tauri/capabilities/default.json`, scoped to the existing `"main"`-only capability.
4. "Unsaved" is the OR of every local dirty flag (e.g. description draft ≠ saved) and any pending
   `saveError`. Each feature that can leave data unsaved registers its own flag; the close handler only
   combines them — it does not know about description-specific state directly.

## Consequences

- One confirm pattern for the whole app: later window-close-adjacent work (T-012 reload, future dialogs)
  reuses this permission and this listener instead of adding a second one.
- `Cmd+Q` on macOS is assumed to route through the same single-window `CloseRequested` event (no menu/tray
  that would trigger a direct process exit). If manual testing shows otherwise, that needs a new ADR
  (Rust-side `RunEvent::ExitRequested` handling) — out of scope here.
- No conflict detection beyond this: last-writer-wins stays as decided in ADR 0002/0011.
