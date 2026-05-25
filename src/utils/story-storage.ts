import type { StoryDocument } from "../types";

/** Returns a copy of the document with `updatedAt` set to now — matches the shape persisted on each save. */
export function storyDocumentWithSaveTimestamp(doc: StoryDocument): StoryDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}
