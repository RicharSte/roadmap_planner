# Model routing

Task loop steps: `/task-plan`, `/task-build`, `/task-next` commands. User guide: `docs/guide.md`.
Rule: **every plan is written in Claude Code**; implementation runs in OpenCode Go on the model from the
backlog column Build. Subscriptions: Claude Pro ($20), OpenCode Go ($10; Go Plus $40 only if limits run out).

## Plan (Claude Code, Claude Pro)

| Code | Model      | Use for                                                                                |
| ---- | ---------- | -------------------------------------------------------------------------------------- |
| O    | Opus 5.5   | Format, storage, concurrency, MCP write/workflow, zip/network — safety-sensitive tasks |
| S    | Sonnet 5.5 | Everything else (UI, refactors, CI, docs). Default                                     |

Claude Pro has a 5-hour window and a weekly limit shared between models; Opus spends it faster.
Do not plan two `O` tasks in one 5-hour window if it can be avoided.

## Build (OpenCode Go)

Go limits per model: 5-hour window = 20 % of the monthly limit, week = 50 % (OpenCode docs).
Approximate requests per 5 hours on Go are in brackets.

| Code | Model           | Use for                                                                          |
| ---- | --------------- | -------------------------------------------------------------------------------- |
| DS   | DeepSeek V4 Pro | Rust, storage, concurrency, MCP fs adapter and write tools, zip/network (~1050)  |
| K2   | Kimi K2.7 Code  | Default workhorse: TS domain, React features, refactors (~1350)                  |
| K3   | Kimi K3         | Hard frontend only: design system, canvas (~110 — scarce, max 3 tasks per month) |
| G    | GLM-5.3         | CI, release workflows, sidecar packaging, scripts, terminal-heavy work (~220)    |
| MM   | MiniMax M3      | Small UI, cleanup, docs, simple fixes (~3200)                                    |
| user | the user        | Manual checks and dogfooding                                                     |

Spare models (no backlog code, use as substitutes): GLM-5.2 (~880) for DS/G, DeepSeek V4.1 Flash (very high limit)
for mechanical edits, Qwen3.7 Plus (~4300) for docs. Kimi K3 and GLM-5.3 accept screenshots: attach UI references.

## Escalation

1. Model fails twice on the same error → writes `docs/handoff.md`, stops.
2. Next model: MM / Flash → K2 → DS (backend) or K3 (frontend) → Claude Sonnet 5.5 (fresh session, only
   `docs/handoff.md` + the plan).
3. Model out of limit → substitute from «Spare models», note it in the report.
4. Never escalate by "continue the same chat with a bigger model": start a fresh session.

## Extra review

For tasks planned with `O`, after gate 2 the user may run `/review-diff <id>` in Claude Code before committing.

## Session hygiene

- One task per session; fresh session for each phase if the context got long.
- Point agents to exact files; paste trimmed errors only.
