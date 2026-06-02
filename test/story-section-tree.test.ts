import { describe, it, expect } from "vitest";
import type { StoryDocument, StorySection } from "../src/types";
import {
  findSectionById,
  findSectionPath,
  sectionIsAncestorOf,
  flattenSectionsDepthFirst,
  removeSectionFromTree,
  insertSectionAfterSibling,
  insertSectionBeforeSibling,
  appendChildSection,
  moveSectionInDocument,
  countRootSections,
  normalizeStorySection,
} from "../src/utils/story-section-tree";

function sec(id: string, children?: StorySection[]): StorySection {
  return { id, title: id, blocks: [], children };
}

function doc(sections: StorySection[]): StoryDocument {
  return { version: 1, id: "d1", title: "T", status: "draft", sections, updatedAt: "2026-01-01T00:00:00Z" };
}

// ── normalizeStorySection ────────────────────────────────────────────────────

describe("normalizeStorySection", () => {
  it("fills in missing blocks and children", () => {
    const raw = { id: "s1", title: "s1" } as unknown as StorySection;
    const n = normalizeStorySection(raw);
    expect(Array.isArray(n.blocks)).toBe(true);
    expect(n.blocks).toHaveLength(0);
  });

  it("keeps existing blocks unchanged", () => {
    const s = sec("s1");
    (s as any).blocks = [{ id: "b1", type: "richText" }];
    const n = normalizeStorySection(s);
    expect(n.blocks).toHaveLength(1);
  });
});

// ── findSectionById ──────────────────────────────────────────────────────────

describe("findSectionById", () => {
  it("finds a root section", () => {
    const sections = [sec("a"), sec("b")];
    expect(findSectionById(sections, "b")?.id).toBe("b");
  });

  it("finds a nested section", () => {
    const sections = [sec("root", [sec("child", [sec("grandchild")])])];
    expect(findSectionById(sections, "grandchild")?.id).toBe("grandchild");
  });

  it("returns null when not found", () => {
    expect(findSectionById([sec("a")], "z")).toBeNull();
  });
});

// ── findSectionPath ──────────────────────────────────────────────────────────

describe("findSectionPath", () => {
  it("returns null for empty tree", () => {
    expect(findSectionPath([], "x")).toBeNull();
  });

  it("returns path with null parent for root section", () => {
    const sections = [sec("root")];
    const p = findSectionPath(sections, "root");
    expect(p?.section.id).toBe("root");
    expect(p?.parent).toBeNull();
    expect(p?.breadcrumb).toHaveLength(0);
  });

  it("returns correct parent and breadcrumb for nested section", () => {
    const sections = [sec("root", [sec("child", [sec("leaf")])])];
    const p = findSectionPath(sections, "leaf");
    expect(p?.section.id).toBe("leaf");
    expect(p?.parent?.id).toBe("child");
    expect(p?.breadcrumb.map((s) => s.id)).toEqual(["root", "child"]);
  });
});

// ── sectionIsAncestorOf ──────────────────────────────────────────────────────

describe("sectionIsAncestorOf", () => {
  const sections = [sec("root", [sec("child", [sec("leaf")])])];

  it("root is ancestor of leaf", () => {
    expect(sectionIsAncestorOf(sections, "root", "leaf")).toBe(true);
  });

  it("child is ancestor of leaf", () => {
    expect(sectionIsAncestorOf(sections, "child", "leaf")).toBe(true);
  });

  it("leaf is NOT ancestor of root", () => {
    expect(sectionIsAncestorOf(sections, "leaf", "root")).toBe(false);
  });

  it("section is not its own ancestor", () => {
    expect(sectionIsAncestorOf(sections, "root", "root")).toBe(false);
  });

  it("unrelated sections return false", () => {
    const tree = [sec("a"), sec("b")];
    expect(sectionIsAncestorOf(tree, "a", "b")).toBe(false);
  });
});

// ── flattenSectionsDepthFirst ────────────────────────────────────────────────

describe("flattenSectionsDepthFirst", () => {
  it("returns root sections when no children", () => {
    const flat = flattenSectionsDepthFirst([sec("a"), sec("b")]);
    expect(flat.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("depth-first ordering", () => {
    const sections = [sec("root", [sec("c1"), sec("c2")])];
    const flat = flattenSectionsDepthFirst(sections);
    expect(flat.map((s) => s.id)).toEqual(["root", "c1", "c2"]);
  });

  it("handles null/undefined gracefully", () => {
    expect(flattenSectionsDepthFirst(null)).toEqual([]);
    expect(flattenSectionsDepthFirst(undefined)).toEqual([]);
  });
});

// ── countRootSections ────────────────────────────────────────────────────────

describe("countRootSections", () => {
  it("counts only root-level sections", () => {
    expect(countRootSections([sec("a", [sec("child")]), sec("b")])).toBe(2);
  });

  it("returns 0 for empty", () => {
    expect(countRootSections([])).toBe(0);
  });
});

// ── removeSectionFromTree ────────────────────────────────────────────────────

describe("removeSectionFromTree", () => {
  it("removes a root section", () => {
    const { next, removed } = removeSectionFromTree([sec("a"), sec("b")], "a");
    expect(next.map((s) => s.id)).toEqual(["b"]);
    expect(removed?.id).toBe("a");
  });

  it("removes a nested section", () => {
    const { next, removed } = removeSectionFromTree([sec("root", [sec("child")])], "child");
    expect(next[0]?.children).toBeUndefined();
    expect(removed?.id).toBe("child");
  });

  it("returns null for missing id", () => {
    const { removed } = removeSectionFromTree([sec("a")], "z");
    expect(removed).toBeNull();
  });
});

// ── insertSectionAfterSibling ────────────────────────────────────────────────

describe("insertSectionAfterSibling", () => {
  it("inserts after the specified sibling at root", () => {
    const d = doc([sec("a"), sec("c")]);
    const next = insertSectionAfterSibling(d, "a", sec("b"));
    expect(next.sections.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("inserts at end when afterId is null", () => {
    const d = doc([sec("a")]);
    const next = insertSectionAfterSibling(d, null, sec("b"));
    expect(next.sections.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

// ── insertSectionBeforeSibling ───────────────────────────────────────────────

describe("insertSectionBeforeSibling", () => {
  it("inserts before the specified sibling at root", () => {
    const d = doc([sec("b"), sec("c")]);
    const next = insertSectionBeforeSibling(d, "b", sec("a"));
    expect(next.sections.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
});

// ── appendChildSection ───────────────────────────────────────────────────────

describe("appendChildSection", () => {
  it("appends a child to the target section", () => {
    const d = doc([sec("parent")]);
    const next = appendChildSection(d, "parent", sec("child"));
    const parent = next.sections[0];
    expect(parent?.children?.map((s) => s.id)).toEqual(["child"]);
  });
});

// ── moveSectionInDocument ────────────────────────────────────────────────────

describe("moveSectionInDocument", () => {
  it("moves a root section up", () => {
    const d = doc([sec("a"), sec("b"), sec("c")]);
    const next = moveSectionInDocument(d, "b", "before", "a");
    expect(next.sections.map((s) => s.id)).toEqual(["b", "a", "c"]);
  });

  it("moves a root section down", () => {
    const d = doc([sec("a"), sec("b"), sec("c")]);
    const next = moveSectionInDocument(d, "b", "after", "c");
    expect(next.sections.map((s) => s.id)).toEqual(["a", "c", "b"]);
  });

  it("returns unchanged doc when section is not found", () => {
    const d = doc([sec("a"), sec("b")]);
    const next = moveSectionInDocument(d, "z", "before", "a");
    expect(next.sections.map((s) => s.id)).toEqual(["a", "b"]);
  });
});
