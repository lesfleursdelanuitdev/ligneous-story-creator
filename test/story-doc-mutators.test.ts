import { describe, it, expect } from "vitest";
import type { StoryBlock, StorySection, StoryColumnsBlock, StoryRichTextBlock } from "../src/types";
import {
  insertBlockAtIndex,
  removeBlockById,
  findStoryBlockAnywhere,
  insertBlockRelativeToBlockId,
  duplicateBlockRelativeToBlockId,
  appendBlockIntoContainer,
  patchBlockRowLayoutInSection,
  patchBlockAnnotationsInSection,
} from "../src/utils/story-doc-mutators";

function rich(id: string): StoryRichTextBlock {
  return { id, type: "richText", doc: { type: "doc", content: [] } };
}

function sec(id: string, blocks: StoryBlock[]): StorySection {
  return { id, title: id, blocks };
}

// ── insertBlockAtIndex ───────────────────────────────────────────────────────

describe("insertBlockAtIndex", () => {
  it("inserts at the beginning", () => {
    const s = sec("s", [rich("a"), rich("b")]);
    const next = insertBlockAtIndex(s, 0, rich("x"));
    expect(next.blocks.map((b) => b.id)).toEqual(["x", "a", "b"]);
  });

  it("inserts in the middle", () => {
    const s = sec("s", [rich("a"), rich("b")]);
    const next = insertBlockAtIndex(s, 1, rich("x"));
    expect(next.blocks.map((b) => b.id)).toEqual(["a", "x", "b"]);
  });

  it("inserts at the end when index >= length", () => {
    const s = sec("s", [rich("a"), rich("b")]);
    const next = insertBlockAtIndex(s, 99, rich("x"));
    expect(next.blocks.map((b) => b.id)).toEqual(["a", "b", "x"]);
  });

  it("inserts into empty section", () => {
    const s = sec("s", []);
    const next = insertBlockAtIndex(s, 0, rich("x"));
    expect(next.blocks.map((b) => b.id)).toEqual(["x"]);
  });
});

// ── removeBlockById ──────────────────────────────────────────────────────────

describe("removeBlockById", () => {
  it("removes a top-level block", () => {
    const s = sec("s", [rich("a"), rich("b"), rich("c")]);
    const result = removeBlockById(s, "b");
    expect(result?.section.blocks.map((b) => b.id)).toEqual(["a", "c"]);
  });

  it("returns null when id not found", () => {
    const s = sec("s", [rich("a")]);
    const result = removeBlockById(s, "z");
    expect(result).toBeNull();
  });

  it("removes a block inside a container", () => {
    const container: StoryBlock = {
      id: "ctr",
      type: "container",
      props: {},
      children: [rich("x"), rich("y")],
    };
    const s = sec("s", [container]);
    const result = removeBlockById(s, "x");
    expect(result).not.toBeNull();
    const ctr = result!.section.blocks[0];
    expect(ctr?.type).toBe("container");
    if (ctr?.type === "container") {
      expect(ctr.children.map((b) => b.id)).toEqual(["y"]);
    }
  });
});

// ── findStoryBlockAnywhere ───────────────────────────────────────────────────

describe("findStoryBlockAnywhere", () => {
  it("finds a top-level block", () => {
    const s = sec("s", [rich("a"), rich("b")]);
    expect(findStoryBlockAnywhere(s, "b")?.id).toBe("b");
  });

  it("finds a block inside a container", () => {
    const container: StoryBlock = {
      id: "ctr",
      type: "container",
      props: {},
      children: [rich("nested")],
    };
    const s = sec("s", [container]);
    expect(findStoryBlockAnywhere(s, "nested")?.id).toBe("nested");
  });

  it("returns null when block not found", () => {
    const s = sec("s", [rich("a")]);
    expect(findStoryBlockAnywhere(s, "z")).toBeNull();
  });

  it("finds a block in a columns slot", () => {
    const columns: StoryColumnsBlock = {
      id: "cols",
      type: "columns",
      columns: [
        { id: "col-0", blocks: [rich("left")] },
        { id: "col-1", blocks: [rich("right")] },
      ],
    };
    const s = sec("s", [columns]);
    expect(findStoryBlockAnywhere(s, "right")?.id).toBe("right");
  });
});

// ── insertBlockRelativeToBlockId ─────────────────────────────────────────────

describe("insertBlockRelativeToBlockId", () => {
  it("inserts above the target block", () => {
    const s = sec("s", [rich("a"), rich("b"), rich("c")]);
    const next = insertBlockRelativeToBlockId(s, "b", "above", rich("x"));
    expect(next?.blocks.map((b) => b.id)).toEqual(["a", "x", "b", "c"]);
  });

  it("inserts below the target block", () => {
    const s = sec("s", [rich("a"), rich("b"), rich("c")]);
    const next = insertBlockRelativeToBlockId(s, "b", "below", rich("x"));
    expect(next?.blocks.map((b) => b.id)).toEqual(["a", "b", "x", "c"]);
  });

  it("appends to end when inserting below the last block", () => {
    const s = sec("s", [rich("a"), rich("b")]);
    const next = insertBlockRelativeToBlockId(s, "b", "below", rich("x"));
    expect(next?.blocks.map((b) => b.id)).toEqual(["a", "b", "x"]);
  });

  it("returns null when target block not found", () => {
    const s = sec("s", [rich("a")]);
    const next = insertBlockRelativeToBlockId(s, "z", "below", rich("x"));
    expect(next).toBeNull();
  });
});

// ── duplicateBlockRelativeToBlockId ──────────────────────────────────────────

describe("duplicateBlockRelativeToBlockId", () => {
  it("duplicates a block and inserts it below the original", () => {
    const s = sec("s", [rich("a"), rich("b"), rich("c")]);
    const result = duplicateBlockRelativeToBlockId(s, "b", "below");
    expect(result).not.toBeNull();
    expect(result!.section.blocks).toHaveLength(4);
    expect(result!.section.blocks[1]?.id).toBe("b");
    expect(result!.section.blocks[2]?.id).not.toBe("b");
    expect(result!.section.blocks[3]?.id).toBe("c");
  });

  it("returns null when block not found", () => {
    const s = sec("s", [rich("a")]);
    const result = duplicateBlockRelativeToBlockId(s, "z", "below");
    expect(result).toBeNull();
  });
});

// ── appendBlockIntoContainer ─────────────────────────────────────────────────

describe("appendBlockIntoContainer", () => {
  it("appends a block into the named container", () => {
    const container: StoryBlock = {
      id: "ctr",
      type: "container",
      props: {},
      children: [rich("existing")],
    };
    const s = sec("s", [container]);
    const result = appendBlockIntoContainer(s, "ctr", rich("new"));
    expect(result).not.toBeNull();
    const ctr = result!.blocks[0];
    expect(ctr?.type).toBe("container");
    if (ctr?.type === "container") {
      expect(ctr.children.map((b) => b.id)).toEqual(["existing", "new"]);
    }
  });
});

// ── patchBlockRowLayoutInSection ─────────────────────────────────────────────

describe("patchBlockRowLayoutInSection", () => {
  it("patches the row layout of a richText block", () => {
    const s = sec("s", [rich("a")]);
    const next = patchBlockRowLayoutInSection(s, "a", { widthMode: "narrow", alignment: "right" });
    const block = next.blocks[0] as StoryRichTextBlock;
    expect(block.rowLayout?.widthMode).toBe("narrow");
    expect(block.rowLayout?.alignment).toBe("right");
  });

  it("merges with existing row layout", () => {
    const block: StoryRichTextBlock = { ...rich("a"), rowLayout: { widthMode: "full", alignment: "left" } };
    const s = sec("s", [block]);
    const next = patchBlockRowLayoutInSection(s, "a", { alignment: "center" });
    const patched = next.blocks[0] as StoryRichTextBlock;
    expect(patched.rowLayout?.widthMode).toBe("full");
    expect(patched.rowLayout?.alignment).toBe("center");
  });

  it("returns section unchanged when block not found", () => {
    const s = sec("s", [rich("a")]);
    const next = patchBlockRowLayoutInSection(s, "z", { widthMode: "wide" });
    expect(next).toBe(s);
  });
});

// ── patchBlockAnnotationsInSection ───────────────────────────────────────────

describe("patchBlockAnnotationsInSection", () => {
  it("sets date annotation on a block", () => {
    const s = sec("s", [rich("a")]);
    const next = patchBlockAnnotationsInSection(s, "a", {
      dateAnnotations: [{ date: "1900-01-01", dateDisplay: "January 1, 1900" }],
    });
    const block = next.blocks[0] as StoryRichTextBlock;
    expect(block.dateAnnotation?.date).toBe("1900-01-01");
  });

  it("removes date annotation when set to empty array", () => {
    const block: StoryRichTextBlock = {
      ...rich("a"),
      dateAnnotation: { date: "1900-01-01", dateDisplay: "January 1, 1900" },
    };
    const s = sec("s", [block]);
    const next = patchBlockAnnotationsInSection(s, "a", { dateAnnotations: [] });
    const patched = next.blocks[0] as StoryRichTextBlock;
    expect(patched.dateAnnotation).toBeUndefined();
  });
});
