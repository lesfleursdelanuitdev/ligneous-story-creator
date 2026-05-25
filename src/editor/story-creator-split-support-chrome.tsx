import type { ReactNode } from "react";
import type { StoryBlock, StoryColumnsBlock, StorySplitSupportBlock } from "../types";
import { STORY_SPLIT_SUPPORT_ADD_PRESET_IDS, storyBlockDisplayLabel } from "../utils/story-block-presets";
import type { StoryBlockPlacementVariant } from "./StoryBlockPlacementDialog";
import { StoryEditorBlockFrame } from "./StoryEditorBlockFrame";
import { EmbedCanvasCard, MediaEmbedCanvasCard } from "./story-creator-canvas-cards";
import {
  isStoryChromeBlockSelected,
  isStoryRichTextBlockToolbarSelected,
  StoryCanvasVerseResizableEditor,
} from "./story-creator-canvas-editors";
import { useStoryCanvasOps } from "./story-creator-canvas-ops-context";
import { StoryTableBlockEditor } from "./story-block-table-editor";

export type StorySplitSupportBlockSectionChromeProps = {
  sectionId: string;
  sb: StorySplitSupportBlock;
  supportPlacementVariant: StoryBlockPlacementVariant;
  allowNestedColumns: boolean;
  chromeDepth?: number;
  columnsNestedDepth: number;
  /** Render prop: called when `sb` is a columns block. Provided by `StoryNestedColumnsGrid` which passes itself. */
  renderColumnsGrid: (block: StoryColumnsBlock, depth: number) => ReactNode;
};

export function StorySplitSupportBlockSectionChrome({
  sectionId,
  sb,
  supportPlacementVariant,
  allowNestedColumns,
  chromeDepth = 1,
  columnsNestedDepth: _columnsNestedDepth,
  renderColumnsGrid: _renderColumnsGrid,
}: StorySplitSupportBlockSectionChromeProps) {
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
    tableOps,
  } = useStoryCanvasOps();

  const asBlock = sb as StoryBlock;
  const nestedSelected = isStoryChromeBlockSelected(storySelection, sb.id);
  const splitAllowlist = STORY_SPLIT_SUPPORT_ADD_PRESET_IDS;

  const openInspector = () => {
    setSelectedBlockId(sb.id);
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
      chromeDepth={chromeDepth}
      onSelect={() => {
        setSelectedBlockId(sb.id);
        setInspectorTab("block");
      }}
      onAddAbove={() =>
        openBlockPlacement({
          flow: "add",
          targetBlockId: sb.id,
          variant: supportPlacementVariant,
          allowNestedColumns,
          initialAddPosition: "above",
          presetAllowlist: splitAllowlist,
        })
      }
      onAddBelow={() =>
        openBlockPlacement({
          flow: "add",
          targetBlockId: sb.id,
          variant: supportPlacementVariant,
          allowNestedColumns,
          initialAddPosition: "below",
          presetAllowlist: splitAllowlist,
        })
      }
      onDuplicate={() =>
        openBlockPlacement({
          flow: "duplicate",
          targetBlockId: sb.id,
          variant: supportPlacementVariant,
          allowNestedColumns,
        })
      }
      onDelete={() => removeBlock(sectionId, sb.id)}
      onOpenInspector={openInspector}
      onMove={(dir) => moveBlock(sectionId, sb.id, dir)}
      contentClassName={undefined}
    >
      {sb.type === "richText" ? (
        <StoryCanvasVerseResizableEditor
          editorKey={`${sectionId}-${sb.id}`}
          rich={sb}
          onJson={(json) => updateRichBlock(sectionId, sb.id, json)}
          isLg={isLg}
          surface="card"
          syncGlobalToolbarSelection={isStoryRichTextBlockToolbarSelected(storySelection, sb.id)}
          onResizeWidth={(pct) =>
            patchRichBlockRowLayout(sectionId, sb.id, {
              widthMode: pct >= 100 ? "full" : "custom",
              widthValue: pct >= 100 ? undefined : pct,
              widthUnit: "%",
              displayMode: "block",
              float: undefined,
            })
          }
        />
      ) : sb.type === "media" ? (
        <MediaEmbedCanvasCard
          compact
          block={sb}
          onConfigure={() => {
            setSelectedBlockId(sb.id);
            setInspectorTab("block");
            if (isLg) setInspectorOpen(true);
            else setBlockSettingsSheetOpen(true);
          }}
        />
      ) : sb.type === "embed" ? (
        <EmbedCanvasCard
          block={sb}
          compact
          onConfigure={() => {
            setSelectedBlockId(sb.id);
            setInspectorTab("block");
            if (isLg) setInspectorOpen(true);
            else setBlockSettingsSheetOpen(true);
          }}
        />
      ) : sb.type === "table" ? (
        tableOps ? (
          <StoryTableBlockEditor block={sb} ops={tableOps(sectionId, sb.id)} />
        ) : (
          <div className="rounded-xl border border-neutral-200/95 bg-neutral-50/90 p-4 text-sm text-neutral-400">Table</div>
        )
      ) : null}
    </StoryEditorBlockFrame>
  );
}
