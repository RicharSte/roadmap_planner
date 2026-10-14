import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup, within } from "@testing-library/react";
import { DomainError } from "./domain/types";
import App from "./App";
import { openProject, createProject } from "./storage/projectStorage";

vi.mock("./storage/projectStorage", () => ({
  openProject: vi.fn(),
  createProject: vi.fn(),
}));

afterEach(() => {
  cleanup();
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

describe("App", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the toolbar and empty details on start", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Открыть папку/i })).toBeInTheDocument();
    expect(screen.getByText("Выберите ноду")).toBeInTheDocument();
  });

  it("opens a project and renders the tree in children order", async () => {
    vi.mocked(openProject).mockResolvedValue({ kind: "opened", project: sampleProject });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));

    await waitFor(() => {
      expect(screen.getByTestId("tree-row-n_root")).toHaveTextContent("Root node");
    });
    expect(screen.getByTestId("tree-row-n_child1")).toHaveTextContent("First child");
    expect(screen.getByTestId("tree-row-n_child2")).toHaveTextContent("Second child");
  });

  it("shows node details when a row is selected", async () => {
    vi.mocked(openProject).mockResolvedValue({ kind: "opened", project: sampleProject });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_child1"));
    fireEvent.click(screen.getByTestId("tree-row-n_child1"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "First child" })).toBeInTheDocument();
    });
    expect(within(screen.getByTestId("details-status")).getByText("Готово")).toBeInTheDocument();
    expect(screen.getByText(/Описание: descriptions\/n_child1\.md/)).toBeInTheDocument();
  });

  it("collapses and expands children", async () => {
    vi.mocked(openProject).mockResolvedValue({ kind: "opened", project: sampleProject });

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
    vi.mocked(openProject).mockResolvedValue({ kind: "opened", project: sampleProject });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Открыть папку/i }));
    await waitFor(() => screen.getByTestId("tree-row-n_root"));

    expect(screen.getByText("Не начато")).toBeInTheDocument();
    expect(screen.getByText("В работе")).toBeInTheDocument();
    expect(screen.getByText("На паузе")).toBeInTheDocument();
    expect(screen.getByText("Готово")).toBeInTheDocument();
  });
});
