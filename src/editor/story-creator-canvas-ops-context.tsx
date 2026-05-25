import { createContext, useContext } from "react";
import type { JSONContent } from "@tiptap/core";
import type { StoryBlock, StoryBlockRowLayout } from "../types";
import type { StorySelection } from "../utils/story-selection";
import type { StoryAddBlockPresetId } from "../utils/story-block-presets";
import type { StoryBlockPlacementVariant } from "./StoryBlockPlacementDialog";
import type { StoryInspectorTab } from "./StoryCreatorInspector";
import type { TableBlockOps } from "./story-block-table-editor";

export type StoryBlockPlacementModalArgs = {
  flow: "add" | "duplicate";
  targetBlockId: string;
  variant: StoryBlockPlacementVariant;
  allowNestedColumns: boolean;
  initialAddPosition?: "above" | "below";
  presetAllowlist?: readonly StoryAddBlockPresetId[] | null;
};

export type StoryCanvasOpsContextValue = {
  isLg: boolean;
  isSm: boolean;
  storySelection: StorySelection | null;
  setSelectedBlockId: (id: string | null) => void;
  setInspectorTab: (t: StoryInspectorTab) => void;
  setInspectorOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  setBlockSettingsSheetOpen: (open: boolean) => void;
  updateRichBlock: (sectionId: string, blockId: string, json: JSONContent) => void;
  patchRichBlockRowLayout: (sectionId: string, blockId: string, patch: Partial<StoryBlockRowLayout>) => void;
  openBlockPlacement: (args: StoryBlockPlacementModalArgs) => void;
  removeBlock: (sectionId: string, blockId: string) => void;
  moveBlock: (sectionId: string, blockId: string, direction: -1 | 1) => void;
  appendIntoContainer: (sectionId: string, containerId: string, block: StoryBlock) => void;
  appendSplitSupportingPreset: (sectionId: string, splitBlockId: string, presetId: StoryAddBlockPresetId) => void;
  insertColumnNested: (
    sectionId: string,
    columnsBlockId: string,
    columnIndex: 0 | 1,
    atIndex: number,
    presetId: StoryAddBlockPresetId,
  ) => void;
  tableOps?: (sectionId: string, blockId: string) => TableBlockOps;
};

export const StoryCanvasOpsContext = createContext<StoryCanvasOpsContextValue | null>(null);

export function useStoryCanvasOps(): StoryCanvasOpsContextValue {
  const ctx = useContext(StoryCanvasOpsContext);
  if (!ctx) throw new Error("useStoryCanvasOps must be used within StoryCanvasOpsContext.Provider");
  return ctx;
}
