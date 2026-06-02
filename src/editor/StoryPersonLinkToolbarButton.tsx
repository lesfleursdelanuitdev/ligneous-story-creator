"use client";

import { useMemo, useState } from "react";
import { useToolbarDialogOpen } from "./story-tiptap-active-editor-context";
import type { Editor } from "@tiptap/core";
import { UserRound } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPortal,
  DialogPopup,
  DialogTitle,
  DialogViewport,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { cn } from "../cn";
import {
  useStoryEditorPickers,
  type StoryPickerIndividualItem,
  storyPickerIndividualDisplayName,
  storyPickerIndividualMetaLine,
} from "./pickers-context";

const PUBLIC_INDIVIDUAL_BASE_URL = "/individuals";

type SelectionSnapshot = { from: number; to: number; text: string };

function selectedText(editor: Editor): SelectionSnapshot {
  const { from, to } = editor.state.selection;
  const text = from === to ? "" : editor.state.doc.textBetween(from, to, " ").trim();
  return { from, to, text };
}

function personProfileUrl(individualId: string): string {
  return `${PUBLIC_INDIVIDUAL_BASE_URL}/${encodeURIComponent(individualId)}`;
}

function linkAttrsForIndividual(individual: StoryPickerIndividualItem) {
  return {
    href: personProfileUrl(individual.id),
    entityType: "person",
    entityId: individual.id,
    entityXref: individual.xref?.trim() || null,
  };
}

function applyPersonLink(editor: Editor, selection: SelectionSnapshot, individual: StoryPickerIndividualItem, displayText: string) {
  const text = displayText.trim() || storyPickerIndividualDisplayName(individual);
  if (!text) return;
  editor
    .chain()
    .focus()
    .setTextSelection({ from: selection.from, to: selection.to })
    .insertContent({
      type: "text",
      text,
      marks: [{ type: "link", attrs: linkAttrsForIndividual(individual) }],
    })
    .run();
}

export function StoryPersonLinkToolbarButton({
  editor,
  touch,
  size = "default",
  className,
}: {
  editor: Editor;
  touch?: boolean;
  size?: "default" | "caption";
  className?: string;
}) {
  const { IndividualSearchPicker } = useStoryEditorPickers();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<SelectionSnapshot>(() => selectedText(editor));
  const [selectedIndividual, setSelectedIndividual] = useState<StoryPickerIndividualItem | null>(null);
  const [displayText, setDisplayText] = useState("");

  useToolbarDialogOpen(open);

  const active = editor.isActive("link", { entityType: "person" });
  const selectedMeta = selectedIndividual ? storyPickerIndividualMetaLine(selectedIndividual) : "";
  const selectedName = selectedIndividual ? storyPickerIndividualDisplayName(selectedIndividual) : "";
  const buttonSizeClass =
    size === "caption"
      ? "h-8 w-8 rounded-md"
      : touch
        ? "h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg"
        : "h-9 w-9 rounded-lg";
  const dialogTitle = useMemo(() => (selection.text ? "Link selected text to a person" : "Insert person link"), [selection.text]);

  const openDialog = () => {
    const snap = selectedText(editor);
    setSelection(snap);
    setSelectedIndividual(null);
    setDisplayText(snap.text);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const canInsert = Boolean(selectedIndividual && displayText.trim());

  return (
    <>
      <button
        type="button"
        aria-label="Link person"
        title="Link person"
        aria-pressed={active}
        onClick={openDialog}
        className={cn(
          "inline-flex shrink-0 items-center justify-center text-base-content/60 transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200",
          buttonSizeClass,
          active ? "bg-primary/20 text-primary ring-1 ring-primary/25" : "hover:bg-base-content/[0.08] hover:text-base-content",
          className,
        )}
      >
        <UserRound className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogViewport data-story-person-link-dialog>
            <DialogPopup className="max-w-2xl border-base-content/10 bg-base-100 p-0 text-base-content shadow-2xl">
              <div className="border-b border-base-content/10 bg-base-200/35 px-5 py-4">
                <DialogTitle className="text-base font-semibold">{dialogTitle}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-base-content/60">
                  Search the tree and insert a public profile link.
                </DialogDescription>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.75fr)]">
                {IndividualSearchPicker ? (
                  <IndividualSearchPicker
                    idPrefix="story-person-link"
                    label="Find person"
                    description="Search by given name and/or surname."
                    allowEmptySearch={false}
                    limit={12}
                    onPick={(individual) => {
                      const name = storyPickerIndividualDisplayName(individual);
                      setSelectedIndividual(individual);
                      setDisplayText((current) => (current.trim() ? current : name));
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-base-content/10 bg-base-200/30 p-6 text-sm text-base-content/50">
                    Individual search picker not available
                  </div>
                )}
                <div className="space-y-4 rounded-xl border border-base-content/10 bg-base-200/25 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/45">Selected person</p>
                    {selectedIndividual ? (
                      <div className="mt-2 rounded-lg border border-base-content/10 bg-base-100 px-3 py-2">
                        <p className="font-medium">{selectedName}</p>
                        {selectedMeta ? <p className="mt-0.5 font-mono text-xs text-base-content/55">{selectedMeta}</p> : null}
                        <p className="mt-2 break-all text-xs text-base-content/50">{personProfileUrl(selectedIndividual.id)}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-base-content/55">Choose a person from the search results.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-base-content/45" htmlFor="story-person-link-text">
                      Display text
                    </label>
                    <Input
                      id="story-person-link-text"
                      className="mt-2 rounded-lg border-base-content/12 bg-base-100"
                      value={displayText}
                      placeholder={selectedIndividual ? selectedName : "Text to insert"}
                      onChange={(e) => setDisplayText(e.target.value)}
                    />
                    {selection.text ? (
                      <p className="mt-2 text-xs text-base-content/50">
                        Selected text: <span className="font-medium">{selection.text}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-base-content/10 px-5 py-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="rounded-lg" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-lg"
                  disabled={!canInsert || !selectedIndividual}
                  onClick={() => {
                    if (!selectedIndividual) return;
                    applyPersonLink(editor, selection, selectedIndividual, displayText);
                    close();
                  }}
                >
                  Insert person link
                </Button>
              </div>
            </DialogPopup>
          </DialogViewport>
        </DialogPortal>
      </Dialog>
    </>
  );
}
