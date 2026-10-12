# 0003. Frontend framework: React + TypeScript
Status: accepted
Date: 2026-10-13

## Context
Implementation is done mostly by weaker coding models (MiniMax, Kimi). Need tree view,
details panel, markdown editor, autosave.

## Decision
React + TypeScript on Vite (official Tauri React template, pnpm).

## Consequences
- Best model familiarity and component ecosystem.
- Watch for unnecessary re-renders and `useEffect` misuse; keep state logic in `src/domain/`
  and thin hooks, not in components.
- No global state library until a concrete need appears (ask first).
