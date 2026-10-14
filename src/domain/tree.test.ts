import { describe, it, expect } from "vitest";
import {
  buildParentIndex,
  createNode,
  deleteNode,
  getChildren,
  getParents,
  moveNode,
  renameNode,
  setDescriptionPath,
  setStatus,
} from "./tree";
import { createNodeId } from "./ids";
import type { Project } from "./types";

const emptyProject = (): Project => ({ version: 1, rootIds: [], nodes: {} });

const node = (
  id: string,
  overrides: Partial<Project["nodes"][string]> = {},
): Project["nodes"][string] => ({
  id,
  title: id.toUpperCase(),
  childrenIds: [],
  status: "unstarted",
  descriptionPath: null,
  createdAt: "t",
  updatedAt: "t",
  ...overrides,
});

describe("buildParentIndex, getParents, getChildren", () => {
  const project: Project = {
    version: 1,
    rootIds: ["a"],
    nodes: {
      a: node("a", { childrenIds: ["b", "c"] }),
      b: node("b"),
      c: node("c", { childrenIds: ["d"] }),
      d: node("d"),
    },
  };

  it("returns empty parents for root", () => {
    const index = buildParentIndex(project);
    expect(getParents(index, "a")).toEqual([]);
  });

  it("returns parents for leaf", () => {
    const index = buildParentIndex(project);
    expect(getParents(index, "b")).toEqual(["a"]);
    expect(getParents(index, "d")).toEqual(["c"]);
  });

  it("returns empty array for unknown id", () => {
    const index = buildParentIndex(project);
    expect(getParents(index, "x")).toEqual([]);
  });

  it("returns children", () => {
    expect(getChildren(project, "a")).toEqual(["b", "c"]);
    expect(getChildren(project, "b")).toEqual([]);
  });

  it("returns empty children for unknown id", () => {
    expect(getChildren(project, "x")).toEqual([]);
  });
});

describe("createNode", () => {
  it("creates root node", () => {
    const project = emptyProject();
    const next = createNode(project, "Root", null, undefined, "t");
    expect(next.rootIds).toHaveLength(1);
    const id = next.rootIds[0];
    expect(next.nodes[id].title).toBe("Root");
    expect(next.nodes[id].status).toBe("unstarted");
    expect(next.nodes[id].descriptionPath).toBeNull();
  });

  it("creates child node", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a"],
      nodes: { a: node("a") },
    };
    const next = createNode(project, "Child", "a", undefined, "t");
    expect(next.nodes.a.childrenIds).toEqual([expect.stringMatching(/^n_/)]);
    const childId = next.nodes.a.childrenIds[0];
    expect(next.nodes[childId].title).toBe("Child");
  });

  it("inserts at index", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a"],
      nodes: {
        a: node("a", { childrenIds: ["b"] }),
        b: node("b"),
      },
    };
    const next = createNode(project, "First", "a", 0, "t");
    expect(next.nodes.a.childrenIds).toHaveLength(2);
    expect(next.nodes[next.nodes.a.childrenIds[0]].title).toBe("First");
    expect(next.nodes[next.nodes.a.childrenIds[1]].title).toBe("B");
  });

  it("throws on empty title", () => {
    expect(() => createNode(emptyProject(), "   ", null, undefined, "t")).toThrow();
  });

  it("throws on title too long", () => {
    const long = "a".repeat(121);
    expect(() => createNode(emptyProject(), long, null, undefined, "t")).toThrow();
  });

  it("normalizes newlines", () => {
    const next = createNode(emptyProject(), "One\nTwo\r\nThree", null, undefined, "t");
    const id = next.rootIds[0];
    expect(next.nodes[id].title).toBe("One Two Three");
  });

  it("throws on unknown parent", () => {
    expect(() => createNode(emptyProject(), "X", "x", undefined, "t")).toThrow();
  });
});

describe("renameNode", () => {
  const project: Project = {
    version: 1,
    rootIds: ["a"],
    nodes: { a: node("a", { createdAt: "t1", updatedAt: "t1" }) },
  };

  it("renames and updates updatedAt", () => {
    const next = renameNode(project, "a", "New title", "t2");
    expect(next.nodes.a.title).toBe("New title");
    expect(next.nodes.a.updatedAt).toBe("t2");
    expect(next.nodes.a.createdAt).toBe("t1");
  });

  it("throws on empty title", () => {
    expect(() => renameNode(project, "a", "   ")).toThrow();
  });

  it("throws on title too long", () => {
    expect(() => renameNode(project, "a", "a".repeat(121))).toThrow();
  });

  it("throws on unknown node", () => {
    expect(() => renameNode(project, "x", "Title")).toThrow();
  });
});

describe("deleteNode", () => {
  it("deletes leaf", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a"],
      nodes: {
        a: node("a", { childrenIds: ["b"] }),
        b: node("b"),
      },
    };
    const { project: next, deletedIds } = deleteNode(project, "b");
    expect(next.rootIds).toEqual(["a"]);
    expect(next.nodes.a.childrenIds).toEqual([]);
    expect(next.nodes.b).toBeUndefined();
    expect(deletedIds).toEqual(["b"]);
  });

  it("deletes subtree of three nodes", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a"],
      nodes: {
        a: node("a", { childrenIds: ["b"] }),
        b: node("b", { childrenIds: ["c", "d"] }),
        c: node("c"),
        d: node("d"),
      },
    };
    const { project: next, deletedIds } = deleteNode(project, "b");
    expect(next.nodes.a.childrenIds).toEqual([]);
    expect(Object.keys(next.nodes)).toEqual(["a"]);
    expect(deletedIds.sort()).toEqual(["b", "c", "d"]);
  });

  it("deletes root node", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a", "b"],
      nodes: { a: node("a"), b: node("b") },
    };
    const { project: next, deletedIds } = deleteNode(project, "a");
    expect(next.rootIds).toEqual(["b"]);
    expect(deletedIds).toEqual(["a"]);
  });

  it("throws on unknown node", () => {
    expect(() => deleteNode(emptyProject(), "x")).toThrow();
  });
});

describe("moveNode", () => {
  const project: Project = {
    version: 1,
    rootIds: ["a"],
    nodes: {
      a: node("a", { childrenIds: ["b", "c"] }),
      b: node("b"),
      c: node("c", { childrenIds: ["d"] }),
      d: node("d"),
    },
  };

  it("moves to another parent", () => {
    const next = moveNode(project, "b", "c");
    expect(next.nodes.a.childrenIds).toEqual(["c"]);
    expect(next.nodes.c.childrenIds).toEqual(["d", "b"]);
  });

  it("moves to root", () => {
    const next = moveNode(project, "b", null);
    expect(next.rootIds).toEqual(["a", "b"]);
    expect(next.nodes.a.childrenIds).toEqual(["c"]);
  });

  it("reorders within parent", () => {
    const next = moveNode(project, "b", "a", 1);
    expect(next.nodes.a.childrenIds).toEqual(["c", "b"]);
  });

  it("throws when moving into itself", () => {
    expect(() => moveNode(project, "a", "a")).toThrow();
  });

  it("throws when moving into descendant", () => {
    expect(() => moveNode(project, "a", "d")).toThrow();
  });

  it("throws on invalid index", () => {
    expect(() => moveNode(project, "b", "a", 10)).toThrow();
  });

  it("throws on unknown parent", () => {
    expect(() => moveNode(project, "b", "x")).toThrow();
  });
});

describe("setStatus", () => {
  const project: Project = {
    version: 1,
    rootIds: ["a"],
    nodes: { a: node("a") },
  };

  it("sets valid status", () => {
    const next = setStatus(project, "a", "done", "t2");
    expect(next.nodes.a.status).toBe("done");
    expect(next.nodes.a.updatedAt).toBe("t2");
  });

  it("throws on invalid status", () => {
    expect(() => setStatus(project, "a", "invalid")).toThrow();
  });
});

describe("setDescriptionPath", () => {
  const project: Project = {
    version: 1,
    rootIds: ["a"],
    nodes: { a: node("a") },
  };

  it("sets path first time", () => {
    const next = setDescriptionPath(project, "a", "descriptions/n_a.md", "t2");
    expect(next.nodes.a.descriptionPath).toBe("descriptions/n_a.md");
    expect(next.nodes.a.updatedAt).toBe("t2");
  });

  it("allows setting same path again", () => {
    const withPath = setDescriptionPath(project, "a", "descriptions/n_a.md", "t2");
    const next = setDescriptionPath(withPath, "a", "descriptions/n_a.md", "t3");
    expect(next.nodes.a.descriptionPath).toBe("descriptions/n_a.md");
    expect(next.nodes.a.updatedAt).toBe("t3");
  });

  it("throws on different path", () => {
    const withPath = setDescriptionPath(project, "a", "descriptions/n_a.md", "t2");
    expect(() => setDescriptionPath(withPath, "a", "descriptions/other.md")).toThrow();
  });
});

describe("createNodeId", () => {
  it("has prefix and correct alphabet", () => {
    const id = createNodeId({});
    expect(id.startsWith("n_")).toBe(true);
    expect(id).toHaveLength(12);
    const tail = id.slice(2);
    const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
    for (const ch of tail) {
      expect(alphabet).toContain(ch);
    }
  });

  it("produces unique ids for 1000 calls", () => {
    const nodes: Record<string, unknown> = {};
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const id = createNodeId(nodes);
      nodes[id] = { id };
      ids.add(id);
    }
    expect(ids.size).toBe(1000);
  });
});

describe("structural sharing", () => {
  it("does not mutate input and creates new nodes map", () => {
    const project: Project = {
      version: 1,
      rootIds: ["a"],
      nodes: { a: node("a") },
    };
    const next = renameNode(project, "a", "New", "t2");
    expect(Object.is(project.nodes, next.nodes)).toBe(false);
    expect(Object.is(project.nodes.a, next.nodes.a)).toBe(false);
    expect(project.nodes.a.title).toBe("A");
  });
});
