import type { StoryEmbedBlock, StoryMediaBlock } from "../types";
import { EmbedBlockContentRenderer } from "./story-block-embed-content";
import { MediaBlockContentRenderer } from "./story-block-media-content";

export function MediaEmbedCanvasCard({
  block,
  onConfigure,
  compact,
  onResizeWidth,
  onResizeHeight,
}: {
  block: StoryMediaBlock;
  onConfigure: () => void;
  compact?: boolean;
  onResizeWidth?: (pct: number) => void;
  onResizeHeight?: (px: number | undefined) => void;
}) {
  return (
    <MediaBlockContentRenderer
      block={block}
      variant="editor"
      compact={compact}
      onConfigure={onConfigure}
      onResizeWidth={onResizeWidth}
      onResizeHeight={onResizeHeight}
    />
  );
}

export function EmbedCanvasCard({
  block,
  compact,
  onConfigure,
  onPatchBlock,
}: {
  block: StoryEmbedBlock;
  compact?: boolean;
  onConfigure?: () => void;
  onPatchBlock?: (patch: Partial<StoryEmbedBlock>) => void;
}) {
  return (
    <EmbedBlockContentRenderer
      block={block}
      variant="editor"
      compact={compact}
      onConfigure={onConfigure}
      onPatchBlock={onPatchBlock}
    />
  );
}
