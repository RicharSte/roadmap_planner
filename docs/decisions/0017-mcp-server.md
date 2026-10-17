# 0017. MCP server: TypeScript, reuses the domain, Bun-compiled Tauri sidecar

Status: accepted (details refined in T-210 plan)
Date: 2026-10-17

## Context

Stage 2 lets agents create (2.1), improve (2.2) and execute (2.3) roadmaps. Agents must not edit `roadmap.json`
by hand: one bad write breaks validation. Clients: Claude Code and OpenCode (both support local stdio MCP servers).

## Decision

- Separate package `mcp/` (TypeScript), SDK `@modelcontextprotocol/server`, transport **stdio only**.
- It imports `src/domain/` directly; every change is a domain operation + `parseProject`-level validation.
  No second schema implementation.
- File I/O: Node adapter `mcp/src/fsStorage.ts` with the same rules as Rust (ADR 0009 path safety, ADR 0011
  atomic writes, ADR 0018 revision check). Covered by its own tests, including the escape cases from `paths.rs`.
- The project root is given once per session (`open_project(path)` or `create_project(path)` into an empty
  folder); every later path is relative to it. No access outside the root.
- Tool groups: read (T-211), write (T-212), workflow (T-213, ADR 0019). MCP prompts: create / improve / next.
- Agents may do everything the app can, including deletes. Before the **first write of each session** the server
  copies `roadmap.json` to `roadmap.backup.json` (one file, overwritten each session).
- No network, no telemetry, no spawning of other processes.
- Shipped as one binary `roadmap-mcp` built with `bun build --compile` per target (macOS arm64/x64, Windows x64)
  and bundled as a Tauri sidecar (`externalBin`). The app only shows the path and ready-to-copy client commands.

## Consequences

- New dev tool: Bun (build only). New dependency: MCP SDK (`mcp/` only, not in the app bundle JS).
- Sidecar adds tens of MB per platform to the installer (accepted).
- Domain code must stay free of browser/Tauri imports (already required by AGENTS.md).
- Amends ADR 0009: a second process writes the project, with the same rules.
