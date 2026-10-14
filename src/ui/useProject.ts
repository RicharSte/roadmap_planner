import { useCallback, useMemo, useState } from "react";
import { buildParentIndex } from "../domain/tree";
import type { ParentIndex, Project } from "../domain/types";
import type { DomainError } from "../domain/types";
import { createProject, openProject } from "../storage/projectStorage";
import type { OpenResult, StorageErrorCode } from "../storage/projectStorage";

/** Ошибка, которую показывает UI после неудачного открытия. */
export interface ProjectError {
  code: StorageErrorCode;
  message: string;
  problems?: DomainError[];
}

/** Состояние и действия открытого проекта. */
export interface UseProjectResult {
  project: Project | null;
  selectedId: string | null;
  collapsed: Set<string>;
  error: ProjectError | null;
  pendingCreate: boolean;
  parentIndex: ParentIndex;
  open: () => Promise<void>;
  create: () => Promise<void>;
  cancelCreate: () => void;
  select: (id: string) => void;
  toggle: (id: string) => void;
}

/**
 * Хук управления открытым проектом.
 *
 * Хранит проект, выбранную ноду, свёрнутые ветки и ошибки открытия.
 * Все вызовы к диску идут через `projectStorage`; здесь только UI-состояние.
 */
export function useProject(): UseProjectResult {
  const [project, setProject] = useState<Project | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<ProjectError | null>(null);
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

  return {
    project,
    selectedId,
    collapsed,
    error,
    pendingCreate,
    parentIndex,
    open,
    create,
    cancelCreate,
    select,
    toggle,
  };
}
