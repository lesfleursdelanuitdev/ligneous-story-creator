"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Expand,
  FileText,
  FolderTree,
  Globe,
  GripVertical,
  Leaf,
  Loader2,
  Pencil,
  PanelRight,
  PanelRightClose,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../cn";
import type { StoryDocument } from "../types";
import { groupStoryBlocksForLayout } from "../utils/story-block-layout";
import { STORY_ADD_BLOCK_DOCK_PRESET_GROUPS, STORY_ADD_BLOCK_PRESET_GROUPS } from "../utils/story-block-presets";
import { flattenSectionsDepthFirst, findSectionPath } from "../utils/story-section-tree";
import { migrateStoryDocument } from "../utils/migrate-story-document";
import { StoryCreatorInspector } from "./StoryCreatorInspector";
import { StoryCanvasOpsContext, type StoryCanvasOpsContextValue } from "./story-creator-canvas-ops-context";
import { StoryEditorStoreProvider } from "./state/storyEditorContext";
import { useStoryEditorStore } from "./state/storyEditorContext";
import type { StoryEditorMode } from "./state/storyEditorTypes";
import { useStoryEditorOperations } from "./useStoryEditorOperations";
import { StoryAddBlockPresetTypeGrid } from "./StoryAddBlockPresetTypeGrid";
import { StoryBlockPlacementDialog } from "./StoryBlockPlacementDialog";
import { StoryBlockRowDesignWrap } from "./StoryBlockDesignWrap";
import { StoryEditorSectionBlockCardRow } from "./story-creator-section-block-card";
import { StoryCreatorPreview } from "./story-creator-preview";
import { StoryEditPreviewModeToggle } from "./StoryEditPreviewModeToggle";
import { StoryGlobalTipTapToolbar } from "./StoryGlobalTipTapToolbar";
import { StoryGlobalToolbarSelectionSync, StoryTiptapActiveEditorProvider } from "./story-tiptap-active-editor-context";
import { StoryStructureSidebar, OutlineRenameInput, type OutlineRenameTarget } from "./StoryStructureSidebar";
import { StoryTipTapStoryDocProvider } from "./story-tiptap-story-doc-context";
import { StoryTipTapCanvasToneProvider } from "./story-tiptap-canvas-tone";
import {
  StoryAddBlockBottomSheet,
  StoryBlockSettingsBottomSheet,
  StoryEditorBottomDock,
  StoryEditorDockPullTab,
  StoryMobileFullScreenPanel,
  type StoryMobileShellTab,
} from "./story-creator-mobile";
import { Button, buttonVariants } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useMediaQueryMinLg } from "./hooks/useMediaQueryMinLg";
import { useMediaQuery } from "./hooks/useMediaQuery";

// ── Panel geometry ────────────────────────────────────────────────────────────

const STORY_LEFT_PANEL_WIDTH_KEY = "story-creator:left-panel-width";
const STORY_LEFT_PANEL_MIN = 260;
const STORY_LEFT_PANEL_DEFAULT = 340;
const STORY_LEFT_PANEL_MAX = 520;
const STORY_RIGHT_PANEL_WIDTH_KEY = "story-creator:right-panel-width";
const STORY_RIGHT_PANEL_MIN = 260;
const STORY_RIGHT_PANEL_DEFAULT = 320;
const STORY_RIGHT_PANEL_MAX = 520;
const STORY_PANEL_TRANSITION = "transition-[width] duration-[250ms] ease-in-out";

function clampStoryLeftPanelWidth(px: number) {
  return Math.min(STORY_LEFT_PANEL_MAX, Math.max(STORY_LEFT_PANEL_MIN, Math.round(px)));
}
function clampStoryRightPanelWidth(px: number) {
  return Math.min(STORY_RIGHT_PANEL_MAX, Math.max(STORY_RIGHT_PANEL_MIN, Math.round(px)));
}

// ── Private helpers ───────────────────────────────────────────────────────────

function formatLastSaved(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function storyKindUiLabel(kind: StoryDocument["kind"]): string {
  switch (kind ?? "story") {
    case "article": return "Article";
    case "post": return "Post";
    case "folklore": return "Folklore";
    default: return "Story";
  }
}

function storyKindPillText(kind: StoryDocument["kind"] | undefined): string {
  return kind ?? "story";
}

function storyDocumentPublishStateText(
  status: StoryDocument["status"],
  editorDirty: boolean,
): "draft" | "saved" | "published" {
  if (status === "published") return "published";
  return editorDirty ? "draft" : "saved";
}

function wordsInTipTapContent(doc: unknown): number {
  if (!doc || typeof doc !== "object") return 0;
  let text = "";
  const stack: unknown[] = [doc];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    const rec = node as Record<string, unknown>;
    if (typeof rec.text === "string") text += ` ${rec.text}`;
    const content = rec.content;
    if (Array.isArray(content)) {
      for (let i = content.length - 1; i >= 0; i -= 1) stack.push(content[i]);
    }
  }
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function wordsInStorySection(blocks: readonly import("../types").StoryBlock[]): number {
  let words = 0;
  for (const block of blocks) {
    if (block.type === "richText") { words += wordsInTipTapContent(block.doc); continue; }
    if (block.type === "columns") {
      words += wordsInStorySection(block.columns[0].blocks as import("../types").StoryBlock[]);
      words += wordsInStorySection(block.columns[1].blocks as import("../types").StoryBlock[]);
      continue;
    }
    if (block.type === "container") { words += wordsInStorySection(block.children ?? []); continue; }
    if (block.type === "splitContent") {
      words += wordsInTipTapContent(block.text.doc);
      words += wordsInStorySection(block.supporting.blocks as import("../types").StoryBlock[]);
      continue;
    }
    if (block.type === "table") {
      for (const row of block.cells ?? []) for (const cell of row ?? []) words += wordsInTipTapContent(cell);
    }
  }
  return words;
}

function StoryCreatorBrandMark() {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 sm:h-9">
      <Leaf className="size-5 shrink-0 text-success sm:size-[1.15rem]" strokeWidth={2} aria-hidden />
      <span className="font-heading text-sm font-semibold tracking-tight text-base-content sm:text-base">StoryCreator</span>
    </div>
  );
}

// ── Public types ──────────────────────────────────────────────────────────────

export type StorySaveStatus = "idle" | "saving" | "error";

export type StoryCreatorFullscreenState = { selectedBlockId: string | null; mode: StoryEditorMode };

export type StoryCreatorClientProps = {
  storyId: string;
  onLoad: (id: string) => Promise<StoryDocument | null>;
  onSave: (doc: StoryDocument) => Promise<StoryDocument>;
  onBack?: (state: StoryCreatorFullscreenState) => void;
  onPublish?: (doc: StoryDocument) => Promise<StoryDocument>;
  onUnpublish?: (doc: StoryDocument) => Promise<StoryDocument>;
  onCheckSlugAvailability?: (slug: string) => Promise<{ available: boolean }>;
  publicOrigin?: string;
  initialSelectedBlockId?: string;
  initialMode?: StoryEditorMode;
  onEnterFullscreen?: (state: StoryCreatorFullscreenState) => void;
};

// ── Inner client (needs store context) ───────────────────────────────────────

function StoryCreatorClientInner({
  storyId,
  onLoad,
  onSave,
  onBack,
  onPublish,
  onUnpublish,
  onCheckSlugAvailability,
  publicOrigin,
  initialSelectedBlockId,
  initialMode,
  onEnterFullscreen,
}: StoryCreatorClientProps) {
  // Store
  const doc = useStoryEditorStore((s) => s.document);
  const mode = useStoryEditorStore((s) => s.mode);
  const selectedSectionId = useStoryEditorStore((s) => s.selectedSectionId);
  const inspectorTab = useStoryEditorStore((s) => s.inspectorTab);
  const isLeftPanelOpen = useStoryEditorStore((s) => s.leftPanelOpen);
  const inspectorOpen = useStoryEditorStore((s) => s.rightPanelOpen);
  const storyEditorDirty = useStoryEditorStore((s) => s.dirty);
  const initializeDocument = useStoryEditorStore((s) => s.initializeDocument);
  const selectSection = useStoryEditorStore((s) => s.selectSection);
  const selectBlock = useStoryEditorStore((s) => s.selectBlock);
  const setMode = useStoryEditorStore((s) => s.setMode);
  const markSaved = useStoryEditorStore((s) => s.markSaved);
  const updateSectionInStore = useStoryEditorStore((s) => s.updateSection);
  const setPanelOpen = useStoryEditorStore((s) => s.setPanelOpen);

  // Responsive
  const isLg = useMediaQueryMinLg();
  const isSm = useMediaQuery("(min-width: 640px)");

  // Panel state
  const [leftPanelWidthPx, setLeftPanelWidthPx] = useState(STORY_LEFT_PANEL_DEFAULT);
  const [isResizingLeftPanel, setIsResizingLeftPanel] = useState(false);
  const [rightPanelWidthPx, setRightPanelWidthPx] = useState(STORY_RIGHT_PANEL_DEFAULT);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);

  // Mobile shell
  const [mobileShellTab, setMobileShellTab] = useState<StoryMobileShellTab>("add-block");
  const [addBlockSheetOpen, setAddBlockSheetOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Outline
  const [outlineRename, setOutlineRename] = useState<OutlineRenameTarget | null>(null);

  // Load / save state
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<StorySaveStatus>("idle");

  // Refs
  const storyTitleInputRef = useRef<HTMLInputElement>(null);

  // Panel toggles
  const setLeftPanelOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === "function" ? next(isLeftPanelOpen) : next;
      setPanelOpen("left", resolved);
    },
    [isLeftPanelOpen, setPanelOpen],
  );

  const setInspectorOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === "function" ? next(inspectorOpen) : next;
      setPanelOpen("right", resolved);
    },
    [inspectorOpen, setPanelOpen],
  );

  // All document operations
  const ops = useStoryEditorOperations({ isLg, isSm });
  const {
    activePair,
    storySelection,
    selectedBlock,
    selectedBlockId,
    selectedFlowNode,
    selectedBlockInSplitPanel,
    columnsLayoutBlock,
    columnsNestingDepth,
    blockPlacementModal,
    blockSettingsSheetOpen,
    setBlockSettingsSheetOpen,
    setSelectedBlockId,
    setInspectorTab,
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
  } = ops;

  // Canvas ops context value
  const canvasOpsValue = useMemo((): StoryCanvasOpsContextValue => ({
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
  }), [
    isLg, isSm, storySelection, setSelectedBlockId, setInspectorTab,
    setInspectorOpen, setBlockSettingsSheetOpen, updateRichBlock,
    patchRichBlockRowLayout, openBlockPlacement, removeBlock, moveBlock,
    appendIntoContainer, appendSplitSupportingPreset, insertColumnNested, tableOps,
  ]);

  // ── Load / save ──────────────────────────────────────────────────────────

  const flushSave = useCallback(async (next: StoryDocument) => {
    setSaveStatus("saving");
    try {
      const saved = await onSave(next);
      markSaved(saved);
      setSaveStatus("idle");
      return saved;
    } catch (e) {
      console.error("Story save failed", e);
      setSaveStatus("error");
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error("Save failed", { description: msg });
      throw e;
    }
  }, [onSave, markSaved]);

  const docRef = useRef<StoryDocument | null>(null);
  docRef.current = doc;

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setSaveStatus("idle");
    (async () => {
      try {
        const existing = await onLoad(storyId);
        if (cancelled) return;
        if (!existing) {
          setLoadError("Story not found.");
          return;
        }
        const migrated = migrateStoryDocument(existing);
        let loadedDoc = migrated;
        if (JSON.stringify(existing) !== JSON.stringify(migrated)) {
          loadedDoc = await onSave(migrated);
          if (cancelled) return;
          toast.message("Story format updated", {
            description: "Sections, columns, and block types were upgraded to the latest format.",
          });
        }
        initializeDocument(loadedDoc);
        if (initialMode) setMode(initialMode);
        const roots = Array.isArray(loadedDoc.sections) ? loadedDoc.sections : [];
        if (initialSelectedBlockId) {
          const allSections = flattenSectionsDepthFirst(roots);
          const ownerSection = allSections.find((s) => s.blocks.some((b) => b.id === initialSelectedBlockId));
          if (ownerSection) {
            selectSection(ownerSection.id);
            selectBlock(initialSelectedBlockId);
          } else {
            const firstSec = roots[0] ?? null;
            selectSection(firstSec?.id ?? null);
            selectBlock(firstSec?.blocks?.[0]?.id ?? null);
          }
        } else {
          const firstSec = roots[0] ?? null;
          selectSection(firstSec?.id ?? null);
          selectBlock(firstSec?.blocks?.[0]?.id ?? null);
        }
      } catch (err) {
        console.error("Story load failed", err);
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Could not load story.";
        setLoadError(msg);
        toast.error("Story could not be loaded", { description: msg });
      }
    })();
    return () => { cancelled = true; };
  }, [storyId, onLoad, onSave, initializeDocument, selectSection, selectBlock, setMode, initialMode, initialSelectedBlockId]);

  const handleSaveDraft = useCallback(() => {
    if (!doc) return;
    void flushSave({ ...doc, status: "draft" }).then(() => toast.success("Draft saved.")).catch(() => {});
  }, [doc, flushSave]);

  const handlePublish = useCallback(() => {
    if (!doc) return;
    if (onPublish) {
      void (async () => {
        try {
          setSaveStatus("saving");
          const saved = await onPublish(doc);
          markSaved(saved);
          setSaveStatus("idle");
          toast.success("Published.");
        } catch (e) {
          setSaveStatus("error");
          toast.error("Publish failed", { description: e instanceof Error ? e.message : undefined });
        }
      })();
    } else {
      void flushSave({ ...doc, status: "published" }).then(() => toast.success("Published.")).catch(() => {});
    }
  }, [doc, onPublish, flushSave, markSaved]);

  const handleRetrySave = useCallback(() => {
    const cur = docRef.current;
    if (!cur) return;
    void flushSave(cur).catch(() => {});
  }, [flushSave]);

  // ── Auto-save ─────────────────────────────────────────────────────────────

  const dirtyRef = useRef(false);
  dirtyRef.current = storyEditorDirty;

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save: commit unsaved changes 3 s after the last edit.
  useEffect(() => {
    if (!storyEditorDirty || !doc) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      const cur = docRef.current;
      if (cur && dirtyRef.current) void flushSave(cur).catch(() => {});
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [doc, storyEditorDirty, flushSave]);

  // Save immediately when the tab/page is hidden (tab switch or browser close).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !dirtyRef.current) return;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      const cur = docRef.current;
      if (cur) void flushSave(cur).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [flushSave]);

  // Show the browser's native "leave page?" prompt if there are unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ── Responsive side effects ───────────────────────────────────────────────

  useEffect(() => {
    if (isLg) {
      setBlockSettingsSheetOpen(false);
      setAddBlockSheetOpen(false);
      setMobileShellTab("add-block");
    }
  }, [isLg, setBlockSettingsSheetOpen]);

  useEffect(() => {
    if (!isLg && mobileShellTab !== "add-block") setBlockSettingsSheetOpen(false);
  }, [isLg, mobileShellTab, setBlockSettingsSheetOpen]);


  // ── Panel width persistence ───────────────────────────────────────────────

  useLayoutEffect(() => {
    try {
      const rawL = sessionStorage.getItem(STORY_LEFT_PANEL_WIDTH_KEY);
      if (rawL) { const n = Number.parseInt(rawL, 10); if (Number.isFinite(n)) setLeftPanelWidthPx(clampStoryLeftPanelWidth(n)); }
      const rawR = sessionStorage.getItem(STORY_RIGHT_PANEL_WIDTH_KEY);
      if (rawR) { const n = Number.parseInt(rawR, 10); if (Number.isFinite(n)) setRightPanelWidthPx(clampStoryRightPanelWidth(n)); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(STORY_LEFT_PANEL_WIDTH_KEY, String(leftPanelWidthPx)); } catch { /* ignore */ }
  }, [leftPanelWidthPx]);

  useEffect(() => {
    try { sessionStorage.setItem(STORY_RIGHT_PANEL_WIDTH_KEY, String(rightPanelWidthPx)); } catch { /* ignore */ }
  }, [rightPanelWidthPx]);

  // ── Panel resize handlers ─────────────────────────────────────────────────

  const onLeftPanelResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    const startX = e.clientX;
    const startW = leftPanelWidthPx;
    setIsResizingLeftPanel(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: PointerEvent) => setLeftPanelWidthPx(clampStoryLeftPanelWidth(startW + ev.clientX - startX));
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      try { el.releasePointerCapture(pointerId); } catch { /* ignore */ }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setIsResizingLeftPanel(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [leftPanelWidthPx]);

  const onRightPanelResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    const startX = e.clientX;
    const startW = rightPanelWidthPx;
    setIsResizingRightPanel(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: PointerEvent) => setRightPanelWidthPx(clampStoryRightPanelWidth(startW + ev.clientX - startX));
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      try { el.releasePointerCapture(pointerId); } catch { /* ignore */ }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setIsResizingRightPanel(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [rightPanelWidthPx]);

  // ── Local derived actions ─────────────────────────────────────────────────

  const editColumnContent = useCallback(
    (columnIndex: 0 | 1) => {
      if (!columnsLayoutBlock) return;
      const firstNested = columnsLayoutBlock.columns[columnIndex]?.blocks?.[0];
      setSelectedBlockId(firstNested?.id ?? columnsLayoutBlock.id);
      setInspectorTab("block");
      if (isLg) setInspectorOpen(true);
      else setBlockSettingsSheetOpen(true);
    },
    [columnsLayoutBlock, isLg, setSelectedBlockId, setInspectorTab, setInspectorOpen, setBlockSettingsSheetOpen],
  );

  const deleteSelectedBlock = useCallback(() => {
    if (!activePair || !selectedBlockId) return;
    removeBlock(activePair.section.id, selectedBlockId);
    setBlockSettingsSheetOpen(false);
  }, [activePair, selectedBlockId, removeBlock, setBlockSettingsSheetOpen]);

  const selectSectionFromOutline = useCallback(
    (sectionId: string, firstBlockId: string | null) => {
      const path = doc ? findSectionPath(doc.sections ?? [], sectionId) : null;
      const fallback = path?.section.blocks[0]?.id ?? null;
      selectSection(sectionId);
      selectBlock(firstBlockId ?? fallback);
      setInspectorTab("block");
      if (!isLg) {
        setMobileShellTab("add-block");
        setBlockSettingsSheetOpen(false);
        setAddBlockSheetOpen(false);
      }
    },
    [doc, isLg, selectSection, selectBlock, setInspectorTab, setBlockSettingsSheetOpen],
  );

  const insertBlockFromDockPicker = useCallback(
    (presetId: import("../utils/story-block-presets").StoryAddBlockPresetId, opts?: { appendToEnd?: boolean }) => {
      if (!activePair) {
        toast.error("Pick a section in the outline first.");
        return;
      }
      const blocks = activePair.section.blocks;
      const idx = !opts?.appendToEnd && selectedBlockId ? blocks.findIndex((b) => b.id === selectedBlockId) : -1;
      const insertIndex = idx >= 0 ? idx + 1 : blocks.length;
      insertBlockWithPreset(activePair.section.id, insertIndex, presetId, {});
      setAddBlockSheetOpen(false);
    },
    [activePair, selectedBlockId, insertBlockWithPreset],
  );

  const handleDockNavigate = useCallback(
    (tab: StoryMobileShellTab) => {
      if (isLg) {
        if (tab === "structure") setLeftPanelOpen(true);
        else if (tab === "settings") { setInspectorOpen(true); setInspectorTab("story"); }
        else setAddBlockSheetOpen(true);
      } else {
        setMobileShellTab(tab);
        if (tab === "add-block") { setBlockSettingsSheetOpen(false); setAddBlockSheetOpen(true); }
        if (tab === "structure" || tab === "settings") setAddBlockSheetOpen(false);
      }
    },
    [isLg, setLeftPanelOpen, setInspectorOpen, setInspectorTab, setBlockSettingsSheetOpen],
  );

  // ── Add-section wrappers that also trigger outline rename ─────────────────

  const addSectionAfterWithRename = useCallback(
    (afterSectionId: string | null) => {
      const id = addSectionAfter(afterSectionId);
      setOutlineRename({ kind: "section", id });
    },
    [addSectionAfter],
  );

  const addSectionBeforeWithRename = useCallback(
    (beforeSectionId: string | null) => {
      const id = addSectionBefore(beforeSectionId);
      setOutlineRename({ kind: "section", id });
    },
    [addSectionBefore],
  );

  const addChildSectionWithRename = useCallback(
    (parentSectionId: string) => {
      const id = addChildSection(parentSectionId);
      setOutlineRename({ kind: "section", id });
    },
    [addChildSection],
  );

  // ── Derived header values ─────────────────────────────────────────────────

  const lastSavedLabel = doc ? formatLastSaved(doc.updatedAt) : "";

  const headerSaveLine =
    saveStatus === "saving" ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-base-content/65">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    ) : saveStatus === "error" ? (
      <span className="flex flex-wrap items-center gap-2 text-xs text-destructive">
        Save failed
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs font-medium" onClick={handleRetrySave}>
          Retry
        </Button>
      </span>
    ) : !storyEditorDirty && lastSavedLabel ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5 shrink-0 opacity-90" aria-hidden />
        Saved · {lastSavedLabel}
      </span>
    ) : storyEditorDirty ? (
      <span className="text-xs text-base-content/50">Unsaved changes</span>
    ) : null;

  const headerPublishState =
    doc && activePair ? storyDocumentPublishStateText(doc.status, storyEditorDirty) : null;

  // ── Publish split control ─────────────────────────────────────────────────

  const publishSplitControl = (opts?: { tall?: boolean }) => {
    const h = opts?.tall ? "h-11 min-h-[44px]" : "h-9";
    return (
      <div
        role="group"
        aria-label="Publish"
        className={cn("join", opts?.tall && "shadow-sm")}
      >
        <Button
          type="button"
          size="sm"
          className={cn(h, "join-item shrink-0 gap-1.5 border-0 px-3.5 font-semibold sm:px-4")}
          onClick={handlePublish}
        >
          Publish
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              h,
              "join-item inline-flex shrink-0 items-center justify-center border-0 border-l border-primary-content/15 px-2.5",
              opts?.tall && "min-w-[44px]",
            )}
            aria-label="More publish options"
          >
            <ChevronDown className="size-4 opacity-90" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 py-2.5" onClick={handlePublish}>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="size-3.5 opacity-80" aria-hidden />
                Publish now
              </span>
              <span className="pl-5 text-xs font-normal text-muted-foreground">Make this story live</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 py-2.5" onClick={handleSaveDraft}>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-3.5 opacity-80" aria-hidden />
                Save draft
              </span>
              <span className="pl-5 text-xs font-normal text-muted-foreground">Keep working without publishing</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="cursor-not-allowed flex-col items-start gap-0.5 py-2.5 opacity-60">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="size-3.5 opacity-80" aria-hidden />
                Schedule
              </span>
              <span className="pl-5 text-xs font-normal text-muted-foreground">Pick a future date (coming soon)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // ── Inspector props (shared between main panel + mobile sheets) ───────────

  const sharedInspectorProps = {
    doc: doc!,
    storyId,
    onPatchEmbed: patchEmbed,
    onPatchMedia: patchMedia,
    onPatchBlockRowLayout: patchBlockRowLayout,
    onPatchBlockDesign: patchBlockDesign,
    onTitleChange: setTitle,
    onExcerptChange: setExcerpt,
    onStoryMetaChange: patchStoryMeta,
    onCheckSlugAvailability: onCheckSlugAvailability,
    publicOrigin,
  };

  // ── Structure sidebar ─────────────────────────────────────────────────────

  const renderStructureSidebar = (mobileOverlay: boolean) =>
    doc ? (
      <StoryStructureSidebar
        doc={doc}
        activeSectionId={selectedSectionId}
        activeBlockId={selectedBlockId}
        onSelectSection={selectSectionFromOutline}
        outlineOpen
        onOutlineOpenChange={(open) => {
          if (mobileOverlay) return;
          if (!open) setLeftPanelOpen(false);
        }}
        renameTarget={outlineRename}
        onRenameTargetChange={setOutlineRename}
        onRenameSection={renameSectionTitle}
        onAddSectionAfter={addSectionAfterWithRename}
        onAddSectionBefore={addSectionBeforeWithRename}
        onAddChildSection={addChildSectionWithRename}
        onDeleteSection={deleteSection}
        onToggleCollapsed={toggleSectionCollapsed}
        onMoveSection={moveSection}
        onToggleSectionChapter={toggleSectionChapter}
        onToggleSectionPage={toggleSectionPage}
        onPatchSectionOutline={patchSectionOutline}
        isCompact={!isLg}
        mobileOverlay={mobileOverlay}
        onCloseMobileOverlay={mobileOverlay ? () => setMobileShellTab("add-block") : undefined}
        showCollapsedRail={Boolean(mobileOverlay)}
        outlineSectionNavDeferMs={mobileOverlay ? 300 : undefined}
      />
    ) : null;

  const structurePanel = renderStructureSidebar(false);

  // ── Early returns ─────────────────────────────────────────────────────────

  if (!doc && loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        {onBack ? (
          <button type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "font-medium")} onClick={() => onBack({ selectedBlockId: null, mode: "edit" })}>
            Go back
          </button>
        ) : null}
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-muted-foreground">
        Loading story…
      </div>
    );
  }

  // ── Editor canvas ─────────────────────────────────────────────────────────

  const editorPanel =
    doc && activePair ? (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base-300/35">
        <div className="min-h-0 flex-1 overflow-y-auto bg-base-300/65 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div
            className={cn(
              "mx-auto w-full max-w-full min-w-0",
              mode === "edit"
                ? "px-3 pb-24 pt-4 sm:px-5 sm:pt-5 lg:px-8 lg:pb-20 lg:pt-6"
                : "px-3 pb-8 pt-4 sm:px-5 lg:px-8 lg:pb-8",
            )}
          >
            <StoryTipTapCanvasToneProvider tone="paper">
              <div
                className={cn(
                  "story-doc-paper-surface w-full min-w-0",
                  "rounded-lg border border-black/20 bg-white text-neutral-900",
                  "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(0,0,0,0.1),0_20px_48px_-12px_rgba(0,0,0,0.12)]",
                  "ring-1 ring-black/[0.04]",
                )}
              >
                <div className="border-b border-black/20 px-4 py-4 sm:px-5 lg:px-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Section</p>
                  {outlineRename?.kind === "section" && outlineRename.id === activePair.section.id ? (
                    <div className="mt-2 max-w-xl" onClick={(e) => e.stopPropagation()}>
                      <OutlineRenameInput
                        initial={activePair.section.title}
                        onCommit={(v) => { renameSectionTitle(activePair.section.id, v); setOutlineRename(null); }}
                        onCancel={() => setOutlineRename(null)}
                      />
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        {activePair.breadcrumb.length > 0 ? (
                          <p className="truncate text-xs text-neutral-600">{activePair.breadcrumb.map((b) => b.title).join(" · ")}</p>
                        ) : null}
                        <p className="truncate font-heading text-lg font-semibold leading-snug tracking-tight text-neutral-900">{activePair.section.title}</p>
                      </div>
                      <button
                        type="button"
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-10 w-10 shrink-0 rounded-lg p-0 text-neutral-600 hover:bg-neutral-100")}
                        aria-label="Rename section"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => queueMicrotask(() => setOutlineRename({ kind: "section", id: activePair.section.id }))}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-4 px-4 py-6 sm:px-6 lg:space-y-2 lg:px-8 lg:py-8">
                  {groupStoryBlocksForLayout(activePair.section.blocks).map((group) => {
                    const sectionId = activePair.section.id;
                    if (group.kind === "float-wrap") {
                      return (
                        <Fragment key={`${group.float.id}-${group.text.id}`}>
                          <div className="flow-root min-w-0">
                            <StoryBlockRowDesignWrap block={group.float} floated>
                              <StoryEditorSectionBlockCardRow sectionId={sectionId} block={group.float} patchMediaBlock={patchMediaBlock} patchSplitContentBlock={patchSplitContentBlock} />
                            </StoryBlockRowDesignWrap>
                            <StoryBlockRowDesignWrap block={group.text} floated={false} wrapperClassName="min-w-0">
                              <StoryEditorSectionBlockCardRow sectionId={sectionId} block={group.text} patchMediaBlock={patchMediaBlock} patchSplitContentBlock={patchSplitContentBlock} />
                            </StoryBlockRowDesignWrap>
                          </div>
                        </Fragment>
                      );
                    }
                    const block = group.block;
                    return (
                      <StoryEditorSectionBlockCardRow
                        key={block.id}
                        sectionId={sectionId}
                        block={block}
                        patchMediaBlock={patchMediaBlock}
                        patchSplitContentBlock={patchSplitContentBlock}
                      />
                    );
                  })}
                </div>
              </div>
            </StoryTipTapCanvasToneProvider>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Select a section from the outline.
      </div>
    );

  // ── Inspector ─────────────────────────────────────────────────────────────

  const inspectorEl =
    doc && mode === "edit" ? (
      <StoryCreatorInspector
        {...sharedInspectorProps}
        inspectorTab={inspectorTab}
        onInspectorTab={setInspectorTab}
        selectedSection={activePair?.section ?? null}
        selectedBlock={selectedBlock}
        selectedBlockId={selectedBlockId}
        selectedFlowNode={selectedFlowNode}
        storyEditorDirty={storyEditorDirty}
        columnsLayoutBlock={columnsLayoutBlock}
        columnsNestingDepth={columnsNestingDepth}
        onPatchColumns={patchColumns}
        onPatchColumnSlot={patchColumnSlot}
        onEditColumnContent={editColumnContent}
        onPatchContainer={patchContainer}
        onPatchBlockDateAnnotation={patchBlockDateAnnotation}
        onPatchSection={updateSectionInStore}
        onPatchRichTextMeta={patchRichTextMeta}
        onPatchDividerMeta={patchDividerMeta}
        onPatchSplitContent={activePair && selectedBlockId ? (patch) => patchSplitContentBlock(activePair.section.id, selectedBlockId, patch) : undefined}
        onPatchFlowNode={patchFlowNode}
        onPatchTable={selectedBlock?.type === "table" ? patchTable : undefined}
        selectedBlockInSplitPanel={selectedBlockInSplitPanel}
        onClose={isLg ? () => setInspectorOpen(false) : undefined}
        onDeleteBlock={deleteSelectedBlock}
        className={cn(
          !isLg && "w-full min-h-0 flex-1 border-l-0 border-t",
          isLg && "h-full min-h-0 w-full min-w-0 border-primary/20 shadow-[inset_1px_0_0_0] shadow-black/10",
        )}
      />
    ) : null;

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <StoryCanvasOpsContext.Provider value={canvasOpsValue}>
      <StoryTipTapStoryDocProvider doc={doc}>
        <StoryTiptapActiveEditorProvider toolbarDensity={isLg ? "default" : "touch"}>
          <StoryGlobalToolbarSelectionSync selectedBlockId={selectedBlockId} selectedBlockKind={selectedBlock?.type ?? null} />
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              mode === "edit" && "bg-base-300",
              mode === "preview" && "bg-base-100",
            )}
          >
            <div className="sticky top-0 z-20 shrink-0">
            <header className="flex flex-col gap-2.5 border-b border-base-content/10 bg-base-300/95 px-3 py-3 backdrop-blur-md sm:gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-4 lg:gap-y-2 lg:px-5 lg:py-3">
                {!isLg ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {onBack ? (
                        <Button type="button" variant="ghost" size="sm" className="h-11 min-h-[44px] w-11 shrink-0 rounded-xl p-0" aria-label="Go back" onClick={() => onBack({ selectedBlockId, mode })}>
                          <ChevronLeft className="size-5" aria-hidden />
                        </Button>
                      ) : null}
                      <StoryCreatorBrandMark />
                      {publishSplitControl({ tall: true })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 gap-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                        <span className={cn("badge h-6 shrink-0 gap-1 border px-2.5 text-[11px] font-semibold", doc.status === "published" ? "badge-success border-transparent" : "badge-ghost border-base-content/15")}>
                          {doc.status === "draft" ? "Draft" : "Published"}
                        </span>
                        <span className="badge badge-outline h-6 shrink-0 border-primary/30 px-2.5 text-[11px] font-semibold text-primary">
                          {storyKindUiLabel(doc.kind)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StoryEditPreviewModeToggle mode={mode} onMode={setMode} layout="touch" />
                        {mode === "edit" ? (
                          <>
                            <Button
                              type="button" variant="outline" size="sm"
                              className={cn("h-11 min-h-[44px] w-11 shrink-0 rounded-xl border-base-content/12 p-0", mobileShellTab === "structure" && "border-primary/40 bg-primary/12 text-primary ring-1 ring-primary/20")}
                              onClick={() => setMobileShellTab((t) => (t === "structure" ? "add-block" : "structure"))}
                            >
                              <FolderTree className="size-5 opacity-90" aria-hidden />
                            </Button>
                            <Button
                              type="button" variant="outline" size="sm"
                              className={cn("h-11 min-h-[44px] w-11 shrink-0 rounded-xl border-base-content/12 p-0", blockSettingsSheetOpen && "border-primary/40 bg-primary/12 text-primary ring-1 ring-primary/20")}
                              onClick={() => { setInspectorTab("block"); setBlockSettingsSheetOpen(!blockSettingsSheetOpen); }}
                            >
                              <SlidersHorizontal className="size-5 opacity-90" aria-hidden />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                        {onBack ? (
                          <Button type="button" variant="ghost" size="sm" className="hidden h-9 w-9 shrink-0 rounded-lg p-0 lg:flex" aria-label="Go back" onClick={() => onBack({ selectedBlockId, mode })}>
                            <ChevronLeft className="size-4" aria-hidden />
                          </Button>
                        ) : null}
                        <div className="hidden shrink-0 lg:flex">
                          <StoryCreatorBrandMark />
                        </div>
                        <div className="flex min-w-0 max-w-full flex-1 items-center gap-2 lg:max-w-xl">
                          <input
                            ref={storyTitleInputRef}
                            className="input input-ghost input-sm h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-base-200/50 px-2.5 font-semibold text-base-content hover:border-base-content/15 focus:border-primary/35"
                            value={doc.title}
                            onChange={(e) => setTitle(e.target.value)}
                            aria-label="Story title"
                          />
                          <button
                            type="button"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9 w-9 shrink-0 rounded-lg p-0 text-base-content/60 hover:bg-base-content/[0.08]")}
                            aria-label="Focus story title"
                            onClick={() => storyTitleInputRef.current?.focus()}
                          >
                            <Pencil className="size-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className={cn("badge h-7 shrink-0 gap-1 border px-2.5 text-xs font-semibold", doc.status === "published" ? "badge-success border-transparent" : "badge-ghost border-base-content/15")}>
                            {doc.status === "draft" ? "Draft" : "Published"}
                          </span>
                          <span className="badge badge-outline h-7 shrink-0 border-primary/30 px-2.5 text-xs font-semibold text-primary">
                            {storyKindUiLabel(doc.kind)}
                          </span>
                          {headerSaveLine}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <StoryEditPreviewModeToggle mode={mode} onMode={setMode} layout="default" />
                      {mode === "edit" ? (
                        <>
                          {onEnterFullscreen ? (
                            <Button
                              type="button" size="sm" variant="outline"
                              className="h-9 w-9 shrink-0 rounded-lg border-base-content/12 p-0"
                              title="Fullscreen writing"
                              onClick={() => { setMobileShellTab("add-block"); onEnterFullscreen({ selectedBlockId, mode }); }}
                            >
                              <Expand className="size-4 opacity-90" aria-hidden />
                            </Button>
                          ) : null}
                          <Button
                            type="button" size="sm" variant="outline"
                            className={cn("h-9 w-9 shrink-0 rounded-lg border-base-content/12 p-0", isLeftPanelOpen && "border-primary/40 bg-primary/12 text-primary ring-1 ring-primary/20")}
                            title={isLeftPanelOpen ? "Hide structure" : "Show structure"}
                            onClick={() => setLeftPanelOpen((o) => !o)}
                          >
                            <FolderTree className="size-4 opacity-90" aria-hidden />
                          </Button>
                          <Button
                            type="button" size="sm" variant="outline"
                            className={cn("h-9 w-9 shrink-0 rounded-lg border-base-content/12 p-0 font-medium", inspectorOpen && "border-primary/40 bg-primary/12 text-primary ring-1 ring-primary/20")}
                            title={inspectorOpen ? "Hide inspector" : "Show inspector"}
                            onClick={() => setInspectorOpen((o) => !o)}
                          >
                            {inspectorOpen ? <PanelRightClose className="size-4 opacity-90" aria-hidden /> : <SlidersHorizontal className="size-4 opacity-90" aria-hidden />}
                          </Button>
                        </>
                      ) : null}
                      {publishSplitControl()}
                    </div>
                  </>
                )}
            </header>

            {mode === "edit" ? (
              <StoryGlobalTipTapToolbar
                toolbarDensity={isLg ? "default" : "touch"}
                className="border-b border-base-content/10 bg-base-300/90 px-2 py-1.5 lg:px-4"
                frameClassName="rounded-lg border-base-content/10 bg-base-200/75 shadow-sm"
              />
            ) : null}
            </div>

            {isLg ? (
              mode === "preview" ? (
                <StoryCreatorPreview doc={doc} activeSectionId={selectedSectionId} onPickSection={selectSection} />
              ) : (
                <div
                  className={cn(
                    "relative flex min-h-0 flex-1",
                    mode === "edit" && !dockCollapsed && "pb-16",
                    (isResizingLeftPanel || isResizingRightPanel) && "select-none",
                  )}
                >
                  {/* Left panel */}
                  <div
                    className={cn("relative flex shrink-0 overflow-hidden border-r border-primary/20 bg-base-200/40 shadow-[inset_-1px_0_0_0] shadow-black/10", STORY_PANEL_TRANSITION)}
                    style={{ width: isLeftPanelOpen ? leftPanelWidthPx + 6 : 0 }}
                  >
                    <div className="flex h-full min-h-0" style={{ width: isLeftPanelOpen ? leftPanelWidthPx + 6 : 0 }}>
                      <div className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden" style={{ width: leftPanelWidthPx }}>
                        {structurePanel}
                      </div>
                      {isLeftPanelOpen ? (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label="Resize structure panel"
                          aria-valuemin={STORY_LEFT_PANEL_MIN}
                          aria-valuemax={STORY_LEFT_PANEL_MAX}
                          aria-valuenow={leftPanelWidthPx}
                          tabIndex={0}
                          className="flex w-1.5 shrink-0 cursor-col-resize items-center justify-center border-l border-primary/25 bg-gradient-to-b from-base-300/80 via-primary/15 to-base-300/80 hover:from-primary/25 hover:via-primary/35 hover:to-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          onPointerDown={onLeftPanelResizePointerDown}
                          onKeyDown={(ke) => {
                            if (ke.key === "ArrowLeft") { ke.preventDefault(); setLeftPanelWidthPx((w) => clampStoryLeftPanelWidth(w - 12)); }
                            else if (ke.key === "ArrowRight") { ke.preventDefault(); setLeftPanelWidthPx((w) => clampStoryLeftPanelWidth(w + 12)); }
                          }}
                        >
                          <GripVertical className="pointer-events-none size-3 text-primary/50" aria-hidden />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {!isLeftPanelOpen ? (
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "absolute left-0 top-1/2 z-20 h-24 w-8 -translate-y-1/2 rounded-r-2xl border-primary/30 bg-base-200/90 px-0 text-primary shadow-md backdrop-blur-sm hover:border-primary/50 hover:bg-primary/10")}
                      aria-label="Open story structure panel"
                      onClick={() => setLeftPanelOpen(true)}
                    >
                      <ChevronRight className="mx-auto size-4" strokeWidth={2.25} aria-hidden />
                    </button>
                  ) : null}
                  {/* Editor */}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-base-300/25">
                    {editorPanel}
                  </div>
                  {/* Right panel */}
                  <div
                    className={cn("relative shrink-0 overflow-hidden border-l border-primary/20 bg-base-200/40 shadow-[inset_1px_0_0_0] shadow-black/10", STORY_PANEL_TRANSITION)}
                    style={{ width: inspectorOpen ? rightPanelWidthPx + 6 : 0 }}
                  >
                    <div className="flex h-full min-h-0 flex-row" style={{ width: inspectorOpen ? rightPanelWidthPx + 6 : 0 }}>
                      {inspectorOpen ? (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label="Resize inspector panel"
                          aria-valuemin={STORY_RIGHT_PANEL_MIN}
                          aria-valuemax={STORY_RIGHT_PANEL_MAX}
                          aria-valuenow={rightPanelWidthPx}
                          tabIndex={0}
                          className="flex w-1.5 shrink-0 cursor-col-resize items-center justify-center border-r border-primary/25 bg-gradient-to-b from-base-300/80 via-primary/15 to-base-300/80 hover:from-primary/25 hover:via-primary/35 hover:to-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          onPointerDown={onRightPanelResizePointerDown}
                          onKeyDown={(ke) => {
                            if (ke.key === "ArrowLeft") { ke.preventDefault(); setRightPanelWidthPx((w) => clampStoryRightPanelWidth(w + 12)); }
                            else if (ke.key === "ArrowRight") { ke.preventDefault(); setRightPanelWidthPx((w) => clampStoryRightPanelWidth(w - 12)); }
                          }}
                        >
                          <GripVertical className="pointer-events-none size-3 text-primary/50" aria-hidden />
                        </div>
                      ) : null}
                      <div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden" style={{ width: rightPanelWidthPx, minWidth: rightPanelWidthPx }}>
                        {inspectorEl}
                      </div>
                    </div>
                  </div>
                  {!inspectorOpen ? (
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "absolute right-0 top-1/2 z-20 h-24 w-8 -translate-y-1/2 rounded-l-2xl border-primary/30 bg-base-200/90 px-0 text-primary shadow-md backdrop-blur-sm hover:border-primary/50 hover:bg-primary/10")}
                      aria-label="Open inspector panel"
                      onClick={() => setInspectorOpen(true)}
                    >
                      <ChevronLeft className="mx-auto size-4" strokeWidth={2.25} aria-hidden />
                    </button>
                  ) : null}
                </div>
              )
            ) : (
              <>
                {mode === "preview" ? (
                  <StoryCreatorPreview doc={doc} activeSectionId={selectedSectionId} onPickSection={selectSection} />
                ) : (
                  <>
                    <div className="relative min-h-0 flex-1 overflow-hidden">
                      {mobileShellTab === "add-block" ? editorPanel : null}
                    </div>
                    <StoryMobileFullScreenPanel
                      open={mobileShellTab === "structure"}
                      onOpenChange={(open: boolean) => { if (!open) setMobileShellTab("add-block"); }}
                      title="Story structure"
                    >
                      {renderStructureSidebar(true)}
                    </StoryMobileFullScreenPanel>
                    <StoryMobileFullScreenPanel
                      open={mobileShellTab === "settings"}
                      onOpenChange={(open: boolean) => { if (!open) setMobileShellTab("add-block"); }}
                      title="Story settings"
                    >
                      <StoryCreatorInspector
                        {...sharedInspectorProps}
                        layout="sheet-story"
                        inspectorTab="story"
                        onInspectorTab={setInspectorTab}
                        selectedSection={activePair?.section ?? null}
                        selectedBlock={selectedBlock}
                        selectedBlockId={selectedBlockId}
                        storyEditorDirty={storyEditorDirty}
                        onPatchBlockRowLayout={patchBlockRowLayout}
                        onPatchBlockDesign={patchBlockDesign}
                        className="min-h-0 border-0 bg-transparent"
                      />
                    </StoryMobileFullScreenPanel>
                    <StoryBlockSettingsBottomSheet open={blockSettingsSheetOpen} onOpenChange={setBlockSettingsSheetOpen} title="Block settings">
                      <StoryCreatorInspector
                        {...sharedInspectorProps}
                        layout="sheet-block"
                        inspectorTab="block"
                        onInspectorTab={setInspectorTab}
                        selectedSection={activePair?.section ?? null}
                        selectedBlock={selectedBlock}
                        selectedBlockId={selectedBlockId}
                        storyEditorDirty={storyEditorDirty}
                        columnsLayoutBlock={columnsLayoutBlock}
                        columnsNestingDepth={columnsNestingDepth}
                        onPatchColumns={patchColumns}
                        onPatchColumnSlot={patchColumnSlot}
                        onEditColumnContent={editColumnContent}
                        onPatchContainer={patchContainer}
                        onPatchBlockDateAnnotation={patchBlockDateAnnotation}
                        onPatchSection={updateSectionInStore}
                        onPatchRichTextMeta={patchRichTextMeta}
                        onPatchDividerMeta={patchDividerMeta}
                        onPatchSplitContent={activePair && selectedBlockId ? (patch) => patchSplitContentBlock(activePair.section.id, selectedBlockId, patch) : undefined}
                        onPatchTable={selectedBlock?.type === "table" ? patchTable : undefined}
                        selectedBlockInSplitPanel={selectedBlockInSplitPanel}
                        onDeleteBlock={deleteSelectedBlock}
                        className="min-h-0 border-0 bg-transparent"
                      />
                    </StoryBlockSettingsBottomSheet>
                  </>
                )}
              </>
            )}

            {mode === "edit" ? (
              <StoryAddBlockBottomSheet open={addBlockSheetOpen} onOpenChange={setAddBlockSheetOpen} title="Add block">
                <StoryAddBlockPresetTypeGrid
                  groups={STORY_ADD_BLOCK_DOCK_PRESET_GROUPS}
                  onPick={(id) => insertBlockFromDockPicker(id, { appendToEnd: true })}
                />
                <p className="mt-4 text-center text-xs leading-relaxed text-base-content/45">
                  New blocks are added to the end of the section.
                </p>
              </StoryAddBlockBottomSheet>
            ) : null}

            {mode === "edit" ? (
              dockCollapsed ? (
                <StoryEditorDockPullTab onOpen={() => setDockCollapsed(false)} />
              ) : (
                <StoryEditorBottomDock
                  active={isLg ? null : mobileShellTab}
                  emphasizeAddBlockFab={isLg}
                  onNavigate={handleDockNavigate}
                  onCollapse={() => setDockCollapsed(true)}
                />
              )
            ) : null}

            <StoryBlockPlacementDialog
              open={blockPlacementModal !== null}
              onOpenChange={(open: boolean) => { if (!open) handlePlacementModalClose(); }}
              flow={blockPlacementModal?.flow ?? null}
              variant={blockPlacementModal?.variant ?? "section"}
              allowNestedColumns={blockPlacementModal?.allowNestedColumns ?? true}
              initialAddPosition={blockPlacementModal?.initialAddPosition ?? null}
              presetAllowlist={blockPlacementModal?.presetAllowlist ?? null}
              onAddComplete={applyPlacementAdd}
              onDuplicateComplete={applyPlacementDuplicate}
            />

          </div>
        </StoryTiptapActiveEditorProvider>
      </StoryTipTapStoryDocProvider>
    </StoryCanvasOpsContext.Provider>
  );
}

// ── Public export (wraps in store provider) ───────────────────────────────────

export function StoryCreatorClient(props: StoryCreatorClientProps) {
  return (
    <StoryEditorStoreProvider>
      <StoryCreatorClientInner {...props} />
    </StoryEditorStoreProvider>
  );
}
