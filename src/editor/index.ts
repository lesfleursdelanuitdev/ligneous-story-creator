/**
 * Story Creator editor entry point.
 * Import via `@ligneous/story-creator/editor`.
 *
 * This entry point is separate from `@ligneous/story-creator` (utils/types) and
 * `@ligneous/story-creator/renderer` (public renderer) so consuming apps only pull
 * in TipTap and editor-only deps when they actually mount the editor.
 */

// ── Main editor shell ─────────────────────────────────────────────────────────

export { StoryCreatorClient } from "./StoryCreatorClient";
export type { StoryCreatorClientProps, StorySaveStatus, StoryCreatorFullscreenState } from "./StoryCreatorClient";

// ── Injection contexts ────────────────────────────────────────────────────────
// Consuming apps must wrap <StoryCreatorClient> in these providers (or provide
// null-returning defaults) before the editor can use entity pickers and media.

// Pickers — entity search UIs injected per-app
export {
  StoryEditorPickersProvider,
  useStoryEditorPickers,
  storyPickerIndividualDisplayName,
  storyPickerIndividualMetaLine,
  storyPickerPlaceLabel,
} from "./pickers-context";
export type {
  StoryEditorPickersContextValue,
  StoryPickerIndividualItem,
  StoryPickerFamilyItem,
  StoryPickerEventItem,
  StoryPickerPlaceRow,
  StoryPickerMediaItem,
  StoryPickerAlbumItem,
  StoryPickerNoteItem,
  StoryPickerTagItem,
  IndividualSearchPickerProps,
  FamilySearchPickerProps,
  EventPickerModalProps,
  PlaceSearchPickerProps,
  MediaPickerModalProps,
  MediaPickerButtonProps,
  EditorPillProps,
  NotesPickerProps,
  TagsPickerProps,
  AlbumsManagerProps,
} from "./pickers-context";

// Media — media-by-id resolution injected per-app
export {
  StoryEditorMediaProvider,
  useStoryEditorMedia,
  useStoryEditorMediaOptional,
} from "./media-context";
export type {
  StoryEditorMediaContextValue,
  StoryMediaDetail,
  StoryMediaQueryResult,
} from "./media-context";

// Timeline — embed data resolution injected per-app
export {
  StoryEditorTimelineProvider,
  useStoryEditorTimelineOptional,
} from "./timeline-embed-context";
export type {
  StoryEditorTimelineContextValue,
  StoryTimelineEmbedDataStatus,
  TimelineResolutionStatus,
} from "./timeline-embed-context";

// ── Store ─────────────────────────────────────────────────────────────────────
// StoryEditorStoreProvider is already mounted inside StoryCreatorClient.
// Export it here for apps that need direct store access outside the client shell.

export { StoryEditorStoreProvider, useStoryEditorStore } from "./state/storyEditorContext";
export type {
  StoryEditorStore,
  StoryEditorState,
  StoryEditorActions,
  StoryEditorMode,
  StoryFlowNodeSelection,
  StoryValidationError,
  StoryEditorHistoryState,
  StoryHistorySnapshot,
  MoveBlockTarget,
  MoveSectionTarget,
  AddBlockPosition,
  AddSectionPosition,
} from "./state/storyEditorTypes";

// ── Inspector ─────────────────────────────────────────────────────────────────

export { StoryCreatorInspector } from "./StoryCreatorInspector";
export type { StoryInspectorTab, StoryInspectorLayout } from "./StoryCreatorInspector";

// Inspector sub-components (re-exported from StoryCreatorInspector barrel)
export {
  FieldLabel,
  HelperCard,
  STORY_KIND_OPTIONS,
  tagsToCommaInput,
  parseCommaTags,
  BlockDateAnnotationInspector,
  StoryBlockRowLayoutInspector,
  StoryBlockDesignInspector,
  TableBlockInspector,
  SplitContentInspector,
  DividerBlockInspector,
  RichTextBlockInspector,
  ContainerLayoutInspector,
  ColumnsLayoutInspector,
  EventPickerButton,
  InspectorStoryAuthorsSection,
  InspectorStoryLinkedRecords,
  InspectorStoryImagesSection,
  StoryLinkedAlbumsField,
  MediaBlockInspector,
  OtherEmbedInspector,
} from "./StoryCreatorInspector";
export type { TableLayoutPatch } from "./StoryCreatorInspector";

// ── Structure sidebar ─────────────────────────────────────────────────────────

export { StoryStructureSidebar, OutlineRenameInput } from "./StoryStructureSidebar";
export type { OutlineRenameTarget } from "./StoryStructureSidebar";

// ── Canvas ops context ────────────────────────────────────────────────────────
// For apps building custom canvas layouts that need to read/call editor ops.

export { StoryCanvasOpsContext, useStoryCanvasOps } from "./story-creator-canvas-ops-context";
export type {
  StoryCanvasOpsContextValue,
  StoryBlockPlacementModalArgs,
} from "./story-creator-canvas-ops-context";

// ── Operations hook ───────────────────────────────────────────────────────────
// Exposed for apps that compose a custom editor shell around the store.

export { useStoryEditorOperations } from "./useStoryEditorOperations";
export type {
  UseStoryEditorOperationsOptions,
  UseStoryEditorOperationsResult,
} from "./useStoryEditorOperations";

// ── Block placement dialog ────────────────────────────────────────────────────

export { StoryBlockPlacementDialog } from "./StoryBlockPlacementDialog";
export type {
  StoryBlockPlacementFlow,
  StoryBlockPlacementVariant,
  StoryBlockPlacementDialogProps,
} from "./StoryBlockPlacementDialog";

// ── Add-block preset grid ─────────────────────────────────────────────────────

export { StoryAddBlockPresetTypeGrid } from "./StoryAddBlockPresetTypeGrid";

// ── Preview ───────────────────────────────────────────────────────────────────

export { StoryCreatorPreview } from "./story-creator-preview";

// ── Mobile shell ──────────────────────────────────────────────────────────────

export {
  StoryEditorBottomDock,
  StoryMobileBottomNav,
  StoryEditorDockPullTab,
  StoryEditorBottomSheet,
  StoryBlockSettingsBottomSheet,
  StoryAddBlockBottomSheet,
  StoryMobileFullScreenPanel,
} from "./story-creator-mobile";
export type { StoryMobileShellTab } from "./story-creator-mobile";
