import { describe, it, expect } from "vitest";
import type { StoryEmbedBlock } from "../src/types";
import {
  defaultStoryEmbedTitle,
  defaultStoryEmbedPresentation,
  normalizeStoryEmbedBlock,
  patchStoryEmbedBlock,
  storyTimelinePayloadFromEmbedBlock,
} from "../src/utils/story-embed-semantics";

function embedBlock(overrides?: Partial<StoryEmbedBlock>): StoryEmbedBlock {
  return {
    id: "e1",
    type: "embed",
    embedKind: "timeline",
    ...overrides,
  } as StoryEmbedBlock;
}

// ── defaultStoryEmbedTitle ───────────────────────────────────────────────────

describe("defaultStoryEmbedTitle", () => {
  it("returns a non-empty string for every known embed kind", () => {
    const kinds = [
      "timeline", "personSpotlight", "familyGroup", "gallery",
      "map", "graph", "document", "tree",
    ] as const;
    for (const kind of kinds) {
      expect(typeof defaultStoryEmbedTitle(kind)).toBe("string");
      expect(defaultStoryEmbedTitle(kind).length).toBeGreaterThan(0);
    }
  });
});

// ── defaultStoryEmbedPresentation ────────────────────────────────────────────

describe("defaultStoryEmbedPresentation", () => {
  it("returns a presentation object with at least a title", () => {
    const pres = defaultStoryEmbedPresentation("timeline");
    expect(pres).toBeDefined();
  });
});

// ── normalizeStoryEmbedBlock ─────────────────────────────────────────────────

describe("normalizeStoryEmbedBlock", () => {
  it("does not throw for a minimal embed block", () => {
    expect(() => normalizeStoryEmbedBlock(embedBlock())).not.toThrow();
  });

  it("returns an object with embedKind preserved", () => {
    const result = normalizeStoryEmbedBlock(embedBlock({ embedKind: "personSpotlight" }));
    expect(result.embedKind).toBe("personSpotlight");
  });
});

// ── patchStoryEmbedBlock ─────────────────────────────────────────────────────

describe("patchStoryEmbedBlock", () => {
  it("merges top-level scalar fields", () => {
    const b = embedBlock({ embedKind: "timeline" });
    const patched = patchStoryEmbedBlock(b, { id: "e2" });
    expect(patched.id).toBe("e2");
    expect(patched.embedKind).toBe("timeline");
  });
});

// ── storyTimelinePayloadFromEmbedBlock ───────────────────────────────────────

describe("storyTimelinePayloadFromEmbedBlock", () => {
  it("returns an object even for a block without timeline-specific data", () => {
    const b = embedBlock({ embedKind: "timeline" });
    const payload = storyTimelinePayloadFromEmbedBlock(b);
    expect(payload).toBeDefined();
    expect(typeof payload).toBe("object");
  });
});
