import { invoke } from "@tauri-apps/api/core";
import { parseProject, validateProject } from "../domain/validate";
import { DomainError } from "../domain/types";
import type { Project } from "../domain/types";

/** Коды ошибок, которые может вернуть адаптер хранилища. */
export type StorageErrorCode =
  | "INVALID_PATH"
  | "PATH_OUTSIDE_PROJECT"
  | "NOT_A_DIRECTORY"
  | "EMPTY_FOLDER"
  | "NO_ROADMAP_FILE"
  | "IO_ERROR"
  | "FILE_TOO_LARGE"
  | "NOT_UTF8"
  | "NO_PENDING_PROJECT"
  | "PENDING_NOT_PROJECT"
  | "NO_PROJECT_OPEN"
  | "INVALID_JSON"
  | "INVALID_PROJECT"
  | "READ_ONLY";

/** Результат открытия или перезагрузки проекта. */
export type OpenResult =
  | { kind: "opened"; project: Project }
  | { kind: "cancelled" }
  | {
      kind: "error";
      code: StorageErrorCode;
      message: string;
      problems?: DomainError[];
    };

/** Результат сохранения файла проекта. */
export type SaveResult =
  | { kind: "saved" }
  | {
      kind: "error";
      code: StorageErrorCode;
      message: string;
      problems?: DomainError[];
    };

/**
 * Преобразует объект ошибки из Rust в домен ошибку хранилища.
 * Rust возвращает `{ code, message }`, поэтому извлекаем эти поля.
 */
function fromRustError(error: unknown): {
  code: StorageErrorCode;
  message: string;
} {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  ) {
    return { code: error.code as StorageErrorCode, message: error.message };
  }
  return { code: "IO_ERROR", message: String(error) };
}

/**
 * Открывает проект через системный диалог выбора папки.
 *
 * Последовательность:
 * 1. `open_project` в Rust показывает диалог и возвращает `null` (отмена)
 *    или сырой текст `roadmap.json`.
 * 2. Текст парсится как JSON.
 * 3. `parseProject` проверяет схему и структуру.
 * 4. При успехе вызывается `commit_project`, чтобы Rust зафиксировал проект
 *    как открытый.
 *
 * Если `parseProject` находит проблемы, `commit_project` не вызывается,
 * и ранее открытый проект остаётся открытым.
 */
export async function openProject(): Promise<OpenResult> {
  try {
    const raw = await invoke<string | null>("open_project", {});
    if (raw === null) {
      return { kind: "cancelled" };
    }
    return parseAndCommit(raw);
  } catch (error) {
    return { kind: "error", ...fromRustError(error) };
  }
}

/**
 * Перезагружает `roadmap.json` уже открытого проекта с диска.
 *
 * В отличие от `openProject`, никогда не вызывает `commit_project`.
 */
export async function reloadProject(): Promise<OpenResult> {
  try {
    const raw = await invoke<string>("reload_project", {});
    return parseWithoutCommit(raw);
  } catch (error) {
    return { kind: "error", ...fromRustError(error) };
  }
}

/** Парсит JSON и, при успехе, подтверждает открытие проекта в Rust. */
function parseAndCommit(raw: string): Promise<OpenResult> {
  return parseRaw(raw, async (project) => {
    await invoke("commit_project", {});
    return { kind: "opened", project };
  });
}

/** Парсит JSON, не подтверждая открытие проекта. */
function parseWithoutCommit(raw: string): Promise<OpenResult> {
  return parseRaw(raw, async (project) => ({ kind: "opened", project }));
}

/**
 * Парсит сырой текст JSON и вызывает `onValid` только если проект валиден.
 * При ошибках парсинга или валидации возвращает `OpenResult` с ошибкой.
 */
async function parseRaw(
  raw: string,
  onValid: (project: Project) => Promise<OpenResult>,
): Promise<OpenResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      kind: "error",
      code: "INVALID_JSON",
      message: "roadmap.json is not valid JSON",
    };
  }

  const result = parseProject(parsed);
  if (!result.ok) {
    return {
      kind: "error",
      code: "INVALID_PROJECT",
      message: "roadmap.json contains invalid project data",
      problems: result.problems,
    };
  }

  return onValid(result.project);
}

/**
 * Сохраняет проект в `roadmap.json` открытого проекта.
 *
 * Сначала проверяет `validateProject`; если есть проблемы, `invoke`
 * не вызывается и возвращается `INVALID_PROJECT`. При успехе сериализует
 * проект с отступом 2 и завершающим переводом строки, затем атомарно
 * записывает через Rust.
 */
export async function saveProject(project: Project): Promise<SaveResult> {
  const validation = validateProject(project);
  if (!validation.ok) {
    return {
      kind: "error",
      code: "INVALID_PROJECT",
      message: "project data is invalid",
      problems: validation.problems,
    };
  }

  const content = JSON.stringify(project, null, 2) + "\n";

  try {
    await invoke("save_roadmap", { content });
    return { kind: "saved" };
  } catch (error) {
    return { kind: "error", ...fromRustError(error) };
  }
}

/**
 * Записывает содержимое описания в файл `descriptions/<id>.md` открытого проекта.
 *
 * Путь и имя проверяются в Rust; адаптер только передаёт аргументы.
 */
export async function writeDescription(path: string, content: string): Promise<SaveResult> {
  try {
    await invoke("write_description", { path, content });
    return { kind: "saved" };
  } catch (error) {
    return { kind: "error", ...fromRustError(error) };
  }
}
