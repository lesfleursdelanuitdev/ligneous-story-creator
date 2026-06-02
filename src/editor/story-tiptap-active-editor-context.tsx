"use client";

import type { Editor } from "@tiptap/core";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type StoryTiptapToolbarDensity = "default" | "touch";

export type StoryTiptapActiveEditorContextValue = {
  activeEditor: Editor | null;
  toolbarDensity: StoryTiptapToolbarDensity;
  mountEditor: (editor: Editor) => void;
  unmountEditor: (editor: Editor) => void;
  notifyEditorFocused: (editor: Editor) => void;
  notifyEditorBlurred: () => void;
  clearGlobalActiveEditor: () => void;
  /** Register an open toolbar dialog — prevents blur from clearing the active editor. */
  openToolbarDialog: () => void;
  /** Unregister a toolbar dialog (call on close). */
  closeToolbarDialog: () => void;
};

const StoryTiptapActiveEditorContext = createContext<StoryTiptapActiveEditorContextValue | null>(null);

export function StoryTiptapActiveEditorProvider({
  toolbarDensity,
  children,
}: {
  toolbarDensity: StoryTiptapToolbarDensity;
  children: ReactNode;
}) {
  const mountedRef = useRef(new Set<Editor>());
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const toolbarDialogCountRef = useRef(0);

  const mountEditor = useCallback((editor: Editor) => {
    mountedRef.current.add(editor);
  }, []);

  const unmountEditor = useCallback((editor: Editor) => {
    mountedRef.current.delete(editor);
    setActiveEditor((cur) => (cur === editor ? null : cur));
  }, []);

  const notifyEditorFocused = useCallback((editor: Editor) => {
    setActiveEditor(editor);
  }, []);

  const clearGlobalActiveEditor = useCallback(() => {
    setActiveEditor(null);
  }, []);

  const openToolbarDialog = useCallback(() => {
    toolbarDialogCountRef.current += 1;
  }, []);

  const closeToolbarDialog = useCallback(() => {
    toolbarDialogCountRef.current = Math.max(0, toolbarDialogCountRef.current - 1);
  }, []);

  const notifyEditorBlurred = useCallback(() => {
    const focusIsOnToolbarChrome = () => {
      const el = document.activeElement;
      if (!(el instanceof Element)) return false;
      if (el.closest("[data-story-global-tiptap-toolbar]")) return true;
      if (el.closest("[data-story-entity-link-dialog]")) return true;
      if (el.closest("[data-story-flow-insert-dialog]")) return true;
      if (el.closest('[data-slot="dropdown-menu-content"]')) return true;
      if (el.closest('[data-slot="dropdown-menu-sub-content"]')) return true;
      return false;
    };
    const focusStillInsideMountedEditor = () => {
      const el = document.activeElement;
      if (!(el instanceof Node)) return false;
      return [...mountedRef.current].some(
        (e) => !e.isDestroyed && typeof e.view.dom?.contains === "function" && e.view.dom.contains(el),
      );
    };
    const focusIsOnOutlineRenameChrome = () => {
      const el = document.activeElement;
      if (!(el instanceof Element)) return false;
      if (el.closest("[data-story-outline-rename]")) return true;
      return el instanceof HTMLInputElement && el.getAttribute("aria-label") === "Rename";
    };
    const runAfterFocusSettled = (fn: () => void) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(fn);
      });
    };
    runAfterFocusSettled(() => {
      if (toolbarDensity === "touch") return;
      if (toolbarDialogCountRef.current > 0) return;
      if ([...mountedRef.current].some((e) => !e.isDestroyed && e.view.hasFocus())) return;
      if (focusStillInsideMountedEditor()) return;
      if (focusIsOnToolbarChrome()) return;
      if (focusIsOnOutlineRenameChrome()) return;
      setActiveEditor(null);
    });
  }, [toolbarDensity]);

  const value = useMemo(
    () => ({
      activeEditor,
      toolbarDensity,
      mountEditor,
      unmountEditor,
      notifyEditorFocused,
      notifyEditorBlurred,
      clearGlobalActiveEditor,
      openToolbarDialog,
      closeToolbarDialog,
    }),
    [
      activeEditor,
      toolbarDensity,
      mountEditor,
      unmountEditor,
      notifyEditorFocused,
      notifyEditorBlurred,
      clearGlobalActiveEditor,
      openToolbarDialog,
      closeToolbarDialog,
    ],
  );

  return <StoryTiptapActiveEditorContext.Provider value={value}>{children}</StoryTiptapActiveEditorContext.Provider>;
}

export function useStoryTiptapActiveEditorOptional(): StoryTiptapActiveEditorContextValue | null {
  return useContext(StoryTiptapActiveEditorContext);
}

/**
 * Registers/unregisters a toolbar dialog with the active-editor context while `open` is true.
 * This prevents the blur handler from clearing the active editor when focus moves into the dialog.
 */
export function useToolbarDialogOpen(open: boolean): void {
  const ctx = useStoryTiptapActiveEditorOptional();
  const openFn = ctx?.openToolbarDialog;
  const closeFn = ctx?.closeToolbarDialog;
  useLayoutEffect(() => {
    if (!open || !openFn || !closeFn) return;
    openFn();
    return () => closeFn();
  }, [open, openFn, closeFn]);
}

export function StoryGlobalToolbarSelectionSync({
  selectedBlockId,
  selectedBlockKind,
}: {
  selectedBlockId: string | null;
  selectedBlockKind: string | null;
}) {
  const ctx = useStoryTiptapActiveEditorOptional();
  useLayoutEffect(() => {
    if (!ctx) return;
    if (!selectedBlockId) {
      ctx.clearGlobalActiveEditor();
      return;
    }
    if (selectedBlockKind === "richText" || selectedBlockKind === "splitContent" || selectedBlockKind === "table") {
      return;
    }
    ctx.clearGlobalActiveEditor();
  }, [ctx, selectedBlockId, selectedBlockKind]);
  return null;
}
