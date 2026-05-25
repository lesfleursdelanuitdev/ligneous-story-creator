"use client";

import { createContext, useContext, type ComponentType, type ReactNode } from "react";

/** Minimal shape of an individual as returned by the tree's person search. */
export type StoryPickerIndividualItem = {
  id: string;
  xref?: string | null;
  fullName?: string | null;
  birthYear?: number | string | null;
  deathYear?: number | string | null;
  individualNameForms?: Array<{
    isPrimary: boolean | null;
    sortOrder: number | null;
    givenNames: Array<{ givenName: { givenName: string } }>;
    surnames: Array<{ surname: { surname: string } }>;
  }>;
};

/** Minimal shape of a family as returned by the tree's family search. */
export type StoryPickerFamilyItem = {
  id: string;
  xref?: string | null;
  /** Pre-formatted label line for the union. If absent the host should construct one. */
  primaryLine?: string | null;
};

/** Minimal shape of an event as returned by the tree's event picker. */
export type StoryPickerEventItem = {
  id: string;
  /** Pre-formatted display label for the event. */
  label?: string | null;
};

/** Minimal shape of a place row returned by the place search. */
export type StoryPickerPlaceRow = {
  id: string;
  name: string;
  original?: string | null;
  county?: string | null;
  state?: string | null;
  country?: string | null;
  /** Pre-formatted label (e.g. "London, England"). If absent the host should construct one. */
  label?: string | null;
};

/** Minimal shape of a media item as returned by the tree's media picker. */
export type StoryPickerMediaItem = {
  id: string;
  title: string | null;
  description: string | null;
  fileRef: string | null;
  form: string | null;
};

/** Minimal shape of an album item. */
export type StoryPickerAlbumItem = {
  id: string;
  name: string;
};

/** Minimal shape of a research note item. */
export type StoryPickerNoteItem = {
  id: string;
  xref?: string | null;
};

/** Minimal shape of a tag item. */
export type StoryPickerTagItem = {
  id: string;
  name: string;
  color: string | null;
};

// ─── Prop types for injectable picker components ─────────────────────────────

export type IndividualSearchPickerProps = {
  idPrefix: string;
  label?: string;
  description?: string;
  allowEmptySearch?: boolean;
  limit?: number;
  excludeIds?: Set<string>;
  onPick: (individual: StoryPickerIndividualItem) => void;
};

export type FamilySearchPickerProps = {
  idPrefix: string;
  excludeIds?: Set<string>;
  onPick: (family: StoryPickerFamilyItem) => void;
};

export type EventPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeEventIds?: Set<string>;
  onPick: (event: StoryPickerEventItem) => void;
};

export type PlaceSearchPickerProps = {
  idPrefix?: string;
  excludeIds?: Set<string>;
  onPick: (row: StoryPickerPlaceRow) => void;
  className?: string;
};

export type MediaPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: string;
  targetId: string;
  mode: "single" | "multi";
  purpose?: string;
  onAttach: (items: StoryPickerMediaItem[]) => void;
};

/**
 * An inline trigger button that opens the host app's media picker.
 * The host owns how to open the picker; the package passes targetType, targetId, etc.
 */
export type MediaPickerButtonProps = {
  targetType: string;
  targetId: string;
  mode: "single" | "multi";
  purpose?: string;
  triggerLabel: string;
  triggerClassName?: string;
  onAttach: (items: StoryPickerMediaItem[]) => void;
};

/** A tag pill used to display a linked item with a remove button. */
export type EditorPillProps = {
  label: string;
  onRemove: () => void;
};

export type NotesPickerProps = {
  idPrefix?: string;
  onPick: (note: StoryPickerNoteItem) => void;
};

export type TagsPickerProps = {
  selected: StoryPickerTagItem[];
  onAdd: (tag: StoryPickerTagItem) => void;
  onRemove: (id: string) => void;
  placeholder?: string;
};

/**
 * Component for managing linked albums. The host app provides this component
 * which handles its own search/create UI internally.
 */
export type AlbumsManagerProps = {
  linkedAlbums: StoryPickerAlbumItem[];
  panelId: string;
  touchComfort?: boolean;
  onChange: (albums: StoryPickerAlbumItem[]) => void;
};

// ─── Context value ────────────────────────────────────────────────────────────

export type StoryEditorPickersContextValue = {
  IndividualSearchPicker: ComponentType<IndividualSearchPickerProps> | null;
  FamilySearchPicker: ComponentType<FamilySearchPickerProps> | null;
  EventPickerModal: ComponentType<EventPickerModalProps> | null;
  PlaceSearchPicker: ComponentType<PlaceSearchPickerProps> | null;
  NotesPicker: ComponentType<NotesPickerProps> | null;
  TagsPicker: ComponentType<TagsPickerProps> | null;
  MediaPickerModal: ComponentType<MediaPickerModalProps> | null;
  MediaPickerButton: ComponentType<MediaPickerButtonProps> | null;
  EditorPill: ComponentType<EditorPillProps> | null;
  AlbumsManager: ComponentType<AlbumsManagerProps> | null;
};

const DEFAULT_VALUE: StoryEditorPickersContextValue = {
  IndividualSearchPicker: null,
  FamilySearchPicker: null,
  EventPickerModal: null,
  PlaceSearchPicker: null,
  NotesPicker: null,
  TagsPicker: null,
  MediaPickerModal: null,
  MediaPickerButton: null,
  EditorPill: null,
  AlbumsManager: null,
};

const StoryEditorPickersContext = createContext<StoryEditorPickersContextValue>(DEFAULT_VALUE);

export function StoryEditorPickersProvider({
  IndividualSearchPicker,
  FamilySearchPicker,
  EventPickerModal,
  PlaceSearchPicker,
  NotesPicker,
  TagsPicker,
  MediaPickerModal,
  MediaPickerButton,
  EditorPill,
  AlbumsManager,
  children,
}: Partial<StoryEditorPickersContextValue> & { children: ReactNode }) {
  return (
    <StoryEditorPickersContext.Provider
      value={{
        IndividualSearchPicker: IndividualSearchPicker ?? null,
        FamilySearchPicker: FamilySearchPicker ?? null,
        EventPickerModal: EventPickerModal ?? null,
        PlaceSearchPicker: PlaceSearchPicker ?? null,
        NotesPicker: NotesPicker ?? null,
        TagsPicker: TagsPicker ?? null,
        MediaPickerModal: MediaPickerModal ?? null,
        MediaPickerButton: MediaPickerButton ?? null,
        EditorPill: EditorPill ?? null,
        AlbumsManager: AlbumsManager ?? null,
      }}
    >
      {children}
    </StoryEditorPickersContext.Provider>
  );
}

export function useStoryEditorPickers(): StoryEditorPickersContextValue {
  return useContext(StoryEditorPickersContext);
}

/** Simple display helpers for individual picker items (used without full gedcom name-form parsing). */
export function storyPickerIndividualDisplayName(ind: StoryPickerIndividualItem): string {
  if (ind.individualNameForms && Array.isArray(ind.individualNameForms)) {
    const primary = ind.individualNameForms.find((f) => f.isPrimary) ?? ind.individualNameForms[0];
    if (primary) {
      const given = primary.givenNames.map((g) => g.givenName.givenName).join(" ").trim();
      const sur = primary.surnames.map((s) => s.surname.surname).join(" ").trim();
      const full = [given, sur].filter(Boolean).join(" ").trim();
      if (full) return full;
    }
  }
  const stripped = ind.fullName?.replace(/\//g, "").trim();
  return stripped || ind.xref?.trim() || ind.id;
}

export function storyPickerIndividualMetaLine(ind: StoryPickerIndividualItem): string {
  const xr = ind.xref?.trim();
  const b = ind.birthYear != null ? String(ind.birthYear).trim() : "";
  const d = ind.deathYear != null ? String(ind.deathYear).trim() : "";
  let life = "";
  if (b && d) life = `b. ${b} – d. ${d}`;
  else if (b) life = `b. ${b}`;
  else if (d) life = `d. ${d}`;
  const parts: string[] = [];
  if (xr) parts.push(xr);
  if (life) parts.push(life);
  return parts.join(" · ");
}

export function storyPickerPlaceLabel(row: StoryPickerPlaceRow): string {
  if (row.label) return row.label;
  const parts = [row.name, row.county, row.state, row.country].filter(Boolean);
  return parts.join(", ");
}
