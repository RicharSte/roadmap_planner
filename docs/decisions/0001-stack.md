# 0001. Desktop stack: Tauri 2 + TypeScript + Rust

Status: accepted
Date: 2026-10-13

## Context

Cross-platform desktop app (macOS, Windows), offline, possible web version later.
Developer knows Python, reads Go. Development is agent-driven.

## Decision

Tauri 2. Frontend in TypeScript (Vite, pnpm). Rust only for native work:
filesystem I/O, atomic writes, path validation.

## Consequences

- Domain logic lives in TS (`src/domain/`) and is reusable for a future web build.
- All Tauri calls go through `src/storage/` adapter.
- UI must be checked on WKWebView (macOS) and WebView2 (Windows).
