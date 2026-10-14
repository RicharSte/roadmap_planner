import { useEffect, useState } from "react";
import { DetailsPanel } from "./ui/DetailsPanel";
import { TreeSidebar } from "./ui/TreeSidebar";
import { useProject } from "./ui/useProject";
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
    pendingCreate,
    open,
    create,
    cancelCreate,
    select,
    toggle,
  } = useProject();
  const [sidebarWidth, setSidebarWidth] = useState(INITIAL_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

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

  return (
    <div className="app">
      <header className="toolbar">
        <button type="button" className="toolbar-button" onClick={open}>
          Открыть папку…
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

      <div className={`workspace ${isResizing ? "resizing" : ""}`}>
        {project !== null && (
          <div className="sidebar-wrapper" style={{ width: sidebarWidth }}>
            <TreeSidebar
              project={project}
              selectedId={selectedId}
              collapsed={collapsed}
              onSelect={select}
              onToggle={toggle}
            />
          </div>
        )}
        <div
          className="resizer"
          onMouseDown={() => setIsResizing(true)}
          role="separator"
          aria-label="Изменить ширину сайдбара"
        />
        <DetailsPanel project={project} selectedId={selectedId} />
      </div>
    </div>
  );
}

export default App;
