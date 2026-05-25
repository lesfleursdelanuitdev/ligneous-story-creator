"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StoryTimelineEmbedPayload, TimelineEventRule, TimelineGlobalFilters } from "../types";

export type StoryTimelineEmbedDataStatus =
  | { status: "loading" }
  | { status: "error"; errorMessage: string }
  | { status: "ready"; events: unknown[]; timelineSubject: unknown; hasAnyPreviewMedia: boolean };

export type TimelineResolutionStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; errorMessage: string }
  | { status: "ready"; events: unknown[]; ruleCount: number; unsupportedRuleCount: number };

export type StoryEditorTimelineContextValue = {
  useTimelineEmbedData: (embed: StoryTimelineEmbedPayload) => StoryTimelineEmbedDataStatus;
  /** Optional: resolve raw event rules for the "Preview summary" panel in the timeline embed inspector. */
  useTimelineEventResolution?: (rules: TimelineEventRule[], globalFilters?: TimelineGlobalFilters) => TimelineResolutionStatus;
};

const StoryEditorTimelineContext = createContext<StoryEditorTimelineContextValue | null>(null);

export function StoryEditorTimelineProvider({
  useTimelineEmbedData,
  useTimelineEventResolution,
  children,
}: {
  useTimelineEmbedData: (embed: StoryTimelineEmbedPayload) => StoryTimelineEmbedDataStatus;
  useTimelineEventResolution?: (rules: TimelineEventRule[], globalFilters?: TimelineGlobalFilters) => TimelineResolutionStatus;
  children: ReactNode;
}) {
  return (
    <StoryEditorTimelineContext.Provider value={{ useTimelineEmbedData, useTimelineEventResolution }}>
      {children}
    </StoryEditorTimelineContext.Provider>
  );
}

export function useStoryEditorTimelineOptional(): StoryEditorTimelineContextValue | null {
  return useContext(StoryEditorTimelineContext);
}
