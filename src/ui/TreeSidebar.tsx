import { useEffect, useRef, useState } from "react";
import { findCurrentLocation, getChildren } from "../domain/tree";
import type { Project } from "../domain/types";
import { STATUS_ORDER, statusLabel } from "./status";

export interface TreeSidebarProps {
  project: Project;
  selectedId: string | null;
  collapsed: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onCreateNode: (parentId: string | null, title: string) => Promise<void>;
  onMoveNode: (id: string, newParentId: string | null, index?: number) => Promise<void>;
}

interface TreeRowProps {
  project: Project;
  id: string;
  parentId: string | null;
  index: number;
  depth: number;
  selectedId: string | null;
  collapsed: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onMoveNode: (id: string, newParentId: string | null, index?: number) => Promise<void>;
}

/** Источник текущего перетаскивания. Хранится вне React, чтобы быть доступным в dragOver. */
let dragSourceId: string | null = null;

/** Проверяет, является ли `candidate` потомком `ancestorId` (включая косвенных). */
function isDescendant(project: Project, ancestorId: string, candidateId: string): boolean {
  function visit(currentId: string): boolean {
    for (const childId of getChildren(project, currentId)) {
      if (childId === candidateId || visit(childId)) {
        return true;
      }
    }
    return false;
  }
  return visit(ancestorId);
}

function TreeRow({
  project,
  id,
  parentId,
  index,
  depth,
  selectedId,
  collapsed,
  onSelect,
  onToggle,
  onMoveNode,
}: TreeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [dropZone, setDropZone] = useState<"before" | "after" | "child" | null>(null);
  const dropZoneRef = useRef<"before" | "after" | "child" | null>(null);

  const node = project.nodes[id];
  if (node === undefined) {
    return null;
  }

  const children = getChildren(project, id);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(id);
  const isSelected = selectedId === id;

  const setDropZoneImmediate = (zone: "before" | "after" | "child" | null): void => {
    setDropZone(zone);
    dropZoneRef.current = zone;
  };

  const clearDrop = (): void => {
    setDropZoneImmediate(null);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    dragSourceId = id;
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const sourceId = dragSourceId;
    if (sourceId === null || sourceId === id || isDescendant(project, sourceId, id)) {
      event.dataTransfer.dropEffect = "none";
      clearDrop();
      return;
    }

    event.dataTransfer.dropEffect = "move";

    const row = rowRef.current;
    if (row === null) {
      return;
    }
    const rect = row.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;

    if (ratio < 1 / 3) {
      setDropZoneImmediate("before");
    } else if (ratio > 2 / 3) {
      setDropZoneImmediate("after");
    } else {
      setDropZoneImmediate("child");
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    const row = rowRef.current;
    if (row !== null && row.contains(event.relatedTarget as Node)) {
      return;
    }
    clearDrop();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const sourceId = dragSourceId;
    const zone = dropZoneRef.current;
    clearDrop();
    dragSourceId = null;

    if (sourceId === null || sourceId === id || isDescendant(project, sourceId, id)) {
      return;
    }
    if (zone === null) {
      return;
    }

    if (zone === "child") {
      void onMoveNode(sourceId, id);
      return;
    }

    const sourceLoc = findCurrentLocation(project, sourceId);
    let insertIndex: number;
    if (zone === "before") {
      insertIndex = index - (sourceLoc.parentId === parentId && sourceLoc.index < index ? 1 : 0);
    } else {
      insertIndex =
        index + 1 - (sourceLoc.parentId === parentId && sourceLoc.index <= index ? 1 : 0);
    }
    void onMoveNode(sourceId, parentId, insertIndex);
  };

  const handleDragEnd = (): void => {
    dragSourceId = null;
    clearDrop();
  };

  const dropClasses = ["tree-row"];
  if (isSelected) dropClasses.push("selected");
  if (dropZone === "child") dropClasses.push("drop-child");

  return (
    <div className="tree-row-wrapper" style={{ paddingLeft: `${depth * 16}px` }}>
      {dropZone === "before" && <div className="drop-line drop-line-before" aria-hidden="true" />}
      <div
        ref={rowRef}
        className={dropClasses.join(" ")}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        data-testid={`tree-row-${id}`}
      >
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
          data-testid={`tree-row-button-${id}`}
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
      {dropZone === "after" && <div className="drop-line drop-line-after" aria-hidden="true" />}
      {hasChildren && !isCollapsed && (
        <div className="tree-children" data-testid={`tree-children-${id}`}>
          {children.map((childId, childIndex) => (
            <TreeRow
              key={childId}
              project={project}
              id={childId}
              parentId={id}
              index={childIndex}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              onSelect={onSelect}
              onToggle={onToggle}
              onMoveNode={onMoveNode}
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
 * Рендерит корни и рекурсивно их детей, показывает статус, легенду,
 * позволяет выбирать/сворачивать ветки, создавать ноды и переносить их drag&drop.
 */
export function TreeSidebar({
  project,
  selectedId,
  collapsed,
  onSelect,
  onToggle,
  onCreateNode,
  onMoveNode,
}: TreeSidebarProps) {
  const [creating, setCreating] = useState<"root" | "child" | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating !== null && inputRef.current !== null) {
      inputRef.current.focus();
    }
  }, [creating]);

  const submit = async (): Promise<void> => {
    const title = draft.trim();
    if (title.length === 0) {
      setCreating(null);
      setDraft("");
      return;
    }
    const parentId = creating === "child" ? selectedId : null;
    if (creating === "child" && parentId === null) {
      setCreating(null);
      setDraft("");
      return;
    }
    await onCreateNode(parentId, title);
    setCreating(null);
    setDraft("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setCreating(null);
      setDraft("");
    }
  };

  const startCreating = (kind: "root" | "child") => (): void => {
    setCreating(kind);
    setDraft("");
  };

  return (
    <aside className="tree-sidebar">
      <div className="tree-toolbar">
        {creating === null ? (
          <>
            <button
              type="button"
              className="toolbar-button"
              onClick={startCreating("root")}
              data-testid="create-root-button"
            >
              + Корень
            </button>
            <button
              type="button"
              className="toolbar-button"
              disabled={selectedId === null}
              onClick={startCreating("child")}
              data-testid="create-child-button"
            >
              + Дочерняя
            </button>
          </>
        ) : (
          <input
            ref={inputRef}
            type="text"
            className="tree-create-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void submit()}
            placeholder={creating === "root" ? "Новая корневая нода" : "Новая дочерняя нода"}
            data-testid="tree-create-input"
          />
        )}
      </div>
      <div className="tree-list" data-testid="tree-list">
        {project.rootIds.map((rootId, rootIndex) => (
          <TreeRow
            key={rootId}
            project={project}
            id={rootId}
            parentId={null}
            index={rootIndex}
            depth={0}
            selectedId={selectedId}
            collapsed={collapsed}
            onSelect={onSelect}
            onToggle={onToggle}
            onMoveNode={onMoveNode}
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
