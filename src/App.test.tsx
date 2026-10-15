import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
  within,
  createEvent,
  act,
} from "@testing-library/react";
import { DomainError } from "./domain/types";
import App from "./App";
import {
  openProject,
  createProject,
  saveProject,
  readDescription,
  writeDescription,
  deleteDescriptions,
} from "./storage/projectStorage";

const { mockedWindow } = vi.hoisted(() => ({
  mockedWindow: {
    onCloseRequested: vi.fn<
      (handler: (event: { preventDefault: () => void }) => void) => () => void
    >(() => vi.fn()),
    destroy: vi.fn(),
  },
}));

vi.mock("./storage/projectStorage", () => ({
  openProject: vi.fn(),
  createProject: vi.fn(),
  saveProject: vi.fn(),
  readDescription: vi.fn(),
  writeDescription: vi.fn(),
  deleteDescriptions: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => mockedWindow),
}));

vi.mock("@uiw/react-codemirror", () => ({
  default: React.forwardRef(function MockCodeMirror(
    props: { value?: string; onChange?: (value: string) => void; editable?: boolean },
    ref: React.ForwardedRef<HTMLTextAreaElement>,
  ) {
    return (
      <textarea
        ref={ref}
        value={props.value ?? ""}
        onChange={(event) => props.onChange?.(event.target.value)}
        readOnly={props.editable === false}
        data-testid="description-codemirror"
      />
    );
  }),
  EditorView: { lineWrapping: "lineWrapping" },
}));

vi.mock("@codemirror/lang-markdown", () => ({
  markdown: vi.fn(() => "markdown-extension"),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const sampleProject = {
  version: 1,
  rootIds: ["n_root"],
  nodes: {
    n_root: {
      id: "n_root",
      title: "Root node",
      childrenIds: ["n_child1", "n_child2"],
      status: "in progress" as const,
      descriptionPath: null,
      createdAt: "2026-10-10T10:00:00.000Z",
      updatedAt: "2026-10-11T10:00:00.000Z",
    },
    n_child1: {
      id: "n_child1",
      title: "First child",
      childrenIds: [],
      status: "done" as const,
      descriptionPath: "descriptions/n_child1.md",
      createdAt: "2026-10-10T11:00:00.000Z",
      updatedAt: "2026-10-11T11:00:00.000Z",
    },
    n_child2: {
      id: "n_child2",
      title: "Second child",
      childrenIds: [],
      status: "paused" as const,
      descriptionPath: null,
      createdAt: "2026-10-10T12:00:00.000Z",
      updatedAt: "2026-10-11T12:00:00.000Z",
    },
  },
};

const emptyProject = {
  version: 1,
  rootIds: [],
  nodes: {},
};

function openSample(): void {
  vi.mocked(openProject).mockResolvedValue({ kind: "opened", project: sampleProject });
}

function dataTransferStub() {
  return {
    setData: vi.fn(),
    getData: vi.fn(),
    effectAllowed: "",
    dropEffect: "",
  };
}

const eventCreators: Record<
  string,
  (element: HTMLElement, init?: Record<string, unknown>) => Event
> = {
  dragstart: createEvent.dragStart,
  dragover: createEvent.dragOver,
  dragleave: createEvent.dragLeave,
  drop: createEvent.drop,
  dragend: createEvent.dragEnd,
};

function dispatchDragEvent(
  type: "dragstart" | "dragover" | "dragleave" | "drop" | "dragend",
  element: HTMLElement,
  options: { dataTransfer?: ReturnType<typeof dataTransferStub>; clientY?: number } = {},
): void {
  const event = eventCreators[type](element);
  if (options.dataTransfer !== undefined) {
    Object.defineProperty(event, "dataTransfer", {
      value: options.dataTransfer,
      configurable: true,
    });
  }
  if (type !== "dragstart" && type !== "dragend" && options.clientY !== undefined) {
    Object.defineProperty(event, "clientY", {
      value: options.clientY,
      configurable: true,
    });
  }
  fireEvent(element, event);
}

function mockRect(element: HTMLElement, height = 30): void {
  element.getBoundingClientRect = vi.fn(() => ({
    top: 0,
    left: 0,
    bottom: height,
    right: 100,
    width: 100,
    height,
    x: 0,
    y: 0,
    toJSON: () => "",
  }));
}

function setupDescriptionLoading(content: string): void {
  vi.mocked(readDescription).mockResolvedValue({ kind: "loaded", content });
}

describe("App", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(saveProject).mockResolvedValue({ kind: "saved" });
    vi.mocked(writeDescription).mockResolvedValue({ kind: "saved" });
    vi.mocked(deleteDescriptions).mockResolvedValue({ kind: "saved" });
    vi.mocked(readDescription).mockResolvedValue({ kind: "missing" });
  });

  it("shows the toolbar and empty details on start", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Открыть папку/i })).toBeInTheDocument();
    expect(screen.getByText("Выберите ноду")).toBeInTheDocument();
  });

  it("opens a project and renders the tree in children order", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));

    await waitFor(() => {
      expect(screen.getByTestId("tree-row-n_root")).toBeInTheDocument();
    });
    expect(screen.getByTestId("tree-row-n_child1")).toHaveTextContent("First child");
    expect(screen.getByTestId("tree-row-n_child2")).toHaveTextContent("Second child");
  });

  it("shows node details when a row is selected", async () => {
    openSample();
    setupDescriptionLoading("Hello **world**");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "First child" })).toBeInTheDocument();
    });
    expect(within(screen.getByTestId("details-status")).getByText("Готово")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("description-preview")).toHaveTextContent("Hello world");
    });
  });

  it("collapses and expands children", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-children-n_root"));

    fireEvent.click(screen.getByTestId("tree-toggle-n_root"));
    await waitFor(() => {
      expect(screen.queryByTestId("tree-children-n_root")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tree-toggle-n_root"));
    await waitFor(() => {
      expect(screen.getByTestId("tree-children-n_root")).toBeInTheDocument();
    });
  });

  it("shows create prompt on EMPTY_FOLDER and creates a project when confirmed", async () => {
    vi.mocked(openProject).mockResolvedValue({
      kind: "error",
      code: "EMPTY_FOLDER",
      message: "folder is empty",
    });
    vi.mocked(createProject).mockResolvedValue({ kind: "opened", project: emptyProject });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));

    await waitFor(() => {
      expect(screen.getByText(/Папка пуста/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Создать/i }));
    await waitFor(() => {
      expect(createProject).toHaveBeenCalledTimes(1);
      expect(screen.getByText("В проекте нет нод")).toBeInTheDocument();
    });
  });

  it("cancels create prompt without calling createProject", async () => {
    vi.mocked(openProject).mockResolvedValue({
      kind: "error",
      code: "EMPTY_FOLDER",
      message: "folder is empty",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByText(/Папка пуста/i));

    fireEvent.click(screen.getByRole("button", { name: /Отмена/i }));
    expect(createProject).not.toHaveBeenCalled();
    expect(screen.queryByText(/Папка пуста/i)).not.toBeInTheDocument();
  });

  it("shows error banner and keeps the previous tree", async () => {
    vi.mocked(openProject)
      .mockResolvedValueOnce({ kind: "opened", project: sampleProject })
      .mockResolvedValueOnce({
        kind: "error",
        code: "INVALID_PROJECT",
        message: "bad project",
        problems: [new DomainError("MISSING_FIELD", "node missing title")],
      });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));

    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => {
      expect(screen.getByText(/Не удалось открыть проект/i)).toBeInTheDocument();
      expect(screen.getByText("INVALID_PROJECT")).toBeInTheDocument();
    });
    expect(screen.getByTestId("tree-row-n_root")).toBeInTheDocument();
  });

  it("does not show a banner for cancelled dialog", async () => {
    vi.mocked(openProject).mockResolvedValue({ kind: "cancelled" });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));

    await waitFor(() => {
      expect(openProject).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/Не удалось открыть проект/i)).not.toBeInTheDocument();
  });

  it("renders the status legend", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));

    expect(screen.getByText("Не начато")).toBeInTheDocument();
    expect(screen.getByText("В работе")).toBeInTheDocument();
    expect(screen.getByText("На паузе")).toBeInTheDocument();
    expect(screen.getByText("Готово")).toBeInTheDocument();
  });

  it("creates a root node and selects it", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));

    fireEvent.click(screen.getByTestId("create-root-button"));
    const input = screen.getByTestId("tree-create-input");
    fireEvent.change(input, { target: { value: "New root" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New root" })).toBeInTheDocument();
    });
    expect(saveProject).toHaveBeenCalledTimes(1);
  });

  it("creates a child node under the selected node", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));

    fireEvent.click(screen.getByTestId("create-child-button"));
    const input = screen.getByTestId("tree-create-input");
    fireEvent.change(input, { target: { value: "New child" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New child" })).toBeInTheDocument();
    });
    expect(screen.getByTestId("tree-children-n_child1")).toBeInTheDocument();
  });

  it("disables child creation until a node is selected", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));

    expect(screen.getByTestId("create-child-button")).toBeDisabled();
  });

  it("renames the selected node", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByRole("heading", { name: "First child" }));

    fireEvent.click(screen.getByTestId("details-rename-button"));
    const input = screen.getByTestId("details-rename-input");
    fireEvent.change(input, { target: { value: "Renamed child" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Renamed child" })).toBeInTheDocument();
    });
    expect(screen.getByTestId("tree-row-n_child1")).toHaveTextContent("Renamed child");
  });

  it("changes the status of the selected node", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child2"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child2"));
    await waitFor(() => within(screen.getByTestId("details-status")).getByText("На паузе"));

    const select = screen.getByTestId("details-status-select");
    fireEvent.change(select, { target: { value: "done" } });

    await waitFor(() => {
      expect(within(screen.getByTestId("details-status")).getByText("Готово")).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("tree-row-n_child2").querySelector('[data-status="done"]'),
    ).not.toBeNull();
  });

  it("shows delete confirmation with node and file counts", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_root"));
    await waitFor(() => screen.getByRole("heading", { name: "Root node" }));

    fireEvent.click(screen.getByTestId("details-delete-button"));

    await waitFor(() => {
      expect(screen.getByTestId("delete-confirmation")).toHaveTextContent(
        "нод: 3 (из них дочерних: 2), файлов описаний: 1",
      );
    });
  });

  it("deletes the selected branch after confirmation", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_root"));
    await waitFor(() => screen.getByRole("heading", { name: "Root node" }));

    fireEvent.click(screen.getByTestId("details-delete-button"));
    await waitFor(() => screen.getByTestId("delete-confirmation"));
    fireEvent.click(screen.getByTestId("delete-confirm-button"));

    await waitFor(() => {
      expect(screen.queryByTestId("tree-row-n_root")).not.toBeInTheDocument();
    });
    expect(saveProject).toHaveBeenCalledTimes(1);
    expect(deleteDescriptions).toHaveBeenCalledWith(["descriptions/n_child1.md"]);
  });

  it("cancels deletion without calling saveProject", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByRole("heading", { name: "First child" }));

    fireEvent.click(screen.getByTestId("details-delete-button"));
    await waitFor(() => screen.getByTestId("delete-confirmation"));
    fireEvent.click(screen.getByTestId("delete-cancel-button"));

    expect(saveProject).not.toHaveBeenCalled();
    expect(screen.getByTestId("tree-row-n_child1")).toBeInTheDocument();
  });

  it("does not delete description files when saveProject fails", async () => {
    openSample();
    vi.mocked(saveProject).mockResolvedValue({
      kind: "error",
      code: "IO_ERROR",
      message: "disk full",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByRole("heading", { name: "First child" }));

    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByRole("heading", { name: "First child" }));

    fireEvent.click(screen.getByTestId("details-delete-button"));
    await waitFor(() => screen.getByTestId("delete-confirmation"));
    fireEvent.click(screen.getByTestId("delete-confirm-button"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error-banner")).toHaveTextContent("IO_ERROR");
    });
    expect(deleteDescriptions).not.toHaveBeenCalled();
    expect(screen.getByTestId("tree-row-n_child1")).toBeInTheDocument();
  });

  it("shows save error banner when deleteDescriptions fails but tree is already updated", async () => {
    openSample();
    vi.mocked(deleteDescriptions).mockResolvedValue({
      kind: "error",
      code: "IO_ERROR",
      message: "cannot remove file",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByRole("heading", { name: "First child" }));

    fireEvent.click(screen.getByTestId("details-delete-button"));
    await waitFor(() => screen.getByTestId("delete-confirmation"));
    fireEvent.click(screen.getByTestId("delete-confirm-button"));

    await waitFor(() => {
      expect(screen.queryByTestId("tree-row-n_child1")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("save-error-banner")).toHaveTextContent("IO_ERROR");
  });

  it("moves a node as a child via drag middle zone", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child2"));

    const source = screen.getByTestId("tree-row-n_child2");
    const target = screen.getByTestId("tree-row-n_child1");
    mockRect(source);
    mockRect(target);

    const dt = dataTransferStub();
    dispatchDragEvent("dragstart", source, { dataTransfer: dt });
    dispatchDragEvent("dragover", target, { dataTransfer: dt, clientY: 15 });
    dispatchDragEvent("drop", target, { dataTransfer: dt, clientY: 15 });

    await waitFor(() => {
      expect(saveProject).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId("tree-children-n_child1")).toHaveTextContent("Second child");
    });
    expect(screen.queryAllByTestId("tree-row-n_child2")).toHaveLength(1);
    expect(screen.getByTestId("tree-children-n_root").children).toHaveLength(1);
  });

  it("moves a node as a sibling before via drag top zone", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));

    const source = screen.getByTestId("tree-row-n_child1");
    const target = screen.getByTestId("tree-row-n_root");
    mockRect(source);
    mockRect(target);

    const dt = dataTransferStub();
    dispatchDragEvent("dragstart", source, { dataTransfer: dt });
    dispatchDragEvent("dragover", target, { dataTransfer: dt, clientY: 5 });
    dispatchDragEvent("drop", target, { dataTransfer: dt, clientY: 5 });

    await waitFor(() => {
      const list = screen.getByTestId("tree-list");
      expect(list.children[0]).toHaveTextContent("First child");
    });
  });

  it("does not move a node onto its descendant", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));

    const source = screen.getByTestId("tree-row-n_root");
    const target = screen.getByTestId("tree-row-n_child1");
    mockRect(source);
    mockRect(target);

    const dt = dataTransferStub();
    dispatchDragEvent("dragstart", source, { dataTransfer: dt });
    dispatchDragEvent("dragover", target, { dataTransfer: dt, clientY: 15 });
    dispatchDragEvent("drop", target, { dataTransfer: dt, clientY: 15 });

    await waitFor(() => {
      expect(saveProject).not.toHaveBeenCalled();
    });
    expect(screen.getByTestId("tree-children-n_root")).toHaveTextContent("First child");
  });

  it("creates a description file and updates roadmap.json", async () => {
    openSample();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_root"));
    await waitFor(() => screen.getByRole("heading", { name: "Root node" }));

    fireEvent.click(screen.getByTestId("create-description-button"));

    await waitFor(() => {
      expect(writeDescription).toHaveBeenCalledWith("descriptions/n_root.md", "");
    });
    expect(saveProject).toHaveBeenCalled();
    expect(vi.mocked(saveProject).mock.calls[0][0].nodes.n_root.descriptionPath).toBe(
      "descriptions/n_root.md",
    );

    const writeOrder = vi.mocked(writeDescription).mock.invocationCallOrder[0];
    const saveOrder = vi.mocked(saveProject).mock.invocationCallOrder[0];
    expect(writeOrder).toBeLessThan(saveOrder);
  });

  it("does not update roadmap.json when description creation fails", async () => {
    openSample();
    vi.mocked(writeDescription).mockResolvedValue({
      kind: "error",
      code: "IO_ERROR",
      message: "cannot write",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_root"));
    await waitFor(() => screen.getByRole("heading", { name: "Root node" }));

    fireEvent.click(screen.getByTestId("create-description-button"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error-banner")).toHaveTextContent("IO_ERROR");
    });
    expect(saveProject).not.toHaveBeenCalled();
  });

  it("opens preview mode for non-empty description", async () => {
    openSample();
    setupDescriptionLoading("Some description");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));

    await waitFor(() => {
      expect(screen.getByTestId("description-preview")).toHaveTextContent("Some description");
    });
    expect(screen.getByTestId("description-mode-preview")).toBeDisabled();
  });

  it("opens editor mode for missing description with a hint", async () => {
    openSample();
    vi.mocked(readDescription).mockResolvedValue({ kind: "missing" });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));

    await waitFor(() => {
      expect(screen.getByText(/Файл не найден/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId("description-codemirror")).toBeInTheDocument();
    expect(screen.getByTestId("description-mode-edit")).toBeDisabled();
  });

  it("shows read-only editor when description read fails", async () => {
    openSample();
    vi.mocked(readDescription).mockResolvedValue({
      kind: "error",
      code: "NOT_UTF8",
      message: "not utf8",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));

    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить описание/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId("description-codemirror")).toHaveAttribute("readonly");
  });

  it("saves description on blur when content changed", async () => {
    openSample();
    setupDescriptionLoading("");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    const textarea = screen.getByTestId("description-codemirror");
    fireEvent.change(textarea, { target: { value: "Updated text" } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(writeDescription).toHaveBeenCalledWith("descriptions/n_child1.md", "Updated text");
    });
  });

  it("does not save description on blur when content unchanged", async () => {
    openSample();
    setupDescriptionLoading("");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    fireEvent.blur(screen.getByTestId("description-codemirror"));

    await waitFor(() => {
      expect(readDescription).toHaveBeenCalled();
    });
    expect(writeDescription).not.toHaveBeenCalled();
  });

  it("saves description when selecting another node", async () => {
    openSample();
    setupDescriptionLoading("");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    fireEvent.change(screen.getByTestId("description-codemirror"), {
      target: { value: "Autosaved text" },
    });
    fireEvent.click(screen.getByTestId("tree-row-button-n_root"));

    await waitFor(() => {
      expect(writeDescription).toHaveBeenCalledWith("descriptions/n_child1.md", "Autosaved text");
    });
  });

  it("shows save error banner when description save fails", async () => {
    openSample();
    setupDescriptionLoading("");
    vi.mocked(writeDescription).mockResolvedValue({
      kind: "error",
      code: "IO_ERROR",
      message: "disk full",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    fireEvent.change(screen.getByTestId("description-codemirror"), {
      target: { value: "Updated text" },
    });
    fireEvent.blur(screen.getByTestId("description-codemirror"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error-banner")).toHaveTextContent("IO_ERROR");
    });
  });

  it("renders preview without clickable links, images or raw HTML", async () => {
    openSample();
    setupDescriptionLoading(
      "# Title\n\n[link](https://example.com)\n\n![alt text](image.png)\n\n<b>raw</b>\n\n| a | b |\n|---|---|\n| 1 | 2 |",
    );

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));

    await waitFor(() => {
      expect(screen.getByTestId("description-preview")).toHaveTextContent("Title");
    });

    const preview = screen.getByTestId("description-preview");
    expect(preview.querySelector("a")).toBeNull();
    expect(preview.querySelector("img")).toBeNull();
    expect(preview.querySelector("b")).toBeNull();
    expect(preview.querySelector("table")).not.toBeNull();
    expect(preview).toHaveTextContent("alt text");
  });

  it("autosaves description after debounce without blur", async () => {
    openSample();
    setupDescriptionLoading("");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    vi.useFakeTimers();

    const textarea = screen.getByTestId("description-codemirror");
    fireEvent.change(textarea, { target: { value: "First" } });
    fireEvent.change(textarea, { target: { value: "Second" } });
    fireEvent.change(textarea, { target: { value: "Final text" } });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(writeDescription).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(800);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(writeDescription).toHaveBeenCalledTimes(1);
      expect(writeDescription).toHaveBeenCalledWith("descriptions/n_child1.md", "Final text");
    });
  });

  it("shows and hides unsaved indicator around debounce save", async () => {
    openSample();
    setupDescriptionLoading("");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    vi.useFakeTimers();

    fireEvent.change(screen.getByTestId("description-codemirror"), {
      target: { value: "Draft" },
    });

    expect(screen.getByTestId("description-dirty-indicator")).toHaveTextContent("Не сохранено");

    act(() => {
      vi.advanceTimersByTime(800);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.queryByTestId("description-dirty-indicator")).not.toBeInTheDocument();
    });
  });

  it("keeps unsaved indicator visible when description save fails", async () => {
    openSample();
    setupDescriptionLoading("");
    vi.mocked(writeDescription).mockResolvedValue({
      kind: "error",
      code: "IO_ERROR",
      message: "disk full",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    fireEvent.change(screen.getByTestId("description-codemirror"), {
      target: { value: "Updated text" },
    });
    fireEvent.blur(screen.getByTestId("description-codemirror"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error-banner")).toHaveTextContent("IO_ERROR");
    });
    expect(screen.getByTestId("description-dirty-indicator")).toHaveTextContent("Не сохранено");
  });

  it("does not prevent closing when there are no unsaved changes", async () => {
    render(<App />);
    await waitFor(() => expect(mockedWindow.onCloseRequested).toHaveBeenCalled());

    const handler = mockedWindow.onCloseRequested.mock.calls[0][0] as unknown as (event: {
      preventDefault: () => void;
    }) => void;
    const preventDefault = vi.fn();

    handler({ preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockedWindow.destroy).not.toHaveBeenCalled();
  });

  it("prevents closing and destroys window on confirm when there are unsaved changes", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    openSample();
    setupDescriptionLoading("");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    fireEvent.change(screen.getByTestId("description-codemirror"), {
      target: { value: "Unsaved" },
    });

    const handler = mockedWindow.onCloseRequested.mock.calls[0][0] as unknown as (event: {
      preventDefault: () => void;
    }) => void;
    const preventDefault = vi.fn();

    handler({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mockedWindow.destroy).toHaveBeenCalledTimes(1);
  });

  it("prevents closing but does not destroy window when user cancels confirm", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    openSample();
    setupDescriptionLoading("");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-button-n_child1"));
    await waitFor(() => screen.getByTestId("description-codemirror"));

    fireEvent.change(screen.getByTestId("description-codemirror"), {
      target: { value: "Unsaved" },
    });

    const handler = mockedWindow.onCloseRequested.mock.calls[0][0] as unknown as (event: {
      preventDefault: () => void;
    }) => void;
    const preventDefault = vi.fn();

    handler({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mockedWindow.destroy).not.toHaveBeenCalled();
  });
});
