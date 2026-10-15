import type { StorageErrorCode } from "../storage/projectStorage";

/**
 * Таблица перевода машинных кодов ошибок слоя storage в русские тексты для UI.
 * Используется баннерами `error` / `reloadError` / `saveError` в `App.tsx`,
 * чтобы пользователь видел сообщение на русском вместо сырого `error.message`
 * (тот остаётся английским из Rust `AppError` и из `projectStorage.ts`).
 *
 * Домен (`DOMAIN`) сюда не входит: его сообщения уже на русском и берутся напрямую.
 *
 * Правило расширения: новый `StorageErrorCode` = новая запись здесь,
 * TypeScript требует её на стадии компиляции.
 */
export const STORAGE_ERROR_MESSAGES: Record<StorageErrorCode, string> = {
  INVALID_PATH: "Указан недопустимый путь к файлу.",
  PATH_OUTSIDE_PROJECT: "Путь ведёт за пределы папки проекта — доступ запрещён.",
  NOT_A_DIRECTORY: "Выбранный путь не является папкой.",
  EMPTY_FOLDER: "Папка пуста.",
  NO_ROADMAP_FILE: "В выбранной папке нет файла roadmap.json.",
  IO_ERROR: "Не удалось прочитать или записать файл на диске.",
  FILE_TOO_LARGE: "Файл превышает лимит 10 МБ.",
  NOT_UTF8: "Файл повреждён: в нём недопустимые символы (ожидается текст в UTF-8).",
  NO_PENDING_PROJECT: "Папка для создания проекта не выбрана. Нажмите «Открыть папку…» снова.",
  PENDING_NOT_PROJECT: "Выбранная папка не содержит проект и не пуста.",
  PENDING_NOT_EMPTY: "Выбранная папка уже содержит проект.",
  FOLDER_NOT_EMPTY: "Папка больше не пуста. Выберите другую папку.",
  NO_PROJECT_OPEN: "Проект не открыт.",
  INVALID_JSON: "Файл roadmap.json повреждён: это не корректный JSON.",
  INVALID_PROJECT: "Файл roadmap.json содержит некорректные данные проекта.",
  READ_ONLY: "Файл доступен только для чтения — запись невозможна.",
};

/**
 * Возвращает русский текст ошибки слоя storage по её машинному коду.
 * Не используется для кода `DOMAIN`: такие ошибки уже несут готовый русский
 * текст в `message` и прокидываются как есть.
 */
export function getStorageErrorMessage(code: StorageErrorCode): string {
  return STORAGE_ERROR_MESSAGES[code];
}
