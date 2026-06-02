"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { CalendarDays, Link2, MapPin, User, Users } from "lucide-react";
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
  storyPickerIndividualDisplayName,
  storyPickerIndividualMetaLine,
  type StoryPickerIndividualItem,
  type StoryPickerFamilyItem,
  type StoryPickerEventItem,
  type StoryPickerPlaceRow,
} from "./pickers-context";
import { useToolbarDialogOpen } from "./story-tiptap-active-editor-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityType = "person" | "family" | "event" | "place";

type SelectedEntity =
  | { entityType: "person"; id: string; xref?: string | null; label: string; meta?: string }
  | { entityType: "family"; id: string; xref?: string | null; label: string }
  | { entityType: "event"; id: string; label: string }
  | { entityType: "place"; id: string; label: string };

type SelectionSnapshot = { from: number; to: number; text: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTITY_TYPES: { type: EntityType; label: string; Icon: React.ElementType }[] = [
  { type: "person", label: "Individual", Icon: User },
  { type: "family", label: "Family", Icon: Users },
  { type: "event", label: "Event", Icon: CalendarDays },
  { type: "place", label: "Place", Icon: MapPin },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function entityHref(entityType: EntityType, entityId: string): string {
  switch (entityType) {
    case "person": return `/individuals/${encodeURIComponent(entityId)}`;
    case "family": return `/families/${encodeURIComponent(entityId)}`;
    case "event": return `/tree/events/${encodeURIComponent(entityId)}`;
    case "place": return `/tree/places/${encodeURIComponent(entityId)}`;
  }
}

function getSelectionSnapshot(editor: Editor): SelectionSnapshot {
  const { from, to } = editor.state.selection;
  const text = from === to ? "" : editor.state.doc.textBetween(from, to, " ").trim();
  return { from, to, text };
}

function applyEntityLink(
  editor: Editor,
  selection: SelectionSnapshot,
  entity: SelectedEntity,
  displayText: string,
) {
  const text = displayText.trim() || entity.label;
  if (!text) return;
  const xref = (entity as { xref?: string | null }).xref ?? null;
  editor
    .chain()
    .focus()
    .setTextSelection({ from: selection.from, to: selection.to })
    .insertContent({
      type: "text",
      text,
      marks: [{
        type: "link",
        attrs: {
          href: entityHref(entity.entityType, entity.id),
          entityType: entity.entityType,
          entityId: entity.id,
          entityXref: xref,
        },
      }],
    })
    .run();
}

function familyDisplayLabel(fam: StoryPickerFamilyItem): string {
  return fam.primaryLine ? `Family of ${fam.primaryLine}` : (fam.xref ?? fam.id);
}

function placeDisplayLabel(place: StoryPickerPlaceRow): string {
  return place.label || place.name || place.original || place.id;
}

// ── Sub-component: chip style ─────────────────────────────────────────────────

function typeChip(active: boolean) {
  return cn(
    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/20 hover:text-base-content",
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StoryEntityLinkToolbarButton({
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
  const pickers = useStoryEditorPickers();
  const [open, setOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [selection, setSelection] = useState<SelectionSnapshot>(() => getSelectionSnapshot(editor));
  const [entityType, setEntityType] = useState<EntityType>("person");
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [displayText, setDisplayText] = useState("");

  useToolbarDialogOpen(open);
  useToolbarDialogOpen(eventPickerOpen);

  const active = Boolean(editor.getAttributes("link").entityType);

  const buttonSizeClass =
    size === "caption"
      ? "h-8 w-8 rounded-md"
      : touch
        ? "h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg"
        : "h-9 w-9 rounded-lg";

  const openDialog = () => {
    const snap = getSelectionSnapshot(editor);
    setSelection(snap);
    setEntityType("person");
    setSelectedEntity(null);
    setDisplayText(snap.text);
    setEventPickerOpen(false);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const switchType = (type: EntityType) => {
    setEntityType(type);
    setSelectedEntity(null);
    setDisplayText(selection.text);
  };

  const pickIndividual = (ind: StoryPickerIndividualItem) => {
    const label = storyPickerIndividualDisplayName(ind);
    const meta = storyPickerIndividualMetaLine(ind);
    setSelectedEntity({ entityType: "person", id: ind.id, xref: ind.xref, label, meta });
    setDisplayText((cur) => (cur.trim() ? cur : label));
  };

  const pickFamily = (fam: StoryPickerFamilyItem) => {
    const label = familyDisplayLabel(fam);
    setSelectedEntity({ entityType: "family", id: fam.id, xref: fam.xref, label });
    setDisplayText((cur) => (cur.trim() ? cur : label));
  };

  const pickEvent = (ev: StoryPickerEventItem) => {
    const label = ev.label || ev.id;
    setSelectedEntity({ entityType: "event", id: ev.id, label });
    setDisplayText((cur) => (cur.trim() ? cur : label));
    setEventPickerOpen(false);
  };

  const pickPlace = (place: StoryPickerPlaceRow) => {
    const label = placeDisplayLabel(place);
    setSelectedEntity({ entityType: "place", id: place.id, label });
    setDisplayText((cur) => (cur.trim() ? cur : label));
  };

  const canInsert = Boolean(selectedEntity && displayText.trim());

  const entityTypeName =
    entityType === "person" ? "person"
    : entityType === "family" ? "family"
    : entityType === "event" ? "event"
    : "place";

  return (
    <>
      <button
        type="button"
        aria-label="Link to entity"
        title="Link to entity"
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
        <Link2 className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogViewport data-story-entity-link-dialog>
            <DialogPopup className="max-w-2xl overflow-hidden border-base-content/10 bg-base-100 p-0 text-base-content shadow-2xl">

              {/* Header */}
              <div className="border-b border-base-content/10 bg-base-200/35 px-5 py-4">
                <DialogTitle className="text-base font-semibold">
                  {selection.text ? "Link selected text" : "Insert entity link"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-base-content/55">
                  Link to a person, family, event, or place in the tree.
                </DialogDescription>
              </div>

              {/* Entity type tabs */}
              <div className="border-b border-base-content/8 px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {ENTITY_TYPES.map(({ type, label, Icon }) => (
                    <button key={type} type="button" onClick={() => switchType(type)} className={typeChip(entityType === type)}>
                      <Icon className="size-3.5 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Picker + selected entity panel */}
              <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.75fr)]">

                {/* Left: search picker */}
                <div>
                  {entityType === "person" && pickers.IndividualSearchPicker ? (
                    <pickers.IndividualSearchPicker
                      idPrefix="entity-link-ind"
                      label="Find person"
                      description="Search by given name and/or surname."
                      allowEmptySearch={false}
                      limit={12}
                      onPick={pickIndividual}
                    />
                  ) : entityType === "person" ? (
                    <p className="text-sm text-base-content/50">Individual search not available.</p>
                  ) : null}

                  {entityType === "family" && pickers.FamilySearchPicker ? (
                    <pickers.FamilySearchPicker
                      idPrefix="entity-link-fam"
                      onPick={pickFamily}
                    />
                  ) : entityType === "family" && !pickers.FamilySearchPicker ? (
                    <p className="text-sm text-base-content/50">Family search not available.</p>
                  ) : null}

                  {entityType === "event" ? (
                    <div className="space-y-3">
                      {selectedEntity?.entityType !== "event" ? (
                        <p className="text-sm text-base-content/55">No event selected yet.</p>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setEventPickerOpen(true)}
                      >
                        Browse events…
                      </Button>
                      {pickers.EventPickerModal ? (
                        <pickers.EventPickerModal
                          open={eventPickerOpen}
                          onOpenChange={setEventPickerOpen}
                          onPick={pickEvent}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {entityType === "place" && pickers.PlaceSearchPicker ? (
                    <pickers.PlaceSearchPicker
                      idPrefix="entity-link-place"
                      onPick={pickPlace}
                    />
                  ) : entityType === "place" && !pickers.PlaceSearchPicker ? (
                    <p className="text-sm text-base-content/50">Place search not available.</p>
                  ) : null}
                </div>

                {/* Right: selected entity + display text */}
                <div className="space-y-4 rounded-xl border border-base-content/10 bg-base-200/25 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
                      Selected {entityTypeName}
                    </p>
                    {selectedEntity ? (
                      <div className="mt-2 rounded-lg border border-base-content/10 bg-base-100 px-3 py-2">
                        <p className="font-medium">{selectedEntity.label}</p>
                        {selectedEntity.entityType === "person" && selectedEntity.meta ? (
                          <p className="mt-0.5 font-mono text-xs text-base-content/55">{selectedEntity.meta}</p>
                        ) : null}
                        <p className="mt-2 break-all text-xs text-base-content/50">
                          {entityHref(selectedEntity.entityType, selectedEntity.id)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-base-content/55">
                        {entityType === "event"
                          ? "Click 'Browse events…' to choose."
                          : "Choose from the search results."}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-base-content/45"
                      htmlFor="entity-link-display-text"
                    >
                      Display text
                    </label>
                    <Input
                      id="entity-link-display-text"
                      className="mt-2 rounded-lg border-base-content/12 bg-base-100"
                      value={displayText}
                      placeholder={selectedEntity ? selectedEntity.label : "Text to insert"}
                      onChange={(e) => setDisplayText(e.target.value)}
                    />
                    {selection.text ? (
                      <p className="mt-2 text-xs text-base-content/50">
                        Selected: <span className="font-medium">{selection.text}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-2 border-t border-base-content/10 px-5 py-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="rounded-lg" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-lg"
                  disabled={!canInsert || !selectedEntity}
                  onClick={() => {
                    if (!selectedEntity) return;
                    applyEntityLink(editor, selection, selectedEntity, displayText);
                    close();
                  }}
                >
                  Insert link
                </Button>
              </div>

            </DialogPopup>
          </DialogViewport>
        </DialogPortal>
      </Dialog>
    </>
  );
}
