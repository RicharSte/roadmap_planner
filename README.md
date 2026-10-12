# roadmap_proj

Local-first desktop-приложение (macOS, Windows) для визуального редактирования roadmap-проектов:
папка с JSON-структурой и Markdown-описаниями нод. Стек: Tauri 2 + React + TypeScript + Rust.

## Что где лежит

| Файл | Назначение |
|---|---|
| `AGENTS.md` | Главные правила для всех агентов (OpenCode читает напрямую) |
| `CLAUDE.md` | Импортирует `AGENTS.md` + роль Claude |
| `.claude/settings.json` | Субагенты принудительно на Haiku, запрет тяжёлых субагентов, защита от опасных команд |
| `.claude/agents/scout.md` | Единственный разрешённый субагент (поиск по коду) |
| `.claude/commands/` | `/task-plan`, `/task-build`, `/task-next`, `/review-diff` |
| `opencode.json` | Запрет субагентов кроме `scout`, права на bash |
| `.opencode/agents/scout.md` | Read-only субагент для OpenCode |
| `.opencode/commands/` | `/task-plan`, `/task-build`, `/task-next`, `/fix` |
| `.claude/skills/` | Проектные skills `tdd`, `tauri-v2` (видят и Claude, и OpenCode) |
| `docs/product-brief.md` | Brief MVP |
| `docs/open-questions.md` | Нерешённые вопросы (UI, схема JSON и т.д.) |
| `docs/backlog.md` | Задачи по шагам |
| `docs/decisions/` | ADR |
| `docs/guide.md` | **Инструкция по работе с агентами** |
| `docs/mvp-done.md` | Определение готовности MVP |
| `docs/later.md` | Идеи после MVP |
| `docs/plans/` | Планы задач (шаблон `_template.md`) |
| `docs/reports/` | Отчёты по задачам для ревью (шаблон `_template.md`) |
| `docs/agents/workflow.md` | Кто какой моделью что делает |
| `docs/agents/budget-policy.md` | Правило экономии лимитов и субагентов |
| `docs/handoff.md` | Передача задачи между моделями |

## Цикл работы

См. [`docs/guide.md`](docs/guide.md): `/task-next` → `/task-plan` → ревью плана в Plannotator → `/task-build` → отчёт и ревью кода → коммит → handoff.

## Перед стартом

- Инструменты установлены (T-000). Нужен git-репозиторий — см. `docs/guide.md`, шаг 0.
- Решения по UI, формату и инструментам: `docs/decisions/0003`–`0007`.
