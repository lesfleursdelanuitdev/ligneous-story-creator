import { describe, it, expect } from "vitest";
import { normalizeStorySlugInput, slugifyStoryTitle, normalizeStorySlugInputLive } from "../src/utils/story-slug";
import { isStoryMediaUnconfigured, isStoryEmbedUnconfigured } from "../src/utils/story-block-config-status";
import { canInsertNestedColumnsAtDepth, MAX_STORY_COLUMNS_NEST_DEPTH } from "../src/utils/story-columns-depth";
import {
  STORY_BLOCK_SCOPE_ATTR,
  storyBlockScopeSelector,
  sanitizeStoryBlockDesignClassName,
} from "../src/utils/story-block-design";
import type { StoryEmbedBlock, StoryMediaBlock } from "../src/types";

function makeMediaBlock(overrides?: Partial<StoryMediaBlock>): StoryMediaBlock {
  return {
    kind: "media",
    id: "m1",
    mediaId: "",
    label: "Media",
    layoutAlign: "center",
    widthPreset: "medium",
    ...overrides,
  } as StoryMediaBlock;
}

function makeEmbedBlock(overrides?: Partial<StoryEmbedBlock>): StoryEmbedBlock {
  return {
    kind: "embed",
    id: "e1",
    embedKind: "timeline",
    label: "New embed",
    title: undefined,
    layoutAlign: "center",
    widthPreset: "medium",
    ...overrides,
  } as StoryEmbedBlock;
}

describe("story-slug", () => {
  it("slugifies a title to lowercase hyphenated", () => {
    expect(slugifyStoryTitle("Hello World")).toBe("hello-world");
    expect(slugifyStoryTitle("The Gonsalves Family, 1900s")).toMatch(/^the-gonsalves-family/);
  });

  it("normalizeStorySlugInput strips leading/trailing hyphens", () => {
    expect(normalizeStorySlugInput("-hello-world-")).toBe("hello-world");
    expect(normalizeStorySlugInput("  hello  world  ")).toMatch(/hello/);
  });

  it("normalizeStorySlugInputLive allows trailing hyphens (in-progress typing)", () => {
    expect(normalizeStorySlugInputLive("hello-")).toBe("hello-");
    expect(normalizeStorySlugInputLive("hello-world")).toBe("hello-world");
  });
});

describe("story-block-config-status", () => {
  it("isStoryMediaUnconfigured: true when mediaId is empty or missing", () => {
    expect(isStoryMediaUnconfigured(makeMediaBlock({ mediaId: "" }))).toBe(true);
    expect(isStoryMediaUnconfigured(makeMediaBlock({ mediaId: "   " }))).toBe(true);
    expect(isStoryMediaUnconfigured(makeMediaBlock({ mediaId: undefined }))).toBe(true);
  });

  it("isStoryMediaUnconfigured: false when mediaId is set", () => {
    expect(isStoryMediaUnconfigured(makeMediaBlock({ mediaId: "media-uuid-123" }))).toBe(false);
  });

  it("isStoryEmbedUnconfigured: true for default sentinel titles", () => {
    expect(isStoryEmbedUnconfigured(makeEmbedBlock({ label: "New embed", title: undefined }))).toBe(true);
    expect(isStoryEmbedUnconfigured(makeEmbedBlock({ label: "Embed block", title: undefined }))).toBe(true);
    expect(isStoryEmbedUnconfigured(makeEmbedBlock({ label: "", title: "" }))).toBe(true);
  });

  it("isStoryEmbedUnconfigured: false when a real title is set", () => {
    expect(isStoryEmbedUnconfigured(makeEmbedBlock({ title: "The Gonsalves Timeline" }))).toBe(false);
  });
});

describe("story-columns-depth", () => {
  it("MAX_STORY_COLUMNS_NEST_DEPTH is 2", () => {
    expect(MAX_STORY_COLUMNS_NEST_DEPTH).toBe(2);
  });

  it("canInsertNestedColumnsAtDepth allows depth 0 and 1, rejects 2+", () => {
    expect(canInsertNestedColumnsAtDepth(0)).toBe(true);
    expect(canInsertNestedColumnsAtDepth(1)).toBe(true);
    expect(canInsertNestedColumnsAtDepth(2)).toBe(false);
    expect(canInsertNestedColumnsAtDepth(3)).toBe(false);
  });
});

describe("story-block-design", () => {
  it("storyBlockScopeSelector produces a valid CSS selector", () => {
    const sel = storyBlockScopeSelector("block-abc");
    expect(sel).toContain("block-abc");
    expect(sel).toContain(STORY_BLOCK_SCOPE_ATTR);
  });

  it("sanitizeStoryBlockDesignClassName drops fully-invalid tokens, keeps valid ones", () => {
    // Each token is whitelist-validated independently; invalid tokens are dropped entirely.
    const result = sanitizeStoryBlockDesignClassName("valid-class <bad> another-valid");
    expect(result).toBe("valid-class another-valid");
  });

  it("sanitizeStoryBlockDesignClassName returns undefined when all tokens are invalid", () => {
    expect(sanitizeStoryBlockDesignClassName("<script>")).toBeUndefined();
    expect(sanitizeStoryBlockDesignClassName("foo!bar")).toBeUndefined();
  });

  it("sanitizeStoryBlockDesignClassName returns undefined for empty/undefined input", () => {
    expect(sanitizeStoryBlockDesignClassName(undefined)).toBeUndefined();
    expect(sanitizeStoryBlockDesignClassName("   ")).toBeUndefined();
  });
});
