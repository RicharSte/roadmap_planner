# Handoff: T-009 завершена, следующая — T-010

## Статус T-009

Задача T-009 (UI — node CRUD, перенос к другому родителю, смена статуса) закрыта.
Plannotator code review: `approved`, замечаний нет.

Проверки:

- `pnpm test` — 86/86 ✅
- `pnpm typecheck` — чисто ✅
- `pnpm lint` — чисто ✅
- `pnpm format:check` — чисто ✅
- `grep -r "@tauri-apps" src/ui` — пусто ✅

В `docs/mvp-done.md` отмечены пункты:

- Добавить корневую ноду и дочернюю ноду
- Переименовать ноду, сменить статус (4 фиксированных статуса)
- Перенести ноду к другому родителю (В данный момент Dnd (Drag and drop) не работает, надо проверить и исправить)

## Что оставляет T-009

- `src/ui/useProject.ts` теперь центральная точка для изменений проекта: `update(compute)` валидирует, сохраняет и только потом обновляет состояние.
- В `src/ui/DetailsPanel.tsx` есть кнопки переименования/удаления и селект статуса.
- В `src/ui/TreeSidebar.tsx` есть кнопки создания нод и drag&drop с тремя зонами.
- `src/storage/projectStorage.ts` уже умеет `writeDescription(path, content)`.
- Доменная функция `setDescriptionPath` в `src/domain/tree.ts` готова.

## Следующая задача: T-010

В бэклоге следующая `todo` — T-010: «Description: create descriptions/<id>.md, CodeMirror editor + preview (ADR 0006)».

План `docs/plans/T-010.md` ещё не создан. Перед сборкой нужно:

1. Создать/утвердить план T-010.
2. Реализовать в UI создание файла описания для ноды, открытие его в CodeMirror 6 (`@uiw/react-codemirror`) и рядом preview на `react-markdown`.
3. Использовать `writeDescription` из `src/storage/projectStorage.ts` и `setDescriptionPath` из домена.
4. Не забыть: descriptionPath создаётся один раз и не переименовывается; удалённые ноды пока не чистят `descriptions/` (это T-010/T-013).

## Commit

Предлагаемое сообщение:

```
feat(T-009): node CRUD, drag-and-drop move, status select
```

Не коммитил — жду подтверждения.
