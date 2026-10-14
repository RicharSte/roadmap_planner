import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  createProject,
  openProject,
  reloadProject,
  saveProject,
  writeDescription,
} from "./projectStorage";
import { createEmptyProject } from "../domain/tree";
import { parseProject, validateProject } from "../domain/validate";
import type { Project } from "../domain/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

function validProject(): Project {
  return {
    version: 1,
    rootIds: ["n_a"],
    nodes: {
      n_a: {
        id: "n_a",
        title: "Root",
        childrenIds: [],
        status: "unstarted",
        descriptionPath: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    },
  };
}

function validProjectJson(): string {
  return JSON.stringify(validProject(), null, 2) + "\n";
}

describe("openProject", () => {
  it("returns cancelled when the dialog is cancelled", async () => {
    mockInvoke.mockResolvedValueOnce(null);

    const result = await openProject();

    expect(result).toEqual({ kind: "cancelled" });
    expect(mockInvoke).not.toHaveBeenCalledWith("commit_project", {});
  });

  it("returns opened and commits a valid project", async () => {
    mockInvoke.mockResolvedValueOnce(validProjectJson());
    mockInvoke.mockResolvedValueOnce(undefined);

    const result = await openProject();

    expect(result.kind).toBe("opened");
    if (result.kind === "opened") {
      expect(result.project.rootIds).toEqual(["n_a"]);
    }
    expect(mockInvoke).toHaveBeenCalledWith("commit_project", {});
  });

  it("returns INVALID_JSON when JSON parsing fails", async () => {
    mockInvoke.mockResolvedValueOnce("{");

    const result = await openProject();

    expect(result).toMatchObject({
      kind: "error",
      code: "INVALID_JSON",
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("commit_project", {});
  });

  it("returns INVALID_PROJECT with problems and does not commit", async () => {
    mockInvoke.mockResolvedValueOnce(JSON.stringify({ version: 2, rootIds: [], nodes: {} }));

    const result = await openProject();

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.code).toBe("INVALID_PROJECT");
      expect(result.problems).toBeDefined();
      expect(result.problems!.length).toBeGreaterThan(0);
    }
    expect(mockInvoke).not.toHaveBeenCalledWith("commit_project", {});
  });

  it("passes through a Rust error code", async () => {
    mockInvoke.mockRejectedValueOnce({ code: "EMPTY_FOLDER", message: "folder is empty" });

    const result = await openProject();

    expect(result).toEqual({
      kind: "error",
      code: "EMPTY_FOLDER",
      message: "folder is empty",
    });
  });
});

describe("reloadProject", () => {
  it("returns opened for a valid project without committing", async () => {
    mockInvoke.mockResolvedValueOnce(validProjectJson());

    const result = await reloadProject();

    expect(result.kind).toBe("opened");
    expect(mockInvoke).not.toHaveBeenCalledWith("commit_project", {});
  });

  it("passes through a Rust error code", async () => {
    mockInvoke.mockRejectedValueOnce({
      code: "NO_PROJECT_OPEN",
      message: "no project is currently open",
    });

    const result = await reloadProject();

    expect(result).toEqual({
      kind: "error",
      code: "NO_PROJECT_OPEN",
      message: "no project is currently open",
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("commit_project", {});
  });
});

describe("saveProject", () => {
  it("returns saved and invokes save_roadmap with formatted JSON", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    const result = await saveProject(validProject());

    expect(result).toEqual({ kind: "saved" });
    expect(mockInvoke).toHaveBeenCalledWith("save_roadmap", {
      content: validProjectJson(),
    });
  });

  it("returns INVALID_PROJECT and does not invoke for invalid project", async () => {
    const invalid: Project = {
      version: 1,
      rootIds: ["missing"],
      nodes: {},
    };

    const result = await saveProject(invalid);

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.code).toBe("INVALID_PROJECT");
      expect(result.problems).toBeDefined();
      expect(result.problems!.length).toBeGreaterThan(0);
    }
    expect(mockInvoke).not.toHaveBeenCalledWith("save_roadmap", expect.anything());
  });

  it("passes through a Rust error code", async () => {
    mockInvoke.mockRejectedValueOnce({
      code: "READ_ONLY",
      message: "target file is read-only",
    });

    const result = await saveProject(validProject());

    expect(result).toEqual({
      kind: "error",
      code: "READ_ONLY",
      message: "target file is read-only",
    });
  });
});

describe("writeDescription", () => {
  it("returns saved and invokes write_description", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    const result = await writeDescription("descriptions/n_a.md", "# hi");

    expect(result).toEqual({ kind: "saved" });
    expect(mockInvoke).toHaveBeenCalledWith("write_description", {
      path: "descriptions/n_a.md",
      content: "# hi",
    });
  });

  it("passes through a Rust error code", async () => {
    mockInvoke.mockRejectedValueOnce({
      code: "INVALID_PATH",
      message: "description path must be descriptions/<name>.md",
    });

    const result = await writeDescription("roadmap.json", "x");

    expect(result).toEqual({
      kind: "error",
      code: "INVALID_PATH",
      message: "description path must be descriptions/<name>.md",
    });
  });
});

describe("createEmptyProject", () => {
  it("passes parseProject and validateProject", () => {
    const project = createEmptyProject();
    const parsed = parseProject(JSON.parse(JSON.stringify(project)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateProject(parsed.project);
    expect(validated.ok).toBe(true);
  });
});

describe("createProject", () => {
  it("returns opened and invokes create_project with formatted empty project", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    const result = await createProject();

    expect(result.kind).toBe("opened");
    if (result.kind === "opened") {
      expect(result.project).toEqual(createEmptyProject());
    }
    expect(mockInvoke).toHaveBeenCalledWith("create_project", {
      content: JSON.stringify(createEmptyProject(), null, 2) + "\n",
    });
  });

  it("passes through PENDING_NOT_EMPTY", async () => {
    mockInvoke.mockRejectedValueOnce({
      code: "PENDING_NOT_EMPTY",
      message: "selected folder already contains a project",
    });

    const result = await createProject();

    expect(result).toEqual({
      kind: "error",
      code: "PENDING_NOT_EMPTY",
      message: "selected folder already contains a project",
    });
  });

  it("passes through FOLDER_NOT_EMPTY", async () => {
    mockInvoke.mockRejectedValueOnce({
      code: "FOLDER_NOT_EMPTY",
      message: "folder is no longer empty",
    });

    const result = await createProject();

    expect(result).toEqual({
      kind: "error",
      code: "FOLDER_NOT_EMPTY",
      message: "folder is no longer empty",
    });
  });

  it("passes through INVALID_JSON", async () => {
    mockInvoke.mockRejectedValueOnce({
      code: "INVALID_JSON",
      message: "content is not valid JSON",
    });

    const result = await createProject();

    expect(result).toEqual({
      kind: "error",
      code: "INVALID_JSON",
      message: "content is not valid JSON",
    });
  });
});
