# Handoff

## Статус

- T-015: код (правка `README.md` + отчёт `docs/reports/T-015.md`) **одобрен Plannotator**
  (`approved`, без замечаний). Backlog → `done`. Самой Windows-сборки агент не делал —
  пункты приёмки, требующие Windows-машины (build, tests, install, ручной сценарий),
  остаются за пользователем и не подтверждены.
- **Открытый шаг**: пользователь запускает `pnpm tauri build` + `pnpm test` + `cargo test`
  на своей Windows-машине (шаги 1–7 плана), проходит ручной сценарий из
  `docs/mvp-done.md` и сообщает результат в чате одним словом «Windows build OK»
  (или лог ошибки — тогда фикс по правилу AGENTS.md, без новых зависимостей/permissions,
  иначе стоп).
- **После подтверждения Windows-сборки** агент одним шагом:
  1) отмечает `[x]` пункт `docs/mvp-done.md` «Windows: сборка `.msi`/`.exe`»;
  2) переписывает этот `docs/handoff.md` под закрытие MVP (следующий шаг — релиз 1.1
     по `docs/later.md`).

## Контекст для следующего шага (Windows build verification)

- Инструкция для пользователя: раздел `### Windows` в `README.md` — чек-лист
  предустановки (Rust + `rustup target add x86_64-pc-windows-msvc`/`aarch64-...`,
  Node.js + pnpm, WebView2 Runtime, VS Build Tools), `pnpm tauri build`, ожидаемые
  пути к `.msi` (`bundle/msi/Roadmap_0.1.0_x64_en-US.msi`) и NSIS `.exe`
  (`bundle/nsis/Roadmap_0.1.0_x64-setup.exe`), обход SmartScreen («Подробнее» →
  «Выполнить в любом случае»), ручной сценарий «создать проект в пустой папке» /
  «открыть существующий проект выбором папки».
- Обязательно прогнать `pnpm test` и `cargo test` на Windows, не только собрать —
  риск платформенных багов в `paths.rs::validate_relative_path` (hotspot, разница
  `/` и `\`) и `atomic.rs::write_inside` (hotspot), у обоих `test_gap: true`.
- Известное ожидаемое поведение (ADR 0011, не баг): на Windows запись в файл,
  открытый другой программой, даёт `IO_ERROR` — задокументировано в README и не
  требует фикса.
- Неподписанная сборка → SmartScreen-предупреждение при первом запуске — ожидаемо,
  не чинить (подпись — T-301, вне MVP).
- Одна и та же ошибка на Windows повторилась дважды подряд одинаково → стоп,
  писать `docs/handoff.md`, эскалация (правило AGENTS.md).

## Не сделано в T-015 (явно вне рамок — не делать без отдельной задачи)

- Подпись/нотаризация Windows (`docs/later.md` T-301).
- GitHub Actions / CI (`docs/later.md` T-108) — отдельная задача после MVP.
- Кросс-сборка с macOS.
- Кастомная иконка, автообновление.
- Рефакторинг hotspot-файлов `project.rs`/`atomic.rs`/`paths.rs` — записано в
  `docs/later.md`.