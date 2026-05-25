/** Represents a linked entity record within a story (individual, family, event, or source). */
export type NoteLinkKind = "individual" | "family" | "event" | "source";

export interface SelectedNoteLink {
  kind: NoteLinkKind;
  id: string;
  label: string;
}
