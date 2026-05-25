import type { ReactNode } from "react";
import type { StoryBlock, StoryContainerBlock } from "../types";
import { getStoryContainerPreset } from "../types";
import { createStoryBlockFromPreset } from "../utils/story-block-presets";
import { groupStoryBlocksForLayout } from "../utils/story-block-layout";
import {
  getContainerClasses,
  getContainerCustomBackgroundStyle,
  getContainerPresetEmptyHint,
} from "../utils/story-container-preset-styles";
import { StoryBlockRowDesignWrap } from "./StoryBlockDesignWrap";
import { StoryEmptySlotAddBlockMenu } from "./StoryEmptySlotAddBlockMenu";
import { isStoryChromeBlockSelected } from "./story-creator-canvas-editors";
import { useStoryCanvasOps } from "./story-creator-canvas-ops-context";

export type StorySectionContainerInnerProps = {
  nest: StoryContainerBlock;
  sectionId: string;
  /** Renders each child block with its chrome frame. Provided by `StoryEditorSectionBlockCard` which passes itself. */
  renderBlock: (block: StoryBlock) => ReactNode;
};

/** Recursive section-level container body (nested containers inside a section container). */
export function StorySectionContainerInner({ nest, sectionId, renderBlock }: StorySectionContainerInnerProps) {
  const { isLg, storySelection, appendIntoContainer } = useStoryCanvasOps();

  const nestSelected = isStoryChromeBlockSelected(storySelection, nest.id);
  const containerEmptyHint = getContainerPresetEmptyHint(getStoryContainerPreset(nest.props));
  const containerShellClass = getContainerClasses(nest, "editor", {
    selected: nestSelected,
    emptyChildren: nest.children.length === 0,
  });
  const containerShellStyle = getContainerCustomBackgroundStyle(nest.props);

  return (
    <div className={containerShellClass} style={containerShellStyle ?? undefined}>
      {nest.props.label?.trim() ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{nest.props.label.trim()}</p>
      ) : null}
      {nest.children.length === 0 ? (
        <>
          <p className="px-1 text-center text-sm leading-relaxed text-neutral-600">{containerEmptyHint}</p>
          <StoryEmptySlotAddBlockMenu
            mobile={!isLg}
            allowNestedColumns
            surface="sheet"
            density="compact"
            includeDivider
            onInsert={(presetId) => appendIntoContainer(sectionId, nest.id, createStoryBlockFromPreset(presetId))}
          />
        </>
      ) : (
        <div className="space-y-3">
          {groupStoryBlocksForLayout(nest.children).map((group) => {
            if (group.kind === "float-wrap") {
              return (
                <div key={`${group.float.id}-${group.text.id}`} className="flow-root min-w-0">
                  <StoryBlockRowDesignWrap block={group.float} floated>
                    {renderBlock(group.float)}
                  </StoryBlockRowDesignWrap>
                  <StoryBlockRowDesignWrap block={group.text} floated={false} wrapperClassName="min-w-0">
                    {renderBlock(group.text)}
                  </StoryBlockRowDesignWrap>
                </div>
              );
            }
            const child = group.block;
            return (
              <StoryBlockRowDesignWrap key={child.id} block={child} floated={false}>
                {renderBlock(child)}
              </StoryBlockRowDesignWrap>
            );
          })}
        </div>
      )}
    </div>
  );
}
