import { describe, it, expect } from "vitest";
import type { StoryBlock, StorySection, StoryColumnsBlock } from "../src/types";
import { moveStoryBlockRelative } from "../src/utils/story-block-move-relative";

function rich(id: string): StoryBlock {
  return { id, type: "richText", doc: { type: "doc", content: [] } };
}

function sec(blocks: StoryBlock[]): StorySection {
  return { id: "s1", title: "s1", blocks };
}

describe("moveStoryBlockRelative — top-level blocks", () => {
  it("moves a block up (-1)", () => {
    const s = sec([rich("a"), rich("b"), rich("c")]);
    const next = moveStoryBlockRelative(s, "b", -1);
    expect(next.blocks.map((b) => b.id)).toEqual(["b", "a", "c"]);
  });

  it("moves a block down (+1)", () => {
    const s = sec([rich("a"), rich("b"), rich("c")]);
    const next = moveStoryBlockRelative(s, "b", 1);
    expect(next.blocks.map((b) => b.id)).toEqual(["a", "c", "b"]);
  });

  it("does not move the first block further up", () => {
    const s = sec([rich("a"), rich("b")]);
    const next = moveStoryBlockRelative(s, "a", -1);
    expect(next.blocks.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("does not move the last block further down", () => {
    const s = sec([rich("a"), rich("b")]);
    const next = moveStoryBlockRelative(s, "b", 1);
    expect(next.blocks.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("returns the original section reference when nothing changes", () => {
    const s = sec([rich("a")]);
    const next = moveStoryBlockRelative(s, "a", -1);
    expect(next).toBe(s);
  });
});

describe("moveStoryBlockRelative — blocks inside container", () => {
  it("moves a block up inside a container", () => {
    const container: StoryBlock = {
      id: "ctr",
      type: "container",
      props: {},
      children: [rich("x"), rich("y"), rich("z")],
    };
    const s = sec([container]);
    const next = moveStoryBlockRelative(s, "y", -1);
    const ctr = next.blocks[0];
    expect(ctr?.type).toBe("container");
    if (ctr?.type === "container") {
      expect(ctr.children.map((b) => b.id)).toEqual(["y", "x", "z"]);
    }
  });
});

describe("moveStoryBlockRelative — blocks inside columns", () => {
  it("moves a block within a column", () => {
    const columns: StoryColumnsBlock = {
      id: "cols",
      type: "columns",
      columns: [
        { id: "col-0", blocks: [rich("p"), rich("q")] },
        { id: "col-1", blocks: [rich("r")] },
      ],
    };
    const s = sec([columns]);
    const next = moveStoryBlockRelative(s, "q", -1);
    const cols = next.blocks[0];
    expect(cols?.type).toBe("columns");
    if (cols?.type === "columns") {
      expect(cols.columns[0]?.blocks.map((b) => b.id)).toEqual(["q", "p"]);
      expect(cols.columns[1]?.blocks.map((b) => b.id)).toEqual(["r"]);
    }
  });
});
