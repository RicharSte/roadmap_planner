import { getChildren } from "../domain/tree";
import type { Project } from "../domain/types";
import { STATUS_ORDER, statusLabel } from "./status";

export interface TreeSidebarProps {
  project: Project;
  selectedId: string | null;
  collapsed: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

interface TreeRowProps {
  project: Project;
  id: string;
  depth: number;
  selectedId: string | null;
  collapsed: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function TreeRow({ project, id, depth, selectedId, collapsed, onSelect, onToggle }: TreeRowProps) {
  const node = project.nodes[id];
  if (node === undefined) {
    return null;
  }

  const children = getChildren(project, id);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(id);
  const isSelected = selectedId === id;

  return (
    <div className="tree-row-wrapper" style={{ paddingLeft: `${depth * 16}px` }}>
      <div className={`tree-row ${isSelected ? "selected" : ""}`}>
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            aria-label={isCollapsed ? "Развернуть" : "Свернуть"}
            onClick={() => onToggle(id)}
            data-testid={`tree-toggle-${id}`}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
        ) : (
          <span className="tree-toggle-spacer" aria-hidden="true" />
        )}
        <button
          type="button"
          className="tree-node"
          onClick={() => onSelect(id)}
          data-testid={`tree-row-${id}`}
        >
          <span
            className="status-dot"
            data-status={node.status}
            title={statusLabel(node.status)}
            aria-hidden="true"
          />
          <span className="tree-title">{node.title}</span>
        </button>
      </div>
      {hasChildren && !isCollapsed && (
        <div className="tree-children" data-testid={`tree-children-${id}`}>
          {children.map((childId) => (
            <TreeRow
              key={childId}
              project={project}
              id={childId}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Сайдбар с деревом проекта.
 *
 * Рендерит корни и рекурсивно их детей, показывает статус, легенду
 * и позволяет выбирать и сворачивать ветки.
 */
export function TreeSidebar({
  project,
  selectedId,
  collapsed,
  onSelect,
  onToggle,
}: TreeSidebarProps) {
  return (
    <aside className="tree-sidebar">
      <div className="tree-list">
        {project.rootIds.map((id) => (
          <TreeRow
            key={id}
            project={project}
            id={id}
            depth={0}
            selectedId={selectedId}
            collapsed={collapsed}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
      </div>
      <div className="tree-legend">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="legend-item">
            <span className="status-dot" data-status={status} aria-hidden="true" />
            <span className="legend-label">{statusLabel(status)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
