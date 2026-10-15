# Handoff

## Статус

- T-010b завершён: редактор описания, предпросмотр Markdown и подтверждение удаления ветки реализованы, код-ревью пройдено.
- Следующая задача из backlog: **T-011** — автосохранение описаний (debounce), индикатор несохранённых изменений и предупреждение при закрытии окна с несохранёнными правками.

## Что сделано в T-010b

- `src/ui/useProject.ts`: колбэки `createDescription`, `loadDescription`, `saveDescription`; удаление ветки теперь сначала сохраняет `roadmap.json`, затем удаляет файлы описаний.
- `src/ui/DescriptionEditor.tsx`: CodeMirror + переключатель «Редактор/Просмотр», сохранение по blur и при размонтировании.
- `src/ui/DetailsPanel.tsx`: кнопка «Создать описание», встроенный редактор, блок подтверждения удаления с подсчётом нод и файлов.
- `src/App.tsx` и `src/App.css`: проводка колбэков и стили.
- `src/App.test.tsx`: моки CodeMirror (`<textarea>`) и новые сценарии тестирования.
- Зависимости: `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `react-markdown`, `remark-gfm`.
- Проверки: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, Rust-проверки — все чистые.
- `docs/reports/T-010b.md` — полный отчёт.
- В `docs/later.md` добавлены две UX-идеи: единое поле редактора/просмотра и кликабельные ссылки в предпросмотре.

## Контекст для T-011

- Редактор описания сейчас сохраняет только на blur и при смене ноды; debounce ещё не реализован.
- Ошибки сохранения попадают в `saveError` в `useProject` и отображаются баннером в `App.tsx` — этот механизм можно расширить для индикатора несохранённого состояния.
- `DescriptionEditor.tsx` отслеживает `draft` и `saved` — отсюда удобно добавить флаг `isDirty` и debounced-вызов `onSave`.
- Предупреждение при закрытии окна потребует Tauri API (`core:event` / `onWindowClose` через `window.onbeforeunload` не работает в Tauri) — нужно будет согласовать добавление capability/permission.

## Рекомендуемое сообщение коммита

```
feat(T-010b): description editor, preview and delete confirmation

- Add CodeMirror markdown editor with editor/preview toggle
- Save description on blur and node switch
- Create description writes empty file before updating roadmap.json
- Delete branch shows confirmation with node/file counts
- Delete description files after successful roadmap.json save
```
