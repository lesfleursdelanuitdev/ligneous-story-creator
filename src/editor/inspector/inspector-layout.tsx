"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/core";
import type {
  StoryDividerBlock,
  StoryDividerVariant,
  StoryBlockRowLayout,
  StoryRichTextBlock,
  StoryBlockRowAlignment,
  StoryVerseLineLayout,
  StoryContainerBlock,
  StoryContainerBlockProps,
  StoryContainerPreset,
  StoryContainerWidth,
  StoryColumnsBlock,
  StoryColumnSlot,
  StoryColumnNestedBlock,
  StoryColumnsMobileBehavior,
  StoryBlockDateAnnotation,
  StoryBlockPlaceAnnotation,
} from "../../types";
import {
  getStoryDividerPreset,
  getStoryRichTextPreset,
  type StoryRichTextTextPreset,
} from "../../types";
import type { StoryDividerMetaPatch, StoryRichTextMetaPatch } from "../../utils/story-doc-mutators";
import {
  effectiveRowLayout,
  effectiveRowLayoutForRichText,
  effectiveContainerRowLayout,
  mergeStoryRowLayout,
} from "../../utils/story-block-layout";
import {
  normalizeColumnWidthPercents,
  advancedColumnLayoutEnabled,
  resolveColumnGapRem,
  resolveColumnStackGapRem,
  resolveColumnStackJustify,
  resolveColumnsMobileBehavior,
  resolveColumnWidthPercents,
  STORY_COLUMN_STACK_GAP_PRESETS,
  STORY_COLUMN_STACK_JUSTIFY_PRESETS,
  STORY_COLUMNS_GAP_PRESETS,
} from "../../utils/story-columns-layout";
import { MAX_STORY_COLUMNS_NEST_DEPTH } from "../../utils/story-columns-depth";
import { resolveContainerVisualProps } from "../../utils/story-container-preset-styles";
import { verseTextFromTipTapDoc } from "../../utils/story-verse";
import { cn } from "../../cn";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { CollapsibleFormSection } from "../ui/collapsible-form-section";
import { StoryTipTapEditor } from "../StoryTipTapEditor";
import { useStoryEditorMediaOptional, type StoryEditorMediaContextValue } from "../media-context";
import { mediaThumbSrc, resolveMediaImageSrc } from "../media-preview";
import { FieldLabel, HelperCard, BlockDateAnnotationInspector, StoryBlockRowLayoutInspector } from "./inspector-primitives";
import { ImageIcon, ChevronRight, Trash2 } from "lucide-react";

// ─── DividerBlockInspector ────────────────────────────────────────────────────

const DIVIDER_PRESET_OPTIONS: StoryDividerVariant[] = ["line", "ornamental", "spacer", "sectionBreak"];

export function DividerBlockInspector({
  block,
  onPatch,
  onPatchRowLayout,
  touchComfort,
}: {
  block: StoryDividerBlock;
  onPatch: (patch: StoryDividerMetaPatch) => void;
  onPatchRowLayout: (patch: Partial<StoryBlockRowLayout>) => void;
  touchComfort?: boolean;
}) {
  const pr = getStoryDividerPreset(block);
  const controlH = touchComfort ? "min-h-11 h-11" : "h-10";
  const chip = touchComfort ? "min-h-11 px-3 text-sm" : "h-9 px-2.5 text-xs";
  const chipBtn = (active: boolean) =>
    cn(
      "rounded-lg border text-center font-semibold uppercase tracking-wide transition-colors",
      chip,
      active
        ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
        : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
    );

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Divider preset</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIVIDER_PRESET_OPTIONS.map((p) => (
            <button key={p} type="button" className={chipBtn(pr === p)} onClick={() => onPatch({ preset: p, variant: p })}>
              {p}
            </button>
          ))}
        </div>
      </div>
      {pr === "spacer" ? (
        <div>
          <FieldLabel>Height (rem)</FieldLabel>
          <Input
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            className={cn("input input-bordered input-sm mt-2 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            value={block.spacerRem ?? 2}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              onPatch({ spacerRem: Math.min(24, Math.max(0.5, n)) });
            }}
          />
        </div>
      ) : null}
      {pr === "ornamental" ? (
        <div>
          <FieldLabel>Ornamental style</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["diamonds", "dots"] as const).map((s) => (
              <button key={s} type="button" className={chipBtn((block.ornamentalStyle ?? "diamonds") === s)} onClick={() => onPatch({ ornamentalStyle: s })}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {pr !== "spacer" ? (
        <div>
          <FieldLabel>Thickness (px)</FieldLabel>
          <Input
            type="number"
            min={1}
            max={8}
            step={1}
            className={cn("input input-bordered input-sm mt-2 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            value={block.dividerThicknessPx ?? 1}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              onPatch({ dividerThicknessPx: Math.min(8, Math.max(1, Math.round(n))) });
            }}
          />
        </div>
      ) : null}
      <StoryBlockRowLayoutInspector rowLayout={effectiveRowLayout(block.rowLayout)} onPatch={onPatchRowLayout} touchComfort={touchComfort} />
    </div>
  );
}

// ─── RichTextBlockInspector ───────────────────────────────────────────────────

const RICH_TEXT_PRESET_OPTIONS: StoryRichTextTextPreset[] = ["paragraph", "heading", "list", "verse", "quote"];

export function RichTextBlockInspector({
  block,
  onPatch,
  onPatchRowLayout,
  touchComfort,
}: {
  block: StoryRichTextBlock;
  onPatch: (patch: StoryRichTextMetaPatch) => void;
  onPatchRowLayout: (patch: Partial<StoryBlockRowLayout>) => void;
  touchComfort?: boolean;
}) {
  const preset = getStoryRichTextPreset(block);
  const controlH = touchComfort ? "min-h-11 h-11" : "h-10";
  const chip = touchComfort ? "min-h-11 px-3 text-sm" : "h-9 px-2.5 text-xs";
  const rowLayout = effectiveRowLayoutForRichText(block.rowLayout);
  const alignmentOptions: StoryBlockRowAlignment[] = ["left", "center", "right"];
  const lineLayoutOptions: { value: StoryVerseLineLayout; label: string }[] = [
    { value: "normal", label: "Normal" },
    { value: "staggered", label: "Staggered" },
  ];
  const chipBtn = (active: boolean) =>
    cn(
      "rounded-lg border text-center font-semibold uppercase tracking-wide transition-colors",
      chip,
      active
        ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
        : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
    );

  return (
    <div className="space-y-4">
      {block.headingPresetLocked ? (
        <HelperCard title="Heading (fixed preset)">
          This block was added from full-screen <strong className="font-semibold text-base-content">Add block</strong> as a heading. It
          stays a heading; use <strong className="font-semibold text-base-content">Heading level</strong> below to change H1–H6.
        </HelperCard>
      ) : block.listPresetLocked ? (
        <HelperCard title="List (fixed preset)">
          This block was added from <strong className="font-semibold text-base-content">Add block</strong> as a list. It stays a list; use{" "}
          <strong className="font-semibold text-base-content">List style</strong> below for bullets vs numbered.
        </HelperCard>
      ) : (
        <div>
          <FieldLabel>Text preset</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {RICH_TEXT_PRESET_OPTIONS.map((p) => (
              <button key={p} type="button" className={chipBtn(preset === p)} onClick={() => onPatch({ preset: p })}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
      {preset === "heading" ? (
        <div>
          <FieldLabel>Heading level</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
              <button key={lvl} type="button" className={chipBtn((block.headingLevel ?? 2) === lvl)} onClick={() => onPatch({ headingLevel: lvl })}>
                H{lvl}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {preset === "list" ? (
        <div>
          <FieldLabel>List style</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["bullet", "ordered"] as const).map((lv) => (
              <button key={lv} type="button" className={chipBtn((block.listVariant ?? "bullet") === lv)} onClick={() => onPatch({ listVariant: lv })}>
                {lv === "bullet" ? "Bullets" : "Numbered"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {preset === "quote" ? (
        <>
          <div>
            <FieldLabel>Attribution</FieldLabel>
            <Input
              className={cn("input input-bordered input-sm mt-2 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
              placeholder="Name or source (optional)"
              value={block.quoteAttribution ?? ""}
              onChange={(e) => onPatch({ quoteAttribution: e.target.value.trim() ? e.target.value : undefined })}
            />
          </div>
          <div>
            <FieldLabel>Quote style</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["simple", "card"] as const).map((s) => (
                <button key={s} type="button" className={chipBtn((block.quoteStyle ?? "simple") === s)} onClick={() => onPatch({ quoteStyle: s })}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {preset === "verse" ? (
        <div className="space-y-4 rounded-xl border border-base-content/10 bg-base-100/45 p-3">
          <div>
            <FieldLabel>Verse title</FieldLabel>
            <Input
              className={cn("input input-bordered input-sm mt-2 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
              placeholder="Optional title"
              value={block.verseTitle ?? ""}
              onChange={(e) => onPatch({ verseTitle: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Verse content</FieldLabel>
            <StoryTipTapEditor
              editorKey={`verse-inspector-${block.id}`}
              content={block.doc as JSONContent}
              onChange={(doc) => onPatch({ doc, verseContent: verseTextFromTipTapDoc(doc) })}
              richTextBlockId={block.id}
              placeholder="Enter each verse line on its own line"
              className="mt-2"
              toolbarDensity={touchComfort ? "touch" : "default"}
              surface="card"
              richTextPreset="verse"
              enableGlobalToolbar={false}
            />
            <p className="mt-2 text-xs leading-relaxed text-base-content/55">
              Use the toolbar for inline formatting, person links, and removing links. Each paragraph is treated as a verse line.
            </p>
          </div>
          <div>
            <FieldLabel>Block alignment</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {alignmentOptions.map((align) => (
                <button
                  key={align}
                  type="button"
                  className={chipBtn((rowLayout.alignment ?? "center") === align)}
                  onClick={() => onPatchRowLayout({ alignment: align, displayMode: "block", float: undefined })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Title alignment</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {alignmentOptions.map((align) => (
                <button
                  key={align}
                  type="button"
                  className={chipBtn((block.verseTitleAlign ?? "center") === align)}
                  onClick={() => onPatch({ verseTitleAlign: align })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Content alignment</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {alignmentOptions.map((align) => (
                <button
                  key={align}
                  type="button"
                  className={chipBtn((block.verseContentAlign ?? "center") === align)}
                  onClick={() => onPatch({ verseContentAlign: align })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Line layout</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {lineLayoutOptions.map((layout) => (
                <button
                  key={layout.value}
                  type="button"
                  className={chipBtn((block.verseLineLayout ?? "normal") === layout.value)}
                  onClick={() => onPatch({ verseLineLayout: layout.value })}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Line spacing</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["compact", "relaxed"] as const).map((s) => (
                <button key={s} type="button" className={chipBtn((block.verseSpacing ?? "relaxed") === s)} onClick={() => onPatch({ verseSpacing: s })}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <StoryBlockRowLayoutInspector
        rowLayout={rowLayout}
        onPatch={(patch) => onPatchRowLayout({ ...patch, displayMode: "block", float: undefined })}
        touchComfort={touchComfort}
      />
    </div>
  );
}

// ─── ContainerLayoutInspector ─────────────────────────────────────────────────

export function ContainerLayoutInspector({
  block,
  onPatch,
  touchComfort,
}: {
  block: StoryContainerBlock;
  onPatch: (patch: Partial<StoryContainerBlockProps>) => void;
  touchComfort?: boolean;
}) {
  const p = block.props;
  const r = resolveContainerVisualProps(block);
  const controlH = touchComfort ? "min-h-11 h-11" : "h-10";
  const chip = touchComfort ? "min-h-11 px-3 text-sm" : "h-9 px-2.5 text-xs";

  const chipBtn = (active: boolean) =>
    cn(
      "rounded-lg border text-center font-semibold uppercase tracking-wide transition-colors",
      chip,
      active
        ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
        : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
    );

  const layoutPresets: StoryContainerPreset[] = ["default", "card", "callout", "quote"];
  const presetLabel = (v: StoryContainerPreset) => (v === "default" ? "Default" : v.charAt(0).toUpperCase() + v.slice(1));

  return (
    <div className="space-y-4">
      <HelperCard title="Container">
        Groups blocks with shared layout. The label is only shown in the editor, not in the published story.
      </HelperCard>
      {block.containerPresetLocked ? (
        <HelperCard title={`${presetLabel(r.preset)} (fixed preset)`}>
          Added from <strong className="font-semibold text-base-content">Add block</strong> as {presetLabel(r.preset)}. The layout
          preset cannot be changed; background, padding, border, and width below still apply.
        </HelperCard>
      ) : (
        <div>
          <FieldLabel>Layout preset</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {layoutPresets.map((v) => (
              <button key={v} type="button" className={chipBtn(r.preset === v)} onClick={() => onPatch({ preset: v })}>
                {presetLabel(v)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <FieldLabel>Label (editor only)</FieldLabel>
        <Input
          className={cn("input input-bordered input-sm mt-2 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
          placeholder={'Optional — e.g. "Callout"'}
          value={p.label ?? ""}
          onChange={(e) => onPatch({ label: e.target.value ? e.target.value : undefined })}
        />
      </div>
      <div>
        <FieldLabel>Background</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["none", "subtle", "custom"] as const).map((v) => (
            <button key={v} type="button" className={chipBtn(r.background === v)} onClick={() => onPatch({ background: v })}>
              {v === "none" ? "None" : v === "subtle" ? "Subtle" : "Custom"}
            </button>
          ))}
        </div>
      </div>
      {p.background === "custom" ? (
        <div>
          <FieldLabel>Custom color (CSS)</FieldLabel>
          <Input
            className={cn("input input-bordered input-sm mt-2 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            placeholder="e.g. oklch(0.9 0.02 250) or #e8e4df"
            value={p.customBackground ?? ""}
            onChange={(e) => onPatch({ customBackground: e.target.value || undefined })}
          />
        </div>
      ) : null}
      <div>
        <FieldLabel>Padding</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["none", "sm", "md", "lg"] as const).map((v) => (
            <button key={v} type="button" className={chipBtn(r.padding === v)} onClick={() => onPatch({ padding: v })}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Border</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["none", "subtle", "dashed"] as const).map((v) => (
            <button key={v} type="button" className={chipBtn(r.border === v)} onClick={() => onPatch({ border: v })}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <StoryBlockRowLayoutInspector
        rowLayout={effectiveContainerRowLayout(p)}
        onPatch={(patch) => {
          const nextRl = mergeStoryRowLayout(effectiveContainerRowLayout(p), patch);
          const wm = nextRl.widthMode ?? "full";
          let width: StoryContainerWidth = "normal";
          if (wm === "full") width = "full";
          else if (wm === "wide") width = "wide";
          else if (wm === "narrow") width = "narrow";
          else if (wm === "medium") width = "normal";
          onPatch({
            rowLayout: nextRl,
            width,
            align: (nextRl.alignment ?? "center") as NonNullable<StoryContainerBlockProps["align"]>,
          });
        }}
        touchComfort={touchComfort}
      />
    </div>
  );
}

// ─── ColumnsLayoutInspector ───────────────────────────────────────────────────

function nestedBlockSummary(nb: StoryColumnNestedBlock): string {
  if (nb.type === "richText") return "Rich text";
  if (nb.type === "media") return "Media";
  if (nb.type === "columns") return "Columns (2)";
  if (nb.type === "container") return nb.props.label?.trim() || "Container";
  if (nb.type === "table") return "Table";
  if (nb.type === "splitContent") return "Split content";
  return `Embed (${nb.embedKind})`;
}

function nestedBlockShortSummary(nb: StoryColumnNestedBlock): string {
  if (nb.type === "richText") return "Text";
  if (nb.type === "media") return "Media";
  if (nb.type === "columns") return "Columns";
  if (nb.type === "container") return "Container";
  if (nb.type === "table") return "Table";
  if (nb.type === "splitContent") return "Split";
  return "Embed";
}

function columnSlotSummary(slot: StoryColumnsBlock["columns"][0]): string {
  const n = slot.blocks.length;
  if (n === 0) return "Empty";
  if (n === 1) return nestedBlockSummary(slot.blocks[0]!);
  if (n === 2) return `${nestedBlockShortSummary(slot.blocks[0]!)} + ${nestedBlockShortSummary(slot.blocks[1]!)}`;
  return `${n} blocks`;
}

function splitMatchesCurrent(current: [number, number], preset: [number, number]): boolean {
  return Math.abs(current[0] - preset[0]) <= 1 && Math.abs(current[1] - preset[1]) <= 1;
}

function ColumnThumbnailConnected({
  mediaId,
  useMediaById,
}: {
  mediaId: string;
  useMediaById: StoryEditorMediaContextValue["useMediaById"];
}) {
  const { data } = useMediaById(mediaId);
  const thumb =
    data?.fileRef != null && data.fileRef !== ""
      ? mediaThumbSrc(data.fileRef, data.form, 96) ?? resolveMediaImageSrc(data.fileRef)
      : null;
  if (!thumb) return null;
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb} alt="" className="size-full object-cover" />
    </div>
  );
}

function ColumnContentsCard({
  slot,
  label,
  onEdit,
  useMediaById,
}: {
  slot: StoryColumnSlot;
  label: string;
  onEdit?: () => void;
  useMediaById?: StoryEditorMediaContextValue["useMediaById"] | undefined;
}) {
  const only = slot.blocks.length === 1 ? slot.blocks[0] : null;
  const mediaId = only?.type === "media" ? only.mediaId : undefined;

  return (
    <div className="rounded-xl border border-base-content/10 bg-base-100/55 p-3 shadow-sm ring-1 ring-base-content/[0.03]">
      <div className="flex items-start gap-3">
        {mediaId && useMediaById ? (
          <ColumnThumbnailConnected mediaId={mediaId} useMediaById={useMediaById} />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-base-content/10 bg-base-200/40">
            <ImageIcon className="size-5 text-base-content/35" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-base-content">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-base-content/60">Contains: {columnSlotSummary(slot)}</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:pointer-events-none disabled:opacity-45"
            onClick={onEdit}
            disabled={!onEdit}
          >
            {slot.blocks.length === 0 ? "Add content" : "Edit contents"} <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ColumnsLayoutInspector({
  block,
  nestingDepth,
  onPatch,
  onPatchColumnSlot,
  onEditColumnContent,
  onPatchBlockDateAnnotation,
  onDeleteBlock,
  touchComfort,
}: {
  block: StoryColumnsBlock;
  nestingDepth: number;
  onPatch: (patch: Partial<Pick<StoryColumnsBlock, "columnWidthPercents" | "columnGapRem" | "mobileBehavior" | "advancedColumnLayoutEnabled">>) => void;
  onPatchColumnSlot: (columnIndex: 0 | 1, patch: Partial<Pick<StoryColumnSlot, "stackJustify" | "stackGapRem">>) => void;
  onEditColumnContent?: (columnIndex: 0 | 1) => void;
  onPatchBlockDateAnnotation?: (next: { dateAnnotations?: StoryBlockDateAnnotation[]; placeAnnotations?: StoryBlockPlaceAnnotation[] }) => void;
  onDeleteBlock?: () => void;
  touchComfort?: boolean;
}) {
  const [w0, w1] = resolveColumnWidthPercents(block);
  const gapRem = resolveColumnGapRem(block);
  const mobileBehavior = resolveColumnsMobileBehavior(block);
  const [contextPanel, setContextPanel] = useState<"datesPlaces" | null>(null);
  const chip = touchComfort ? "min-h-11 px-3 text-sm" : "h-9 px-2.5 text-xs";
  const current: [number, number] = [w0, w1];
  const advancedColumnLayout = advancedColumnLayoutEnabled(block);
  const sharedStackGap = resolveColumnStackGapRem(block.columns[0]);
  const mediaCtx = useStoryEditorMediaOptional();

  const chipBtn = (active: boolean) =>
    cn(
      "rounded-lg border text-center font-semibold uppercase tracking-wide transition-colors",
      chip,
      active
        ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
        : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
    );

  const widthPresets: { label: string; percents: [number, number] }[] = [
    { label: "Equal", percents: [50, 50] },
    { label: "Left wide", percents: [60, 40] },
    { label: "Right wide", percents: [40, 60] },
    { label: "Left feature", percents: [67, 33] },
    { label: "Right feature", percents: [33, 67] },
    { label: "Left narrow", percents: [25, 75] },
    { label: "Right narrow", percents: [75, 25] },
  ];

  const mobileOptions: { label: string; value: StoryColumnsMobileBehavior }[] = [
    { label: "Stack left first", value: "stackLeftFirst" },
    { label: "Stack right first", value: "stackRightFirst" },
    { label: "Keep side by side", value: "keepSideBySide" },
  ];

  const applySharedStackGap = (gap: number) => {
    onPatchColumnSlot(0, { stackGapRem: gap });
    onPatchColumnSlot(1, { stackGapRem: gap });
  };

  const dateCount = (block.dateAnnotations?.length ?? 0) + (block.dateAnnotations?.length ? 0 : block.dateAnnotation ? 1 : 0);
  const placeCount = block.placeAnnotations?.length ?? 0;
  const contextRows: Array<{ label: string; count: number; enabled: boolean }> = [
    { label: "People", count: 0, enabled: false },
    { label: "Families", count: 0, enabled: false },
    { label: "Events", count: 0, enabled: false },
    { label: "Places", count: placeCount, enabled: true },
    { label: "Dates", count: dateCount, enabled: true },
    { label: "Notes / Keywords", count: 0, enabled: false },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-base-content/10 bg-base-100/50 p-4 shadow-sm ring-1 ring-base-content/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Columns</p>
            <h3 className="mt-1 text-sm font-semibold text-base-content">Display content in side-by-side columns.</h3>
          </div>
          <span className="rounded-full border border-base-content/10 bg-base-200/50 px-2.5 py-1 text-[11px] font-semibold text-base-content/60">
            Depth {nestingDepth} of {MAX_STORY_COLUMNS_NEST_DEPTH}
          </span>
        </div>
      </div>

      <CollapsibleFormSection title="Summary" defaultOpen>
        <p className="mb-3 text-xs leading-relaxed text-base-content/55">Two side-by-side content areas.</p>
        <div className="overflow-hidden rounded-lg border border-base-content/10 bg-base-200/30 text-[11px] font-semibold text-base-content/70">
          <div className="flex h-9">
            <div className="flex items-center justify-center bg-primary/15 text-primary" style={{ width: `${w0}%` }}>
              Left {w0}%
            </div>
            <div className="flex items-center justify-center bg-base-100/80" style={{ width: `${w1}%` }}>
              Right {w1}%
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          <p>
            <span className="font-semibold text-base-content">Left:</span>{" "}
            <span className="text-base-content/70">{columnSlotSummary(block.columns[0])}</span>
          </p>
          <p>
            <span className="font-semibold text-base-content">Right:</span>{" "}
            <span className="text-base-content/70">{columnSlotSummary(block.columns[1])}</span>
          </p>
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Layout" defaultOpen>
        <FieldLabel>Column width balance</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {widthPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={chipBtn(splitMatchesCurrent(current, preset.percents))}
              onClick={() => onPatch({ columnWidthPercents: normalizeColumnWidthPercents(preset.percents) })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <FieldLabel>Custom balance</FieldLabel>
          <div className="mb-2 text-xs font-medium text-base-content/60">
            Left {w0}% · Right {w1}%
          </div>
          <input
            type="range"
            min={15}
            max={85}
            step={1}
            value={w0}
            className="range range-primary range-sm w-full"
            aria-valuetext={`Left ${w0}%, right ${w1}%`}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              onPatch({ columnWidthPercents: normalizeColumnWidthPercents([next, 100 - next]) });
            }}
          />
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Spacing" defaultOpen>
        <div>
          <FieldLabel>Gap between columns</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {STORY_COLUMNS_GAP_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={chipBtn(Math.abs(gapRem - preset.gapRem) < 0.05)}
                onClick={() => onPatch({ columnGapRem: preset.gapRem })}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Spacing inside columns</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {STORY_COLUMN_STACK_GAP_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={chipBtn(Math.abs(sharedStackGap - preset.gapRem) < 0.05)}
                onClick={() => applySharedStackGap(preset.gapRem)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Contents" defaultOpen>
        <div className="grid gap-3">
          {([0, 1] as const).map((colIdx) => (
            <ColumnContentsCard
              key={block.columns[colIdx].id}
              slot={block.columns[colIdx]}
              label={colIdx === 0 ? "Left Column" : "Right Column"}
              onEdit={() => onEditColumnContent?.(colIdx)}
              useMediaById={mediaCtx?.useMediaById}
            />
          ))}
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Mobile Behavior" defaultOpen>
        <p className="mb-3 text-xs leading-relaxed text-base-content/55">When the screen is narrow:</p>
        <div className="grid gap-2">
          {mobileOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={chipBtn(mobileBehavior === option.value)}
              onClick={() => onPatch({ mobileBehavior: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Block Context" defaultOpen={false}>
        <p className="mb-3 text-xs leading-relaxed text-base-content/55">
          Hidden context for this block. Used by timelines, maps, search, and related-content views. This does not appear
          directly in the story.
        </p>
        <div className="divide-y divide-base-content/10 rounded-lg border border-base-content/10 bg-base-100/50">
          {contextRows.map(({ label, count, enabled }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 font-medium text-base-content">{label}</span>
              <span className="text-xs font-semibold tabular-nums text-base-content/55">{count}</span>
              {enabled ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => setContextPanel((cur) => (cur === "datesPlaces" ? null : "datesPlaces"))}
                >
                  Manage
                </button>
              ) : (
                <span className="rounded-full bg-base-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-base-content/45">
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>
        {contextPanel === "datesPlaces" && onPatchBlockDateAnnotation ? (
          <div className="mt-3">
            <BlockDateAnnotationInspector
              title="Manage dates and places"
              defaultOpen
              dateAnnotations={block.dateAnnotations}
              legacyDateAnnotation={block.dateAnnotation}
              placeAnnotations={block.placeAnnotations}
              onCommit={onPatchBlockDateAnnotation}
              touchComfort={touchComfort}
            />
          </div>
        ) : null}
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Advanced" defaultOpen={false}>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-content/10 bg-base-100/50 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-2 border-base-content/45 bg-base-100 accent-primary"
            checked={advancedColumnLayout}
            onChange={(e) => onPatch({ advancedColumnLayoutEnabled: e.target.checked })}
          />
          <span>
            <span className="font-medium text-base-content">Customize each column separately</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-base-content/55">
              Enable per-column spacing and vertical alignment overrides.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-base-content/10 bg-base-100/40 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-base-content/35 bg-base-100 accent-primary"
            checked
            readOnly
          />
          <span>
            <span className="font-medium text-base-content">Equal height columns</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-base-content/55">
              Columns already share the same row height in the editor and preview.
            </span>
          </span>
        </label>
        {advancedColumnLayout ? (
          <div className="space-y-3">
            {([0, 1] as const).map((colIdx) => {
              const slot = block.columns[colIdx];
              const justify = resolveColumnStackJustify(slot);
              const stackGap = resolveColumnStackGapRem(slot);
              return (
                <div key={slot.id} className="space-y-3 rounded-lg border border-base-content/10 bg-base-100/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
                    {colIdx === 0 ? "Left column" : "Right column"}
                  </p>
                  <div>
                    <FieldLabel>Vertical alignment</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {STORY_COLUMN_STACK_JUSTIFY_PRESETS.map((preset) => (
                        <button
                          key={`${colIdx}-${preset.value}`}
                          type="button"
                          title={preset.hint}
                          className={chipBtn(justify === preset.value)}
                          onClick={() => onPatchColumnSlot(colIdx, { stackJustify: preset.value })}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Space between blocks</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {STORY_COLUMN_STACK_GAP_PRESETS.map((preset) => (
                        <button
                          key={`${colIdx}-gap-${preset.label}`}
                          type="button"
                          className={chipBtn(Math.abs(stackGap - preset.gapRem) < 0.05)}
                          onClick={() => onPatchColumnSlot(colIdx, { stackGapRem: preset.gapRem })}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CollapsibleFormSection>

      {onDeleteBlock ? (
        <div className="border-t border-base-content/10 pt-4">
          <CollapsibleFormSection title="Danger Zone" defaultOpen={false}>
            <p className="mb-3 text-xs leading-relaxed text-base-content/55">Delete columns block. This action cannot be undone.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "w-full gap-2 rounded-lg border-error/40 font-medium text-error hover:border-error/55 hover:bg-error/10",
                touchComfort ? "min-h-[44px] h-11" : "h-10",
              )}
              onClick={onDeleteBlock}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </Button>
          </CollapsibleFormSection>
        </div>
      ) : null}
    </div>
  );
}
