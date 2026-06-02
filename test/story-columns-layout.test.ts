import { describe, it, expect } from "vitest";
import {
  normalizeColumnWidthPercents,
  resolveColumnGapRem,
  resolveColumnsMobileBehavior,
  resolveColumnsLayoutMode,
  DEFAULT_COLUMN_WIDTH_PERCENTS,
  DEFAULT_COLUMN_GAP_REM,
  DEFAULT_COLUMNS_MOBILE_BEHAVIOR,
} from "../src/utils/story-columns-layout";
import type { StoryColumnsBlock } from "../src/types";

function colsBlock(overrides?: Partial<StoryColumnsBlock>): StoryColumnsBlock {
  return {
    id: "c1",
    type: "columns",
    columns: [
      { id: "col-0", blocks: [] },
      { id: "col-1", blocks: [] },
    ],
    ...overrides,
  };
}

// ── normalizeColumnWidthPercents ─────────────────────────────────────────────

describe("normalizeColumnWidthPercents", () => {
  it("returns default when input is invalid", () => {
    expect(normalizeColumnWidthPercents([0, 0])).toEqual(DEFAULT_COLUMN_WIDTH_PERCENTS);
    expect(normalizeColumnWidthPercents([-10, 110] as [number, number])).toEqual(DEFAULT_COLUMN_WIDTH_PERCENTS);
  });

  it("normalizes to 100% total", () => {
    const result = normalizeColumnWidthPercents([30, 70]);
    expect(result[0] + result[1]).toBe(100);
  });

  it("clamps columns that are too narrow (< 5%)", () => {
    expect(normalizeColumnWidthPercents([2, 98])).toEqual(DEFAULT_COLUMN_WIDTH_PERCENTS);
  });

  it("rounds to integer percents that sum to 100", () => {
    const [a, b] = normalizeColumnWidthPercents([60, 40]);
    expect(a).toBe(60);
    expect(b).toBe(40);
  });

  it("handles equal split", () => {
    const result = normalizeColumnWidthPercents([50, 50]);
    expect(result).toEqual([50, 50]);
  });
});

// ── resolveColumnGapRem ──────────────────────────────────────────────────────

describe("resolveColumnGapRem", () => {
  it("returns default when gap is not set", () => {
    expect(resolveColumnGapRem(colsBlock())).toBe(DEFAULT_COLUMN_GAP_REM);
  });

  it("returns the configured gap", () => {
    expect(resolveColumnGapRem(colsBlock({ columnGapRem: 2 }))).toBe(2);
  });

  it("clamps to maximum 6", () => {
    expect(resolveColumnGapRem(colsBlock({ columnGapRem: 100 }))).toBe(6);
  });

  it("returns default for negative values", () => {
    expect(resolveColumnGapRem(colsBlock({ columnGapRem: -1 }))).toBe(DEFAULT_COLUMN_GAP_REM);
  });
});

// ── resolveColumnsMobileBehavior ─────────────────────────────────────────────

describe("resolveColumnsMobileBehavior", () => {
  it("returns default when not set", () => {
    expect(resolveColumnsMobileBehavior(colsBlock())).toBe(DEFAULT_COLUMNS_MOBILE_BEHAVIOR);
  });

  it("returns stackRightFirst when configured", () => {
    expect(resolveColumnsMobileBehavior(colsBlock({ mobileBehavior: "stackRightFirst" }))).toBe("stackRightFirst");
  });

  it("returns keepSideBySide when configured", () => {
    expect(resolveColumnsMobileBehavior(colsBlock({ mobileBehavior: "keepSideBySide" }))).toBe("keepSideBySide");
  });
});

// ── resolveColumnsLayoutMode ─────────────────────────────────────────────────

describe("resolveColumnsLayoutMode", () => {
  it("returns 'stacked' on narrow screens regardless of block config", () => {
    expect(resolveColumnsLayoutMode(colsBlock(), true)).toBe("stacked");
  });

  it("returns 'two-column' on wide screens", () => {
    expect(resolveColumnsLayoutMode(colsBlock(), false)).toBe("two-column");
  });
});
