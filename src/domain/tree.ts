import { createNodeId } from "./ids";
import type { NodeStatus, ParentIndex, Project, RoadmapNode } from "./types";
import { DomainError } from "./types";

const STATUSES: NodeStatus[] = ["unstarted", "in progress", "paused", "done"];

/** Возвращает текущую метку времени в формате ISO 8601, если now не передан. */
function nowOrDefault(now?: string): string {
  return now ?? new Date().toISOString();
}

/** Проверяет, что строка — один из допустимых статусов. */
function isNodeStatus(value: string): value is NodeStatus {
  return (STATUSES as readonly string[]).includes(value);
}

/**
 * Возвращает пустой проект v1.
 * Используется при создании нового проекта в пустой папке.
 */
export function createEmptyProject(): Project {
  return { version: 1, rootIds: [], nodes: {} };
}

/**
 * Нормализует заголовок: заменяет переносы строк на пробелы, обрезает крайние пробелы.
 * Не схлопывает несколько пробелов подряд — это оставлено на усмотрение UI.
 */
function normalizeTitle(title: string): string {
  return title.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\r/g, " ").trim();
}

/**
 * Вставляет элемент в массив по индексу.
 * Если индекс не указан — вставляет в конец.
 * Бросает `DomainError` с кодом `INVALID_INDEX`, если индекс выходит за границы.
 */
function insertAt<T>(arr: T[], item: T, index?: number): void {
  if (index === undefined) {
    arr.push(item);
    return;
  }
  if (!Number.isInteger(index) || index < 0 || index > arr.length) {
    throw new DomainError("INVALID_INDEX", `Индекс ${index} вне диапазона [0, ${arr.length}]`);
  }
  arr.splice(index, 0, item);
}

/** Находит текущее расположение узла: родителя (null для корня) и индекс среди братьев. */
function findCurrentLocation(
  project: Project,
  id: string,
): { parentId: string | null; index: number } {
  const rootIndex = project.rootIds.indexOf(id);
  if (rootIndex !== -1) {
    return { parentId: null, index: rootIndex };
  }
  for (const [parentId, parent] of Object.entries(project.nodes)) {
    const index = parent.childrenIds.indexOf(id);
    if (index !== -1) {
      return { parentId, index };
    }
  }
  return { parentId: null, index: -1 };
}

/** Собирает всех потомков узла (не включая сам узел). */
function collectDescendants(project: Project, id: string): Set<string> {
  const descendants = new Set<string>();
  function visit(currentId: string): void {
    const node = project.nodes[currentId];
    if (!node) return;
    for (const childId of node.childrenIds) {
      descendants.add(childId);
      visit(childId);
    }
  }
  visit(id);
  return descendants;
}

/**
 * Строит индекс родителей по проекту.
 * Для каждого узла возвращает массив id его родителей.
 * Узлы без родителей (корни) получают пустой массив.
 */
export function buildParentIndex(project: Project): ParentIndex {
  const index = new Map<string, string[]>();
  for (const id of Object.keys(project.nodes)) {
    index.set(id, []);
  }
  for (const [parentId, node] of Object.entries(project.nodes)) {
    for (const childId of node.childrenIds) {
      const parents = index.get(childId) ?? [];
      parents.push(parentId);
      index.set(childId, parents);
    }
  }
  return index;
}

/**
 * Возвращает родителей узла по готовому индексу.
 * Индекс должен быть построен через `buildParentIndex`;
 * кэширование индекса — ответственность вызывающего кода (например, `useMemo`).
 */
export function getParents(index: ParentIndex, id: string): string[] {
  return index.get(id) ?? [];
}

/** Возвращает детей узла. Для несуществующего узла — пустой массив. */
export function getChildren(project: Project, id: string): string[] {
  return project.nodes[id]?.childrenIds ?? [];
}

/**
 * Создаёт новый узел и вставляет его в корень или к указанному родителю.
 *
 * @param project — текущий проект.
 * @param title — заголовок узла; нормализуется и валидируется.
 * @param parentId — id родителя или `null` для корня.
 * @param index — позиция вставки; если не указана — в конец.
 * @param now — метка времени; если не указана — текущее время.
 * @returns новый проект с добавленным узлом.
 * @throws DomainError с кодами `EMPTY_TITLE`, `TITLE_TOO_LONG`, `PARENT_NOT_FOUND`, `INVALID_INDEX`.
 */
export function createNode(
  project: Project,
  title: string,
  parentId: string | null = null,
  index?: number,
  now?: string,
): Project {
  const normalized = normalizeTitle(title);
  if (normalized.length === 0) {
    throw new DomainError("EMPTY_TITLE", "Заголовок не может быть пустым");
  }
  if (normalized.length > 120) {
    throw new DomainError("TITLE_TOO_LONG", "Заголовок не может быть длиннее 120 символов");
  }

  const id = createNodeId(project.nodes);
  const node: RoadmapNode = {
    id,
    title: normalized,
    childrenIds: [],
    status: "unstarted",
    descriptionPath: null,
    createdAt: nowOrDefault(now),
    updatedAt: nowOrDefault(now),
  };
  const nodes = { ...project.nodes, [id]: node };

  if (parentId === null) {
    const rootIds = [...project.rootIds];
    insertAt(rootIds, id, index);
    return { ...project, rootIds, nodes };
  }

  const parent = project.nodes[parentId];
  if (!parent) {
    throw new DomainError("PARENT_NOT_FOUND", `Родитель не найден: ${parentId}`);
  }
  const updatedParent: RoadmapNode = { ...parent, childrenIds: [...parent.childrenIds] };
  insertAt(updatedParent.childrenIds, id, index);
  return { ...project, nodes: { ...nodes, [parentId]: updatedParent } };
}

/**
 * Переименовывает узел.
 *
 * @throws DomainError с кодами `NODE_NOT_FOUND`, `EMPTY_TITLE`, `TITLE_TOO_LONG`.
 */
export function renameNode(project: Project, id: string, title: string, now?: string): Project {
  const node = project.nodes[id];
  if (!node) {
    throw new DomainError("NODE_NOT_FOUND", `Узел не найден: ${id}`);
  }
  const normalized = normalizeTitle(title);
  if (normalized.length === 0) {
    throw new DomainError("EMPTY_TITLE", "Заголовок не может быть пустым");
  }
  if (normalized.length > 120) {
    throw new DomainError("TITLE_TOO_LONG", "Заголовок не может быть длиннее 120 символов");
  }
  const updated: RoadmapNode = { ...node, title: normalized, updatedAt: nowOrDefault(now) };
  return { ...project, nodes: { ...project.nodes, [id]: updated } };
}

/**
 * Удаляет узел вместе с поддеревом.
 *
 * @returns объект с новым проектом и списком id удалённых узлов
 * (нужен storage для очистки `descriptions/`).
 * @throws DomainError с кодом `NODE_NOT_FOUND`, если узел не существует.
 */
export function deleteNode(
  project: Project,
  id: string,
): { project: Project; deletedIds: string[] } {
  const node = project.nodes[id];
  if (!node) {
    throw new DomainError("NODE_NOT_FOUND", `Узел не найден: ${id}`);
  }

  const deletedIds: string[] = [];
  function collect(currentId: string): void {
    deletedIds.push(currentId);
    const current = project.nodes[currentId];
    if (!current) return;
    for (const childId of current.childrenIds) {
      collect(childId);
    }
  }
  collect(id);

  let rootIds = [...project.rootIds];
  let nodes = { ...project.nodes };

  const location = findCurrentLocation(project, id);
  if (location.parentId === null) {
    rootIds = rootIds.filter((rootId) => rootId !== id);
  } else {
    const parent = nodes[location.parentId];
    const updatedParent: RoadmapNode = {
      ...parent,
      childrenIds: parent.childrenIds.filter((childId) => childId !== id),
    };
    nodes = { ...nodes, [location.parentId]: updatedParent };
  }

  for (const deletedId of deletedIds) {
    delete nodes[deletedId];
  }

  return { project: { ...project, rootIds, nodes }, deletedIds };
}

/**
 * Перемещает узел к другому родителю или в корень.
 * Если `newParentId` совпадает с текущим родителем, узел переставляется внутри родителя.
 *
 * @param newParentId — id нового родителя или `null` для корня.
 * @param index — позиция вставки; если не указана — в конец.
 * @throws DomainError с кодами `NODE_NOT_FOUND`, `PARENT_NOT_FOUND`, `CYCLE`, `INVALID_INDEX`.
 */
export function moveNode(
  project: Project,
  id: string,
  newParentId: string | null,
  index?: number,
): Project {
  const node = project.nodes[id];
  if (!node) {
    throw new DomainError("NODE_NOT_FOUND", `Узел не найден: ${id}`);
  }

  if (newParentId !== null && !project.nodes[newParentId]) {
    throw new DomainError("PARENT_NOT_FOUND", `Родитель не найден: ${newParentId}`);
  }

  if (newParentId !== null) {
    if (newParentId === id) {
      throw new DomainError("CYCLE", "Нельзя переместить узел в самого себя");
    }
    const descendants = collectDescendants(project, id);
    if (descendants.has(newParentId)) {
      throw new DomainError("CYCLE", "Нельзя переместить узел в своего потомка");
    }
  }

  const oldLocation = findCurrentLocation(project, id);
  let rootIds = [...project.rootIds];
  let nodes = { ...project.nodes };

  // Удаляем узел из старого места.
  if (oldLocation.parentId === null) {
    rootIds = rootIds.filter((rootId) => rootId !== id);
  } else {
    const oldParent = nodes[oldLocation.parentId];
    const updatedOldParent: RoadmapNode = {
      ...oldParent,
      childrenIds: oldParent.childrenIds.filter((childId) => childId !== id),
    };
    nodes = { ...nodes, [oldLocation.parentId]: updatedOldParent };
  }

  // Вставляем узел в новое место.
  // Удаление перед вставкой корректно обрабатывает и перемещение внутри одного родителя.
  if (newParentId === null) {
    insertAt(rootIds, id, index);
  } else {
    const newParent = nodes[newParentId];
    const updatedNewParent: RoadmapNode = { ...newParent, childrenIds: [...newParent.childrenIds] };
    insertAt(updatedNewParent.childrenIds, id, index);
    nodes = { ...nodes, [newParentId]: updatedNewParent };
  }

  return { ...project, rootIds, nodes };
}

/**
 * Меняет статус узла.
 *
 * @throws DomainError с кодами `NODE_NOT_FOUND`, `INVALID_STATUS`.
 */
export function setStatus(project: Project, id: string, status: string, now?: string): Project {
  const node = project.nodes[id];
  if (!node) {
    throw new DomainError("NODE_NOT_FOUND", `Узел не найден: ${id}`);
  }
  if (!isNodeStatus(status)) {
    throw new DomainError("INVALID_STATUS", `Недопустимый статус: ${status}`);
  }
  const updated: RoadmapNode = { ...node, status, updatedAt: nowOrDefault(now) };
  return { ...project, nodes: { ...project.nodes, [id]: updated } };
}

/**
 * Устанавливает путь к файлу описания узла.
 * Повторная установка того же пути — безопасна.
 * Изменение уже установленного пути запрещено (описание создаётся один раз).
 *
 * @throws DomainError с кодами `NODE_NOT_FOUND`, `DESCRIPTION_PATH_SET`.
 */
export function setDescriptionPath(
  project: Project,
  id: string,
  path: string,
  now?: string,
): Project {
  const node = project.nodes[id];
  if (!node) {
    throw new DomainError("NODE_NOT_FOUND", `Узел не найден: ${id}`);
  }
  if (node.descriptionPath !== null && node.descriptionPath !== path) {
    throw new DomainError(
      "DESCRIPTION_PATH_SET",
      `У узла уже есть описание по пути ${node.descriptionPath}; нельзя сменить на ${path}`,
    );
  }
  const updated: RoadmapNode = { ...node, descriptionPath: path, updatedAt: nowOrDefault(now) };
  return { ...project, nodes: { ...project.nodes, [id]: updated } };
}
