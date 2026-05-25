import type { StoryEmbedBlock, StoryMediaBlock } from "../types";

export function isStoryMediaUnconfigured(block: StoryMediaBlock): boolean {
  return !block.mediaId?.trim();
}

export function isStoryEmbedUnconfigured(block: StoryEmbedBlock): boolean {
  const title = block.title ?? block.label;
  return title === "New embed" || title === "Embed block" || !title?.trim();
}
