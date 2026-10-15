import { useEffect, useRef, useState } from "react";
import { deleteNode as computeDeleteNode } from "../domain/tree";
import type { NodeStatus, Project } from "../domain/types";
import { DescriptionEditor } from "./DescriptionEditor";
import { STATUS_ORDER, STATUS_LABELS } from "./status";

export interface DetailsPanelProps {
  project: Project | null;
  selectedId: string | null;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetStatus: (id: string, status: NodeStatus) => Promise<void>;
  onCreateDescription: (id: string) => Promise<void>;
  onLoadDescription: (
    path: string,
  ) => Promise<import("../storage/projectStorage").ReadDescriptionResult>;
  onSaveDescription: (path: string, content: string) => Promise<boolean>;
  onDescriptionDirtyChange?: (dirty: boolean) => void;
  hasSaveError?: boolean;
}

/**
 * Панель деталей выбранной ноды.
 *
 * Показывает заголовок (с возможностью переименования), статус, даты создания/изменения,
 * редактор описания (или кнопку создания) и кнопку удаления с подтверждением.
 * Если нода не выбрана или в проекте нет нод — заглушку.
 */
export function DetailsPanel({
  project,
  selectedId,
  onRename,
  onDelete,
  onSetStatus,
  onCreateDescription,
  onLoadDescription,
  onSaveDescription,
  onDescriptionDirtyChange,
  hasSaveError = false,
}: DetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current !== null) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (project === null) {
    return (
      <section className="details-panel">
        <p className="details-empty">Выберите ноду</p>
      </section>
    );
  }

  if (Object.keys(project.nodes).length === 0) {
    return (
      <section className="details-panel">
        <p className="details-empty">В проекте нет нод</p>
      </section>
    );
  }

  if (selectedId === null) {
    return (
      <section className="details-panel">
        <p className="details-empty">Выберите ноду</p>
      </section>
    );
  }

  const node = project.nodes[selectedId];
  if (node === undefined) {
    return (
      <section className="details-panel">
        <p className="details-empty">Выберите ноду</p>
      </section>
    );
  }

  const startEditing = (): void => {
    setEditTitle(node.title);
    setIsEditing(true);
  };

  const cancelEditing = (): void => {
    setIsEditing(false);
    setEditTitle("");
  };

  const commitEditing = async (): Promise<void> => {
    const trimmed = editTitle.trim();
    if (trimmed.length > 0 && trimmed !== node.title) {
      await onRename(node.id, trimmed);
    }
    setIsEditing(false);
    setEditTitle("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitEditing();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  };

  const handleStatusChange = async (event: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    await onSetStatus(node.id, event.target.value as NodeStatus);
  };

  const startDelete = (): void => {
    setConfirmingId(node.id);
  };

  const cancelDelete = (): void => {
    setConfirmingId(null);
  };

  const confirmDelete = async (): Promise<void> => {
    setConfirmingId(null);
    await onDelete(node.id);
  };

  const deletionInfo = computeDeleteNode(project, node.id);
  const deletedCount = deletionInfo.deletedIds.length;
  const childCount = deletionInfo.deletedIds.filter((id) => id !== node.id).length;
  const descriptionCount = deletionInfo.deletedIds.filter(
    (id) => project.nodes[id]?.descriptionPath !== null,
  ).length;

  return (
    <section className="details-panel">
      <div className="details-header">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="details-title-input"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            onBlur={() => void commitEditing()}
            onKeyDown={handleKeyDown}
            data-testid="details-rename-input"
          />
        ) : (
          <h2 className="details-title">{node.title}</h2>
        )}
        <div className="details-actions">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => void startEditing()}
            data-testid="details-rename-button"
          >
            Переименовать
          </button>
          <button
            type="button"
            className="toolbar-button details-delete"
            onClick={() => void startDelete()}
            data-testid="details-delete-button"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="details-status" data-testid="details-status">
        <span className="status-dot" data-status={node.status} aria-hidden="true" />
        <select
          className="details-status-select"
          value={node.status}
          onChange={(event) => void handleStatusChange(event)}
          data-testid="details-status-select"
        >
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="details-dates">
        <p>Создано: {new Date(node.createdAt).toLocaleString()}</p>
        <p>Изменено: {new Date(node.updatedAt).toLocaleString()}</p>
      </div>

      {confirmingId === node.id && (
        <div className="delete-confirmation" role="alert" data-testid="delete-confirmation">
          <p>
            Удалить «{node.title}»? Будет удалено нод: {deletedCount} (из них дочерних: {childCount}
            ), файлов описаний: {descriptionCount}.
          </p>
          <div className="delete-confirmation-actions">
            <button
              type="button"
              className="toolbar-button details-delete"
              onClick={() => void confirmDelete()}
              data-testid="delete-confirm-button"
            >
              Удалить
            </button>
            <button
              type="button"
              className="toolbar-button"
              onClick={cancelDelete}
              data-testid="delete-cancel-button"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="details-description">
        {node.descriptionPath === null ? (
          <button
            type="button"
            className="toolbar-button"
            onClick={() => void onCreateDescription(node.id)}
            data-testid="create-description-button"
          >
            Создать описание
          </button>
        ) : (
          <DescriptionEditor
            key={node.id}
            path={node.descriptionPath}
            onLoad={onLoadDescription}
            onSave={onSaveDescription}
            onDirtyChange={onDescriptionDirtyChange}
            hasSaveError={hasSaveError}
          />
        )}
      </div>
    </section>
  );
}
