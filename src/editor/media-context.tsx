"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StoryCoverMediaKind } from "../types";

export type StoryMediaDetail = {
  id: string;
  title: string | null;
  description: string | null;
  fileRef: string | null;
  form: string | null;
};

export type StoryMediaQueryResult = {
  data: StoryMediaDetail | undefined;
  isLoading: boolean;
};

export type StoryEditorMediaContextValue = {
  useMediaById: (mediaId: string | undefined, mediaKind?: StoryCoverMediaKind) => StoryMediaQueryResult;
  /** Optional multi-ID variant. Returns a Map from mediaId → detail. */
  useMediaByIds?: (mediaIds: string[]) => Map<string, StoryMediaDetail>;
};

const StoryEditorMediaContext = createContext<StoryEditorMediaContextValue | null>(null);

export function StoryEditorMediaProvider({
  useMediaById,
  useMediaByIds,
  children,
}: {
  useMediaById: (mediaId: string | undefined, mediaKind?: StoryCoverMediaKind) => StoryMediaQueryResult;
  useMediaByIds?: (mediaIds: string[]) => Map<string, StoryMediaDetail>;
  children: ReactNode;
}) {
  return (
    <StoryEditorMediaContext.Provider value={{ useMediaById, useMediaByIds }}>
      {children}
    </StoryEditorMediaContext.Provider>
  );
}

export function useStoryEditorMedia(): StoryEditorMediaContextValue {
  const ctx = useContext(StoryEditorMediaContext);
  if (!ctx) throw new Error("useStoryEditorMedia must be used inside StoryEditorMediaProvider");
  return ctx;
}

export function useStoryEditorMediaOptional(): StoryEditorMediaContextValue | null {
  return useContext(StoryEditorMediaContext);
}
