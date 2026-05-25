import { Fragment, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../cn";
import type { StoryBlock, StoryColumnNestedBlock, StoryColumnsBlock, StoryContainerBlock } from "../types";
import { getStoryContainerPreset } from "../types";
import { groupColumnNestedBlocksForLayout, groupStoryBlocksForLayout } from "../utils/story-block-layout";
import {
  STORY_ADD_BLOCK_PRESET_GROUPS,
  STORY_SPLIT_SUPPORT_ADD_PRESET_IDS,
  createColumnNestedBlockFromPreset,
  storyBlockDisplayLabel,
} from "../utils/story-block-presets";
import { MAX_STORY_COLUMNS_NEST_DEPTH } from "../utils/story-columns-depth";
import {
  DEFAULT_COLUMN_STACK_GAP_REM,
  advancedColumnLayoutEnabled,
  orderedColumnSlots,
  resolveColumnGapRem,
  resolveColumnsLayoutMode,
  storyColumnSharedStackStyle,
  storyColumnStackStyle,
  storyColumnsGridStyle,
} from "../utils/story-columns-layout";
import {
  getContainerClasses,
  getContainerCustomBackgroundStyle,
  getContainerPresetEmptyHint,
} from "../utils/story-container-preset-styles";
import { StoryBlockRowDesignWrap } from "./StoryBlockDesignWrap";
import { StoryColumnInsertAffordance } from "./StoryColumnInsertAffordance";
import { StoryDividerEditorChrome } from "./StoryDividerEditorChrome";
import { StoryEditorBlockFrame } from "./StoryEditorBlockFrame";
import { EmbedCanvasCard, MediaEmbedCanvasCard } from "./story-creator-canvas-cards";
import {
  isStoryChromeBlockSelected,
  isStoryRichTextBlockToolbarSelected,
  StoryCanvasVerseResizableEditor,
  StorySplitContentEditorLayout,
} from "./story-creator-canvas-editors";
import { useStoryCanvasOps } from "./story-creator-canvas-ops-context";
import { StorySplitSupportBlockSectionChrome } from "./story-creator-split-support-chrome";
import { StoryTableBlockEditor } from "./story-block-table-editor";
import { buttonVariants } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

function storyAddPresetLabel(id: string): string {
  for (const g of STORY_ADD_BLOCK_PRESET_GROUPS) {
    const it = g.items.find((x) => x.id === id);
    if (it) return it.label;
  }
  return id;
}

export type StoryNestedColumnsGridProps = {
  sectionId: string;
  columnsBlock: StoryColumnsBlock;
  /** 1 = first columns under the section; 2 = columns nested inside a column. */
  depth: number;
};

export function StoryNestedColumnsGrid({ sectionId, columnsBlock, depth }: StoryNestedColumnsGridProps) {
  const {
    isLg,
    isSm,
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
    appendIntoContainer,
    appendSplitSupportingPreset,
    insertColumnNested,
    tableOps,
  } = useStoryCanvasOps();

  const allowNestedColumns = depth < MAX_STORY_COLUMNS_NEST_DEPTH;
  const narrowLayout = !isSm;
  const layoutMode = resolveColumnsLayoutMode(columnsBlock, narrowLayout);
  const gapRem = resolveColumnGapRem(columnsBlock);
  const useAdvancedColumnLayout = advancedColumnLayoutEnabled(columnsBlock);
  const sharedStackGapRem = columnsBlock.columns[0]?.stackGapRem ?? DEFAULT_COLUMN_STACK_GAP_REM;
  const gridStyle: CSSProperties =
    depth >= 2
      ? { ...storyColumnsGridStyle(columnsBlock, layoutMode), gap: `${Math.max(0.35, gapRem * 0.65)}rem` }
      : storyColumnsGridStyle(columnsBlock, layoutMode);
  const cellPad = depth >= 2 ? "p-2 sm:p-2.5" : "p-3";
  const cellMinH = depth >= 2 ? "min-h-[8rem]" : "min-h-[10rem]";
  const cellBorder = depth >= 2 ? "border-black/20 ring-primary/10" : "border-black/20 hover:border-black/25";
  const cellActiveBorder = depth >= 2 ? "border-primary/35 ring-1 ring-primary/12" : "border-primary/40 ring-1 ring-primary/18";

  function renderContainerInColumn(nest: StoryContainerBlock) {
    const nestSelected = isStoryChromeBlockSelected(storySelection, nest.id);
    const colContainerEmptyHint = getContainerPresetEmptyHint(getStoryContainerPreset(nest.props));
    const colContainerShellClass = getContainerClasses(nest, "editor", {
      selected: nestSelected,
      emptyChildren: nest.children.length === 0,
    });
    const colContainerShellStyle = getContainerCustomBackgroundStyle(nest.props);

    function renderColContainerChildBody(child: StoryBlock) {
      if (child.type === "richText") {
        return (
          <StoryCanvasVerseResizableEditor
            editorKey={`${sectionId}-${nest.id}-${child.id}`}
            rich={child}
            onJson={(json) => updateRichBlock(sectionId, child.id, json)}
            isLg={isLg}
            surface="card"
            syncGlobalToolbarSelection={isStoryRichTextBlockToolbarSelected(storySelection, child.id)}
            onResizeWidth={(pct) =>
              patchRichBlockRowLayout(sectionId, child.id, {
                widthMode: pct >= 100 ? "full" : "custom",
                widthValue: pct >= 100 ? undefined : pct,
                widthUnit: "%",
                displayMode: "block",
                float: undefined,
              })
            }
          />
        );
      }
      if (child.type === "media") {
        return (
          <MediaEmbedCanvasCard
            compact
            block={child}
            onConfigure={() => {
              setSelectedBlockId(child.id);
              setInspectorTab("block");
              if (isLg) setInspectorOpen(true);
              else setBlockSettingsSheetOpen(true);
            }}
          />
        );
      }
      if (child.type === "embed") {
        return (
          <EmbedCanvasCard
            compact
            block={child}
            onConfigure={() => {
              setSelectedBlockId(child.id);
              setInspectorTab("block");
              if (isLg) setInspectorOpen(true);
              else setBlockSettingsSheetOpen(true);
            }}
          />
        );
      }
      if (child.type === "divider") {
        return <StoryDividerEditorChrome block={child} />;
      }
      if (child.type === "table") {
        return tableOps ? (
          <StoryTableBlockEditor block={child} ops={tableOps(sectionId, child.id)} />
        ) : (
          <div className="rounded-xl border border-neutral-200/95 bg-neutral-50/90 p-4 text-sm text-neutral-400">Table</div>
        );
      }
      if (child.type === "splitContent") {
        return (
          <StorySplitContentEditorLayout
            block={child}
            textEditor={
              <div className="max-w-full">
                <StoryCanvasVerseResizableEditor
                  editorKey={`${sectionId}-${nest.id}-${child.text.id}`}
                  rich={child.text}
                  onJson={(json) => updateRichBlock(sectionId, child.text.id, json)}
                  isLg={isLg}
                  surface="card"
                  syncGlobalToolbarSelection={isStoryRichTextBlockToolbarSelected(storySelection, child.text.id)}
                  onResizeWidth={(pct) =>
                    patchRichBlockRowLayout(sectionId, child.text.id, {
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
                {child.supporting.blocks.length === 0 ? (
                  <p className="text-center text-xs text-base-content/45">Empty supporting area.</p>
                ) : (
                  child.supporting.blocks.map((sb) => (
                    <StorySplitSupportBlockSectionChrome
                      key={sb.id}
                      sectionId={sectionId}
                      sb={sb}
                      supportPlacementVariant="column"
                      allowNestedColumns={allowNestedColumns}
                      chromeDepth={depth + 1}
                      columnsNestedDepth={depth + 1}
                      renderColumnsGrid={(block, d) => <StoryNestedColumnsGrid sectionId={sectionId} columnsBlock={block} depth={d} />}
                    />
                  ))
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full gap-2 border-base-content/15 text-xs font-medium")}
                  >
                    Add to supporting area
                    <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-64 min-w-[11rem] overflow-y-auto">
                    {STORY_SPLIT_SUPPORT_ADD_PRESET_IDS.map((id) => (
                      <DropdownMenuItem key={id} className="text-xs font-medium" onClick={() => appendSplitSupportingPreset(sectionId, child.id, id)}>
                        {storyAddPresetLabel(id)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
          />
        );
      }
      if (child.type === "columns") {
        return <StoryNestedColumnsGrid sectionId={sectionId} columnsBlock={child} depth={depth + 1} />;
      }
      return renderContainerInColumn(child);
    }

    function renderColContainerChildCard(child: StoryBlock) {
      const sel = isStoryChromeBlockSelected(storySelection, child.id);
      const v = child.type === "container" ? "container" : ("column" as const);
      const openInspector = () => {
        setSelectedBlockId(child.id);
        setInspectorTab("block");
        if (isLg) setInspectorOpen(true);
        else setBlockSettingsSheetOpen(true);
      };
      return (
        <StoryEditorBlockFrame
          block={child}
          frameLabel={storyBlockDisplayLabel(child)}
          selected={sel}
          isLg={isLg}
          chromeDepth={depth}
          visualQuietContainer={child.type === "container"}
          onSelect={() => { setSelectedBlockId(child.id); setInspectorTab("block"); }}
          onAddAbove={() => openBlockPlacement({ flow: "add", targetBlockId: child.id, variant: v, allowNestedColumns, initialAddPosition: "above" })}
          onAddBelow={() => openBlockPlacement({ flow: "add", targetBlockId: child.id, variant: v, allowNestedColumns, initialAddPosition: "below" })}
          onAddInsideContainer={
            child.type === "container"
              ? () => openBlockPlacement({ flow: "add", targetBlockId: child.children?.[0]?.id ?? child.id, variant: "container", allowNestedColumns })
              : undefined
          }
          onDuplicate={() => openBlockPlacement({ flow: "duplicate", targetBlockId: child.id, variant: v, allowNestedColumns })}
          onDelete={() => removeBlock(sectionId, child.id)}
          onOpenInspector={openInspector}
          onMove={(dir) => moveBlock(sectionId, child.id, dir)}
        >
          {renderColContainerChildBody(child)}
        </StoryEditorBlockFrame>
      );
    }

    return (
      <div className={colContainerShellClass} style={colContainerShellStyle ?? undefined}>
        {nest.props.label?.trim() ? (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{nest.props.label.trim()}</p>
        ) : null}
        {nest.children.length === 0 ? (
          <>
            <p className="text-center text-xs leading-relaxed text-neutral-600">{colContainerEmptyHint}</p>
            <StoryColumnInsertAffordance
              mobile={!isLg}
              allowNestedColumns={allowNestedColumns}
              onInsert={(presetId) => appendIntoContainer(sectionId, nest.id, createColumnNestedBlockFromPreset(presetId) as StoryBlock)}
            />
          </>
        ) : (
          <div className="space-y-2">
            {groupStoryBlocksForLayout(nest.children).map((group) => {
              if (group.kind === "float-wrap") {
                return (
                  <div key={`${group.float.id}-${group.text.id}`} className="flow-root min-w-0">
                    <StoryBlockRowDesignWrap block={group.float} floated>{renderColContainerChildCard(group.float)}</StoryBlockRowDesignWrap>
                    <StoryBlockRowDesignWrap block={group.text} floated={false} wrapperClassName="min-w-0">{renderColContainerChildCard(group.text)}</StoryBlockRowDesignWrap>
                  </div>
                );
              }
              const child = group.block;
              return (
                <StoryBlockRowDesignWrap key={child.id} block={child} floated={false}>
                  {renderColContainerChildCard(child)}
                </StoryBlockRowDesignWrap>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderColumnNestedChrome(nested: StoryColumnNestedBlock) {
    const nestedSelected = isStoryChromeBlockSelected(storySelection, nested.id);
    const asBlock = nested as StoryBlock;
    const placementVariant = nested.type === "container" ? "container" : ("column" as const);
    const openInspector = () => {
      setSelectedBlockId(nested.id);
      setInspectorTab("block");
      if (isLg) setInspectorOpen(true);
      else setBlockSettingsSheetOpen(true);
    };

    return (
      <StoryEditorBlockFrame
        block={asBlock}
        frameLabel={storyBlockDisplayLabel(asBlock)}
        selected={nestedSelected}
        isLg={isLg}
        chromeDepth={depth}
        visualQuietContainer={nested.type === "container"}
        onSelect={() => { setSelectedBlockId(nested.id); setInspectorTab("block"); }}
        onAddAbove={() => openBlockPlacement({ flow: "add", targetBlockId: nested.id, variant: placementVariant, allowNestedColumns, initialAddPosition: "above" })}
        onAddBelow={() => openBlockPlacement({ flow: "add", targetBlockId: nested.id, variant: placementVariant, allowNestedColumns, initialAddPosition: "below" })}
        onAddInsideContainer={
          nested.type === "container"
            ? () => openBlockPlacement({ flow: "add", targetBlockId: nested.children?.[0]?.id ?? nested.id, variant: "container", allowNestedColumns })
            : undefined
        }
        onDuplicate={() => openBlockPlacement({ flow: "duplicate", targetBlockId: nested.id, variant: placementVariant, allowNestedColumns })}
        onDelete={() => removeBlock(sectionId, nested.id)}
        onOpenInspector={openInspector}
        onMove={(dir) => moveBlock(sectionId, nested.id, dir)}
      >
        {nested.type === "richText" ? (
          <StoryCanvasVerseResizableEditor
            editorKey={`${sectionId}-${columnsBlock.id}-${nested.id}`}
            rich={nested}
            onJson={(json) => updateRichBlock(sectionId, nested.id, json)}
            isLg={isLg}
            surface="card"
            syncGlobalToolbarSelection={isStoryRichTextBlockToolbarSelected(storySelection, nested.id)}
            onResizeWidth={(pct) =>
              patchRichBlockRowLayout(sectionId, nested.id, {
                widthMode: pct >= 100 ? "full" : "custom",
                widthValue: pct >= 100 ? undefined : pct,
                widthUnit: "%",
                displayMode: "block",
                float: undefined,
              })
            }
          />
        ) : nested.type === "media" ? (
          <MediaEmbedCanvasCard
            compact
            block={nested}
            onConfigure={() => {
              setSelectedBlockId(nested.id);
              setInspectorTab("block");
              if (isLg) setInspectorOpen(true);
              else setBlockSettingsSheetOpen(true);
            }}
          />
        ) : nested.type === "columns" ? (
          <StoryNestedColumnsGrid sectionId={sectionId} columnsBlock={nested} depth={depth + 1} />
        ) : nested.type === "embed" ? (
          <EmbedCanvasCard
            compact
            block={nested}
            onConfigure={() => {
              setSelectedBlockId(nested.id);
              setInspectorTab("block");
              if (isLg) setInspectorOpen(true);
              else setBlockSettingsSheetOpen(true);
            }}
          />
        ) : nested.type === "table" ? (
          tableOps ? (
            <StoryTableBlockEditor block={nested} ops={tableOps(sectionId, nested.id)} />
          ) : (
            <div className="rounded-xl border border-neutral-200/95 bg-neutral-50/90 p-4 text-sm text-neutral-400">Table</div>
          )
        ) : nested.type === "splitContent" ? (
          <StorySplitContentEditorLayout
            block={nested}
            textEditor={
              <div className="max-w-full">
                <StoryCanvasVerseResizableEditor
                  editorKey={`${sectionId}-${columnsBlock.id}-${nested.text.id}`}
                  rich={nested.text}
                  onJson={(json) => updateRichBlock(sectionId, nested.text.id, json)}
                  isLg={isLg}
                  surface="card"
                  syncGlobalToolbarSelection={isStoryRichTextBlockToolbarSelected(storySelection, nested.text.id)}
                  onResizeWidth={(pct) =>
                    patchRichBlockRowLayout(sectionId, nested.text.id, {
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
                {nested.supporting.blocks.length === 0 ? (
                  <p className="text-center text-xs text-base-content/45">Empty supporting area.</p>
                ) : (
                  nested.supporting.blocks.map((sb) => (
                    <StorySplitSupportBlockSectionChrome
                      key={sb.id}
                      sectionId={sectionId}
                      sb={sb}
                      supportPlacementVariant="column"
                      allowNestedColumns={allowNestedColumns}
                      chromeDepth={depth + 1}
                      columnsNestedDepth={depth + 1}
                      renderColumnsGrid={(block, d) => <StoryNestedColumnsGrid sectionId={sectionId} columnsBlock={block} depth={d} />}
                    />
                  ))
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full gap-2 border-base-content/15 text-xs font-medium")}
                  >
                    Add to supporting area
                    <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-64 min-w-[11rem] overflow-y-auto">
                    {STORY_SPLIT_SUPPORT_ADD_PRESET_IDS.map((id) => (
                      <DropdownMenuItem key={id} className="text-xs font-medium" onClick={() => appendSplitSupportingPreset(sectionId, nested.id, id)}>
                        {storyAddPresetLabel(id)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
          />
        ) : nested.type === "container" ? (
          renderContainerInColumn(nested)
        ) : null}
      </StoryEditorBlockFrame>
    );
  }

  return (
    <div className="grid min-w-0 pt-0.5" style={gridStyle}>
      {orderedColumnSlots(columnsBlock, narrowLayout).map(({ slot, columnIndex: colIdx }) => {
        const columnActive =
          storySelection?.mode === "column" &&
          storySelection.columnsBlock.id === columnsBlock.id &&
          storySelection.columnIndex === colIdx;
        return (
          <div
            key={slot.id}
            className={cn(
              "flex min-w-0 flex-col overflow-visible rounded-xl border bg-neutral-50/70 transition-[border-color,box-shadow]",
              cellMinH,
              cellPad,
              columnActive ? cellActiveBorder : cellBorder,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex min-h-0 flex-1 flex-col overflow-visible"
              style={useAdvancedColumnLayout ? storyColumnStackStyle(slot) : storyColumnSharedStackStyle(sharedStackGapRem)}
            >
              {slot.blocks.length === 0 ? (
                <>
                  <StoryColumnInsertAffordance
                    mobile={!isLg}
                    allowNestedColumns={allowNestedColumns}
                    onInsert={(presetId) => insertColumnNested(sectionId, columnsBlock.id, colIdx, 0, presetId)}
                  />
                  <p className="mt-2 px-1 text-center text-xs leading-relaxed text-neutral-500">
                    Or use a block's floating toolbar to add above or below once this column has content.
                  </p>
                </>
              ) : (
                <>
                  {groupColumnNestedBlocksForLayout(slot.blocks).map((grp) => (
                    <Fragment key={grp.kind === "single" ? grp.block.id : `${grp.float.id}-${grp.text.id}`}>
                      {grp.kind === "float-wrap" ? (
                        <div className="flow-root min-w-0">
                          <StoryBlockRowDesignWrap block={grp.float as StoryBlock} floated>
                            {renderColumnNestedChrome(grp.float)}
                          </StoryBlockRowDesignWrap>
                          <StoryBlockRowDesignWrap block={grp.text as StoryBlock} floated={false} wrapperClassName="min-w-0">
                            {renderColumnNestedChrome(grp.text)}
                          </StoryBlockRowDesignWrap>
                        </div>
                      ) : (
                        <StoryBlockRowDesignWrap block={grp.block as StoryBlock} floated={false}>
                          {renderColumnNestedChrome(grp.block)}
                        </StoryBlockRowDesignWrap>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
