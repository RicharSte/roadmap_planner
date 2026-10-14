import { useEffect, useRef, useState } from "react";
import type { NodeStatus, Project } from "../domain/types";
import { STATUS_ORDER, STATUS_LABELS } from "./status";

export interface DetailsPanelProps {
  project: Project | null;
  selectedId: string | null;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetStatus: (id: string, status: NodeStatus) => Promise<void>;
}

/**
 * Панель деталей выбранной ноды.
 *
 * Показывает заголовок (с возможностью переименования), статус, даты создания/изменения,
 * путь к описанию и кнопку удаления. Если нода не выбрана или в проекте нет нод — заглушку.
 */
export function DetailsPanel({
  project,
  selectedId,
  onRename,
  onDelete,
  onSetStatus,
}: DetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
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

  const handleDelete = async (): Promise<void> => {
    await onDelete(node.id);
  };

  const handleStatusChange = async (event: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    await onSetStatus(node.id, event.target.value as NodeStatus);
  };

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
            onClick={() => void handleDelete()}
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
      <p className="details-description">
        Описание: {node.descriptionPath === null ? "нет" : node.descriptionPath}
      </p>
    </section>
  );
}
