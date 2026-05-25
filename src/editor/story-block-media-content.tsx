"use client";

import { useRef, useState } from "react";
import { cn } from "../cn";
import {
  isLikelyAudioFile,
  isLikelyVideoFile,
  isPlayableAudioRef,
  isPlayableVideoRef,
  mediaThumbSrc,
  normalizeSiteMediaPath,
  preferNativeRasterImgPreview,
  resolveMediaImageSrc,
} from "./media-preview";
import { isStoryMediaUnconfigured } from "../utils/story-block-config-status";
import { effectiveMediaEmbedInspectorRowLayout, storyRowInnerTextAlignClass } from "../utils/story-block-layout";
import { StoryAssetWithTitleCaption } from "../utils/story-block-text-layout";
import type { StoryMediaBlock } from "../types";
import { useStoryEditorMediaOptional } from "./media-context";
import { Button } from "./ui/button";
import { ImageIcon, Settings } from "lucide-react";
import { StoryCaptionRichTextDisplay } from "./StoryCaptionRichText";

export type MediaBlockContentVariant = "editor" | "preview";

const THUMB_W = { editor: 800, preview: 1200 } as const;

const SNAP_POINTS = [25, 33, 50, 66, 75, 100];

function snapWidth(pct: number): number {
  for (const s of SNAP_POINTS) {
    if (Math.abs(pct - s) <= 3) return s;
  }
  return pct;
}

type DragState = { kind: "width"; startX: number; startWidthPx: number; parentWidthPx: number; scopeEl: HTMLElement; side: "left" | "right" };

export function MediaBlockContentRenderer({
  block,
  variant,
  compact,
  onConfigure,
  onResizeWidth,
}: {
  block: StoryMediaBlock;
  variant: MediaBlockContentVariant;
  compact?: boolean;
  onConfigure?: () => void;
  onResizeWidth?: (pct: number) => void;
  onResizeHeight?: (px: number | undefined) => void;
}) {
  const mediaCtx = useStoryEditorMediaOptional();
  const mediaQuery = mediaCtx?.useMediaById(block.mediaId || undefined);
  const data = mediaQuery?.data;
  const isLoading = mediaQuery?.isLoading ?? false;

  const alignClass = storyRowInnerTextAlignClass(effectiveMediaEmbedInspectorRowLayout(block));
  const isEditor = variant === "editor";
  const thumbW = isEditor ? THUMB_W.editor : THUMB_W.preview;

  const labelTrim = block.label?.trim() ?? "";
  const captionTrim = block.caption?.trim() ?? "";
  const titleDisplay = labelTrim || (isEditor ? "Untitled media" : "");
  const captionDisplay = captionTrim || (isEditor ? "No caption" : "");
  const showTitleSlot = !block.hideTitle && (isEditor || Boolean(labelTrim));
  const showCaptionSlot = !block.hideCaption && (isEditor || Boolean(captionTrim));

  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<DragState | null>(null);
  const lastWidthPctRef = useRef(100);

  const resolvedFileRef = data?.fileRef?.trim() || null;
  const [loadedFileRef, setLoadedFileRef] = useState<string | null>(null);
  const imgLoaded = resolvedFileRef != null && loadedFileRef === resolvedFileRef;

  function onSidePointerDown(e: React.PointerEvent<HTMLDivElement>, side: "left" | "right") {
    if (!onResizeWidth) return;
    e.stopPropagation();
    e.preventDefault();
    const scopeEl = e.currentTarget.closest<HTMLElement>("[data-story-block-scope]");
    const parentEl = scopeEl?.parentElement;
    if (!scopeEl || !parentEl) return;
    const scopeRect = scopeEl.getBoundingClientRect();
    const parentRect = parentEl.getBoundingClientRect();
    const cs = window.getComputedStyle(parentEl);
    const parentContentWidth = parentRect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    dragState.current = { kind: "width", startX: e.clientX, startWidthPx: scopeRect.width, parentWidthPx: parentContentWidth, scopeEl, side };
    lastWidthPctRef.current = Math.round((scopeRect.width / parentContentWidth) * 100);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onSidePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    if (!state || state.kind !== "width") return;
    const delta = state.side === "right" ? e.clientX - state.startX : state.startX - e.clientX;
    const pct = Math.min(100, Math.max(15, Math.round(((state.startWidthPx + delta) / state.parentWidthPx) * 100)));
    lastWidthPctRef.current = pct;
    state.scopeEl.style.width = `${pct}%`;
    state.scopeEl.style.maxWidth = "100%";
  }

  function onSidePointerUp() {
    const state = dragState.current;
    if (!state || state.kind !== "width") return;
    state.scopeEl.style.width = "";
    state.scopeEl.style.maxWidth = "";
    dragState.current = null;
    setIsDragging(false);
    onResizeWidth?.(snapWidth(lastWidthPctRef.current));
  }

  if (compact && isEditor && isStoryMediaUnconfigured(block) && onConfigure) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-base-content/10 bg-base-200/30 py-2 pl-2 pr-2 ring-1 ring-base-content/[0.04] sm:gap-2.5 sm:pl-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-base-content/10 bg-base-100/50">
          <ImageIcon className="size-4 text-base-content/35" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight text-base-content">Media</p>
          <p className="mt-0.5 text-[11px] leading-snug text-base-content/50">No media selected</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium"
          onClick={(e) => {
            e.stopPropagation();
            onConfigure();
          }}
        >
          Choose media
        </Button>
      </div>
    );
  }

  const fileRef = data?.fileRef?.trim() ? data.fileRef : "";
  const form = data?.form ?? null;
  const thumb = fileRef !== "" ? mediaThumbSrc(fileRef, form, thumbW) ?? resolveMediaImageSrc(fileRef) : null;
  const directSrc = fileRef ? resolveMediaImageSrc(fileRef) : null;
  const normalizedRef = fileRef ? normalizeSiteMediaPath(fileRef).trim() : "";
  const streamSrc = normalizedRef && (normalizedRef.startsWith("/") || normalizedRef.startsWith("http")) ? normalizedRef : null;
  const alt = labelTrim || data?.title?.trim() || "Story media";
  const nativeImg = fileRef ? preferNativeRasterImgPreview(fileRef, form) : false;

  const videoOk = Boolean(fileRef && isLikelyVideoFile(fileRef, form) && isPlayableVideoRef(fileRef));
  const audioOk = Boolean(fileRef && isLikelyAudioFile(fileRef, form) && isPlayableAudioRef(fileRef));
  const videoSrc = videoOk ? directSrc ?? streamSrc : null;
  const audioSrc = audioOk ? directSrc ?? streamSrc : null;

  const fixedHeight = block.heightPx != null ? block.heightPx : null;

  let asset: React.ReactNode;

  if (videoOk && videoSrc) {
    asset = (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-base-content/10 ring-1 ring-base-content/[0.06]"
        style={fixedHeight ? { height: fixedHeight } : undefined}
      >
        <video src={videoSrc} className={cn("w-full", fixedHeight ? "h-full object-cover" : "")} controls playsInline preload="metadata" />
      </div>
    );
  } else if (audioOk && audioSrc) {
    asset = <audio src={audioSrc} className="w-full rounded-xl" controls preload="metadata" />;
  } else if (thumb) {
    const imgSrc = nativeImg ? (directSrc ?? thumb) : thumb;
    asset = (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-base-content/10 bg-transparent ring-1 ring-base-content/[0.06]"
        style={fixedHeight ? { height: fixedHeight } : undefined}
      >
        {!imgLoaded && (
          <div
            className={cn(
              "w-full bg-base-200/60",
              fixedHeight ? "absolute inset-0" : "aspect-video animate-pulse",
            )}
            aria-hidden
          />
        )}
        <img
          src={imgSrc}
          alt={alt}
          className={cn(
            "block w-full transition-opacity duration-300",
            fixedHeight ? "h-full object-cover" : "h-auto",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoadedFileRef(resolvedFileRef)}
        />
      </div>
    );
  } else {
    asset = (
      <div
        className="w-full overflow-hidden rounded-xl border border-base-content/10 ring-1 ring-base-content/[0.06]"
        style={fixedHeight ? { height: fixedHeight } : undefined}
      >
        {isLoading && block.mediaId ? (
          <div className="aspect-video w-full animate-pulse bg-base-200/60" aria-hidden />
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-1 bg-base-200/45 p-3 text-center text-xs leading-snug text-base-content/45" style={{ minHeight: "8rem" }}>
            {isEditor ? (
              <span>No media selected — use the inspector to pick a file.</span>
            ) : (
              <span className="text-base-content/40">No media attached</span>
            )}
          </div>
        )}
      </div>
    );
  }

  const titleNode = showTitleSlot ? (
    <p className="text-sm font-semibold tracking-tight text-neutral-900">{titleDisplay}</p>
  ) : null;

  const captionNode = showCaptionSlot ? (
    <StoryCaptionRichTextDisplay caption={captionDisplay} className="text-neutral-500" />
  ) : null;

  const showHandles = isEditor && !compact && Boolean(onResizeWidth);
  const sideHandleBase = cn(
    "absolute inset-y-0 z-20 flex w-4 cursor-col-resize touch-none select-none items-center justify-center opacity-0 transition-opacity duration-150 group-hover/mediaresize:opacity-100",
    isDragging && "opacity-100",
  );

  return (
    <figure className={cn("group/mediaresize relative min-w-0", alignClass)}>
      {showHandles && onResizeWidth && (
        <div
          className={cn(sideHandleBase, "-left-2")}
          onPointerDown={(e) => onSidePointerDown(e, "left")}
          onPointerMove={onSidePointerMove}
          onPointerUp={onSidePointerUp}
          onPointerCancel={onSidePointerUp}
        >
          <div className="h-10 w-1 rounded-full bg-primary/60 shadow" />
        </div>
      )}
      {showHandles && onResizeWidth && (
        <div
          className={cn(sideHandleBase, "-right-2")}
          onPointerDown={(e) => onSidePointerDown(e, "right")}
          onPointerMove={onSidePointerMove}
          onPointerUp={onSidePointerUp}
          onPointerCancel={onSidePointerUp}
        >
          <div className="h-10 w-1 rounded-full bg-primary/60 shadow" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-3">
        <StoryAssetWithTitleCaption
          titlePlacement={block.titlePlacement}
          captionPlacement={block.captionPlacement}
          titleClassName="min-w-0 w-full max-w-full text-center"
          captionClassName="min-w-0 w-full max-w-full text-center"
          asset={asset}
          title={titleNode}
          caption={captionNode}
        />
        {isEditor && isStoryMediaUnconfigured(block) && onConfigure ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-11 min-h-[44px] w-fit gap-2 rounded-xl border-base-content/12 px-4 text-sm font-medium lg:h-9 lg:min-h-0 lg:rounded-lg lg:px-3"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure();
            }}
          >
            <Settings className="size-3.5 opacity-90" aria-hidden />
            Configure media
          </Button>
        ) : null}
      </div>
    </figure>
  );
}
