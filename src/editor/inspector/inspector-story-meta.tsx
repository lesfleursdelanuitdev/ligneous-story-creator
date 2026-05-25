"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  StoryDocument,
  StoryDocumentMetaPatch,
  StoryLinkedPlace,
  StoryImageMediaRef,
  StoryAuthorCredit,
} from "../../types";
import { newStoryId } from "../../types";
import type { SelectedNoteLink } from "../../note-link-types";
import {
  getStoryAuthorCredits,
  formatStoryAuthorLine,
  effectiveStoryAuthorPrefixMode,
  STORY_AUTHOR_PREFIX_OPTIONS,
} from "../../utils/story-author-display";
import { legacyCoverImageRef } from "../../utils/story-images-resolve";
import { mediaThumbSrc, resolveMediaImageSrc } from "../media-preview";
import { useStoryEditorPickers, type StoryPickerPlaceRow, type StoryPickerAlbumItem, storyPickerPlaceLabel } from "../pickers-context";
import { useStoryEditorMedia } from "../media-context";
import { cn } from "../../cn";
import { Button } from "../ui/button";
import { CollapsibleFormSection } from "../ui/collapsible-form-section";
import { FieldLabel } from "./inspector-primitives";
import { ArrowUp, ArrowDown, ImageIcon, Plus, Trash2 } from "lucide-react";

// ─── EventPickerButton — local wrapper that owns open state ───────────────────

export function EventPickerButton({
  excludeEventIds,
  touchComfort,
  onPick,
}: {
  excludeEventIds: Set<string>;
  touchComfort?: boolean;
  onPick: (id: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { EventPickerModal } = useStoryEditorPickers();
  const addBtnClass = touchComfort ? "min-h-11 h-11 gap-1.5" : "h-9 gap-1";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={addBtnClass}
        onClick={() => setOpen(true)}
        disabled={!EventPickerModal}
      >
        <Plus className="size-4" aria-hidden />
        Add event
      </Button>
      {EventPickerModal ? (
        <EventPickerModal
          open={open}
          onOpenChange={setOpen}
          excludeEventIds={excludeEventIds}
          onPick={(ev) => {
            onPick(ev.id, ev.label ?? ev.id);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

// ─── StoryLinkedAlbumsField ───────────────────────────────────────────────────

export function StoryLinkedAlbumsField({
  linkedAlbums,
  onStoryMetaChange,
  panelId,
  touchComfort,
}: {
  linkedAlbums: StoryPickerAlbumItem[];
  onStoryMetaChange: (patch: StoryDocumentMetaPatch) => void;
  panelId: string;
  touchComfort?: boolean;
}) {
  const { AlbumsManager } = useStoryEditorPickers();

  if (!AlbumsManager) {
    return (
      <div className="space-y-2">
        <FieldLabel>Albums</FieldLabel>
        {linkedAlbums.length === 0 ? (
          <p className="text-sm text-base-content/50">No albums linked.</p>
        ) : (
          <div className="space-y-1">
            {linkedAlbums.map((a) => (
              <p key={a.id} className="text-sm text-base-content">
                {a.name}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <AlbumsManager
      linkedAlbums={linkedAlbums}
      panelId={panelId}
      touchComfort={touchComfort}
      onChange={(albums) => onStoryMetaChange({ linkedAlbums: albums })}
    />
  );
}

// ─── InspectorStoryLinkedRecords ──────────────────────────────────────────────

function storyLinkedPlaceFromPickerRow(row: StoryPickerPlaceRow): StoryLinkedPlace {
  return {
    id: row.id,
    label: row.label ?? storyPickerPlaceLabel(row),
    name: row.name,
    original: row.original?.trim() ? row.original.trim() : (row.original ?? undefined),
    county: row.county ?? undefined,
    state: row.state ?? undefined,
    country: row.country ?? undefined,
  };
}

export function InspectorStoryLinkedRecords({
  doc,
  storyId,
  onStoryMetaChange,
  touchComfort,
  embedded,
}: {
  doc: StoryDocument;
  storyId: string;
  onStoryMetaChange: (patch: StoryDocumentMetaPatch) => void;
  touchComfort?: boolean;
  embedded?: boolean;
}) {
  const { IndividualSearchPicker, FamilySearchPicker, PlaceSearchPicker } = useStoryEditorPickers();
  const selectedLinks = doc.linkedRecords ?? [];
  const [showPeoplePicker, setShowPeoplePicker] = useState(false);
  const [showFamilyPicker, setShowFamilyPicker] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  const peopleLinks = selectedLinks.filter((l) => l.kind === "individual");
  const familyLinks = selectedLinks.filter((l) => l.kind === "family");
  const eventLinks = selectedLinks.filter((l) => l.kind === "event");
  const placeLinks = doc.placeLinks ?? [];

  const selectedIdSetByKind = (kind: SelectedNoteLink["kind"]) =>
    new Set(selectedLinks.filter((l) => l.kind === kind).map((l) => l.id));

  const addLink = (next: SelectedNoteLink) => {
    if (next.kind !== "individual" && next.kind !== "family" && next.kind !== "event") return;
    if (selectedLinks.some((p) => p.kind === next.kind && p.id === next.id)) return;
    onStoryMetaChange({ linkedRecords: [...selectedLinks, next] });
  };

  const removeLink = (kind: SelectedNoteLink["kind"], id: string) => {
    onStoryMetaChange({
      linkedRecords: selectedLinks.filter((p) => !(p.kind === kind && p.id === id)),
    });
  };

  const selectedPlaceIdSet = new Set(placeLinks.map((p) => p.id));

  const addPlaceLink = (next: StoryLinkedPlace) => {
    if (placeLinks.some((p) => p.id === next.id)) return;
    onStoryMetaChange({ placeLinks: [...placeLinks, next] });
  };

  const removePlaceLink = (id: string) => {
    onStoryMetaChange({ placeLinks: placeLinks.filter((p) => p.id !== id) });
  };

  const addBtnClass = touchComfort ? "min-h-11 h-11 gap-1.5" : "h-9 gap-1";

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 rounded-xl border border-base-content/10 bg-base-100/70 p-4 shadow-sm ring-1 ring-base-content/[0.04]"
      }
    >
      <div className="mb-1">
        <h2 className={embedded ? "text-sm font-semibold text-base-content" : "text-base font-semibold text-base-content"}>
          Linked records
        </h2>
        <p className="text-sm leading-relaxed text-base-content/60">
          Connect this story to the people, families, events, and places it relates to.
        </p>
      </div>

      {/* People */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-base-content/90">People</span>
          <Button type="button" variant="outline" size="sm" className={addBtnClass} onClick={() => setShowPeoplePicker((v) => !v)} disabled={!IndividualSearchPicker}>
            <Plus className="size-4" aria-hidden />
            Add person
          </Button>
        </div>
        {peopleLinks.map((l) => (
          <div key={`p-${l.id}`} className="flex items-center justify-between rounded-md border border-base-content/10 bg-base-100/50 px-3 py-2">
            <p className="text-sm text-base-content">{l.label}</p>
            <button type="button" className="text-base-content/50 hover:text-base-content" aria-label={`Remove ${l.label}`} onClick={() => removeLink("individual", l.id)}>
              ×
            </button>
          </div>
        ))}
        {showPeoplePicker && IndividualSearchPicker ? (
          <IndividualSearchPicker
            idPrefix={`story-ind-${storyId}`}
            excludeIds={selectedIdSetByKind("individual")}
            onPick={(ind) => {
              addLink({ kind: "individual", id: ind.id, label: ind.fullName?.trim() || ind.xref || ind.id });
              setShowPeoplePicker(false);
            }}
          />
        ) : null}
      </div>

      {/* Families */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-base-content/90">Families</span>
          <Button type="button" variant="outline" size="sm" className={addBtnClass} onClick={() => setShowFamilyPicker((v) => !v)} disabled={!FamilySearchPicker}>
            <Plus className="size-4" aria-hidden />
            Add family
          </Button>
        </div>
        {familyLinks.map((l) => (
          <div key={`f-${l.id}`} className="flex items-center justify-between rounded-md border border-base-content/10 bg-base-100/50 px-3 py-2">
            <p className="text-sm text-base-content">{l.label}</p>
            <button type="button" className="text-base-content/50 hover:text-base-content" aria-label={`Remove ${l.label}`} onClick={() => removeLink("family", l.id)}>
              ×
            </button>
          </div>
        ))}
        {showFamilyPicker && FamilySearchPicker ? (
          <FamilySearchPicker
            idPrefix={`story-fam-${storyId}`}
            excludeIds={selectedIdSetByKind("family")}
            onPick={(fam) => {
              addLink({
                kind: "family",
                id: fam.id,
                label: fam.primaryLine ?? fam.xref ?? fam.id,
              });
              setShowFamilyPicker(false);
            }}
          />
        ) : null}
      </div>

      {/* Events */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-base-content/90">Events</span>
          <EventPickerButton
            excludeEventIds={selectedIdSetByKind("event")}
            touchComfort={touchComfort}
            onPick={(id, label) => addLink({ kind: "event", id, label })}
          />
        </div>
        {eventLinks.map((l) => (
          <div key={`e-${l.id}`} className="flex items-center justify-between rounded-md border border-base-content/10 bg-base-100/50 px-3 py-2">
            <p className="text-sm text-base-content">{l.label}</p>
            <button type="button" className="text-base-content/50 hover:text-base-content" aria-label={`Remove ${l.label}`} onClick={() => removeLink("event", l.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Places */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-base-content/90">Related places</span>
          <Button type="button" variant="outline" size="sm" className={addBtnClass} onClick={() => setShowPlacePicker((v) => !v)} disabled={!PlaceSearchPicker}>
            <Plus className="size-4" aria-hidden />
            Add place
          </Button>
        </div>
        {placeLinks.length === 0 && !showPlacePicker ? (
          <div className="rounded-md border border-base-content/8 bg-base-100/30 px-3 py-2">
            <p className="text-xs leading-relaxed text-base-content/55">No places linked yet.</p>
            <p className="mt-1 text-xs leading-relaxed text-base-content/45">
              Link places connected to this story, such as birthplaces, residences, migration points, or event locations.
            </p>
          </div>
        ) : null}
        {placeLinks.map((pl) => (
          <div key={`place-${pl.id}`} className="flex items-center justify-between rounded-md border border-base-content/10 bg-base-100/50 px-3 py-2">
            <div className="min-w-0 pr-2">
              <p className="truncate text-sm text-base-content">{pl.label}</p>
              {pl.original && pl.original !== pl.label ? (
                <p className="truncate text-[11px] text-base-content/45">{pl.original}</p>
              ) : null}
            </div>
            <button type="button" className="shrink-0 text-base-content/50 hover:text-base-content" aria-label={`Remove ${pl.label}`} onClick={() => removePlaceLink(pl.id)}>
              ×
            </button>
          </div>
        ))}
        {showPlacePicker && PlaceSearchPicker ? (
          <PlaceSearchPicker
            idPrefix={`story-place-${storyId}`}
            excludeIds={selectedPlaceIdSet}
            onPick={(row) => {
              addPlaceLink(storyLinkedPlaceFromPickerRow(row));
              setShowPlacePicker(false);
            }}
          />
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-base-content/50">
        Stored on this draft; a future story API can mirror note-style junction tables (e.g.{" "}
        <code className="rounded bg-base-200/70 px-1 text-[10px]">story_places</code> for place ids).
      </p>
    </div>
  );
}

// ─── InspectorStoryImagesSection ──────────────────────────────────────────────

function coverImageMetaPatch(ref: StoryImageMediaRef | undefined): StoryDocumentMetaPatch {
  if (!ref) {
    return { coverImage: undefined, coverMediaId: undefined, coverMediaKind: undefined };
  }
  if (ref.mediaKind === "user_media") {
    return { coverImage: ref, coverMediaId: ref.mediaId, coverMediaKind: "user_media" };
  }
  return { coverImage: ref, coverMediaId: undefined, coverMediaKind: undefined };
}

function InspectorStoryImageRow({
  label,
  helper,
  mediaId,
  hasExplicit,
  storyId,
  touchComfort,
  chooseLabel,
  replaceLabel,
  removeLabel,
  onPick,
  onRemove,
}: {
  label: string;
  helper: string;
  mediaId: string | undefined;
  hasExplicit: boolean;
  storyId: string;
  touchComfort?: boolean;
  chooseLabel: string;
  replaceLabel: string;
  removeLabel: string;
  onPick: (mediaId: string, title: string | null) => void;
  onRemove: () => void;
}) {
  const { useMediaById } = useStoryEditorMedia();
  const { MediaPickerButton } = useStoryEditorPickers();
  const { data, isLoading } = useMediaById(mediaId);
  const thumb =
    data?.fileRef != null && data.fileRef !== ""
      ? mediaThumbSrc(data.fileRef, data.form, 200) ?? resolveMediaImageSrc(data.fileRef)
      : null;

  return (
    <div className="rounded-lg border border-base-content/10 bg-base-100/50 p-3">
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1 text-xs leading-relaxed text-base-content/55">{helper}</p>
      <div className="mt-3 flex gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-[10px] leading-tight text-base-content/45">
              <ImageIcon className="size-6 opacity-40" aria-hidden />
              {isLoading && mediaId ? "…" : "No image"}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          {MediaPickerButton ? (
            <MediaPickerButton
              targetType="story"
              targetId={storyId}
              mode="single"
              purpose="storyIllustration"
              triggerLabel={hasExplicit ? replaceLabel : chooseLabel}
              triggerClassName={cn(
                "rounded-lg border-base-content/12 px-3 font-medium",
                touchComfort ? "min-h-[44px] h-11" : "h-9",
              )}
              onAttach={(items) => {
                const m = items[0];
                if (!m) return;
                onPick(m.id, m.title);
              }}
            />
          ) : null}
          {hasExplicit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "w-fit rounded-lg border-base-content/12 font-medium text-error hover:bg-error/10",
                touchComfort ? "min-h-[44px] h-11" : "h-9",
              )}
              onClick={onRemove}
            >
              {removeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function InspectorStoryImagesSection({
  doc,
  storyId,
  onStoryMetaChange,
  touchComfort,
}: {
  doc: StoryDocument;
  storyId: string;
  onStoryMetaChange: (patch: StoryDocumentMetaPatch) => void;
  touchComfort?: boolean;
}) {
  const coverRef = doc.coverImage ?? legacyCoverImageRef(doc);
  const coverMediaId = coverRef?.mediaId;
  const profileMediaId = doc.profileImage?.mediaId;

  return (
    <CollapsibleFormSection title="Story images" defaultOpen>
      <div className="space-y-4">
        <InspectorStoryImageRow
          label="Cover image"
          helper="Used as the main visual header for the story."
          mediaId={coverMediaId}
          hasExplicit={Boolean(doc.coverImage ?? doc.coverMediaId)}
          storyId={storyId}
          touchComfort={touchComfort}
          chooseLabel="Choose cover"
          replaceLabel="Replace cover"
          removeLabel="Remove cover"
          onPick={(mediaId) => onStoryMetaChange(coverImageMetaPatch({ mediaId, mediaKind: "user_media" }))}
          onRemove={() => onStoryMetaChange(coverImageMetaPatch(undefined))}
        />
        <InspectorStoryImageRow
          label="Profile image"
          helper="Used as the story's identity image. If not set, the cover image will be used."
          mediaId={profileMediaId}
          hasExplicit={Boolean(doc.profileImage)}
          storyId={storyId}
          touchComfort={touchComfort}
          chooseLabel="Choose profile"
          replaceLabel="Replace profile"
          removeLabel="Remove profile"
          onPick={(mediaId) => onStoryMetaChange({ profileImage: { mediaId, mediaKind: "user_media" } })}
          onRemove={() => onStoryMetaChange({ profileImage: undefined })}
        />
        <p className="text-xs leading-relaxed text-base-content/50">
          Library picks map to <code className="rounded bg-base-200/80 px-1 py-0.5 text-[10px]">stories.cover_media_id</code> /{" "}
          <code className="rounded bg-base-200/80 px-1 py-0.5 text-[10px]">stories.profile_media_id</code> when synced to the database.
        </p>
      </div>
    </CollapsibleFormSection>
  );
}

// ─── InspectorStoryAuthorsSection ─────────────────────────────────────────────

function authorsPatch(next: StoryAuthorCredit[]): StoryDocumentMetaPatch {
  return {
    authors: next,
    author: undefined,
    authorPrefixMode: undefined,
    authorPrefixCustom: undefined,
  };
}

export function InspectorStoryAuthorsSection({
  doc,
  controlH,
  authorPrefixOptionClass,
  onStoryMetaChange,
}: {
  doc: StoryDocument;
  controlH: string;
  authorPrefixOptionClass: (active: boolean) => string;
  onStoryMetaChange: (patch: StoryDocumentMetaPatch) => void;
}) {
  const credits = useMemo(() => getStoryAuthorCredits(doc), [doc]);

  const setCredits = useCallback(
    (next: StoryAuthorCredit[]) => {
      const normalized = next.map((c) => ({
        ...c,
        id: c.id?.trim() && c.id !== "legacy" ? c.id : newStoryId(),
        name: c.name,
      }));
      onStoryMetaChange(authorsPatch(normalized));
    },
    [onStoryMetaChange],
  );

  const updateCredit = useCallback(
    (id: string, patch: Partial<StoryAuthorCredit>) => {
      setCredits(credits.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    },
    [credits, setCredits],
  );

  const addAuthor = useCallback(() => {
    setCredits([...credits, { id: newStoryId(), name: "", authorPrefixMode: "by" }]);
  }, [credits, setCredits]);

  const removeAuthor = useCallback(
    (id: string) => {
      setCredits(credits.filter((c) => c.id !== id));
    },
    [credits, setCredits],
  );

  const moveAuthor = useCallback(
    (id: string, delta: -1 | 1) => {
      const i = credits.findIndex((c) => c.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= credits.length) return;
      const next = [...credits];
      const t = next[i]!;
      next[i] = next[j]!;
      next[j] = t;
      setCredits(next);
    },
    [credits, setCredits],
  );

  return (
    <div>
      <p className="mb-2 text-xs leading-relaxed text-base-content/55">
        One credit per line; order is shown on the public page. Each person can use a different prefix (for example
        &quot;Written by&quot; vs &quot;Narrated by&quot;).
      </p>
      <div className="flex flex-col gap-3">
        {credits.length === 0 ? (
          <p className="text-xs text-base-content/50">No authors yet.</p>
        ) : (
          credits.map((credit, idx) => (
            <div
              key={credit.id}
              className="rounded-xl border border-base-content/12 bg-base-100/30 p-3 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/45">
                  Author {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  {credits.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-0.5 px-1.5"
                        disabled={idx === 0}
                        onClick={() => moveAuthor(credit.id, -1)}
                        aria-label={`Move author ${idx + 1} up`}
                        title="Move up"
                      >
                        <ArrowUp className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-0.5 px-1.5"
                        disabled={idx >= credits.length - 1}
                        onClick={() => moveAuthor(credit.id, 1)}
                        aria-label={`Move author ${idx + 1} down`}
                        title="Move down"
                      >
                        <ArrowDown className="size-3.5" aria-hidden />
                      </button>
                    </>
                  ) : null}
                  {credits.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs gap-1 text-error"
                      onClick={() => removeAuthor(credit.id)}
                      aria-label={`Remove author ${idx + 1}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              <input
                className={cn(
                  "input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100",
                  controlH,
                )}
                placeholder="e.g. Jordan Gonsalves"
                value={credit.name}
                onChange={(e) => updateCredit(credit.id, { name: e.target.value })}
              />
              <p className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wider text-base-content/45">
                Text before this name
              </p>
              <div className="flex flex-col gap-2">
                {STORY_AUTHOR_PREFIX_OPTIONS.map((opt) => {
                  const active = effectiveStoryAuthorPrefixMode(credit.authorPrefixMode) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={authorPrefixOptionClass(active)}
                      onClick={() => updateCredit(credit.id, { authorPrefixMode: opt.value })}
                    >
                      <span className="block text-sm font-semibold text-base-content">{opt.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-base-content/55">{opt.example}</span>
                    </button>
                  );
                })}
              </div>
              {effectiveStoryAuthorPrefixMode(credit.authorPrefixMode) === "custom" ? (
                <div className="mt-2">
                  <FieldLabel>Custom prefix</FieldLabel>
                  <p className="mb-2 text-xs leading-relaxed text-base-content/55">
                    Text immediately before this name. Add a trailing space if you want one before the name.
                  </p>
                  <input
                    className={cn(
                      "input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100",
                      controlH,
                    )}
                    placeholder="e.g. Narrated by  or  Written by "
                    value={credit.authorPrefixCustom ?? ""}
                    onChange={(e) =>
                      updateCredit(credit.id, {
                        authorPrefixCustom: e.target.value.length ? e.target.value : undefined,
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      <button type="button" className="btn btn-outline btn-sm mt-2 gap-1" onClick={addAuthor}>
        <Plus className="size-3.5" aria-hidden />
        Add author
      </button>
      <div className="mt-3 rounded-lg border border-base-content/10 bg-base-100/45 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/45">Live preview</p>
        <p className="mt-1.5 whitespace-pre-line text-sm font-medium text-base-content">
          {formatStoryAuthorLine(doc) ?? (
            <span className="font-normal text-base-content/50">Add at least one author name to preview bylines.</span>
          )}
        </p>
      </div>
    </div>
  );
}
