# roadmap_proj

Local-first desktop-приложение (macOS, Windows) для визуального редактирования roadmap-проектов:
папка с JSON-структурой и Markdown-описаниями нод. Стек: Tauri 2 + React + TypeScript + Rust.

## Что где лежит

| Файл                           | Назначение                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `AGENTS.md`                    | Главные правила для всех агентов (OpenCode читает напрямую)                           |
| `CLAUDE.md`                    | Импортирует `AGENTS.md` + роль Claude                                                 |
| `.claude/settings.json`        | Субагенты принудительно на Haiku, запрет тяжёлых субагентов, защита от опасных команд |
| `.claude/agents/scout.md`      | Единственный разрешённый субагент (поиск по коду)                                     |
| `.claude/commands/`            | `/task-plan`, `/task-build`, `/task-next`, `/review-diff`                             |
| `opencode.json`                | Запрет субагентов кроме `scout`, права на bash                                        |
| `.opencode/agents/scout.md`    | Read-only субагент для OpenCode                                                       |
| `.opencode/commands/`          | `/task-plan`, `/task-build`, `/task-next`, `/fix`                                     |
| `.claude/skills/`              | Проектные skills `tdd`, `tauri-v2` (видят и Claude, и OpenCode)                       |
| `docs/product-brief.md`        | Brief MVP                                                                             |
| `docs/open-questions.md`       | Нерешённые вопросы (UI, схема JSON и т.д.)                                            |
| `docs/backlog.md`              | Задачи по шагам                                                                       |
| `docs/decisions/`              | ADR                                                                                   |
| `docs/guide.md`                | **Инструкция по работе с агентами**                                                   |
| `docs/mvp-done.md`             | Определение готовности MVP                                                            |
| `docs/later.md`                | План после MVP: 1.1 (зависимости), 1.2 (агенты), 2.0 (B2C) + входящие идеи            |
| `docs/plans/`                  | Планы задач (шаблон `_template.md`)                                                   |
| `docs/reports/`                | Отчёты по задачам для ревью (шаблон `_template.md`)                                   |
| `docs/agents/workflow.md`      | Кто какой моделью что делает                                                          |
| `docs/agents/budget-policy.md` | Правило экономии лимитов и субагентов                                                 |
| `docs/handoff.md`              | Передача задачи между моделями                                                        |

## Цикл работы

См. [`docs/guide.md`](docs/guide.md): `/task-next` → `/task-plan` → ревью плана в Plannotator → `/task-build` → отчёт и ревью кода → коммит → handoff.

## Перед стартом

- Окружение готово (T-000, git, RTK, skills) — состояние в `docs/guide.md`, раздел 0.
- Решения по UI, формату и инструментам: `docs/decisions/0003`–`0007`.

## Как установить и запустить

Публичных релизов пока нет (запланированы в 1.1, см. `docs/later.md` T-108), поэтому приложение
собирается из исходников локально. Нужны инструменты из раздела «Перед стартом».

1. Клонировать репозиторий и перейти в папку проекта:

   ```bash
   git clone <URL_репозитория> roadmap_proj
   cd roadmap_proj
   ```

2. Поставить JS-зависимости: `pnpm install`.
3. Собрать релизную версию под текущую ОС: `pnpm tauri build`.
   - macOS: `.app` и `.dmg` появятся в `src-tauri/target/release/bundle/`.
   - Windows: `.msi` / `.exe` — в той же папке, бинарник — отдельная задача T-015.
4. (macOS) Открыть полученный `.dmg`, перетащить `Roadmap.app` в `/Applications`.
   Первый запуск неподписанной сборки — Finder → ПКМ на `Roadmap.app` → «Открыть» → подтвердить
   предупреждение Gatekeeper. Последующие запуски — двойным кликом.
5. Запустить `Roadmap` из `/Applications`. В открывшемся окне — кнопка «Открыть проект» (выбор папки)
   или «Создать проект» (выбор пустой папки).

Готовый `.dmg` под другую архитектуру (Intel/Apple Silicon) собирается на Mac с соответствующим
процессором либо через `pnpm tauri build --target <triple>` при наличии cross-toolchain.
