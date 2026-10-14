import { describe, it, expect } from "vitest";
import { parseProject, validateProject } from "./validate";
import type { Project } from "./types";

const adrExample = {
  version: 1,
  rootIds: ["n_a"],
  nodes: {
    n_a: {
      id: "n_a",
      title: "Auth",
      childrenIds: ["n_b"],
      status: "in progress",
      descriptionPath: "descriptions/n_a.md",
      createdAt: "2026-10-13T10:00:00Z",
      updatedAt: "2026-10-13T10:00:00Z",
    },
    n_b: {
      id: "n_b",
      title: "Login form",
      childrenIds: [],
      status: "unstarted",
      descriptionPath: null,
      createdAt: "2026-10-13T10:00:00Z",
      updatedAt: "2026-10-13T10:00:00Z",
    },
  },
};

describe("parseProject", () => {
  it("accepts ADR 0005 example", () => {
    const result = parseProject(adrExample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.version).toBe(1);
    expect(result.project.rootIds).toEqual(["n_a"]);
    expect(Object.keys(result.project.nodes)).toHaveLength(2);
    expect(result.project.nodes.n_a.title).toBe("Auth");
  });

  it("rejects non-object input", () => {
    const result = parseProject("not an object");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "NOT_AN_OBJECT")).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = parseProject({ version: 1, rootIds: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "MISSING_FIELD")).toBe(true);
  });

  it("rejects unsupported version", () => {
    const result = parseProject({ ...adrExample, version: 2 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "UNSUPPORTED_VERSION")).toBe(true);
  });

  it("reports multiple problems at once", () => {
    const result = parseProject({ version: 2 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.length).toBeGreaterThanOrEqual(2);
  });

  it("drops extra fields", () => {
    const raw = {
      ...adrExample,
      extra: "ignored",
      nodes: {
        ...adrExample.nodes,
        n_a: {
          ...adrExample.nodes.n_a,
          extra: "ignored",
        },
      },
    };
    const result = parseProject(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("extra" in result.project).toBe(false);
    expect("extra" in result.project.nodes.n_a).toBe(false);
  });

  it("does not mutate input", () => {
    const before = JSON.parse(JSON.stringify(adrExample));
    parseProject(before);
    expect(before).toEqual(adrExample);
  });
});

describe("validateProject", () => {
  const base: Project = {
    version: 1,
    rootIds: ["a"],
    nodes: {
      a: {
        id: "a",
        title: "A",
        childrenIds: ["b"],
        status: "unstarted",
        descriptionPath: "descriptions/a.md",
        createdAt: "t",
        updatedAt: "t",
      },
      b: {
        id: "b",
        title: "B",
        childrenIds: [],
        status: "unstarted",
        descriptionPath: null,
        createdAt: "t",
        updatedAt: "t",
      },
    },
  };

  it("accepts valid project", () => {
    expect(validateProject(base).ok).toBe(true);
  });

  it("detects missing referenced id", () => {
    const project: Project = {
      ...base,
      nodes: {
        ...base.nodes,
        a: { ...base.nodes.a, childrenIds: ["x"] },
      },
    };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "NODE_NOT_FOUND")).toBe(true);
  });

  it("detects multiple parents", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a", "b"],
      nodes: {
        a: { ...base.nodes.a, childrenIds: ["c"] },
        b: { ...base.nodes.b, childrenIds: ["c"] },
        c: {
          id: "c",
          title: "C",
          childrenIds: [],
          status: "unstarted",
          descriptionPath: null,
          createdAt: "t",
          updatedAt: "t",
        },
      },
    };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "MULTIPLE_PARENTS")).toBe(true);
  });

  it("detects orphan node", () => {
    const project: Project = {
      ...base,
      nodes: {
        ...base.nodes,
        c: {
          id: "c",
          title: "C",
          childrenIds: [],
          status: "unstarted",
          descriptionPath: null,
          createdAt: "t",
          updatedAt: "t",
        },
      },
    };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "ORPHAN_NODE")).toBe(true);
  });

  it("detects cycle", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a"],
      nodes: {
        a: { ...base.nodes.a, childrenIds: ["b"] },
        b: {
          id: "b",
          title: "B",
          childrenIds: ["a"],
          status: "unstarted",
          descriptionPath: null,
          createdAt: "t",
          updatedAt: "t",
        },
      },
    };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "CYCLE")).toBe(true);
  });

  it("detects duplicate child id", () => {
    const project: Project = {
      ...base,
      nodes: {
        ...base.nodes,
        a: { ...base.nodes.a, childrenIds: ["b", "b"] },
      },
    };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "DUPLICATE_ID")).toBe(true);
  });

  it("detects invalid descriptionPath", () => {
    const project: Project = {
      ...base,
      nodes: {
        ...base.nodes,
        a: { ...base.nodes.a, descriptionPath: "../secret.md" },
      },
    };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.code === "INVALID_DESCRIPTION_PATH")).toBe(true);
  });

  it("does not mutate input", () => {
    const before = JSON.parse(JSON.stringify(base)) as Project;
    validateProject(before);
    expect(before).toEqual(base);
  });
});
