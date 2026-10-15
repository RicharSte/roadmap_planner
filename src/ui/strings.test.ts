import { describe, expect, it } from "vitest";
import type { StorageErrorCode } from "../storage/projectStorage";
import { getStorageErrorMessage, STORAGE_ERROR_MESSAGES } from "./strings";

/**
 * Полный список кодов `StorageErrorCode`. Дублируется локально,
 * чтобы тест зафиксировал соответствие ключей таблице сообщений.
 * Если в `projectStorage.ts` появится новый код — `it` ниже сломается
 * и заставит добавить запись в `STORAGE_ERROR_MESSAGES`.
 */
const ALL_CODES: StorageErrorCode[] = [
  "INVALID_PATH",
  "PATH_OUTSIDE_PROJECT",
  "NOT_A_DIRECTORY",
  "EMPTY_FOLDER",
  "NO_ROADMAP_FILE",
  "IO_ERROR",
  "FILE_TOO_LARGE",
  "NOT_UTF8",
  "NO_PENDING_PROJECT",
  "PENDING_NOT_PROJECT",
  "PENDING_NOT_EMPTY",
  "FOLDER_NOT_EMPTY",
  "NO_PROJECT_OPEN",
  "INVALID_JSON",
  "INVALID_PROJECT",
  "READ_ONLY",
];

describe("getStorageErrorMessage", () => {
  it.each(ALL_CODES)("возвращает непустую русскую строку для кода %s", (code) => {
    const message = getStorageErrorMessage(code);

    expect(message).toBeTruthy();
    // Таблица не должна подменять текст машинным кодом (защита от регрессии к английскому).
    expect(message).not.toBe(code);
    // Кириллица обязательна — простая защита от случайной замены текста на латиницу.
    expect(/[А-Яа-яЁё]/.test(message)).toBe(true);
  });

  it("сообщает размер лимита для FILE_TOO_LARGE", () => {
    expect(getStorageErrorMessage("FILE_TOO_LARGE")).toContain("10 МБ");
  });

  it("покрывает все коды StorageErrorCode в таблице STORAGE_ERROR_MESSAGES", () => {
    // Защита от рассинхронизации: ключи таблицы совпадают с типом StorageErrorCode.
    const tableKeys = Object.keys(STORAGE_ERROR_MESSAGES).sort();
    const expectedKeys = [...ALL_CODES].sort();
    expect(tableKeys).toEqual(expectedKeys);
  });
});
