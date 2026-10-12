# 0007. Tooling: ESLint + Prettier, Vitest + RTL, cargo checks
Status: accepted
Date: 2026-10-13

## Decision
- TS: ESLint (with React + hooks rules) + Prettier.
- Tests: Vitest for `src/domain/` (main coverage), React Testing Library for key components.
- Rust: `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test`.
- No e2e in MVP (`tauri-driver` does not support macOS).

## Consequences
- package.json scripts: `typecheck`, `lint`, `format`, `format:check`, `test` (set up in T-002).
