---
description: Phase 3-5 — implement an approved plan, report, code review in Plannotator, handoff
argument-hint: <task-id>
---
Implement task $ARGUMENTS.

0. Load skill `caveman` (full) for chat replies. Report file itself: normal full Russian.
1. Read `docs/plans/$ARGUMENTS.md`. If missing or its status is not `approved`, stop and say so.
2. Set backlog status `in-progress`. Read only the files listed in the plan (plus direct imports).
3. Implement exactly the plan, step by step. Skill `tdd` for domain/Rust logic, `tauri-v2` for Tauri work.
   Follow "Code comments" in AGENTS.md (Russian `///` on every Rust function).
   Anything outside the plan → one line in `docs/later.md`, do not implement it.
4. Run the checks from the plan. Same error fails twice → write `docs/handoff.md`, stop, ask for escalation.
5. Write `docs/reports/$ARGUMENTS.md` from `docs/reports/_template.md` in plain Russian:
   every changed file explained; for Rust, each function in simple words; manual test steps; check results.
6. Set backlog status `code-review`. Gate 2 — requires a git repo; if there is none, stop and ask the user to run `git init`.
   Run exactly (`git add -N .` only makes new files visible in the diff, it stages nothing):
   `git add -N . && mkdir -p .reviews && rm -f .reviews/$ARGUMENTS-code.json && (nohup plannotator review --json > .reviews/$ARGUMENTS-code.json 2>/dev/null &)`
   Then say «Ревью кода открыто в браузере. Отчёт: docs/reports/$ARGUMENTS.md. Напиши «готово», когда закончишь.» and stop.
7. On «готово»: open `.reviews/$ARGUMENTS-code.json` with your file-read tool (not `cat`). Field `decision`:
   - `approved` → backlog `done`; tick items in `docs/mvp-done.md` that now really pass;
     overwrite `docs/handoff.md` for the next `todo` task; suggest a commit message `feat($ARGUMENTS): ...`.
     Do not commit unless the user asks. Stop.
   - `annotated` → answer questions, fix, update the report, rerun gate 2. Max 2 rounds, then ask one concrete question.
   - `dismissed` / empty file → ask the user.
