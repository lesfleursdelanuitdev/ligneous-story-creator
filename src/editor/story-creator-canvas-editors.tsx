import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { cn } from "../cn";
import type { StoryRichTextBlock, StorySplitContentBlock } from "../types";
import { getStoryRichTextPreset } from "../types";
import type { StorySelection } from "../utils/story-selection";
import { StoryTipTapEditor } from "./StoryTipTapEditor";
import { StoryVerseBlock } from "./StoryVerseBlock";

/** True when this block is focused — resolveStorySelection uses `section` or `column` depending on tree path. */
export function isStoryChromeBlockSelected(storySelection: StorySelection | null, blockId: string): boolean {
  return !!storySelection && storySelection.block.id === blockId;
}

/** True when story chrome / outline targets this rich-text block, including the parent split row for main text. */
export function isStoryRichTextBlockToolbarSelected(storySelection: StorySelection | null, richTextBlockId: string): boolean {
  if (!storySelection) return false;
  if (isStoryChromeBlockSelected(storySelection, richTextBlockId)) return true;
  const b = storySelection.block;
  return b.type === "splitContent" && b.text.id === richTextBlockId;
}

export const VERSE_WIDTH_SNAPS = [25, 33, 50, 66, 75, 100];

export function snapVerseWidth(pct: number): number {
  for (const s of VERSE_WIDTH_SNAPS) {
    if (Math.abs(pct - s) <= 3) return s;
  }
  return Math.min(100, Math.max(15, Math.round(pct)));
}

const SPLIT_SNAP_POINTS = [20, 25, 33, 40, 50] as const;

export function snapSplitWidth(pct: number): number {
  for (const s of SPLIT_SNAP_POINTS) {
    if (Math.abs(pct - s) <= 3) return s;
  }
  return Math.min(50, Math.max(20, pct));
}

export function StoryCanvasRichTextEditor({
  editorKey,
  rich,
  onJson,
  isLg,
  surface = "canvas",
  syncGlobalToolbarSelection = false,
}: {
  editorKey: string;
  rich: StoryRichTextBlock;
  onJson: (json: JSONContent) => void;
  isLg: boolean;
  /** `canvas`: flat shell inside section canvas. `card`: bordered shell when nested in containers/columns. */
  surface?: "canvas" | "card";
  syncGlobalToolbarSelection?: boolean;
}) {
  const preset = getStoryRichTextPreset(rich);
  return (
    <StoryTipTapEditor
      editorKey={editorKey}
      content={rich.doc}
      onChange={onJson}
      richTextBlockId={rich.id}
      toolbarDensity={isLg ? "default" : "touch"}
      surface={surface}
      richTextPreset={preset}
      listVariant={preset === "list" ? (rich.listVariant ?? "bullet") : undefined}
      quoteStyle={rich.quoteStyle}
      verseSpacing={rich.verseSpacing}
      headingLevel={preset === "heading" ? rich.headingLevel : undefined}
      syncGlobalToolbarSelection={syncGlobalToolbarSelection}
    />
  );
}

export function StoryCanvasVerseResizableEditor({
  editorKey,
  rich,
  onJson,
  isLg,
  surface = "canvas",
  syncGlobalToolbarSelection = false,
  onResizeWidth,
}: {
  editorKey: string;
  rich: StoryRichTextBlock;
  onJson: (json: JSONContent) => void;
  isLg: boolean;
  surface?: "canvas" | "card";
  syncGlobalToolbarSelection?: boolean;
  onResizeWidth?: (pct: number) => void;
}) {
  const preset = getStoryRichTextPreset(rich);
  const showHandles = (preset === "verse" || preset === "quote") && Boolean(onResizeWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startWidthPx: number;
    parentWidthPx: number;
    scopeEl: HTMLElement;
    side: "left" | "right";
  } | null>(null);
  const lastWidthPctRef = useRef(100);

  function onSidePointerDown(e: ReactPointerEvent<HTMLDivElement>, side: "left" | "right") {
    if (!showHandles || !onResizeWidth) return;
    e.stopPropagation();
    e.preventDefault();
    const scopeEl = e.currentTarget.closest<HTMLElement>("[data-story-block-scope]");
    const parentEl = scopeEl?.parentElement;
    if (!scopeEl || !parentEl) return;
    const scopeRect = scopeEl.getBoundingClientRect();
    const parentRect = parentEl.getBoundingClientRect();
    const cs = window.getComputedStyle(parentEl);
    const parentContentWidth = parentRect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    dragRef.current = { startX: e.clientX, startWidthPx: scopeRect.width, parentWidthPx: parentContentWidth, scopeEl, side };
    lastWidthPctRef.current = Math.round((scopeRect.width / parentContentWidth) * 100);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onSidePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    const delta = state.side === "right" ? e.clientX - state.startX : state.startX - e.clientX;
    const pct = Math.min(100, Math.max(15, Math.round(((state.startWidthPx + delta) / state.parentWidthPx) * 100)));
    lastWidthPctRef.current = pct;
    state.scopeEl.style.width = `${pct}%`;
    state.scopeEl.style.maxWidth = "100%";
  }

  function onSidePointerUp() {
    const state = dragRef.current;
    if (!state || !onResizeWidth) return;
    state.scopeEl.style.width = "";
    state.scopeEl.style.maxWidth = "";
    dragRef.current = null;
    setIsDragging(false);
    onResizeWidth(snapVerseWidth(lastWidthPctRef.current));
  }

  const handleClasses = (side: "left" | "right") =>
    cn(
      "absolute inset-y-0 z-20 flex w-4 cursor-col-resize touch-none select-none items-center justify-center opacity-0 transition-opacity duration-150 group-hover/verseresize:opacity-100",
      isDragging && "opacity-100",
      side === "left" ? "-left-2" : "-right-2",
    );

  return (
    <div className={cn("group/verseresize relative min-w-0", showHandles && "px-1")}>
      {showHandles ? (
        <div
          className={handleClasses("left")}
          onPointerDown={(e) => onSidePointerDown(e, "left")}
          onPointerMove={onSidePointerMove}
          onPointerUp={onSidePointerUp}
          onPointerCancel={onSidePointerUp}
        >
          <div className="h-10 w-1 rounded-full bg-primary/60 shadow" />
        </div>
      ) : null}
      {showHandles ? (
        <div
          className={handleClasses("right")}
          onPointerDown={(e) => onSidePointerDown(e, "right")}
          onPointerMove={onSidePointerMove}
          onPointerUp={onSidePointerUp}
          onPointerCancel={onSidePointerUp}
        >
          <div className="h-10 w-1 rounded-full bg-primary/60 shadow" />
        </div>
      ) : null}
      <div className="max-w-full overflow-x-auto">
        {preset === "verse" ? (
          <StoryVerseBlock block={rich} variant="editor" />
        ) : (
          <StoryCanvasRichTextEditor
            editorKey={editorKey}
            rich={rich}
            onJson={onJson}
            isLg={isLg}
            surface={surface}
            syncGlobalToolbarSelection={syncGlobalToolbarSelection}
          />
        )}
      </div>
    </div>
  );
}

export function StorySplitContentEditorLayout({
  block,
  textEditor,
  supportingAside,
  onResizeSupportingWidth,
}: {
  block: StorySplitContentBlock;
  textEditor: ReactNode;
  supportingAside: ReactNode;
  onResizeSupportingWidth?: (pct: number) => void;
}) {
  const containerId = useId().replace(/:/g, "");
  const widthPct = block.supportingWidthPct ?? 33;
  const gapRem = block.supportingGapRem ?? 1.5;
  const side = block.supportingSide ?? "right";
  const floatPos = block.supportingFloatPosition ?? "top";
  const alignSelf = floatPos === "center" ? "center" : floatPos === "bottom" ? "end" : "start";
  const mdGridCols = side === "left" ? `${widthPct}% 1fr` : `1fr ${widthPct}%`;
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{
    startX: number;
    startWidthPx: number;
    containerWidthPx: number;
    containerEl: HTMLElement;
  } | null>(null);
  const lastPctRef = useRef(widthPct);

  function onHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!onResizeSupportingWidth) return;
    e.stopPropagation();
    e.preventDefault();
    const containerEl = e.currentTarget.closest<HTMLElement>("[data-split-container]");
    if (!containerEl) return;
    const containerRect = containerEl.getBoundingClientRect();
    const cs = window.getComputedStyle(containerEl);
    const containerW = containerRect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const railEl = containerEl.querySelector<HTMLElement>("[data-split-rail]");
    const railWidth = railEl ? railEl.getBoundingClientRect().width : (containerW * widthPct) / 100;
    dragState.current = { startX: e.clientX, startWidthPx: railWidth, containerWidthPx: containerW, containerEl };
    lastPctRef.current = widthPct;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    if (!state) return;
    const delta = side === "left" ? e.clientX - state.startX : state.startX - e.clientX;
    const pct = Math.min(50, Math.max(20, Math.round(((state.startWidthPx + delta) / state.containerWidthPx) * 100)));
    lastPctRef.current = pct;
    const cols = side === "left" ? `${pct}% 1fr` : `1fr ${pct}%`;
    state.containerEl.style.gridTemplateColumns = cols;
  }

  function onHandlePointerUp() {
    const state = dragState.current;
    if (!state) return;
    state.containerEl.style.gridTemplateColumns = "";
    dragState.current = null;
    setIsDragging(false);
    onResizeSupportingWidth?.(snapSplitWidth(lastPctRef.current));
  }

  const handleEvents = {
    onPointerDown: onHandlePointerDown,
    onPointerMove: onHandlePointerMove,
    onPointerUp: onHandlePointerUp,
    onPointerCancel: onHandlePointerUp,
  };

  const handleBar = onResizeSupportingWidth ? (
    <div
      className={cn(
        "group/splithandle absolute inset-y-0 z-20 flex w-4 cursor-col-resize touch-none select-none items-center justify-center opacity-0 transition-opacity duration-150 hover:opacity-100",
        isDragging && "opacity-100",
        side === "left" ? "-right-2" : "-left-2",
      )}
      {...handleEvents}
    >
      <div className="h-10 w-1 rounded-full bg-primary/60 shadow" />
    </div>
  ) : null;

  const rail = (
    <div
      data-split-rail
      className="relative rounded-xl border border-neutral-200/95 bg-neutral-50/90 p-3"
      style={{ alignSelf }}
    >
      {handleBar}
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Supporting content</p>
      {supportingAside}
    </div>
  );
  const textCol = <div className="min-w-0" style={{ alignSelf: "stretch" }}>{textEditor}</div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@media (min-width: 768px){[data-split-container="${containerId}"]{display:grid;grid-template-columns:${mdGridCols};column-gap:${gapRem}rem;}}` }} />
      <div data-split-container={containerId} className="flex flex-col gap-4">
        {side === "left" ? rail : textCol}
        {side === "left" ? textCol : rail}
      </div>
    </>
  );
}
