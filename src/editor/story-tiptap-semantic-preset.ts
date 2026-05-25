import type { Editor } from "@tiptap/core";
import type { StoryRichTextTextPreset } from "../types";

const semanticByEditor = new WeakMap<Editor, StoryRichTextTextPreset>();

export function bindStoryEditorSemanticPreset(editor: Editor, preset: StoryRichTextTextPreset): void {
  semanticByEditor.set(editor, preset);
}

export function unbindStoryEditorSemanticPreset(editor: Editor): void {
  semanticByEditor.delete(editor);
}

export function getStoryEditorSemanticPreset(editor: Editor): StoryRichTextTextPreset | undefined {
  return semanticByEditor.get(editor);
}
