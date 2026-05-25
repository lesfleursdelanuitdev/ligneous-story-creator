"use client";

import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp } from "lucide-react";
import type { StoryTableBlock, StorySplitContentBlock } from "../../types";
import { cn } from "../../cn";
import { Input } from "../ui/input";
import { CollapsibleFormSection } from "../ui/collapsible-form-section";
import { Checkbox } from "../ui/checkbox";
import { FieldLabel, HelperCard } from "./inspector-primitives";

// ─── TableBlockInspector ──────────────────────────────────────────────────────

export type TableLayoutPatch = Partial<
  Pick<StoryTableBlock, "hasHeaderRow" | "hasHeaderColumn" | "rowCount" | "columnCount" | "widthPct" | "widthAlign">
>;

const TABLE_WIDTH_PRESETS = [
  { pct: 33, label: "33%" },
  { pct: 50, label: "50%" },
  { pct: 66, label: "66%" },
  { pct: 75, label: "75%" },
  { pct: 100, label: "Full" },
] as const;

export function TableBlockInspector({
  block,
  onPatch,
  touchComfort,
}: {
  block: StoryTableBlock;
  onPatch: (patch: TableLayoutPatch) => void;
  touchComfort?: boolean;
}) {
  const widthPct = block.widthPct ?? 100;
  const widthAlign = block.widthAlign ?? "center";
  const bodyRowCount = Math.max(1, block.rowCount ?? 1);
  const bodyColumnCount = Math.max(1, block.columnCount ?? 1);
  const chipH = touchComfort ? "h-9 min-h-[36px]" : "h-8";

  return (
    <div className="space-y-4">
      <HelperCard title="Table">
        Click any cell to edit its rich-text content. Rows/columns below are body counts; enabling headers adds an
        extra top row and/or first column.
      </HelperCard>

      <CollapsibleFormSection title="Body dimensions" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <FieldLabel>Rows</FieldLabel>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  "inline-flex w-8 items-center justify-center rounded-md border border-base-content/15 bg-base-100 text-base-content transition-colors hover:bg-base-200 disabled:opacity-40",
                  chipH,
                )}
                onClick={() => onPatch({ rowCount: Math.max(1, bodyRowCount - 1) })}
                disabled={bodyRowCount <= 1}
              >
                <ArrowDown className="size-3.5" />
              </button>
              <Input
                type="number"
                min={1}
                value={bodyRowCount}
                onChange={(e) => {
                  const next = Number.parseInt(e.currentTarget.value || "", 10);
                  if (Number.isFinite(next)) onPatch({ rowCount: Math.max(1, next) });
                }}
                className={cn(chipH, "text-center")}
              />
              <button
                type="button"
                className={cn(
                  "inline-flex w-8 items-center justify-center rounded-md border border-base-content/15 bg-base-100 text-base-content transition-colors hover:bg-base-200",
                  chipH,
                )}
                onClick={() => onPatch({ rowCount: bodyRowCount + 1 })}
              >
                <ArrowUp className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Columns</FieldLabel>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  "inline-flex w-8 items-center justify-center rounded-md border border-base-content/15 bg-base-100 text-base-content transition-colors hover:bg-base-200 disabled:opacity-40",
                  chipH,
                )}
                onClick={() => onPatch({ columnCount: Math.max(1, bodyColumnCount - 1) })}
                disabled={bodyColumnCount <= 1}
              >
                <ArrowDown className="size-3.5" />
              </button>
              <Input
                type="number"
                min={1}
                value={bodyColumnCount}
                onChange={(e) => {
                  const next = Number.parseInt(e.currentTarget.value || "", 10);
                  if (Number.isFinite(next)) onPatch({ columnCount: Math.max(1, next) });
                }}
                className={cn(chipH, "text-center")}
              />
              <button
                type="button"
                className={cn(
                  "inline-flex w-8 items-center justify-center rounded-md border border-base-content/15 bg-base-100 text-base-content transition-colors hover:bg-base-200",
                  chipH,
                )}
                onClick={() => onPatch({ columnCount: bodyColumnCount + 1 })}
              >
                <ArrowUp className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Headers" defaultOpen>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={block.hasHeaderRow ?? false}
              onCheckedChange={(v) => onPatch({ hasHeaderRow: Boolean(v) })}
            />
            Header row (first row)
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={block.hasHeaderColumn ?? false}
              onCheckedChange={(v) => onPatch({ hasHeaderColumn: Boolean(v) })}
            />
            Header column (first column)
          </label>
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Block width" defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {TABLE_WIDTH_PRESETS.map(({ pct, label }) => (
            <button
              key={pct}
              type="button"
              className={cn(
                "rounded-md border px-2.5 text-xs font-medium transition-colors",
                chipH,
                widthPct === pct
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-base-content/15 bg-base-100 text-base-content hover:bg-base-200",
              )}
              onClick={() => onPatch({ widthPct: pct })}
            >
              {label}
            </button>
          ))}
        </div>
        {widthPct < 100 && (
          <div className="mt-2 flex gap-1.5">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                type="button"
                title={`Align ${a}`}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-md border transition-colors",
                  chipH,
                  widthAlign === a
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-base-content/15 bg-base-100 text-base-content hover:bg-base-200",
                )}
                onClick={() => onPatch({ widthAlign: a })}
              >
                {a === "left" ? (
                  <AlignLeft className="size-3.5" />
                ) : a === "right" ? (
                  <AlignRight className="size-3.5" />
                ) : (
                  <AlignCenter className="size-3.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </CollapsibleFormSection>
    </div>
  );
}

// ─── SplitContentInspector ────────────────────────────────────────────────────

const SPLIT_WIDTH_PRESETS = [
  { pct: 20, label: "20%" },
  { pct: 25, label: "25%" },
  { pct: 33, label: "33%" },
  { pct: 40, label: "40%" },
  { pct: 50, label: "50%" },
] as const;

const SPLIT_GAP_PRESETS = [
  { rem: 0.75, label: "Tight" },
  { rem: 1.5, label: "Normal" },
  { rem: 2.5, label: "Wide" },
] as const;

export function SplitContentInspector({
  block,
  onPatch,
  touchComfort,
}: {
  block: StorySplitContentBlock;
  onPatch: (patch: {
    supportingWidthPct?: number;
    supportingGapRem?: number;
    supportingSide?: "left" | "right";
    supportingFloatPosition?: "top" | "center" | "bottom";
  }) => void;
  touchComfort?: boolean;
}) {
  const chip = touchComfort ? "min-h-11 px-3 text-sm" : "h-9 px-2.5 text-xs";
  const chipBtn = (active: boolean) =>
    cn(
      "rounded-lg border text-center font-semibold uppercase tracking-wide transition-colors",
      chip,
      active
        ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
        : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
    );
  const widthPct = block.supportingWidthPct ?? 33;
  const gapRem = block.supportingGapRem ?? 1.5;
  const side = block.supportingSide ?? "right";

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Panel side</FieldLabel>
        <div className="flex gap-2">
          {(["left", "right"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={cn(chipBtn(side === s), "flex-1 capitalize")}
              onClick={() => onPatch({ supportingSide: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Panel width</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SPLIT_WIDTH_PRESETS.map(({ pct, label }) => (
            <button
              key={pct}
              type="button"
              className={chipBtn(Math.abs(widthPct - pct) <= 2)}
              onClick={() => onPatch({ supportingWidthPct: pct })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Gap</FieldLabel>
        <div className="flex gap-2">
          {SPLIT_GAP_PRESETS.map(({ rem, label }) => (
            <button
              key={rem}
              type="button"
              className={cn(chipBtn(Math.abs(gapRem - rem) < 0.1), "flex-1")}
              onClick={() => onPatch({ supportingGapRem: rem })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
