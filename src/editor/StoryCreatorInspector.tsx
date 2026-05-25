"use client";

import { useState } from "react";
import type {
  StoryBlock,
  StoryBlockDateAnnotation,
  StoryBlockDesign,
  StoryBlockPlaceAnnotation,
  StoryBlockRowLayout,
  StoryColumnSlot,
  StoryColumnsBlock,
  StoryContainerBlockProps,
  StoryDocument,
  StoryDocumentMetaPatch,
  StoryEmbedBlock,
  StoryMediaBlock,
  StorySection,
} from "../types";
import type { StoryDividerMetaPatch, StoryRichTextMetaPatch } from "../utils/story-doc-mutators";
import type { StoryFlowNodeSelection } from "./state/storyEditorTypes";
import type { TableLayoutPatch } from "./inspector/inspector-table-split";
import { cn } from "../cn";
import { Button } from "./ui/button";
import { Bug, ChevronRight } from "lucide-react";
import { StoryBlockInspector } from "./inspector/StoryBlockInspector";
import { StorySettingsInspector } from "./inspector/StorySettingsInspector";
import { StoryDebugInspector } from "./inspector/StoryDebugInspector";

// ─── Re-exports (satisfies inspector/StoryBlockInspector + inspector/StorySettingsInspector
//     which import from "../StoryCreatorInspector") ────────────────────────────

export {
  FieldLabel,
  HelperCard,
  STORY_KIND_OPTIONS,
  tagsToCommaInput,
  parseCommaTags,
  BlockDateAnnotationInspector,
  StoryBlockRowLayoutInspector,
  StoryBlockDesignInspector,
} from "./inspector/inspector-primitives";

export {
  type TableLayoutPatch,
  TableBlockInspector,
  SplitContentInspector,
} from "./inspector/inspector-table-split";

export {
  DividerBlockInspector,
  RichTextBlockInspector,
  ContainerLayoutInspector,
  ColumnsLayoutInspector,
} from "./inspector/inspector-layout";

export {
  EventPickerButton,
  InspectorStoryAuthorsSection,
  InspectorStoryLinkedRecords,
  InspectorStoryImagesSection,
  StoryLinkedAlbumsField,
} from "./inspector/inspector-story-meta";

export {
  MediaBlockInspector,
  OtherEmbedInspector,
} from "./inspector/inspector-block-media-embed";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryInspectorTab = "block" | "story" | "debug";

/** `sidebar`: desktop right rail. `sheet-block` / `sheet-story`: mobile full-width panels without tab chrome. */
export type StoryInspectorLayout = "sidebar" | "sheet-block" | "sheet-story";

// ─── StoryInspectorSheetStoryOrDebug ─────────────────────────────────────────

function StoryInspectorSheetStoryOrDebug({
  storyId,
  doc,
  onTitleChange,
  onExcerptChange,
  onStoryMetaChange,
  onCheckSlugAvailability,
  publicOrigin,
  selectedBlockId,
  selectedBlock,
  storyEditorDirty,
  touchComfort,
  className,
}: {
  storyId: string;
  doc: StoryDocument;
  onTitleChange: (title: string) => void;
  onExcerptChange: (excerpt: string) => void;
  onStoryMetaChange: (patch: StoryDocumentMetaPatch) => void;
  onCheckSlugAvailability?: (slug: string) => Promise<{ available: boolean }>;
  publicOrigin?: string;
  selectedBlockId: string | null;
  selectedBlock: StoryBlock | null;
  storyEditorDirty: boolean;
  touchComfort?: boolean;
  className?: string;
}) {
  const [subState, setSubState] = useState<{ storyId: string; sub: "story" | "debug" }>(() => ({
    storyId,
    sub: "story",
  }));
  const sub = subState.storyId === storyId ? subState.sub : "story";
  const setSub = (next: "story" | "debug") => setSubState({ storyId, sub: next });

  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col bg-base-200/45", className)}>
      <div className="flex shrink-0 gap-1 border-b border-base-content/10 px-2.5 pt-2">
        <button
          type="button"
          onClick={() => setSub("story")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
            sub === "story"
              ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-content/[0.06]"
              : "text-base-content/55 hover:bg-base-content/[0.06] hover:text-base-content",
          )}
        >
          Story
        </button>
        <button
          type="button"
          onClick={() => setSub("debug")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors",
            sub === "debug"
              ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-content/[0.06]"
              : "text-base-content/55 hover:bg-base-content/[0.06] hover:text-base-content",
          )}
        >
          <Bug className="size-3.5 opacity-80" aria-hidden />
          Debug
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {sub === "story" ? (
          <StorySettingsInspector
            doc={doc}
            storyId={storyId}
            onTitleChange={onTitleChange}
            onExcerptChange={onExcerptChange}
            onStoryMetaChange={onStoryMetaChange}
            onCheckSlugAvailability={onCheckSlugAvailability}
            publicOrigin={publicOrigin}
            touchComfort={touchComfort}
          />
        ) : (
          <StoryDebugInspector
            doc={doc}
            selectedBlockId={selectedBlockId}
            selectedBlock={selectedBlock}
            storyEditorDirty={storyEditorDirty}
          />
        )}
      </div>
    </div>
  );
}

// ─── StoryCreatorInspector ────────────────────────────────────────────────────

export function StoryCreatorInspector({
  doc,
  storyId,
  inspectorTab,
  onInspectorTab,
  selectedSection,
  selectedBlock,
  selectedBlockId = null,
  selectedFlowNode = null,
  storyEditorDirty = false,
  columnsLayoutBlock,
  columnsNestingDepth,
  onPatchColumns,
  onPatchColumnSlot,
  onEditColumnContent,
  onPatchEmbed,
  onPatchMedia,
  onPatchContainer,
  onPatchBlockRowLayout,
  onPatchBlockDesign,
  onPatchBlockDateAnnotation,
  onPatchSection,
  onPatchRichTextMeta,
  onPatchDividerMeta,
  onPatchSplitContent,
  onPatchTable,
  onPatchFlowNode,
  selectedBlockInSplitPanel = false,
  onTitleChange,
  onExcerptChange,
  onStoryMetaChange,
  onCheckSlugAvailability,
  publicOrigin,
  onClose,
  onDeleteBlock,
  className,
  layout = "sidebar",
}: {
  doc: StoryDocument;
  storyId: string;
  inspectorTab: StoryInspectorTab;
  onInspectorTab: (t: StoryInspectorTab) => void;
  selectedSection?: StorySection | null;
  selectedBlock: StoryBlock | null;
  selectedBlockId?: string | null;
  selectedFlowNode?: StoryFlowNodeSelection | null;
  storyEditorDirty?: boolean;
  columnsLayoutBlock?: StoryColumnsBlock | null;
  columnsNestingDepth?: number;
  onPatchColumns?: (patch: Partial<Pick<StoryColumnsBlock, "columnWidthPercents" | "columnGapRem" | "mobileBehavior" | "advancedColumnLayoutEnabled">>) => void;
  onPatchColumnSlot?: (columnIndex: 0 | 1, patch: Partial<Pick<StoryColumnSlot, "stackJustify" | "stackGapRem">>) => void;
  onEditColumnContent?: (columnIndex: 0 | 1) => void;
  onPatchEmbed: (patch: Partial<StoryEmbedBlock>) => void;
  onPatchMedia: (patch: Partial<StoryMediaBlock>) => void;
  onPatchContainer?: (patch: Partial<StoryContainerBlockProps>) => void;
  onPatchBlockRowLayout: (patch: Partial<StoryBlockRowLayout>) => void;
  onPatchBlockDesign: (patch: Partial<StoryBlockDesign> | null) => void;
  onPatchBlockDateAnnotation?: (next: {
    dateAnnotations?: StoryBlockDateAnnotation[];
    placeAnnotations?: StoryBlockPlaceAnnotation[];
  }) => void;
  onPatchSection?: (sectionId: string, patch: Partial<StorySection>) => void;
  onPatchRichTextMeta?: (patch: StoryRichTextMetaPatch) => void;
  onPatchDividerMeta?: (patch: StoryDividerMetaPatch) => void;
  onPatchSplitContent?: (patch: {
    supportingWidthPct?: number;
    supportingGapRem?: number;
    supportingSide?: "left" | "right";
    supportingFloatPosition?: "top" | "center" | "bottom";
  }) => void;
  onPatchTable?: (patch: TableLayoutPatch) => void;
  onPatchFlowNode?: (selection: StoryFlowNodeSelection, patch: Record<string, unknown>) => void;
  selectedBlockInSplitPanel?: boolean;
  onTitleChange: (title: string) => void;
  onExcerptChange: (excerpt: string) => void;
  onStoryMetaChange?: (patch: StoryDocumentMetaPatch) => void;
  onCheckSlugAvailability?: (slug: string) => Promise<{ available: boolean }>;
  publicOrigin?: string;
  onClose?: () => void;
  onDeleteBlock?: () => void;
  className?: string;
  layout?: StoryInspectorLayout;
}) {
  const storyMeta = onStoryMetaChange ?? (() => {});

  if (layout === "sheet-block") {
    return (
      <div className={cn("flex min-h-0 w-full flex-col bg-transparent", className)}>
        <div className="min-h-0 flex-1 space-y-6">
          <StoryBlockInspector
            storyId={storyId}
            selectedBlock={selectedBlock}
            selectedSection={selectedSection ?? null}
            columnsLayoutBlock={columnsLayoutBlock ?? null}
            columnsNestingDepth={columnsNestingDepth ?? 1}
            onPatchColumns={onPatchColumns}
            onPatchColumnSlot={onPatchColumnSlot}
            onEditColumnContent={onEditColumnContent}
            onPatchEmbed={onPatchEmbed}
            onPatchMedia={onPatchMedia}
            onPatchContainer={onPatchContainer}
            onPatchBlockRowLayout={onPatchBlockRowLayout}
            onPatchBlockDesign={onPatchBlockDesign}
            onPatchBlockDateAnnotation={onPatchBlockDateAnnotation}
            onPatchSection={onPatchSection}
            onPatchRichTextMeta={onPatchRichTextMeta}
            onPatchDividerMeta={onPatchDividerMeta}
            onPatchSplitContent={onPatchSplitContent}
            onPatchTable={onPatchTable}
            selectedFlowNode={selectedFlowNode}
            onPatchFlowNode={onPatchFlowNode}
            selectedBlockInSplitPanel={selectedBlockInSplitPanel}
            onDeleteBlock={onDeleteBlock}
            touchComfort
          />
        </div>
      </div>
    );
  }

  if (layout === "sheet-story") {
    return (
      <StoryInspectorSheetStoryOrDebug
        className={className}
        storyId={storyId}
        doc={doc}
        onTitleChange={onTitleChange}
        onExcerptChange={onExcerptChange}
        onStoryMetaChange={storyMeta}
        onCheckSlugAvailability={onCheckSlugAvailability}
        publicOrigin={publicOrigin}
        selectedBlockId={selectedBlockId}
        selectedBlock={selectedBlock}
        storyEditorDirty={storyEditorDirty}
        touchComfort
      />
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 w-full min-w-0 shrink-0 flex-col border-l border-base-content/10 bg-base-200/45 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-base-content/10 p-2.5">
        {onClose ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-lg p-0 text-base-content/65 hover:bg-base-content/[0.08] hover:text-base-content"
            title="Hide inspector"
            aria-label="Hide inspector panel"
            onClick={onClose}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        ) : null}
        <button
          type="button"
          onClick={() => onInspectorTab("block")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
            inspectorTab === "block"
              ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-content/[0.06]"
              : "text-base-content/55 hover:bg-base-content/[0.06] hover:text-base-content",
          )}
        >
          Block
        </button>
        <button
          type="button"
          onClick={() => onInspectorTab("story")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
            inspectorTab === "story"
              ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-content/[0.06]"
              : "text-base-content/55 hover:bg-base-content/[0.06] hover:text-base-content",
          )}
        >
          Story
        </button>
        <button
          type="button"
          onClick={() => onInspectorTab("debug")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
            inspectorTab === "debug"
              ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-content/[0.06]"
              : "text-base-content/55 hover:bg-base-content/[0.06] hover:text-base-content",
          )}
          title="Debug"
        >
          <Bug className="size-3.5 shrink-0 opacity-80 max-[340px]:hidden" aria-hidden />
          <span className="truncate">Debug</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
        {inspectorTab === "story" ? (
          <StorySettingsInspector
            doc={doc}
            storyId={storyId}
            onTitleChange={onTitleChange}
            onExcerptChange={onExcerptChange}
            onStoryMetaChange={storyMeta}
            onCheckSlugAvailability={onCheckSlugAvailability}
            publicOrigin={publicOrigin}
          />
        ) : inspectorTab === "debug" ? (
          <StoryDebugInspector
            doc={doc}
            selectedBlockId={selectedBlockId}
            selectedBlock={selectedBlock}
            storyEditorDirty={storyEditorDirty}
          />
        ) : (
          <StoryBlockInspector
            storyId={storyId}
            selectedBlock={selectedBlock}
            selectedSection={selectedSection ?? null}
            columnsLayoutBlock={columnsLayoutBlock ?? null}
            columnsNestingDepth={columnsNestingDepth ?? 1}
            onPatchColumns={onPatchColumns}
            onPatchColumnSlot={onPatchColumnSlot}
            onEditColumnContent={onEditColumnContent}
            onPatchEmbed={onPatchEmbed}
            onPatchMedia={onPatchMedia}
            onPatchContainer={onPatchContainer}
            onPatchBlockRowLayout={onPatchBlockRowLayout}
            onPatchBlockDesign={onPatchBlockDesign}
            onPatchBlockDateAnnotation={onPatchBlockDateAnnotation}
            onPatchSection={onPatchSection}
            onPatchRichTextMeta={onPatchRichTextMeta}
            onPatchDividerMeta={onPatchDividerMeta}
            onPatchSplitContent={onPatchSplitContent}
            onPatchTable={onPatchTable}
            selectedFlowNode={selectedFlowNode}
            onPatchFlowNode={onPatchFlowNode}
            selectedBlockInSplitPanel={selectedBlockInSplitPanel}
            onDeleteBlock={onDeleteBlock}
          />
        )}
      </div>
    </aside>
  );
}
