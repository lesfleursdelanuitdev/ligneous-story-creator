import { describe, it, expect } from "vitest";
import {
  createRichTextBlock,
  createMediaBlock,
  createEmbedBlock,
  createColumnsBlock,
  createDividerBlock,
  createTableBlock,
  createContainerBlock,
  createDefaultSectionBlocks,
  cloneStoryBlock,
} from "../src/utils/story-block-factory";

describe("createRichTextBlock", () => {
  it("creates a richText block with a unique id", () => {
    const a = createRichTextBlock();
    const b = createRichTextBlock();
    expect(a.type).toBe("richText");
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it("has a valid TipTap doc structure", () => {
    const block = createRichTextBlock();
    expect(block.doc.type).toBe("doc");
    expect(Array.isArray(block.doc.content)).toBe(true);
  });
});

describe("createMediaBlock", () => {
  it("creates a media block", () => {
    const block = createMediaBlock();
    expect(block.type).toBe("media");
    expect(block.id).toBeTruthy();
  });
});

describe("createEmbedBlock", () => {
  it("defaults to document kind", () => {
    const block = createEmbedBlock();
    expect(block.type).toBe("embed");
    expect(block.embedKind).toBe("document");
  });

  it("creates with specified kind", () => {
    expect(createEmbedBlock("timeline").embedKind).toBe("timeline");
    expect(createEmbedBlock("personSpotlight").embedKind).toBe("personSpotlight");
  });
});

describe("createColumnsBlock", () => {
  it("creates a columns block with two columns", () => {
    const block = createColumnsBlock();
    expect(block.type).toBe("columns");
    expect(block.columns).toHaveLength(2);
    expect(block.columns[0]?.blocks).toEqual([]);
    expect(block.columns[1]?.blocks).toEqual([]);
  });

  it("sets default 50/50 width percents", () => {
    const block = createColumnsBlock();
    expect(block.columnWidthPercents).toEqual([50, 50]);
  });
});

describe("createDividerBlock", () => {
  it("creates a divider with default variant", () => {
    const block = createDividerBlock();
    expect(block.type).toBe("divider");
    expect(block.id).toBeTruthy();
  });
});

describe("createTableBlock", () => {
  it("creates a 3×3 table by default (body rows × cols, plus header row)", () => {
    const block = createTableBlock();
    expect(block.type).toBe("table");
    // cells is a 2D array: [rows][cols] where total rows = bodyRows + hasHeaderRow
    expect(block.cells).toHaveLength(4); // 3 body + 1 header
    expect(block.cells[0]).toHaveLength(3);
  });

  it("respects custom row and column counts (no header row)", () => {
    const block = createTableBlock(2, 4, false);
    expect(block.cells).toHaveLength(2);
    expect(block.cells[0]).toHaveLength(4);
  });

  it("includes header row when hasHeaderRow is true", () => {
    const block = createTableBlock(2, 3, true);
    expect(block.hasHeaderRow).toBe(true);
    expect(block.cells).toHaveLength(3); // 2 body + 1 header
  });
});

describe("createContainerBlock", () => {
  it("creates a container with no children", () => {
    const block = createContainerBlock();
    expect(block.type).toBe("container");
    expect(block.children).toEqual([]);
  });
});

describe("createDefaultSectionBlocks", () => {
  it("returns at least one block", () => {
    const blocks = createDefaultSectionBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  it("wraps content in a container block", () => {
    const blocks = createDefaultSectionBlocks();
    expect(blocks[0]?.type).toBe("container");
  });

  it("container holds a richText block as its first child", () => {
    const blocks = createDefaultSectionBlocks();
    const container = blocks[0];
    expect(container?.type).toBe("container");
    if (container?.type === "container") {
      expect(container.children[0]?.type).toBe("richText");
    }
  });
});

describe("cloneStoryBlock", () => {
  it("produces a new id different from the original", () => {
    const original = createRichTextBlock();
    const clone = cloneStoryBlock(original);
    expect(clone.type).toBe("richText");
    expect(clone.id).not.toBe(original.id);
  });

  it("clones columns block and gives new ids to columns", () => {
    const original = createColumnsBlock();
    original.columns[0]!.blocks.push(createRichTextBlock());
    const clone = cloneStoryBlock(original);
    expect(clone.id).not.toBe(original.id);
    if (clone.type === "columns") {
      expect(clone.columns).toHaveLength(2);
      clone.columns.forEach((col, i) => {
        expect(col.id).not.toBe(original.columns[i]?.id);
      });
    }
  });

  it("deep-clones nested container children with new ids", () => {
    const child = createRichTextBlock();
    const container = createContainerBlock();
    container.children.push(child);
    const clone = cloneStoryBlock(container);
    expect(clone.id).not.toBe(container.id);
    if (clone.type === "container") {
      expect(clone.children[0]?.id).not.toBe(child.id);
    }
  });
});
