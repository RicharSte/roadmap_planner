import { useCallback, useMemo, useState } from "react";
import {
  buildParentIndex,
  createNode,
  deleteNode,
  moveNode,
  renameNode,
  setDescriptionPath,
  setStatus,
} from "../domain/tree";
import type { NodeStatus, ParentIndex, Project } from "../domain/types";
import { DomainError } from "../domain/types";
import {
  createProject,
  deleteDescriptions,
  openProject,
  readDescription,
  saveProject,
  writeDescription,
} from "../storage/projectStorage";
import type {
  OpenResult,
  ReadDescriptionResult,
  StorageErrorCode,
} from "../storage/projectStorage";

/** Ошибка, которую показывает UI после неудачного открытия или сохранения. */
export interface ProjectError {
  code: StorageErrorCode | "DOMAIN";
  message: string;
  problems?: DomainError[];
}

/** Состояние и действия открытого проекта. */
export interface UseProjectResult {
  project: Project | null;
  selectedId: string | null;
  collapsed: Set<string>;
  error: ProjectError | null;
  saveError: ProjectError | null;
  pendingCreate: boolean;
  parentIndex: ParentIndex;
  open: () => Promise<void>;
  create: () => Promise<void>;
  cancelCreate: () => void;
  select: (id: string) => void;
  toggle: (id: string) => void;
  update: (compute: (project: Project) => Project) => Promise<boolean>;
  createNode: (parentId: string | null, title: string) => Promise<void>;
  renameNode: (id: string, title: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  moveNode: (id: string, newParentId: string | null, index?: number) => Promise<void>;
  setNodeStatus: (id: string, status: NodeStatus) => Promise<void>;
  createDescription: (id: string) => Promise<void>;
  loadDescription: (path: string) => Promise<ReadDescriptionResult>;
  saveDescription: (path: string, content: string) => Promise<boolean>;
}

/**
 * Хук управления открытым проектом.
 *
 * Хранит проект, выбранную ноду, свёрнутые ветки и ошибки открытия/сохранения.
 * Все вызовы к диску идут через `projectStorage`; здесь только UI-состояние.
 */
export function useProject(): UseProjectResult {
  const [project, setProject] = useState<Project | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<ProjectError | null>(null);
  const [saveError, setSaveError] = useState<ProjectError | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);

  /** Индекс родителей строится один раз при смене проекта. */
  const parentIndex = useMemo<ParentIndex>(() => {
    return project === null ? new Map() : buildParentIndex(project);
  }, [project]);

  /**
   * Обновляет состояние по результату открытия/создания.
   * Успех — сбрасывает выбор и свёрнутые узлы, ошибка `EMPTY_FOLDER`
   * показывает диалог создания, остальные ошибки — баннер.
   */
  const applyResult = useCallback((result: OpenResult): void => {
    if (result.kind === "opened") {
      setProject(result.project);
      setSelectedId(null);
      setCollapsed(new Set());
      setError(null);
      setSaveError(null);
      setPendingCreate(false);
      return;
    }

    if (result.kind === "cancelled") {
      setError(null);
      return;
    }

    if (result.code === "EMPTY_FOLDER") {
      setPendingCreate(true);
      return;
    }

    setError({ code: result.code, message: result.message, problems: result.problems });
  }, []);

  /** Показывает диалог выбора папки и открывает проект. */
  const open = useCallback(async (): Promise<void> => {
    setError(null);
    setPendingCreate(false);
    applyResult(await openProject());
  }, [applyResult]);

  /** Создаёт новый проект в пустой папке, выбранной до этого. */
  const create = useCallback(async (): Promise<void> => {
    applyResult(await createProject());
  }, [applyResult]);

  /** Скрывает диалог создания проекта в пустой папке. */
  const cancelCreate = useCallback((): void => {
    setPendingCreate(false);
  }, []);

  /** Выбирает ноду для показа в панели деталей. */
  const select = useCallback((id: string): void => {
    setSelectedId(id);
  }, []);

  /** Сворачивает или разворачивает ветку дерева. */
  const toggle = useCallback((id: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Универсальное обновление проекта.
   *
   * Применяет чистую доменную функцию к текущему проекту, валидирует результат,
   * атомарно сохраняет на диск и только после успеха меняет состояние.
   * Любая ошибка домена или хранилища попадает в `saveError`.
   */
  const update = useCallback(
    async (compute: (project: Project) => Project): Promise<boolean> => {
      if (project === null) {
        return false;
      }

      let next: Project;
      try {
        next = compute(project);
      } catch (error) {
        if (error instanceof DomainError) {
          setSaveError({ code: "DOMAIN", message: error.message });
        } else {
          throw error;
        }
        return false;
      }

      const result = await saveProject(next);
      if (result.kind === "error") {
        setSaveError({
          code: result.code,
          message: result.message,
          problems: result.problems,
        });
        return false;
      }

      const oldIds = project.nodes;
      const newIds = Object.keys(next.nodes).filter((id) => !(id in oldIds));

      let nextSelectedId = selectedId;
      if (newIds.length === 1) {
        nextSelectedId = newIds[0];
      } else if (selectedId !== null && !(selectedId in next.nodes)) {
        nextSelectedId = null;
      }

      setProject(next);
      setSaveError(null);
      setSelectedId(nextSelectedId);
      return true;
    },
    [project, selectedId],
  );

  /** Создаёт узел: в корень, если `parentId === null`, иначе — ребёнком. */
  const createNodeCallback = useCallback(
    async (parentId: string | null, title: string): Promise<void> => {
      await update((p) => createNode(p, title, parentId));
    },
    [update],
  );

  /** Переименовывает узел. */
  const renameNodeCallback = useCallback(
    async (id: string, title: string): Promise<void> => {
      await update((p) => renameNode(p, id, title));
    },
    [update],
  );

  /** Удаляет узел вместе с поддеревом и чистит файлы описаний. */
  const deleteNodeCallback = useCallback(
    async (id: string): Promise<void> => {
      if (project === null) {
        return;
      }

      const deletion = deleteNode(project, id);
      const paths = deletion.deletedIds
        .map((deletedId) => project.nodes[deletedId]?.descriptionPath)
        .filter((path): path is string => path !== null && path !== undefined);

      const saved = await update(() => deletion.project);
      if (!saved) {
        return;
      }

      const result = await deleteDescriptions(paths);
      if (result.kind === "error") {
        setSaveError({
          code: result.code,
          message: result.message,
          problems: result.problems,
        });
      }
    },
    [project, update],
  );

  /** Перемещает узел к другому родителю или переставляет внутри текущего. */
  const moveNodeCallback = useCallback(
    async (id: string, newParentId: string | null, index?: number): Promise<void> => {
      await update((p) => moveNode(p, id, newParentId, index));
    },
    [update],
  );

  /** Меняет статус узла. */
  const setNodeStatusCallback = useCallback(
    async (id: string, status: NodeStatus): Promise<void> => {
      await update((p) => setStatus(p, id, status));
    },
    [update],
  );

  /** Создаёт пустой файл описания и фиксирует путь в roadmap.json. */
  const createDescriptionCallback = useCallback(
    async (id: string): Promise<void> => {
      const path = `descriptions/${id}.md`;
      const result = await writeDescription(path, "");
      if (result.kind === "error") {
        setSaveError({
          code: result.code,
          message: result.message,
          problems: result.problems,
        });
        return;
      }

      await update((p) => setDescriptionPath(p, id, path));
    },
    [update],
  );

  /** Загружает содержимое файла описания. */
  const loadDescriptionCallback = useCallback(
    async (path: string): Promise<ReadDescriptionResult> => {
      return readDescription(path);
    },
    [],
  );

  /** Сохраняет содержимое файла описания. */
  const saveDescriptionCallback = useCallback(
    async (path: string, content: string): Promise<boolean> => {
      const result = await writeDescription(path, content);
      if (result.kind === "error") {
        setSaveError({
          code: result.code,
          message: result.message,
          problems: result.problems,
        });
        return false;
      }

      setSaveError(null);
      return true;
    },
    [],
  );

  return {
    project,
    selectedId,
    collapsed,
    error,
    saveError,
    pendingCreate,
    parentIndex,
    open,
    create,
    cancelCreate,
    select,
    toggle,
    update,
    createNode: createNodeCallback,
    renameNode: renameNodeCallback,
    deleteNode: deleteNodeCallback,
    moveNode: moveNodeCallback,
    setNodeStatus: setNodeStatusCallback,
    createDescription: createDescriptionCallback,
    loadDescription: loadDescriptionCallback,
    saveDescription: saveDescriptionCallback,
  };
}
