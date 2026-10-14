import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { openProject, reloadProject } from "./projectStorage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

function validProjectJson(): string {
  return JSON.stringify({
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
  });
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
