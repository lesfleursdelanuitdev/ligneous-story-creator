import { ChevronDown } from "lucide-react";
import { cn } from "../cn";
import type { StoryBlock, StoryMediaBlock } from "../types";
import {
  STORY_ADD_BLOCK_PRESET_GROUPS,
  STORY_SPLIT_SUPPORT_ADD_PRESET_IDS,
  storyBlockDisplayLabel,
} from "../utils/story-block-presets";
import { mergeMediaEmbedRowLayoutPatch } from "../utils/story-media-embed-layout-sync";
import { StoryBlockRowDesignWrap } from "./StoryBlockDesignWrap";
import { StoryDividerEditorChrome } from "./StoryDividerEditorChrome";
import { StoryEditorBlockFrame } from "./StoryEditorBlockFrame";
import { StoryTableBlockEditor } from "./story-block-table-editor";
import { EmbedCanvasCard, MediaEmbedCanvasCard } from "./story-creator-canvas-cards";
import {
  isStoryChromeBlockSelected,
  isStoryRichTextBlockToolbarSelected,
  StoryCanvasVerseResizableEditor,
  StorySplitContentEditorLayout,
} from "./story-creator-canvas-editors";
import { StoryNestedColumnsGrid } from "./story-creator-columns-grid";
import { StorySectionContainerInner } from "./story-creator-container-inner";
import { useStoryCanvasOps } from "./story-creator-canvas-ops-context";
import { StorySplitSupportBlockSectionChrome } from "./story-creator-split-support-chrome";
import { buttonVariants } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

function storyAddPresetLabel(id: string): string {
  for (const g of STORY_ADD_BLOCK_PRESET_GROUPS) {
    const it = g.items.find((x) => x.id === id);
    if (it) return it.label;
  }
  return id;
}

export type StoryEditorSectionBlockCardProps = {
  sectionId: string;
  block: StoryBlock;
  patchMediaBlock?: (sectionId: string, blockId: string, patch: Partial<StoryMediaBlock>) => void;
  patchSplitContentBlock?: (
    sectionId: string,
    blockId: string,
    patch: {
      supportingWidthPct?: number;
      supportingGapRem?: number;
      supportingSide?: "left" | "right";
      supportingFloatPosition?: "top" | "center" | "bottom";
    },
  ) => void;
};

export function StoryEditorSectionBlockCard({
  sectionId,
  block,
  patchMediaBlock,
  patchSplitContentBlock,
}: StoryEditorSectionBlockCardProps) {
  const {
    isLg,
    storySelection,
    setSelectedBlockId,
    setInspectorTab,
    setInspectorOpen,
    setBlockSettingsSheetOpen,
    updateRichBlock,
    patchRichBlockRowLayout,
    openBlockPlacement,
    removeBlock,
    moveBlock,
    appendSplitSupportingPreset,
    tableOps,
  } = useStoryCanvasOps();

  const selected = isStoryChromeBlockSelected(storySelection, block.id);
  const placementVariant = block.type === "container" ? "container" : ("section" as const);
  const allowNested = true;

  const openInspector = () => {
    setSelectedBlockId(block.id);
    setInspectorTab("block");
    if (isLg) setInspectorOpen(true);
    else setBlockSettingsSheetOpen(true);
  };

  function renderBlock(child: StoryBlock) {
    return (
      <StoryEditorSectionBlockCard
        sectionId={sectionId}
        block={child}
        patchMediaBlock={patchMediaBlock}
        patchSplitContentBlock={patchSplitContentBlock}
      />
    );
  }

  return (
    <StoryEditorBlockFrame
      block={block}
      frameLabel={storyBlockDisplayLabel(block)}
      selected={selected}
      isLg={isLg}
      visualQuietContainer={block.type === "container"}
      onSelect={() => { setSelectedBlockId(block.id); setInspectorTab("block"); }}
      onAddAbove={() => openBlockPlacement({ flow: "add", targetBlockId: block.id, variant: placementVariant, allowNestedColumns: allowNested, initialAddPosition: "above" })}
      onAddBelow={() => openBlockPlacement({ flow: "add", targetBlockId: block.id, variant: placementVariant, allowNestedColumns: allowNested, initialAddPosition: "below" })}
      onAddInsideContainer={
        block.type === "container"
          ? () => openBlockPlacement({ flow: "add", targetBlockId: block.children?.[0]?.id ?? block.id, variant: "container", allowNestedColumns: allowNested })
          : undefined
      }
      onDuplicate={() => openBlockPlacement({ flow: "duplicate", targetBlockId: block.id, variant: placementVariant, allowNestedColumns: allowNested })}
      onDelete={() => removeBlock(sectionId, block.id)}
      onOpenInspector={openInspector}
      onMove={(dir) => moveBlock(sectionId, block.id, dir)}
      contentClassName={cn(block.type === "richText" && "pb-4 pt-5")}
    >
      {block.type === "richText" ? (
        <StoryCanvasVerseResizableEditor
          editorKey={`${sectionId}-${block.id}`}
          rich={block}
          onJson={(json) => updateRichBlock(sectionId, block.id, json)}
          isLg={isLg}
          syncGlobalToolbarSelection={isStoryRichTextBlockToolbarSelected(storySelection, block.id)}
          onResizeWidth={(pct) =>
            patchRichBlockRowLayout(sectionId, block.id, {
              widthMode: pct >= 100 ? "full" : "custom",
              widthValue: pct >= 100 ? undefined : pct,
              widthUnit: "%",
              displayMode: "block",
              float: undefined,
            })
          }
        />
      ) : block.type === "columns" ? (
        <StoryNestedColumnsGrid sectionId={sectionId} columnsBlock={block} depth={1} />
      ) : block.type === "divider" ? (
        <StoryDividerEditorChrome block={block} />
      ) : block.type === "table" ? (
        tableOps ? (
          <StoryTableBlockEditor block={block} ops={tableOps(sectionId, block.id)} />
        ) : (
          <div className="rounded-xl border border-neutral-200/95 bg-neutral-50/90 p-4 text-sm text-neutral-400">Table</div>
        )
      ) : block.type === "splitContent" ? (
        <StorySplitContentEditorLayout
          block={block}
          onResizeSupportingWidth={
            patchSplitContentBlock
              ? (pct) => patchSplitContentBlock(sectionId, block.id, { supportingWidthPct: pct })
              : undefined
          }
          textEditor={
            <div className="pb-4 pt-5">
              <StoryCanvasVerseResizableEditor
                editorKey={`${sectionId}-${block.text.id}`}
                rich={block.text}
                onJson={(json) => updateRichBlock(sectionId, block.text.id, json)}
                isLg={isLg}
                syncGlobalToolbarSelection={isStoryRichTextBlockToolbarSelected(storySelection, block.text.id)}
                onResizeWidth={(pct) =>
                  patchRichBlockRowLayout(sectionId, block.text.id, {
                    widthMode: pct >= 100 ? "full" : "custom",
                    widthValue: pct >= 100 ? undefined : pct,
                    widthUnit: "%",
                    displayMode: "block",
                    float: undefined,
                  })
                }
              />
            </div>
          }
          supportingAside={
            <div className="space-y-2">
              {block.supporting.blocks.length === 0 ? (
                <p className="text-center text-xs text-base-content/45">Nothing in the supporting area yet.</p>
              ) : (
                block.supporting.blocks.map((sb) => (
                  <StorySplitSupportBlockSectionChrome
                    key={sb.id}
                    sectionId={sectionId}
                    sb={sb}
                    supportPlacementVariant="section"
                    allowNestedColumns={allowNested}
                    chromeDepth={2}
                    columnsNestedDepth={1}
                    renderColumnsGrid={(colBlock, d) => (
                      <StoryNestedColumnsGrid sectionId={sectionId} columnsBlock={colBlock} depth={d} />
                    )}
                  />
                ))
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full gap-2 border-base-content/15 font-medium")}
                >
                  Add to supporting area
                  <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 min-w-[12rem] overflow-y-auto">
                  {STORY_SPLIT_SUPPORT_ADD_PRESET_IDS.map((id) => (
                    <DropdownMenuItem key={id} className="font-medium" onClick={() => appendSplitSupportingPreset(sectionId, block.id, id)}>
                      {storyAddPresetLabel(id)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      ) : block.type === "media" ? (
        <MediaEmbedCanvasCard
          block={block}
          onConfigure={openInspector}
          onResizeWidth={
            patchMediaBlock
              ? (pct) =>
                  patchMediaBlock(
                    sectionId,
                    block.id,
                    mergeMediaEmbedRowLayoutPatch(block as StoryMediaBlock, {
                      widthMode: pct >= 100 ? "full" : "custom",
                      widthValue: pct >= 100 ? undefined : pct,
                      widthUnit: "%",
                    }),
                  )
              : undefined
          }
          onResizeHeight={patchMediaBlock ? (px) => patchMediaBlock(sectionId, block.id, { heightPx: px }) : undefined}
        />
      ) : block.type === "embed" ? (
        <EmbedCanvasCard block={block} onConfigure={openInspector} />
      ) : block.type === "container" ? (
        <StorySectionContainerInner nest={block} sectionId={sectionId} renderBlock={renderBlock} />
      ) : null}
    </StoryEditorBlockFrame>
  );
}

/** Wraps `StoryEditorSectionBlockCard` with `StoryBlockRowDesignWrap` for use in the section canvas loop. */
export function StoryEditorSectionBlockCardRow({
  sectionId,
  block,
  patchMediaBlock,
  patchSplitContentBlock,
}: StoryEditorSectionBlockCardProps) {
  return (
    <StoryBlockRowDesignWrap block={block} floated={false}>
      <StoryEditorSectionBlockCard
        sectionId={sectionId}
        block={block}
        patchMediaBlock={patchMediaBlock}
        patchSplitContentBlock={patchSplitContentBlock}
      />
    </StoryBlockRowDesignWrap>
  );
}
