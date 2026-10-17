# 0016. Понятные пользователю тексты ошибок storage/UI

Status: accepted
Date: 2026-10-15

## Context

Баннеры ошибок `error` / `reloadError` / `saveError` в `App.tsx` показывали
`error.code` (`IO_ERROR`, `NOT_A_DIRECTORY`, ...) и `error.message` как есть.
`message` приходит либо из Rust (`AppError`, нарочно на английском —
`src-tauri/src/paths.rs:5-6`, независимость от локали ОС), либо
захардкожен на английском в `src/storage/projectStorage.ts`
(`"roadmap.json is not valid JSON"` и т.п.). Пользователь без английского
не понимал, что произошло. Доменные ошибки (`DomainError`, `problems[]`)
уже на русском, поэтому проблема была только в слое storage/UI.

## Decision

1. Rust (`AppError`) и `src/domain/` (`DomainError`, `validate.ts`) не трогаем:
   они остаются источником машинных кодов и английских/русских технических
   сообщений, как было решено в ADR 0002 (`AppError`) и при разделении слоёв.

2. Перевод делаем на фронте. Новый модуль `src/ui/strings.ts` экспортирует
   `Record<StorageErrorCode, string>` (все 16 кодов) и функцию
   `getStorageErrorMessage(code)`. Тип `Record<StorageErrorCode, string>`
   гарантирует полноту маппинга на стадии компиляции.

3. `App.tsx` для баннеров `error` / `reloadError` / `saveError` вычисляет
   текст сообщения: `code === "DOMAIN" ? message : getStorageErrorMessage(code)`.
   `error.code` остаётся рядом отдельным узлом (`.error-code`, `data-testid`),
   чтобы пригодиться в багрепортах и не потерять связь с исходным кодом.

4. Доменные ошибки (`DOMAIN`) и `problems[]` остаются без изменений: их
   сообщения уже на русском, перевод через таблицу их не касается.

5. Расширение правила: новый `StorageErrorCode` = обязательная запись
   в `STORAGE_ERROR_MESSAGES`. Покрытие проверяется тестом
   `src/ui/strings.test.ts` (`Object.keys` совпадает с типом).

6. ADR пронумерован 0016, не 0015: 0015 зарезервирован (сейчас — задача T-102 в `docs/backlog.md`)
   для отдельного решения о блокировке записи после ошибки reload (T-012).

## Consequences

- У пользователя появляется понятный русский текст во всех баннерах
  ошибок слоя storage; машинный код виден рядом для поддержки и багрепортов.
- `src/ui/strings.ts` становится точкой расширения: полный перенос UI-строк
  (кнопки, диалоги) и будущая локализация на другие языки (RU/EN/...)
  делается в этом файле без правок `App.tsx`. Это частично закрывает Q9
  (`docs/open-questions.md`) — отмечено в `docs/later.md`.
- `App.tsx` (hotspot 0.76) и `useProject.ts` (hotspot 0.88) остаются
  горячими точками; правка баннеров минимальна, разбивка отложена в `docs/later.md`.
- Полный перенос остальных UI-строк — отдельная задача (в `docs/later.md`).
