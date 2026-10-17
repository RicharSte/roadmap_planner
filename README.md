# roadmap_proj

Local-first desktop-приложение (macOS, Windows) для визуального редактирования roadmap-проектов:
папка с JSON-структурой и Markdown-описаниями нод. С этапа 2 roadmap могут создавать, улучшать и выполнять
AI-агенты через встроенный MCP-сервер. Стек: Tauri 2 + React + TypeScript + Rust.

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
| `docs/product-brief.md`        | Brief: MVP (готов), MSP 1.0.0, направление Web                                        |
| `docs/open-questions.md`       | Нерешённые вопросы (UI, схема JSON и т.д.)                                            |
| `docs/backlog.md`              | Задачи MSP: этапы 1–3, модели для плана и реализации                                  |
| `docs/decisions/`              | ADR                                                                                   |
| `docs/guide.md`                | **Инструкция по работе с агентами**                                                   |
| `docs/msp-done.md`             | Определение готовности MSP (релиз 1.0.0)                                              |
| `docs/archive/`                | Закрытый MVP: backlog и определение готовности                                        |
| `docs/ui/`                     | UI-брифы задач (шаблон `_template.md`), референсы и макеты                            |
| `docs/later.md`                | Входящие идеи, «После MSP», направление Web                                           |
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

Публичных релизов пока нет (GitHub Releases — задача T-315 в `docs/backlog.md`), поэтому приложение
собирается из исходников локально. Нужны инструменты из раздела «Перед стартом».

Общие шаги для обеих платформ:

1. Клонировать репозиторий и перейти в папку проекта:

   ```bash
   git clone <URL_репозитория> roadmap_proj
   cd roadmap_proj
   ```

2. Поставить JS-зависимости: `pnpm install`.

### macOS

1. Собрать релизную версию: `pnpm tauri build`. `.app` и `.dmg` появятся в
   `src-tauri/target/release/bundle/`.
2. Открыть полученный `.dmg`, перетащить `Roadmap.app` в `/Applications`. Первый запуск
   неподписанной сборки — Finder → ПКМ на `Roadmap.app` → «Открыть» → подтвердить
   предупреждение Gatekeeper. Последующие запуски — двойным кликом.
3. Запустить `Roadmap` из `/Applications`. В открывшемся окне — кнопка «Открыть проект»
   (выбор папки) или «Создать проект» (выбор пустой папки).

Готовый `.dmg` под другую архитектуру (Intel/Apple Silicon) собирается на Mac с соответствующим
процессором либо через `pnpm tauri build --target <triple>` при наличии cross-toolchain.

### Windows

Прежде чем собирать, на Windows-машине должны быть установлены:

- **Rust** ([rustup](https://rustup.rs/)) с таргетом под архитектуру машины:
  `rustup target add x86_64-pc-windows-msvc` (на ARM64 — `aarch64-pc-windows-msvc`).
- **Node.js** + **pnpm** — те же версии, что и для macOS.
- **WebView2 Runtime** — на Windows 11 обычно уже есть; если приложение при старте падает
  с ошибкой про WebView2, скачать Evergreen Bootstrapper с сайта Microsoft.
- **Build Tools для Visual Studio** (C++ toolchain) — нужен линковщику `link.exe`, без них
  `cargo build` падает на этапе линковки.

Сборка и установка:

1. В корне проекта: `pnpm tauri build`. В `src-tauri/target/release/bundle/` появятся:
   - `.msi` (WiX-инсталлятор) — обычно `msi/Roadmap_0.1.0_x64_en-US.msi`;
   - NSIS `.exe` (одна портативная сборка) — обычно `nsis/Roadmap_0.1.0_x64-setup.exe`.
2. Запустить `.msi` (или `.exe`) → пройти мастер установки → приложение появится в меню «Пуск».
3. Первый запуск неподписанной сборки — SmartScreen покажет предупреждение: нажать
   «Подробнее» → «Выполнить в любом случае». Это ожидаемо для неподписанной сборки (подпись —
   после MSP, см. `docs/later.md`, «После MSP»).
4. В открывшемся окне — кнопка «Открыть проект» (выбор папки) или «Создать проект»
   (выбор пустой папки).

Если при первом сохранении появится `IO_ERROR` (файл `roadmap.json` или `.md` открыт в другой
программе, например в Блокноте) — закройте другую программу; следующее автосохранение повторит
попытку. Это документированное поведение (ADR 0011), не дефект.

## Лицензия

Будет выбрана перед публичным релизом (T-315, `docs/open-questions.md`).
