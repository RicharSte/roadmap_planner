---
description: Phase 1-2 — interview, write the task plan, approve it in Plannotator
agent: build
---
Plan task $ARGUMENTS. Do not edit source code in this command.

0. Load skill `caveman` (full) for chat replies. Plan file itself: normal full Russian.
1. If $ARGUMENTS is empty, take the first `todo` task in `docs/backlog.md`. Never invent tasks.
   Read `docs/handoff.md`, the task row, `docs/mvp-done.md`, relevant ADRs in `docs/decisions/`,
   and only the code files the task touches (find them and their callers with CodeGraph).

2. Interview (skill `grilling`, with these overrides):
   - Needed when the Plan column is **C**, or a decision is not covered by the brief / ADRs / template.
     Otherwise say «интервью не нужно: <причина>» and go to step 3.
   - Interview until no decision is open and nothing is silently assumed. No limit on rounds or questions.
     Each question: options + your recommended answer.
   - Only this task and its acceptance criteria. Beyond-MVP ideas → `docs/later.md`, not questions.
   - No subagents: find facts yourself (CodeGraph, Repowise, grep/read).
   - Never re-ask what `docs/product-brief.md`, `docs/decisions/`, `docs/open-questions.md` answer.

3. Write `docs/plans/$ARGUMENTS.md` from `docs/plans/_template.md`:
   Problem → Interview decisions → Solution → Acceptance criteria → Files → Steps → Tests → Out of scope → Risks.
   Limits: ≤ 6 files, ≤ 80 lines; bigger → propose a split. Every acceptance criterion is checkable
   (command, test, or manual step with expected result). Durable decisions → propose an ADR.
   Risks: add Repowise `get_risk` findings for the planned files (hotspots, co-change, past fixes), if any.

4. Set the task status to `plan-review` in `docs/backlog.md`.

5. Gate 1 — run exactly (it blocks until the user decides, so it runs in the background):
   `mkdir -p .reviews && rm -f .reviews/$ARGUMENTS-plan.json && nohup plannotator annotate docs/plans/$ARGUMENTS.md --gate --json --result-file .reviews/$ARGUMENTS-plan.json >/dev/null 2>&1 &`
   Then say «Ревью плана открыто в браузере. Напиши «готово», когда закончишь.» and stop.

6. On «готово»: open `.reviews/$ARGUMENTS-plan.json` with your file-read tool (not `cat`). Field `decision`:
   - `approved` → plan `Статус: approved`, backlog `approved`; treat notes in the message as guidance;
     overwrite `docs/handoff.md` (next: `/task-build $ARGUMENTS`, tool from the Build column). Stop.
   - `annotated` → revise the plan, rerun gate 1. Max 2 rounds, then ask the user one concrete question.
   - `dismissed` / no file → ask the user what to do.
