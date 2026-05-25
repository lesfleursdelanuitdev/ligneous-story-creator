"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import type {
  StoryBlock,
  StoryBlockDateAnnotation,
  StoryBlockPlaceAnnotation,
  StoryBlockDesign,
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
import { newStoryId } from "../types";
import {
  appendBlockIntoContainer,
  appendSupportingBlockToSplit,
  duplicateBlockRelativeToBlockId,
  findStoryBlockAnywhere,
  insertBlockAtIndex,
  insertBlockRelativeToBlockId,
  insertColumnNestedAt,
  isBlockInSplitSupportingSlot,
  patchBlockAnnotationsInSection,
  patchBlockDesignInSection,
  patchBlockRowLayoutInSection,
  patchColumnSlotLayout,
  patchColumnsInSection,
  patchContainerInSection,
  patchDividerBlockInSection,
  patchEmbedInSection,
  patchMediaInSection,
  patchRichTextInSection,
  patchRichTextMetaInSection,
  patchSplitContentLayoutInSection,
  patchTableInSection,
  removeBlockById,
  setTableCellInSection,
  setTableColumnWidthsInSection,
  addTableRowInSection,
  removeTableRowInSection,
  addTableColumnInSection,
  removeTableColumnInSection,
  type StoryDividerMetaPatch,
  type StoryRichTextMetaPatch,
} from "../utils/story-doc-mutators";
import { createDefaultSectionBlocks } from "../utils/story-block-factory";
import {
  createColumnNestedBlockFromPreset,
  createSplitSupportBlockFromPreset,
  createStoryBlockFromPreset,
  type StoryAddBlockPresetId,
} from "../utils/story-block-presets";
import { columnsBlockDepthInSection, MAX_STORY_COLUMNS_NEST_DEPTH } from "../utils/story-columns-depth";
import {
  appendChildSection,
  findSectionPath,
  flattenSectionsDepthFirst,
  insertSectionAfterSibling,
  insertSectionBeforeSibling,
  mapSectionInDocument,
  moveSectionInDocument,
  normalizeStorySection,
  removeSectionFromTree,
  type SectionPath,
} from "../utils/story-section-tree";
import { resolveStorySelection, type StorySelection } from "../utils/story-selection";
import { updateStoryFlowNodeInDoc } from "../utils/story-flow-nodes";
import { normalizeStorySlugInput, slugifyStoryTitle } from "../utils/story-slug";
import { moveStoryBlockRelative } from "../utils/story-block-move-relative";
import { useStoryEditorStore } from "./state/storyEditorContext";
import type { StoryFlowNodeSelection } from "./state/storyEditorTypes";
import type { StoryBlockPlacementModalArgs } from "./story-creator-canvas-ops-context";
import type { TableBlockOps } from "./story-block-table-editor";

export type UseStoryEditorOperationsOptions = {
  isLg: boolean;
  isSm: boolean;
};

export type UseStoryEditorOperationsResult = {
  // Store state
  doc: StoryDocument | null;
  selectedBlockId: string | null;
  selectedSectionId: string | null;
  selectedFlowNode: StoryFlowNodeSelection | null;
  rightPanelOpen: boolean;

  // Derived state
  activePair: SectionPath | null;
  storySelection: StorySelection | null;
  selectedBlock: StoryBlock | null;
  selectedBlockInSplitPanel: boolean;
  columnsLayoutBlock: StoryColumnsBlock | null;
  columnsNestingDepth: number;

  // UI state
  blockPlacementModal: StoryBlockPlacementModalArgs | null;
  blockSettingsSheetOpen: boolean;
  setBlockSettingsSheetOpen: (open: boolean) => void;

  // Selection / inspector
  setSelectedBlockId: (id: string | null) => void;
  setInspectorTab: (tab: "block" | "story" | "debug") => void;
  setInspectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Inspector ops — act on the currently selected block
  patchEmbed: (patch: Partial<StoryEmbedBlock>) => void;
  patchMedia: (patch: Partial<StoryMediaBlock>) => void;
  patchTable: (patch: Parameters<typeof patchTableInSection>[2]) => void;
  patchContainer: (patch: Partial<StoryContainerBlockProps>) => void;
  patchBlockRowLayout: (patch: Partial<StoryBlockRowLayout>) => void;
  patchBlockDesign: (patch: Partial<StoryBlockDesign> | null) => void;
  patchBlockDateAnnotation: (patch: {
    dateAnnotations?: StoryBlockDateAnnotation[];
    placeAnnotations?: StoryBlockPlaceAnnotation[];
  }) => void;
  patchRichTextMeta: (patch: StoryRichTextMetaPatch) => void;
  patchDividerMeta: (patch: StoryDividerMetaPatch) => void;
  patchColumns: (
    patch: Partial<Pick<StoryColumnsBlock, "columnWidthPercents" | "columnGapRem" | "mobileBehavior" | "advancedColumnLayoutEnabled">>,
  ) => void;
  patchColumnSlot: (
    columnIndex: 0 | 1,
    patch: Partial<Pick<StoryColumnSlot, "stackJustify" | "stackGapRem">>,
  ) => void;
  patchFlowNode: (selection: StoryFlowNodeSelection, patch: Record<string, unknown>) => void;

  // Canvas ops — take explicit sectionId + blockId
  patchMediaBlock: (sectionId: string, blockId: string, patch: Partial<StoryMediaBlock>) => void;
  patchSplitContentBlock: (
    sectionId: string,
    blockId: string,
    patch: {
      supportingWidthPct?: number;
      supportingGapRem?: number;
      supportingSide?: "left" | "right";
      supportingFloatPosition?: "top" | "center" | "bottom";
    },
  ) => void;
  patchRichBlockRowLayout: (sectionId: string, blockId: string, patch: Partial<StoryBlockRowLayout>) => void;
  updateRichBlock: (sectionId: string, blockId: string, json: JSONContent) => void;
  appendIntoContainer: (sectionId: string, containerId: string, block: StoryBlock) => void;
  appendSplitSupportingPreset: (sectionId: string, splitBlockId: string, presetId: StoryAddBlockPresetId) => void;
  removeBlock: (sectionId: string, blockId: string) => void;
  moveBlock: (sectionId: string, blockId: string, direction: -1 | 1) => void;
  insertColumnNested: (
    sectionId: string,
    columnsBlockId: string,
    columnIndex: 0 | 1,
    atIndex: number,
    presetId: StoryAddBlockPresetId,
  ) => void;
  tableOps: (sectionId: string, blockId: string) => TableBlockOps;

  // Block insert
  insertBlockWithPreset: (
    sectionId: string,
    index: number,
    presetId: StoryAddBlockPresetId,
    opts?: { headingPresetLocked?: boolean },
  ) => void;

  // Block placement modal
  openBlockPlacement: (args: StoryBlockPlacementModalArgs) => void;
  applyPlacementAdd: (position: "above" | "below", presetId: StoryAddBlockPresetId) => void;
  applyPlacementDuplicate: (position: "above" | "below") => void;
  handlePlacementModalClose: () => void;

  // Section ops
  addSectionAfter: (afterSectionId: string | null) => string;
  addSectionBefore: (beforeSectionId: string | null) => string;
  addChildSection: (parentSectionId: string) => string;
  deleteSection: (sectionId: string) => void;
  moveSection: (draggedId: string, newParentId: string | null, insertBeforeId: string | null) => void;
  renameSectionTitle: (sectionId: string, title: string) => void;
  toggleSectionCollapsed: (sectionId: string) => void;
  toggleSectionChapter: (sectionId: string, isChapter: boolean) => void;
  toggleSectionPage: (sectionId: string, isPage: boolean) => void;
  patchSectionOutline: (sectionId: string, patch: Partial<StorySection>) => void;

  // Story meta
  setTitle: (title: string) => void;
  setExcerpt: (excerpt: string) => void;
  patchStoryMeta: (patch: StoryDocumentMetaPatch) => void;
};

export function useStoryEditorOperations({ isLg }: UseStoryEditorOperationsOptions): UseStoryEditorOperationsResult {
  const doc = useStoryEditorStore((s) => s.document);
  const selectedBlockId = useStoryEditorStore((s) => s.selectedBlockId);
  const selectedSectionId = useStoryEditorStore((s) => s.selectedSectionId);
  const selectedFlowNode = useStoryEditorStore((s) => s.selectedFlowNode);
  const rightPanelOpen = useStoryEditorStore((s) => s.rightPanelOpen);
  const updateDocumentRecipeNoHistory = useStoryEditorStore((s) => s.updateDocumentRecipeNoHistory);
  const selectBlock = useStoryEditorStore((s) => s.selectBlock);
  const selectSection = useStoryEditorStore((s) => s.selectSection);
  const storeSetInspectorTab = useStoryEditorStore((s) => s.setInspectorTab);
  const setPanelOpen = useStoryEditorStore((s) => s.setPanelOpen);

  const docRef = useRef<StoryDocument | null>(null);
  docRef.current = doc;

  const rightPanelOpenRef = useRef(rightPanelOpen);
  rightPanelOpenRef.current = rightPanelOpen;

  const [blockPlacementModal, setBlockPlacementModal] = useState<StoryBlockPlacementModalArgs | null>(null);
  const blockPlacementModalRef = useRef<StoryBlockPlacementModalArgs | null>(null);
  blockPlacementModalRef.current = blockPlacementModal;

  const [blockSettingsSheetOpen, setBlockSettingsSheetOpen] = useState(false);

  // ── Core helpers ──────────────────────────────────────────────────────────

  const updateDoc = useCallback(
    (fn: (d: StoryDocument) => StoryDocument) => {
      updateDocumentRecipeNoHistory((cur) => fn(JSON.parse(JSON.stringify(cur)) as StoryDocument));
    },
    [updateDocumentRecipeNoHistory],
  );

  const mapDocSection = useCallback(
    (doc: StoryDocument, sectionId: string, fn: (sec: StorySection) => StorySection): StoryDocument =>
      mapSectionInDocument(doc, sectionId, fn),
    [],
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const activePair = useMemo(() => {
    if (!doc || !selectedSectionId) return null;
    return findSectionPath(doc.sections ?? [], selectedSectionId);
  }, [doc, selectedSectionId]);

  const activePairRef = useRef<SectionPath | null>(null);
  activePairRef.current = activePair;

  const storySelection = useMemo(() => {
    if (!activePair || !selectedBlockId) return null;
    return resolveStorySelection(activePair.section, selectedBlockId);
  }, [activePair, selectedBlockId]);

  const selectedBlock = storySelection?.block ?? null;
  const selectedBlockInSplitPanel =
    activePair != null && selectedBlockId != null
      ? isBlockInSplitSupportingSlot(activePair.section, selectedBlockId)
      : false;

  const columnsLayoutBlock = useMemo((): StoryColumnsBlock | null => {
    if (!storySelection) return null;
    if (storySelection.mode === "column") return storySelection.columnsBlock;
    if (storySelection.mode === "section" && storySelection.block.type === "columns") return storySelection.block;
    return null;
  }, [storySelection]);

  const columnsLayoutBlockRef = useRef<StoryColumnsBlock | null>(null);
  columnsLayoutBlockRef.current = columnsLayoutBlock;

  const columnsNestingDepth = useMemo(() => {
    if (!activePair?.section || !columnsLayoutBlock) return 1;
    return columnsBlockDepthInSection(activePair.section, columnsLayoutBlock.id) ?? 1;
  }, [activePair?.section, columnsLayoutBlock]);

  // ── Selection / inspector ─────────────────────────────────────────────────

  const setSelectedBlockId = useCallback((id: string | null) => selectBlock(id), [selectBlock]);

  const setInspectorTab = useCallback(
    (tab: "block" | "story" | "debug") => storeSetInspectorTab(tab),
    [storeSetInspectorTab],
  );

  const setInspectorOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof open === "function" ? open(rightPanelOpenRef.current) : open;
      setPanelOpen("right", next);
    },
    [setPanelOpen],
  );

  // ── Inspector ops (act on selected block) ─────────────────────────────────

  const patchEmbed = useCallback(
    (patch: Partial<StoryEmbedBlock>) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchEmbedInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchMedia = useCallback(
    (patch: Partial<StoryMediaBlock>) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchMediaInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchTable = useCallback(
    (patch: Parameters<typeof patchTableInSection>[2]) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchTableInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchContainer = useCallback(
    (patch: Partial<StoryContainerBlockProps>) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchContainerInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchBlockRowLayout = useCallback(
    (patch: Partial<StoryBlockRowLayout>) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchBlockRowLayoutInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchBlockDesign = useCallback(
    (patch: Partial<StoryBlockDesign> | null) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchBlockDesignInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchBlockDateAnnotation = useCallback(
    (patch: { dateAnnotations?: StoryBlockDateAnnotation[]; placeAnnotations?: StoryBlockPlaceAnnotation[] }) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchBlockAnnotationsInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchRichTextMeta = useCallback(
    (patch: StoryRichTextMetaPatch) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchRichTextMetaInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchDividerMeta = useCallback(
    (patch: StoryDividerMetaPatch) => {
      const pair = activePairRef.current;
      if (!pair || !selectedBlockId) return;
      const sid = pair.section.id;
      const bid = selectedBlockId;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchDividerBlockInSection(sec, bid, patch)));
    },
    [selectedBlockId, updateDoc, mapDocSection],
  );

  const patchColumns = useCallback(
    (
      patch: Partial<
        Pick<StoryColumnsBlock, "columnWidthPercents" | "columnGapRem" | "mobileBehavior" | "advancedColumnLayoutEnabled">
      >,
    ) => {
      const pair = activePairRef.current;
      const col = columnsLayoutBlockRef.current;
      if (!pair || !col) return;
      const sid = pair.section.id;
      const id = col.id;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchColumnsInSection(sec, id, patch)));
    },
    [updateDoc, mapDocSection],
  );

  const patchColumnSlot = useCallback(
    (columnIndex: 0 | 1, patch: Partial<Pick<StoryColumnSlot, "stackJustify" | "stackGapRem">>) => {
      const pair = activePairRef.current;
      const col = columnsLayoutBlockRef.current;
      if (!pair || !col) return;
      const sid = pair.section.id;
      const id = col.id;
      updateDoc((d) => mapDocSection(d, sid, (sec) => patchColumnSlotLayout(sec, id, columnIndex, patch)));
    },
    [updateDoc, mapDocSection],
  );

  const patchFlowNode = useCallback(
    (selection: StoryFlowNodeSelection, patch: Record<string, unknown>) => {
      const pair = activePairRef.current;
      if (!pair) return;
      updateDoc((d) =>
        mapDocSection(d, pair.section.id, (sec) =>
          patchRichTextInSection(
            sec,
            selection.richTextBlockId,
            updateStoryFlowNodeInDoc(
              (resolveStorySelection(sec, selection.richTextBlockId)?.block as
                | { doc?: object }
                | undefined)?.doc ?? {},
              selection.nodeType,
              selection.nodeId,
              patch,
            ),
          ),
        ),
      );
    },
    [updateDoc, mapDocSection],
  );

  // ── Canvas ops ────────────────────────────────────────────────────────────

  const patchMediaBlock = useCallback(
    (sectionId: string, blockId: string, patch: Partial<StoryMediaBlock>) => {
      updateDoc((d) => mapDocSection(d, sectionId, (sec) => patchMediaInSection(sec, blockId, patch)));
    },
    [updateDoc, mapDocSection],
  );

  const patchSplitContentBlock = useCallback(
    (
      sectionId: string,
      blockId: string,
      patch: {
        supportingWidthPct?: number;
        supportingGapRem?: number;
        supportingSide?: "left" | "right";
        supportingFloatPosition?: "top" | "center" | "bottom";
      },
    ) => {
      updateDoc((d) => mapDocSection(d, sectionId, (sec) => patchSplitContentLayoutInSection(sec, blockId, patch)));
    },
    [updateDoc, mapDocSection],
  );

  const patchRichBlockRowLayout = useCallback(
    (sectionId: string, blockId: string, patch: Partial<StoryBlockRowLayout>) => {
      updateDoc((d) => mapDocSection(d, sectionId, (sec) => patchBlockRowLayoutInSection(sec, blockId, patch)));
    },
    [updateDoc, mapDocSection],
  );

  const updateRichBlock = useCallback(
    (sectionId: string, blockId: string, json: JSONContent) => {
      updateDoc((d) => mapDocSection(d, sectionId, (sec) => patchRichTextInSection(sec, blockId, json)));
    },
    [updateDoc, mapDocSection],
  );

  const appendIntoContainer = useCallback(
    (sectionId: string, containerId: string, block: StoryBlock) => {
      updateDoc((d) =>
        mapDocSection(d, sectionId, (sec) => {
          const next = appendBlockIntoContainer(sec, containerId, block);
          return next ?? sec;
        }),
      );
      selectSection(sectionId);
      selectBlock(block.id);
      storeSetInspectorTab("block");
    },
    [updateDoc, mapDocSection, selectSection, selectBlock, storeSetInspectorTab],
  );

  const appendSplitSupportingPreset = useCallback(
    (sectionId: string, splitBlockId: string, presetId: StoryAddBlockPresetId) => {
      const add = createSplitSupportBlockFromPreset(presetId);
      if (!add) return;
      updateDoc((d) =>
        mapDocSection(d, sectionId, (sec) => appendSupportingBlockToSplit(sec, splitBlockId, add) ?? sec),
      );
      selectSection(sectionId);
      selectBlock(add.id);
      storeSetInspectorTab("block");
    },
    [updateDoc, mapDocSection, selectSection, selectBlock, storeSetInspectorTab],
  );

  const removeBlock = useCallback(
    (sectionId: string, blockId: string) => {
      const d = docRef.current;
      if (!d) return;
      const pair = findSectionPath(d.sections ?? [], sectionId);
      if (!pair) return;
      const nested = resolveStorySelection(pair.section, blockId);
      const msg =
        nested?.mode === "column"
          ? "Remove this content from the column?"
          : "Remove this block from the section?";
      if (!window.confirm(msg)) return;
      const next = removeBlockById(pair.section, blockId);
      if (!next) return;
      updateDoc((doc) => mapDocSection(doc, sectionId, () => next.section));
      selectBlock(next.nextSelectedId);
    },
    [updateDoc, mapDocSection, selectBlock],
  );

  const moveBlock = useCallback(
    (sectionId: string, blockId: string, direction: -1 | 1) => {
      updateDoc((d) => mapDocSection(d, sectionId, (sec) => moveStoryBlockRelative(sec, blockId, direction)));
    },
    [updateDoc, mapDocSection],
  );

  const insertColumnNested = useCallback(
    (
      sectionId: string,
      columnsBlockId: string,
      columnIndex: 0 | 1,
      atIndex: number,
      presetId: StoryAddBlockPresetId,
    ) => {
      if (presetId === "layout_columns") {
        const d = docRef.current;
        if (d) {
          const pair = findSectionPath(d.sections ?? [], sectionId);
          const depth = pair ? columnsBlockDepthInSection(pair.section, columnsBlockId) : null;
          if (depth != null && depth >= MAX_STORY_COLUMNS_NEST_DEPTH) return;
        }
      }
      const nested = createColumnNestedBlockFromPreset(presetId);
      updateDoc((d) =>
        mapDocSection(d, sectionId, (sec) => insertColumnNestedAt(sec, columnsBlockId, columnIndex, atIndex, nested)),
      );
      selectSection(sectionId);
      selectBlock(nested.id);
      storeSetInspectorTab("block");
    },
    [updateDoc, mapDocSection, selectSection, selectBlock, storeSetInspectorTab],
  );

  const tableOps = useCallback(
    (sectionId: string, blockId: string): TableBlockOps => ({
      onPatchLayout: (patch) =>
        updateDoc((d) => mapDocSection(d, sectionId, (sec) => patchTableInSection(sec, blockId, patch))),
      onSetCell: (row, col, content) =>
        updateDoc((d) => mapDocSection(d, sectionId, (sec) => setTableCellInSection(sec, blockId, row, col, content))),
      onAddRow: (afterIndex) =>
        updateDoc((d) => mapDocSection(d, sectionId, (sec) => addTableRowInSection(sec, blockId, afterIndex))),
      onRemoveRow: (rowIndex) =>
        updateDoc((d) => mapDocSection(d, sectionId, (sec) => removeTableRowInSection(sec, blockId, rowIndex))),
      onAddColumn: (afterIndex) =>
        updateDoc((d) => mapDocSection(d, sectionId, (sec) => addTableColumnInSection(sec, blockId, afterIndex))),
      onRemoveColumn: (colIndex) =>
        updateDoc((d) => mapDocSection(d, sectionId, (sec) => removeTableColumnInSection(sec, blockId, colIndex))),
      onSetColumnWidths: (widths) =>
        updateDoc((d) =>
          mapDocSection(d, sectionId, (sec) => setTableColumnWidthsInSection(sec, blockId, widths)),
        ),
    }),
    [updateDoc, mapDocSection],
  );

  // ── Block insert ──────────────────────────────────────────────────────────

  const insertBlockWithPreset = useCallback(
    (
      sectionId: string,
      index: number,
      presetId: StoryAddBlockPresetId,
      opts?: { headingPresetLocked?: boolean },
    ) => {
      let block = createStoryBlockFromPreset(presetId);
      if (opts?.headingPresetLocked && presetId === "text_heading" && block.type === "richText") {
        block = { ...block, headingPresetLocked: true };
      }
      if (presetId === "text_list" && block.type === "richText") {
        block = { ...block, listPresetLocked: true };
      }
      updateDoc((d) => mapDocSection(d, sectionId, (sec) => insertBlockAtIndex(sec, index, block)));
      selectSection(sectionId);
      selectBlock(block.id);
      storeSetInspectorTab("block");
    },
    [updateDoc, mapDocSection, selectSection, selectBlock, storeSetInspectorTab],
  );

  // ── Block placement modal ─────────────────────────────────────────────────

  const openBlockPlacement = useCallback((args: StoryBlockPlacementModalArgs) => {
    setBlockPlacementModal(args);
  }, []);

  const handlePlacementModalClose = useCallback(() => {
    setBlockPlacementModal(null);
  }, []);

  const applyPlacementAdd = useCallback(
    (position: "above" | "below", presetId: StoryAddBlockPresetId) => {
      const pair = activePairRef.current;
      const ctx = blockPlacementModalRef.current;
      if (!pair || !ctx) return;
      const block =
        ctx.variant === "column" ? createColumnNestedBlockFromPreset(presetId) : createStoryBlockFromPreset(presetId);
      if (ctx.variant === "container") {
        const target = findStoryBlockAnywhere(pair.section, ctx.targetBlockId);
        if (target?.type === "container" && target.children.length === 0 && target.id === ctx.targetBlockId) {
          const next = appendBlockIntoContainer(pair.section, target.id, block);
          if (next) {
            updateDoc((d) => mapDocSection(d, pair.section.id, () => next));
            selectBlock(block.id);
            storeSetInspectorTab("block");
            setBlockPlacementModal(null);
            return;
          }
        }
      }
      const next = insertBlockRelativeToBlockId(pair.section, ctx.targetBlockId, position, block);
      if (!next) return;
      updateDoc((d) => mapDocSection(d, pair.section.id, () => next));
      selectBlock(block.id);
      storeSetInspectorTab("block");
      setBlockPlacementModal(null);
    },
    [updateDoc, mapDocSection, selectBlock, storeSetInspectorTab],
  );

  const applyPlacementDuplicate = useCallback(
    (position: "above" | "below") => {
      const pair = activePairRef.current;
      const ctx = blockPlacementModalRef.current;
      if (!pair || !ctx) return;
      const result = duplicateBlockRelativeToBlockId(pair.section, ctx.targetBlockId, position);
      if (!result) return;
      updateDoc((d) => mapDocSection(d, pair.section.id, () => result.section));
      selectBlock(result.duplicateId);
      storeSetInspectorTab("block");
      setBlockPlacementModal(null);
    },
    [updateDoc, mapDocSection, selectBlock, storeSetInspectorTab],
  );

  // ── Section ops ───────────────────────────────────────────────────────────

  const addSectionAfter = useCallback(
    (afterSectionId: string | null): string => {
      const secId = newStoryId();
      const initialBlocks = createDefaultSectionBlocks();
      const firstBlockId = initialBlocks[0]!.id;
      const node = normalizeStorySection({
        id: secId,
        title: "New section",
        collapsed: false,
        blocks: initialBlocks,
      });
      updateDoc((d) => insertSectionAfterSibling(d, afterSectionId, node));
      selectSection(secId);
      selectBlock(firstBlockId);
      storeSetInspectorTab("block");
      return secId;
    },
    [updateDoc, selectSection, selectBlock, storeSetInspectorTab],
  );

  const addSectionBefore = useCallback(
    (beforeSectionId: string | null): string => {
      const secId = newStoryId();
      const initialBlocks = createDefaultSectionBlocks();
      const firstBlockId = initialBlocks[0]!.id;
      const node = normalizeStorySection({
        id: secId,
        title: "New section",
        collapsed: false,
        blocks: initialBlocks,
      });
      updateDoc((d) => insertSectionBeforeSibling(d, beforeSectionId, node));
      selectSection(secId);
      selectBlock(firstBlockId);
      storeSetInspectorTab("block");
      return secId;
    },
    [updateDoc, selectSection, selectBlock, storeSetInspectorTab],
  );

  const addChildSection = useCallback(
    (parentSectionId: string): string => {
      const secId = newStoryId();
      const initialBlocks = createDefaultSectionBlocks();
      const firstBlockId = initialBlocks[0]!.id;
      const node = normalizeStorySection({
        id: secId,
        title: "New section",
        collapsed: false,
        blocks: initialBlocks,
      });
      updateDoc((d) => appendChildSection(d, parentSectionId, node));
      selectSection(secId);
      selectBlock(firstBlockId);
      storeSetInspectorTab("block");
      return secId;
    },
    [updateDoc, selectSection, selectBlock, storeSetInspectorTab],
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      const d = docRef.current;
      if (!d) return;
      const flat = flattenSectionsDepthFirst(d.sections ?? []);
      if (flat.length <= 1) return;
      const path = findSectionPath(d.sections ?? [], sectionId);
      if (!path) return;
      if (
        !window.confirm(
          `Delete "${path.section.title}" and any nested subsections? Blocks in this section will be removed.`,
        )
      ) {
        return;
      }
      const removedIdx = flat.findIndex((s) => s.id === sectionId);
      const neighbor = flat[removedIdx + 1] ?? flat[removedIdx - 1];
      const { next, removed } = removeSectionFromTree(d.sections ?? [], sectionId);
      if (!removed) return;
      const wasActive = selectedSectionId === sectionId;
      updateDoc((doc) => ({ ...doc, sections: next }));
      if (wasActive) {
        selectSection(neighbor?.id ?? null);
        selectBlock(neighbor?.blocks?.[0]?.id ?? null);
      }
    },
    [selectedSectionId, updateDoc, selectSection, selectBlock],
  );

  const moveSection = useCallback(
    (draggedId: string, newParentId: string | null, insertBeforeId: string | null) => {
      updateDoc((d) => {
        const next = moveSectionInDocument(d, draggedId, newParentId, insertBeforeId);
        return next ?? d;
      });
    },
    [updateDoc],
  );

  const renameSectionTitle = useCallback(
    (sectionId: string, title: string) => {
      const t = title.trim() || "Untitled section";
      updateDoc((d) => mapDocSection(d, sectionId, (s) => ({ ...s, title: t })));
    },
    [updateDoc, mapDocSection],
  );

  const toggleSectionCollapsed = useCallback(
    (sectionId: string) => {
      updateDoc((d) =>
        mapDocSection(d, sectionId, (s) => ({
          ...s,
          collapsed: !(s.collapsed ?? false),
        })),
      );
    },
    [updateDoc, mapDocSection],
  );

  const toggleSectionChapter = useCallback(
    (sectionId: string, isChapter: boolean) => {
      updateDoc((d) => mapDocSection(d, sectionId, (s) => ({ ...s, isChapter })));
    },
    [updateDoc, mapDocSection],
  );

  const toggleSectionPage = useCallback(
    (sectionId: string, isPage: boolean) => {
      updateDoc((d) => mapDocSection(d, sectionId, (s) => ({ ...s, isPage })));
    },
    [updateDoc, mapDocSection],
  );

  const patchSectionOutline = useCallback(
    (sectionId: string, patch: Partial<StorySection>) => {
      updateDoc((d) => mapDocSection(d, sectionId, (s) => ({ ...s, ...patch })));
    },
    [updateDoc, mapDocSection],
  );

  // ── Story meta ────────────────────────────────────────────────────────────

  const setTitle = useCallback(
    (title: string) => {
      updateDoc((d) => {
        const next = { ...d, title };
        if (!d.slugManuallyEdited) {
          if (!title.trim()) {
            next.slug = undefined;
          } else {
            const auto = normalizeStorySlugInput(slugifyStoryTitle(title));
            next.slug = auto.length > 0 ? auto : undefined;
          }
        }
        return next;
      });
    },
    [updateDoc],
  );

  const setExcerpt = useCallback(
    (excerpt: string) => {
      updateDoc((d) => ({ ...d, excerpt }));
    },
    [updateDoc],
  );

  const patchStoryMeta = useCallback(
    (patch: StoryDocumentMetaPatch) => {
      updateDoc((d) => ({ ...d, ...patch }));
    },
    [updateDoc],
  );

  // ─────────────────────────────────────────────────────────────────────────

  return {
    doc,
    selectedBlockId,
    selectedSectionId,
    selectedFlowNode,
    rightPanelOpen,
    activePair,
    storySelection,
    selectedBlock,
    selectedBlockInSplitPanel,
    columnsLayoutBlock,
    columnsNestingDepth,
    blockPlacementModal,
    blockSettingsSheetOpen,
    setBlockSettingsSheetOpen,
    setSelectedBlockId,
    setInspectorTab,
    setInspectorOpen,
    patchEmbed,
    patchMedia,
    patchTable,
    patchContainer,
    patchBlockRowLayout,
    patchBlockDesign,
    patchBlockDateAnnotation,
    patchRichTextMeta,
    patchDividerMeta,
    patchColumns,
    patchColumnSlot,
    patchFlowNode,
    patchMediaBlock,
    patchSplitContentBlock,
    patchRichBlockRowLayout,
    updateRichBlock,
    appendIntoContainer,
    appendSplitSupportingPreset,
    removeBlock,
    moveBlock,
    insertColumnNested,
    tableOps,
    insertBlockWithPreset,
    openBlockPlacement,
    applyPlacementAdd,
    applyPlacementDuplicate,
    handlePlacementModalClose,
    addSectionAfter,
    addSectionBefore,
    addChildSection,
    deleteSection,
    moveSection,
    renameSectionTitle,
    toggleSectionCollapsed,
    toggleSectionChapter,
    toggleSectionPage,
    patchSectionOutline,
    setTitle,
    setExcerpt,
    patchStoryMeta,
  };
}
