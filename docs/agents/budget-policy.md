# Subagent and token budget policy

Applies to every agent in this repo (Claude Code, OpenCode, any model).
Reason: Claude Pro and the OpenCode subscription have shared, limited quotas. Subagents
multiply usage: each one re-reads context and files from scratch.

## Rules

1. **Default is no subagents.** The main session does the work.
2. **Allowed subagent: `scout` only** (read-only, cheap model, ≤ 8 steps), for locating code
   when the answer would otherwise require reading more than 5 files.
   In Claude Code the built-in `Explore` is also allowed; it is forced to `haiku`.
3. **Max 1 subagent at a time.** No parallel fan-out, no nested subagents, no "agent teams".
4. **Never delegate** planning, implementation, review, or debugging to a subagent.
5. **Never run a subagent on a heavy model** (Opus, Sonnet, or similar frontier models).
6. Prefer grep/glob/targeted reads over any subagent.
7. Do not re-read files already in context; do not print whole files back.
8. Keep final reports ≤ 15 lines unless asked for detail.

## Enforcement (config)

- Claude Code — `.claude/settings.json`:
  - `CLAUDE_CODE_SUBAGENT_MODEL=haiku` + `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` → every subagent runs on Haiku.
  - `permissions.deny`: `Agent(general-purpose)`, `Agent(Plan)`.
  - Project agent `.claude/agents/scout.md` (haiku, Read/Grep/Glob, maxTurns 8).
  - To forbid subagents entirely, add `"Agent"` to `permissions.deny`.
- OpenCode — `opencode.json`:
  - `permission.task`: `"*": "deny"`, `"scout": "allow"` (globally and for build/plan).
  - `.opencode/agents/scout.md`: read-only, `steps: 8`.
  - Note: users can still call any agent manually via `@`.

## Exceptions

Only when the user explicitly asks in the current message (e.g. "use subagents for this").
