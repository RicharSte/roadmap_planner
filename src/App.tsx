import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { DetailsPanel } from "./ui/DetailsPanel";
import { TreeSidebar } from "./ui/TreeSidebar";
import { useProject } from "./ui/useProject";
import type { DescriptionEditorHandle } from "./ui/DescriptionEditor";
import "./App.css";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_RATIO = 0.6;
const INITIAL_SIDEBAR_WIDTH = 280;

function App() {
  const {
    project,
    selectedId,
    collapsed,
    error,
    reloadError,
    saveError,
    pendingCreate,
    locked,
    open,
    create,
    cancelCreate,
    select,
    toggle,
    createNode,
    renameNode,
    deleteNode,
    moveNode,
    setNodeStatus,
    createDescription,
    loadDescription,
    saveDescription,
    reload,
  } = useProject();
  const [sidebarWidth, setSidebarWidth] = useState(INITIAL_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const hasUnsavedRef = useRef(false);
  const descriptionEditorRef = useRef<DescriptionEditorHandle>(null);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent): void => {
      const maxWidth = window.innerWidth * MAX_SIDEBAR_RATIO;
      const nextWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(event.clientX, maxWidth));
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = (): void => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    hasUnsavedRef.current = descriptionDirty || saveError !== null || locked;
  }, [descriptionDirty, saveError, locked]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    async function setupCloseHandler(): Promise<void> {
      const currentWindow = getCurrentWindow();
      unlisten = await currentWindow.onCloseRequested((event) => {
        if (!hasUnsavedRef.current) {
          return;
        }

        event.preventDefault();

        const confirmed = window.confirm(
          "Есть несохранённые изменения. Закрыть приложение без сохранения?",
        );

        if (confirmed) {
          void currentWindow.destroy();
        }
      });

      if (cancelled && unlisten !== null) {
        unlisten();
      }
    }

    void setupCloseHandler();

    return () => {
      cancelled = true;
      if (unlisten !== null) {
        unlisten();
      }
    };
  }, []);

  const handleReload = async (): Promise<void> => {
    await descriptionEditorRef.current?.flush();
    await reload();
    setReloadToken((prev) => prev + 1);
  };

  return (
    <div className="app">
      <header className="toolbar">
        <button type="button" className="toolbar-button" onClick={open}>
          Открыть папку…
        </button>
        <button
          type="button"
          className="toolbar-button"
          disabled={project === null}
          onClick={() => void handleReload()}
          data-testid="reload-button"
        >
          Перезагрузить
        </button>
      </header>

      {pendingCreate && (
        <div className="create-prompt" role="dialog" aria-modal="true">
          <span>Папка пуста. Создать в ней новый проект?</span>
          <div className="create-prompt-actions">
            <button type="button" className="toolbar-button" onClick={create}>
              Создать
            </button>
            <button type="button" className="toolbar-button" onClick={cancelCreate}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {error !== null && (
        <div className="error-banner" role="alert">
          <strong>Не удалось открыть проект</strong>
          <span className="error-code">{error.code}</span>
          <span className="error-message">{error.message}</span>
          {error.problems !== undefined && error.problems.length > 0 && (
            <ul className="error-problems">
              {error.problems.map((problem, index) => (
                <li key={index}>
                  {problem.code}: {problem.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {reloadError !== null && (
        <div
          className="error-banner reload-error-banner"
          role="alert"
          data-testid="reload-error-banner"
        >
          <strong>Не удалось перезагрузить проект с диска</strong>
          <span className="error-code">{reloadError.code}</span>
          <span className="error-message">{reloadError.message}</span>
          {reloadError.problems !== undefined && reloadError.problems.length > 0 && (
            <ul className="error-problems">
              {reloadError.problems.map((problem, index) => (
                <li key={index}>
                  {problem.code}: {problem.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {saveError !== null && (
        <div
          className="error-banner save-error-banner"
          role="alert"
          data-testid="save-error-banner"
        >
          <strong>Не удалось сохранить изменения</strong>
          <span className="error-code">{saveError.code}</span>
          <span className="error-message">{saveError.message}</span>
          {saveError.problems !== undefined && saveError.problems.length > 0 && (
            <ul className="error-problems">
              {saveError.problems.map((problem, index) => (
                <li key={index}>
                  {problem.code}: {problem.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={`workspace ${isResizing ? "resizing" : ""}`}>
        {project !== null && (
          <div className="sidebar-wrapper" style={{ width: sidebarWidth }}>
            <TreeSidebar
              project={project}
              selectedId={selectedId}
              collapsed={collapsed}
              onSelect={select}
              onToggle={toggle}
              onCreateNode={createNode}
              onMoveNode={moveNode}
            />
          </div>
        )}
        <div
          className="resizer"
          onMouseDown={() => setIsResizing(true)}
          role="separator"
          aria-label="Изменить ширину сайдбара"
        />
        <DetailsPanel
          project={project}
          selectedId={selectedId}
          onRename={renameNode}
          onDelete={deleteNode}
          onSetStatus={setNodeStatus}
          onCreateDescription={createDescription}
          onLoadDescription={loadDescription}
          onSaveDescription={saveDescription}
          onDescriptionDirtyChange={setDescriptionDirty}
          hasSaveError={saveError !== null}
          descriptionRef={descriptionEditorRef}
          reloadToken={reloadToken}
        />
      </div>
    </div>
  );
}

export default App;
