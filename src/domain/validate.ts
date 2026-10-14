import { buildParentIndex } from "./tree";
import type { DomainErrorCode, NodeStatus, Project, RoadmapNode } from "./types";
import { DomainError } from "./types";

const STATUSES: NodeStatus[] = ["unstarted", "in progress", "paused", "done"];

/** Результат парсинга или валидации проекта. */
type ValidationResult = { ok: true; project: Project } | { ok: false; problems: DomainError[] };

/** Проверяет, что значение — обычный объект (не массив, не null). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Проверяет, что строка — один из допустимых статусов. */
function isNodeStatus(value: string): value is NodeStatus {
  return (STATUSES as readonly string[]).includes(value);
}

/**
 * Добавляет проблему в список.
 * Используется как облегчённый синтаксис вместо повторения `new DomainError`.
 */
function addProblem(problems: DomainError[], code: DomainErrorCode, message: string): void {
  problems.push(new DomainError(code, message));
}

/**
 * Разбирает массив строк из сырого JSON.
 * При ошибках добавляет проблемы и возвращает пустой массив.
 */
function parseStringArray(raw: unknown, context: string, problems: DomainError[]): string[] {
  if (!Array.isArray(raw)) {
    addProblem(problems, "INVALID_TYPE", `${context} должен быть массивом`);
    return [];
  }
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      addProblem(problems, "INVALID_TYPE", `${context} должен содержать только строки`);
      return [];
    }
    result.push(item);
  }
  return result;
}

/**
 * Разбирает один узел из сырого JSON.
 * Возвращает `null`, если узел не удалось разобрать; проблемы добавляются в список.
 */
function parseNode(key: string, raw: unknown, problems: DomainError[]): RoadmapNode | null {
  if (!isPlainObject(raw)) {
    addProblem(problems, "INVALID_TYPE", `Узел ${key} должен быть объектом`);
    return null;
  }

  const initialCount = problems.length;
  const required: (keyof RoadmapNode)[] = [
    "id",
    "title",
    "childrenIds",
    "status",
    "descriptionPath",
    "createdAt",
    "updatedAt",
  ];
  for (const field of required) {
    if (!(field in raw)) {
      addProblem(problems, "MISSING_FIELD", `В узле ${key} отсутствует поле ${field}`);
    }
  }

  const id = raw.id;
  if (typeof id !== "string") {
    addProblem(problems, "INVALID_TYPE", `Поле id в узле ${key} должно быть строкой`);
    return null;
  }
  if (id !== key) {
    addProblem(problems, "INVALID_VALUE", `Ключ узла ${key} не совпадает с id ${id}`);
  }

  const title = raw.title;
  if (typeof title !== "string") {
    addProblem(problems, "INVALID_TYPE", `Поле title в узле ${id} должно быть строкой`);
  }

  const childrenIds = parseStringArray(raw.childrenIds, `childrenIds в узле ${id}`, problems);

  const status = raw.status;
  if (typeof status !== "string" || !isNodeStatus(status)) {
    addProblem(problems, "INVALID_VALUE", `Поле status в узле ${id} имеет недопустимое значение`);
  }

  const descriptionPath = raw.descriptionPath;
  if (descriptionPath !== null && typeof descriptionPath !== "string") {
    addProblem(
      problems,
      "INVALID_TYPE",
      `Поле descriptionPath в узле ${id} должно быть строкой или null`,
    );
  }

  const createdAt = raw.createdAt;
  if (typeof createdAt !== "string") {
    addProblem(problems, "INVALID_TYPE", `Поле createdAt в узле ${id} должно быть строкой`);
  }

  const updatedAt = raw.updatedAt;
  if (typeof updatedAt !== "string") {
    addProblem(problems, "INVALID_TYPE", `Поле updatedAt в узле ${id} должно быть строкой`);
  }

  if (problems.length > initialCount) {
    return null;
  }

  return {
    id,
    title: title as string,
    childrenIds,
    status: status as NodeStatus,
    descriptionPath: descriptionPath as string | null,
    createdAt: createdAt as string,
    updatedAt: updatedAt as string,
  };
}

/**
 * Парсит сырой JSON в доменный проект.
 * Не бросает исключений: все ошибки возвращаются в виде списка проблем.
 * Лишние поля отбрасываются.
 *
 * @param raw — результат JSON.parse или любое другое значение.
 * @returns либо успешный проект, либо список проблем с кодами.
 */
export function parseProject(raw: unknown): ValidationResult {
  const problems: DomainError[] = [];

  if (!isPlainObject(raw)) {
    addProblem(problems, "NOT_AN_OBJECT", "Входные данные должны быть объектом");
    return { ok: false, problems };
  }

  if (raw.version !== 1) {
    addProblem(problems, "UNSUPPORTED_VERSION", `Ожидалась версия 1, получена ${raw.version}`);
  }

  const rootIds = parseStringArray(raw.rootIds, "rootIds", problems);

  if (!isPlainObject(raw.nodes)) {
    addProblem(problems, "MISSING_FIELD", "Отсутствует или неверно поле nodes");
    return { ok: false, problems };
  }

  const nodes: Record<string, RoadmapNode> = {};
  for (const [key, value] of Object.entries(raw.nodes)) {
    const node = parseNode(key, value, problems);
    if (node) {
      nodes[key] = node;
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return { ok: true, project: { version: 1, rootIds, nodes } };
}

/**
 * Проверяет структурную целостность уже типизированного проекта.
 * Используется после parseProject или при загрузке из доверенного источника.
 *
 * Проверяет:
 * - все id в rootIds/childrenIds существуют;
 * - у каждого узла не больше одного родителя (v1);
 * - каждый узел либо корень, либо имеет родителя;
 * - нет циклов;
 * - нет дубликатов в rootIds/childrenIds;
 * - путь descriptionPath либо null, либо равен descriptions/<id>.md.
 *
 * @returns либо тот же проект, либо список проблем.
 */
export function validateProject(project: Project): ValidationResult {
  const problems: DomainError[] = [];
  const parentIndex = buildParentIndex(project);

  const seenRoots = new Set<string>();
  for (const id of project.rootIds) {
    if (seenRoots.has(id)) {
      addProblem(problems, "DUPLICATE_ID", `Дублирующийся id в rootIds: ${id}`);
    }
    seenRoots.add(id);
    if (!project.nodes[id]) {
      addProblem(problems, "NODE_NOT_FOUND", `Корневой id не найден: ${id}`);
    }
  }

  for (const [id, node] of Object.entries(project.nodes)) {
    if (node.id !== id) {
      addProblem(problems, "INVALID_VALUE", `Ключ ${id} не совпадает с node.id ${node.id}`);
    }

    const parents = parentIndex.get(id) ?? [];
    if (parents.length > 1) {
      addProblem(
        problems,
        "MULTIPLE_PARENTS",
        `Узел ${id} имеет несколько родителей: ${parents.join(", ")}`,
      );
    }
    if (!project.rootIds.includes(id) && parents.length === 0) {
      addProblem(problems, "ORPHAN_NODE", `Узел ${id} не является корнем и не имеет родителя`);
    }

    const seenChildren = new Set<string>();
    for (const childId of node.childrenIds) {
      if (seenChildren.has(childId)) {
        addProblem(problems, "DUPLICATE_ID", `Дублирующийся child id ${childId} в узле ${id}`);
      }
      seenChildren.add(childId);
      if (!project.nodes[childId]) {
        addProblem(problems, "NODE_NOT_FOUND", `Ребёнок ${childId} узла ${id} не найден`);
      }
    }

    if (node.descriptionPath !== null && node.descriptionPath !== `descriptions/${id}.md`) {
      addProblem(
        problems,
        "INVALID_DESCRIPTION_PATH",
        `Узел ${id} имеет недопустимый descriptionPath: ${node.descriptionPath}`,
      );
    }
  }

  // Обход в глубину от корней для поиска циклов.
  const visiting = new Set<string>();
  const visited = new Set<string>();
  let cycleReported = false;

  function visit(id: string, stack: string[]): void {
    if (visiting.has(id)) {
      if (!cycleReported) {
        const start = stack.indexOf(id);
        const cycle = stack.slice(start).concat(id);
        addProblem(problems, "CYCLE", `Обнаружен цикл: ${cycle.join(" -> ")}`);
        cycleReported = true;
      }
      return;
    }
    if (visited.has(id)) return;

    visiting.add(id);
    stack.push(id);
    const node = project.nodes[id];
    if (node) {
      for (const childId of node.childrenIds) {
        visit(childId, stack);
      }
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of project.rootIds) {
    visit(id, []);
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }
  return { ok: true, project };
}
