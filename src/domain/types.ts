/**
 * Доменные типы проекта дорожной карты.
 * Чистые структуры данных: нет побочных эффектов и нет зависимостей от Tauri.
 */

/** Допустимые статусы узла. */
export type NodeStatus = "unstarted" | "in progress" | "paused" | "done";

/** Узел дорожной карты. Ссылки на детей хранятся только в родителе. */
export interface RoadmapNode {
  id: string;
  title: string;
  childrenIds: string[];
  status: NodeStatus;
  descriptionPath: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Корневой объект проекта. */
export interface Project {
  version: number;
  rootIds: string[];
  nodes: Record<string, RoadmapNode>;
}

/**
 * Индекс родителей: id узла → массив id его родителей.
 * В v1 у узла не больше одного родителя, но массив не меняет подписи
 * и оставляет дверь открытой для графа v2.
 */
export type ParentIndex = Map<string, string[]>;

/** Коды ошибок домена. */
export type DomainErrorCode =
  | "NOT_AN_OBJECT"
  | "UNSUPPORTED_VERSION"
  | "MISSING_FIELD"
  | "INVALID_TYPE"
  | "INVALID_VALUE"
  | "NODE_NOT_FOUND"
  | "PARENT_NOT_FOUND"
  | "MULTIPLE_PARENTS"
  | "ORPHAN_NODE"
  | "CYCLE"
  | "DUPLICATE_ID"
  | "INVALID_DESCRIPTION_PATH"
  | "EMPTY_TITLE"
  | "TITLE_TOO_LONG"
  | "INVALID_INDEX"
  | "INVALID_STATUS"
  | "DESCRIPTION_PATH_SET";

/** Ошибка домена с машинным кодом и человекочитаемым сообщением. */
export class DomainError extends Error {
  code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DomainError";
  }
}
