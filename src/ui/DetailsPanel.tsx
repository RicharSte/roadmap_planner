import type { Project } from "../domain/types";
import { statusLabel } from "./status";

export interface DetailsPanelProps {
  project: Project | null;
  selectedId: string | null;
}

/**
 * Панель деталей выбранной ноды.
 *
 * Показывает заголовок, статус, даты создания/изменения и путь к описанию.
 * Если нода не выбрана или в проекте нет нод — соответствующую заглушку.
 */
export function DetailsPanel({ project, selectedId }: DetailsPanelProps) {
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

  return (
    <section className="details-panel">
      <h2 className="details-title">{node.title}</h2>
      <div className="details-status" data-testid="details-status">
        <span className="status-dot" data-status={node.status} aria-hidden="true" />
        <span>{statusLabel(node.status)}</span>
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
