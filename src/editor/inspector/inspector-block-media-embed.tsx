"use client";

import { useState } from "react";
import type {
  StoryMediaBlock,
  StoryEmbedBlock,
  StoryEmbedLinkMode,
  StoryEmbedLayoutAlign,
  StoryBlockTextPlacement,
  StoryGeneralEmbedKind,
  StoryTreeEmbedData,
  StoryTreeCardVariant,
  StoryTreeCardLayout,
  StoryTreeCompactCardSize,
  StoryPersonSpotlightField,
  StoryPersonSpotlightEmbedData,
  StoryGalleryEmbedData,
  StoryMapEmbedData,
  StoryEventEmbedData,
  StoryFamilyGroupEmbedData,
  StoryRecipeEmbedData,
} from "../../types";
import {
  effectiveMediaEmbedInspectorRowLayout,
  layoutAlignToRowAlignment,
} from "../../utils/story-block-layout";
import { mergeMediaEmbedRowLayoutPatch } from "../../utils/story-media-embed-layout-sync";
import { STORY_TEXT_PLACEMENT_OPTIONS } from "../../utils/story-block-text-layout";
import { mediaThumbSrc, resolveMediaImageSrc } from "../media-preview";
import { useStoryEditorMedia } from "../media-context";
import { useStoryEditorPickers } from "../pickers-context";
import { StoryCaptionRichTextEditor } from "../StoryCaptionRichText";
import { EventPickerButton } from "./inspector-story-meta";
import { FieldLabel, HelperCard } from "./inspector-primitives";
import { cn } from "../../cn";
import { Button } from "../ui/button";
import { CollapsibleFormSection } from "../ui/collapsible-form-section";
import { AlignLeft, AlignCenter, AlignRight, ImageIcon, Plus, X } from "lucide-react";

// ─── Private helpers ──────────────────────────────────────────────────────────

function basenameFromFileRef(ref: string | null | undefined): string | undefined {
  if (ref == null || !String(ref).trim()) return undefined;
  const s = String(ref).replace(/\\/g, "/");
  const idx = s.lastIndexOf("/");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

type CustomField = NonNullable<StoryPersonSpotlightEmbedData["customFields"]>[number];

function CustomFieldsEditor({
  customFields,
  onChange,
}: {
  customFields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}) {
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const canAdd = draftLabel.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onChange([...customFields, { label: draftLabel.trim(), value: draftValue.trim() || undefined }]);
    setDraftLabel("");
    setDraftValue("");
  };

  return (
    <div className="mt-4 rounded-lg border border-base-content/12 bg-base-100 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/50">Custom fields</p>
      {customFields.length > 0 ? (
        <div className="mb-3 space-y-1.5">
          {customFields.map((cf, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-base-content/10 bg-base-200/40 px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-base-content">{cf.label}</span>
                {cf.value ? <span className="ml-2 text-xs text-base-content/55">{cf.value}</span> : null}
              </div>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-base-content/40 hover:bg-error/10 hover:text-error"
                onClick={() => onChange(customFields.filter((_, j) => j !== i))}
                aria-label={`Remove ${cf.label}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-base-content/45">No custom fields yet.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-base-content/50">Label</p>
          <input
            className="input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100"
            placeholder="e.g. Occupation"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-base-content/50">Value</p>
          <input
            className="input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100"
            placeholder="e.g. Schoolteacher"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={!canAdd}
        onClick={handleAdd}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-base-content/15 bg-base-200/50 px-2.5 py-1 text-xs font-medium text-base-content/70 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-3" />
        Add field
      </button>
    </div>
  );
}

function StoryTextPlacementGrid({
  heading,
  value,
  onPick,
  touchComfort,
}: {
  heading: string;
  value: StoryBlockTextPlacement;
  onPick: (v: StoryBlockTextPlacement) => void;
  touchComfort?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{heading}</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        {STORY_TEXT_PLACEMENT_OPTIONS.map(({ value: v, label }) => (
          <button
            key={v}
            type="button"
            title={label}
            onClick={() => onPick(v)}
            className={cn(
              "rounded-lg border text-center text-[11px] font-semibold uppercase tracking-wide transition-colors",
              touchComfort ? "min-h-[44px] px-2 py-2.5" : "px-2 py-2",
              value === v
                ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
                : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18 hover:bg-base-content/[0.04]",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const MEDIA_WIDTH_PRESETS: { label: string; pct: number }[] = [
  { label: "25%", pct: 25 },
  { label: "33%", pct: 33 },
  { label: "50%", pct: 50 },
  { label: "66%", pct: 66 },
  { label: "75%", pct: 75 },
  { label: "Full", pct: 100 },
];

const STORY_MEDIA_EMBED_LAYOUT_ALIGN_OPTIONS: { value: StoryEmbedLayoutAlign; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

function StandaloneMediaEmbedLayoutInspectorSection({
  block,
  onPatchLayout,
  touchComfort,
}: {
  block: StoryMediaBlock | StoryEmbedBlock;
  onPatchLayout: (p: Partial<StoryMediaBlock> | Partial<StoryEmbedBlock>) => void;
  touchComfort?: boolean;
}) {
  const rl = effectiveMediaEmbedInspectorRowLayout(block);
  const layoutAlign = block.layoutAlign ?? "center";
  const chip = touchComfort ? "min-h-[44px] px-2 text-sm" : "h-9 px-2 text-xs";

  const currentPct =
    rl.widthMode === "full"
      ? 100
      : rl.widthMode === "custom" && rl.widthValue != null
        ? rl.widthValue
        : rl.widthMode === "wide"
          ? 80
          : rl.widthMode === "medium"
            ? 65
            : rl.widthMode === "narrow"
              ? 45
              : 100;

  function applyWidth(pct: number) {
    onPatchLayout(
      mergeMediaEmbedRowLayoutPatch(block, {
        widthMode: pct >= 100 ? "full" : "custom",
        widthValue: pct >= 100 ? undefined : pct,
        widthUnit: "%",
        displayMode: "block",
        float: undefined,
      }),
    );
  }

  return (
    <CollapsibleFormSection title="Size & alignment" defaultOpen>
      <p className="mb-3 text-xs leading-relaxed text-base-content/55">
        Drag the handles on the image edges to resize, or pick a preset below.
      </p>
      <FieldLabel>Width</FieldLabel>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {MEDIA_WIDTH_PRESETS.map(({ label, pct }) => {
          const active = Math.abs(currentPct - pct) <= 2;
          return (
            <button
              key={pct}
              type="button"
              onClick={() => applyWidth(pct)}
              className={cn(
                "rounded-lg border text-center font-semibold transition-colors",
                chip,
                active
                  ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
                  : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {rl.widthMode === "custom" && rl.widthValue != null ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="range"
            min={10}
            max={100}
            step={1}
            value={Math.round(rl.widthValue)}
            onChange={(e) => applyWidth(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-primary"
          />
          <span className="w-10 text-right text-xs font-semibold tabular-nums text-base-content/70">
            {Math.round(rl.widthValue)}%
          </span>
        </div>
      ) : null}
      <div className="mt-4">
        <FieldLabel>Alignment in column</FieldLabel>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {STORY_MEDIA_EMBED_LAYOUT_ALIGN_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => onPatchLayout(mergeMediaEmbedRowLayoutPatch(block, { alignment: layoutAlignToRowAlignment(value), displayMode: "block", float: undefined }))}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-colors",
                touchComfort ? "min-h-[44px] py-2" : "py-2.5",
                layoutAlign === value
                  ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
                  : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </CollapsibleFormSection>
  );
}

// ─── MediaBlockInspector ──────────────────────────────────────────────────────

const LINK_OPTIONS: { value: StoryEmbedLinkMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "same_window", label: "Same window" },
  { value: "new_tab", label: "New tab" },
];

export function MediaBlockInspector({
  storyId,
  block,
  onPatch,
  hideLayoutSection,
  touchComfort,
}: {
  storyId: string;
  block: StoryMediaBlock;
  onPatch: (p: Partial<StoryMediaBlock>) => void;
  hideLayoutSection?: boolean;
  touchComfort?: boolean;
}) {
  const { useMediaById } = useStoryEditorMedia();
  const { MediaPickerButton } = useStoryEditorPickers();
  const { data, isLoading } = useMediaById(block.mediaId);
  const linkMode = block.linkMode ?? "none";
  const titlePlacement = block.titlePlacement ?? "above";
  const captionPlacement = block.captionPlacement ?? "below";
  const textSectionOpenDefault = Boolean(block.label?.trim() || block.caption?.trim());

  const thumb =
    data?.fileRef != null && data.fileRef !== ""
      ? mediaThumbSrc(data.fileRef, data.form, 160) ?? resolveMediaImageSrc(data.fileRef)
      : null;

  const filename = basenameFromFileRef(data?.fileRef ?? undefined);
  const controlH = touchComfort ? "min-h-[44px] h-11" : "h-10";

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/45">Media block</p>

      <CollapsibleFormSection title="Media / source" defaultOpen>
        <FieldLabel>Preview</FieldLabel>
        <div className="mt-3 flex gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-base-content/10 bg-base-200/50">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center p-1 text-center text-[10px] leading-tight text-base-content/45">
                {isLoading && block.mediaId ? "…" : "None"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs leading-snug text-base-content/60">
            {data?.title ? <p className="font-medium text-base-content">{data.title}</p> : null}
            {filename ? (
              <p className="mt-1 font-mono text-[11px] text-base-content/55">
                <span className="font-semibold text-base-content/45">File: </span>
                {filename}
              </p>
            ) : null}
            {data?.form ? (
              <p className="mt-0.5">
                <span className="font-semibold text-base-content/45">Type: </span>
                {data.form}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-base-content/50">Dimensions and alt text are not loaded from the server in this draft yet.</p>
            {!block.mediaId ? <p className="mt-1 text-base-content/55">No file attached yet.</p> : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {MediaPickerButton ? (
            <MediaPickerButton
              targetType="story"
              targetId={storyId}
              mode="single"
              purpose="storyIllustration"
              triggerLabel={block.mediaId ? "Replace media" : "Select media"}
              triggerClassName={cn("rounded-lg border-base-content/12 px-3 font-medium", controlH)}
              onAttach={(items) => {
                const m = items[0];
                if (!m) return;
                onPatch({ mediaId: m.id, label: m.title?.trim() ? m.title.trim() : block.label });
              }}
            />
          ) : null}
          {block.mediaId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("rounded-lg border-base-content/12 px-3 font-medium text-error hover:bg-error/10", controlH)}
              onClick={() => onPatch({ mediaId: undefined })}
            >
              Remove media
            </Button>
          ) : null}
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Text" defaultOpen={textSectionOpenDefault}>
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            placeholder="Optional display title"
            value={block.label ?? ""}
            onChange={(e) => onPatch({ label: e.target.value })}
          />
        </div>
        <div className="mt-3">
          <FieldLabel>Caption</FieldLabel>
          <StoryCaptionRichTextEditor
            caption={block.caption}
            placeholder="Optional caption shown with the media…"
            touchComfort={touchComfort}
            onChange={(caption) => onPatch({ caption })}
          />
        </div>
        <div className="mt-4 space-y-3 rounded-lg border border-base-content/10 bg-base-100/50 p-3">
          <p className="text-xs font-semibold text-base-content/70">Story display</p>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-base-content/80">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-2 border-base-content/45 bg-base-100 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              checked={!block.hideTitle}
              onChange={(e) => onPatch({ hideTitle: !e.target.checked })}
            />
            <span>
              <span className="font-medium text-base-content">Display title in story</span>
              <span className="mt-0.5 block text-xs leading-snug text-base-content/55">
                Keep the title editable here, but omit it from every story rendering when this is off.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-base-content/80">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-2 border-base-content/45 bg-base-100 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              checked={!block.hideCaption}
              onChange={(e) => onPatch({ hideCaption: !e.target.checked })}
            />
            <span>
              <span className="font-medium text-base-content">Display caption in story</span>
              <span className="mt-0.5 block text-xs leading-snug text-base-content/55">
                Keep the caption editable here, but omit it from every story rendering when this is off.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-4">
          <StoryTextPlacementGrid heading="Title position" value={titlePlacement} onPick={(v) => onPatch({ titlePlacement: v })} touchComfort={touchComfort} />
        </div>
        <div className="mt-4">
          <StoryTextPlacementGrid heading="Caption position" value={captionPlacement} onPick={(v) => onPatch({ captionPlacement: v })} touchComfort={touchComfort} />
        </div>
      </CollapsibleFormSection>

      {!hideLayoutSection && (
        <StandaloneMediaEmbedLayoutInspectorSection block={block} onPatchLayout={(p) => onPatch(p as Partial<StoryMediaBlock>)} touchComfort={touchComfort} />
      )}

      <CollapsibleFormSection title="Appearance" defaultOpen={block.heightPx != null}>
        <FieldLabel>Height</FieldLabel>
        {block.heightPx != null ? (
          <div className="mt-1 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={60}
                max={900}
                step={10}
                value={block.heightPx}
                onChange={(e) => onPatch({ heightPx: Number(e.target.value) })}
                className="h-2 flex-1 cursor-pointer accent-primary"
              />
              <span className="w-14 text-right text-xs font-semibold tabular-nums text-base-content/70">
                {block.heightPx}px
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("w-full rounded-lg border-base-content/12 font-medium", controlH)}
              onClick={() => onPatch({ heightPx: undefined })}
            >
              Reset to natural height
            </Button>
          </div>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-base-content/55">
            Natural — height follows the image aspect ratio. Drag the bottom handle on the image to set a fixed crop height.
          </p>
        )}
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Link / interaction" defaultOpen={false}>
        <FieldLabel>Link behavior</FieldLabel>
        <p className="mb-2 text-xs text-base-content/55">Used when this block links to media or an external target (future site behavior).</p>
        <select
          className={cn("select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
          value={linkMode}
          onChange={(e) => onPatch({ linkMode: e.target.value as StoryEmbedLinkMode })}
        >
          {LINK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Advanced" defaultOpen={false}>
        <FieldLabel>Block ID</FieldLabel>
        <input readOnly className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-200/40 font-mono text-xs", controlH)} value={block.id} />
        <div className="mt-3">
          <FieldLabel>Stored type</FieldLabel>
          <p className="mt-1 rounded-lg border border-base-content/10 bg-base-200/30 px-3 py-2 font-mono text-xs text-base-content/75">media</p>
        </div>
        <div className="mt-3">
          <FieldLabel>Legacy layout fields (read-only)</FieldLabel>
          <p className="mt-0.5 text-[10px] leading-relaxed text-base-content/40">
            Deprecated fields kept for backward compatibility. Use Size &amp; alignment above to migrate.
          </p>
          <p className="mt-1 break-all font-mono text-[10px] leading-relaxed text-base-content/50">
            widthPreset={block.widthPreset ?? "—"} · layoutAlign={block.layoutAlign ?? "—"} · textWrap=
            {String(block.textWrap ?? false)} · fullWidth={String(block.fullWidth ?? false)}
          </p>
        </div>
      </CollapsibleFormSection>
    </div>
  );
}

// ─── OtherEmbedInspector ──────────────────────────────────────────────────────

const OTHER_EMBED_KINDS: StoryGeneralEmbedKind[] = [
  "document",
  "timeline",
  "map",
  "tree",
  "graph",
  "gallery",
  "personSpotlight",
  "familyGroup",
  "event",
  "recipe",
];

const EMBED_KIND_LABELS: Record<StoryGeneralEmbedKind, string> = {
  document: "Document",
  timeline: "Timeline",
  map: "Map",
  tree: "Family tree",
  graph: "Graph",
  gallery: "Photo gallery",
  personSpotlight: "Person spotlight",
  familyGroup: "Family group",
  event: "Event",
  recipe: "Recipe",
};

const TREE_CHART_TYPES: NonNullable<StoryTreeEmbedData["chartType"]>[] = ["pedigree", "verticalPedigree", "descendancy", "fan"];
const TREE_CHART_TYPE_LABELS: Record<NonNullable<StoryTreeEmbedData["chartType"]>, string> = {
  pedigree: "Pedigree",
  verticalPedigree: "Vertical pedigree",
  descendancy: "Descendants",
  fan: "Fan chart",
};

const TREE_CARD_VARIANTS: StoryTreeCardVariant[] = ["full", "compact-name", "compact-avatar"];
const TREE_CARD_VARIANT_LABELS: Record<StoryTreeCardVariant, string> = {
  full: "Full",
  "compact-name": "Name only",
  "compact-avatar": "Name + avatar",
};

const TREE_CARD_LAYOUTS: StoryTreeCardLayout[] = [
  "avatarTopActionsBottom",
  "avatarLeftActionsRight",
  "avatarLeftActionsBottom",
  "avatarTopActionsRight",
  "avatarTopMobileMenu",
  "avatarLeftMobileMenu",
];
const TREE_CARD_LAYOUT_LABELS: Record<StoryTreeCardLayout, string> = {
  avatarTopActionsBottom: "Avatar top · Actions bottom",
  avatarLeftActionsRight: "Avatar left · Actions right",
  avatarLeftActionsBottom: "Avatar left · Actions bottom",
  avatarTopActionsRight: "Avatar top · Actions right",
  avatarTopMobileMenu: "Avatar top · Menu",
  avatarLeftMobileMenu: "Avatar left · Menu",
};

const TREE_COMPACT_SIZES: StoryTreeCompactCardSize[] = ["large", "medium", "small", "extra-small"];
const TREE_COMPACT_SIZE_LABELS: Record<StoryTreeCompactCardSize, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small",
  "extra-small": "Extra small",
};

const PERSON_SPOTLIGHT_FIELDS: StoryPersonSpotlightField[] = [
  "profileImage", "name", "birthDate", "deathDate", "age", "lifespan",
  "birthPlace", "deathPlace", "parents", "spouses", "children", "custom",
];
const PERSON_SPOTLIGHT_FIELD_LABELS: Record<StoryPersonSpotlightField, string> = {
  profileImage: "Profile photo",
  name: "Full name",
  birthDate: "Birth date",
  deathDate: "Death date",
  age: "Age",
  lifespan: "Lifespan",
  birthPlace: "Birth place",
  deathPlace: "Death place",
  parents: "Parents",
  spouses: "Spouses",
  children: "Children",
  custom: "Custom fields",
};

const GALLERY_SOURCE_TYPES: StoryGalleryEmbedData["sourceType"][] = ["album", "personMedia", "familyMedia", "eventMedia", "tag", "custom"];
const GALLERY_SOURCE_TYPE_LABELS: Record<StoryGalleryEmbedData["sourceType"], string> = {
  album: "Album",
  personMedia: "Person's photos",
  familyMedia: "Family photos",
  eventMedia: "Event photos",
  tag: "Tagged photos",
  custom: "Custom selection",
};

const MAP_MODES: NonNullable<StoryMapEmbedData["mapMode"]>[] = ["events", "lifeRoute", "familyMigration", "custom"];
const MAP_MODE_LABELS: Record<NonNullable<StoryMapEmbedData["mapMode"]>, string> = {
  events: "Events",
  lifeRoute: "Life route",
  familyMigration: "Family migration",
  custom: "Custom",
};

export function OtherEmbedInspector({
  block,
  onPatch,
  touchComfort,
}: {
  block: StoryEmbedBlock;
  onPatch: (p: Partial<StoryEmbedBlock>) => void;
  touchComfort?: boolean;
}) {
  const { IndividualSearchPicker, FamilySearchPicker, TagsPicker, AlbumsManager } = useStoryEditorPickers();
  const title = block.title ?? block.label ?? "";
  const presentation = block.presentation ?? {};
  const textSectionOpenDefault = Boolean(title.trim() || block.caption?.trim() || block.sublabel?.trim());
  const controlH = touchComfort ? "min-h-[44px] h-11" : "h-10";
  const dataRecord = block.data && typeof block.data === "object" ? (block.data as Record<string, unknown>) : {};
  const patchData = (patch: Record<string, unknown>) => onPatch({ data: { ...dataRecord, ...patch } } as Partial<StoryEmbedBlock>);

  const semanticConfig = (() => {
    if (block.embedKind === "tree") {
      const data = (block.data ?? { generations: 5, chartType: "fan" }) as StoryTreeEmbedData;
      return (
        <CollapsibleFormSection title="Tree configuration" defaultOpen>
          <FieldLabel>Root person</FieldLabel>
          {data.rootPersonLabel || data.rootPersonId || data.rootPersonXref ? (
            <p className="mb-3 rounded-lg border border-base-content/10 bg-base-content/[0.03] px-3 py-2 text-sm text-base-content/70">
              {data.rootPersonLabel || data.rootPersonXref || data.rootPersonId}
            </p>
          ) : null}
          {IndividualSearchPicker ? (
            <IndividualSearchPicker
              idPrefix={`story-tree-root-${block.id}`}
              onPick={(ind) => {
                patchData({
                  rootPersonId: ind.id,
                  rootPersonXref: ind.xref ?? undefined,
                  rootPersonLabel: ind.fullName?.trim() || ind.xref || ind.id,
                });
                onPatch({
                  subject: {
                    type: "individual",
                    id: ind.id,
                    xref: ind.xref ?? undefined,
                    label: ind.fullName?.trim() || ind.xref || ind.id,
                  },
                });
              }}
            />
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Generations</FieldLabel>
              <input
                type="number"
                min={1}
                max={10}
                className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                value={data.generations ?? 5}
                onChange={(e) => patchData({ generations: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
              />
            </div>
            <div>
              <FieldLabel>Chart type</FieldLabel>
              <select
                className={cn("select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                value={data.chartType ?? "fan"}
                onChange={(e) => patchData({ chartType: e.target.value })}
              >
                {TREE_CHART_TYPES.map((chartType) => (
                  <option key={chartType} value={chartType}>{TREE_CHART_TYPE_LABELS[chartType]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <FieldLabel>Card style</FieldLabel>
            <p className="mb-2 text-xs text-base-content/50">When set, overrides the renderer&apos;s default. Leave unset to let the renderer choose.</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {([undefined, ...TREE_CARD_VARIANTS] as (StoryTreeCardVariant | undefined)[]).map((v) => (
                <button
                  key={v ?? "__default__"}
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                    data.cardVariant === v
                      ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
                      : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
                  )}
                  onClick={() => patchData({ cardVariant: v, cardLayout: undefined, compactCardSize: undefined })}
                >
                  {v == null ? "Renderer default" : TREE_CARD_VARIANT_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
          {(data.cardVariant === "full" || data.cardVariant == null) && (
            <div className="mt-3">
              <FieldLabel>Card layout</FieldLabel>
              <select
                className={cn("select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                value={data.cardLayout ?? ""}
                onChange={(e) => patchData({ cardLayout: (e.target.value as StoryTreeCardLayout) || undefined })}
              >
                <option value="">Renderer default</option>
                {TREE_CARD_LAYOUTS.map((layout) => (
                  <option key={layout} value={layout}>{TREE_CARD_LAYOUT_LABELS[layout]}</option>
                ))}
              </select>
            </div>
          )}
          {(data.cardVariant === "compact-name" || data.cardVariant === "compact-avatar") && (
            <div className="mt-3">
              <FieldLabel>Card size</FieldLabel>
              <div className="mt-1 flex flex-wrap gap-2">
                {([undefined, ...TREE_COMPACT_SIZES] as (StoryTreeCompactCardSize | undefined)[]).map((size) => (
                  <button
                    key={size ?? "__default__"}
                    type="button"
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                      data.compactCardSize === size
                        ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
                        : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
                    )}
                    onClick={() => patchData({ compactCardSize: size })}
                  >
                    {size == null ? "Renderer default" : TREE_COMPACT_SIZE_LABELS[size]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CollapsibleFormSection>
      );
    }

    if (block.embedKind === "personSpotlight") {
      const data = (block.data ?? { fields: ["profileImage", "name", "lifespan"] }) as StoryPersonSpotlightEmbedData;
      const fields = new Set(data.fields ?? []);
      return (
        <CollapsibleFormSection title="Person spotlight configuration" defaultOpen>
          <FieldLabel>Person</FieldLabel>
          {data.personLabel || data.personId || data.personXref ? (
            <p className="mb-3 rounded-lg border border-base-content/10 bg-base-content/[0.03] px-3 py-2 text-sm text-base-content/70">
              {data.personLabel || data.personXref || data.personId}
            </p>
          ) : null}
          {IndividualSearchPicker ? (
            <IndividualSearchPicker
              idPrefix={`story-person-spotlight-${block.id}`}
              onPick={(ind) => {
                const label = ind.fullName?.trim() || ind.xref || ind.id;
                patchData({ personId: ind.id, personXref: ind.xref ?? undefined, personLabel: label });
                onPatch({ subject: { type: "individual", id: ind.id, xref: ind.xref ?? undefined, label } });
              }}
            />
          ) : null}
          <FieldLabel>Fields to show</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {PERSON_SPOTLIGHT_FIELDS.map((field) => (
              <label key={field} className="flex items-center gap-2 rounded-lg border border-base-content/10 bg-base-100/55 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={fields.has(field)}
                  onChange={(e) => {
                    const next = new Set(fields);
                    if (e.target.checked) next.add(field);
                    else next.delete(field);
                    if (!e.target.checked) patchData({ fields: Array.from(next), customFields: [] });
                    else patchData({ fields: Array.from(next) });
                  }}
                />
                {PERSON_SPOTLIGHT_FIELD_LABELS[field]}
              </label>
            ))}
          </div>
          {fields.has("custom") ? (
            <CustomFieldsEditor
              customFields={data.customFields ?? []}
              onChange={(customFields) => patchData({ customFields })}
            />
          ) : null}
        </CollapsibleFormSection>
      );
    }

    if (block.embedKind === "gallery") {
      const data = (block.data ?? { sourceType: "custom" }) as StoryGalleryEmbedData;

      const gallerySourcePicker = (() => {
        if (data.sourceType === "album") {
          if (AlbumsManager) {
            const linked = data.sourceId ? [{ id: data.sourceId, name: data.sourceLabel ?? data.sourceId }] : [];
            return (
              <AlbumsManager
                linkedAlbums={linked}
                panelId={`story-gallery-album-${block.id}`}
                touchComfort={touchComfort}
                onChange={(albums) => {
                  const first = albums[albums.length - 1];
                  if (first) patchData({ sourceId: first.id, sourceLabel: first.name });
                  else patchData({ sourceId: undefined, sourceLabel: undefined });
                }}
              />
            );
          }
          return (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Album ID</FieldLabel>
                <input
                  className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                  placeholder="Album identifier"
                  value={data.sourceId ?? ""}
                  onChange={(e) => patchData({ sourceId: e.target.value || undefined })}
                />
              </div>
              <div>
                <FieldLabel>Display label</FieldLabel>
                <input
                  className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                  value={data.sourceLabel ?? ""}
                  onChange={(e) => patchData({ sourceLabel: e.target.value || undefined })}
                />
              </div>
            </div>
          );
        }

        if (data.sourceType === "tag") {
          if (TagsPicker) {
            return (
              <TagsPicker
                selected={data.sourceId ? [{ id: data.sourceId, name: data.sourceLabel ?? data.sourceId, color: null }] : []}
                onAdd={(tag) => patchData({ sourceId: tag.id, sourceLabel: tag.name })}
                onRemove={() => patchData({ sourceId: undefined, sourceLabel: undefined })}
                placeholder="Search tags…"
              />
            );
          }
          return (
            <input
              className={cn("input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
              placeholder="Tag ID"
              value={data.sourceId ?? ""}
              onChange={(e) => patchData({ sourceId: e.target.value || undefined })}
            />
          );
        }

        if (data.sourceType === "personMedia") {
          return (
            <>
              {data.sourceLabel || data.sourceId ? (
                <p className="mb-3 rounded-lg border border-base-content/10 bg-base-content/[0.03] px-3 py-2 text-sm text-base-content/70">
                  {data.sourceLabel ?? data.sourceId}
                </p>
              ) : null}
              {IndividualSearchPicker ? (
                <IndividualSearchPicker
                  idPrefix={`story-gallery-person-${block.id}`}
                  onPick={(ind) => {
                    const label = ind.fullName?.trim() || ind.xref || ind.id;
                    patchData({ sourceId: ind.id, sourceLabel: label });
                  }}
                />
              ) : null}
            </>
          );
        }

        if (data.sourceType === "familyMedia") {
          return (
            <>
              {data.sourceLabel || data.sourceId ? (
                <p className="mb-3 rounded-lg border border-base-content/10 bg-base-content/[0.03] px-3 py-2 text-sm text-base-content/70">
                  {data.sourceLabel ?? data.sourceId}
                </p>
              ) : null}
              {FamilySearchPicker ? (
                <FamilySearchPicker
                  idPrefix={`story-gallery-family-${block.id}`}
                  onPick={(fam) => {
                    const label = fam.primaryLine ?? fam.xref ?? fam.id;
                    patchData({ sourceId: fam.id, sourceLabel: label });
                  }}
                />
              ) : null}
            </>
          );
        }

        if (data.sourceType === "eventMedia") {
          return (
            <>
              {data.sourceLabel || data.sourceId ? (
                <p className="mb-3 rounded-lg border border-base-content/10 bg-base-content/[0.03] px-3 py-2 text-sm text-base-content/70">
                  {data.sourceLabel ?? data.sourceId}
                </p>
              ) : null}
              <EventPickerButton
                excludeEventIds={data.sourceId ? new Set([data.sourceId]) : new Set()}
                touchComfort={touchComfort}
                onPick={(id, label) => patchData({ sourceId: id, sourceLabel: label })}
              />
            </>
          );
        }

        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Source ID</FieldLabel>
              <input
                className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                placeholder="Any identifier your renderer recognises"
                value={data.sourceId ?? ""}
                onChange={(e) => patchData({ sourceId: e.target.value || undefined })}
              />
            </div>
            <div>
              <FieldLabel>Display label</FieldLabel>
              <input
                className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                placeholder="Shown in the editor preview"
                value={data.sourceLabel ?? ""}
                onChange={(e) => patchData({ sourceLabel: e.target.value || undefined })}
              />
            </div>
          </div>
        );
      })();

      return (
        <CollapsibleFormSection title="Gallery configuration" defaultOpen>
          <FieldLabel>Source</FieldLabel>
          <select
            className={cn("select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            value={data.sourceType ?? "custom"}
            onChange={(e) => patchData({ sourceType: e.target.value, sourceId: undefined, sourceLabel: undefined })}
          >
            {GALLERY_SOURCE_TYPES.map((sourceType) => (
              <option key={sourceType} value={sourceType}>{GALLERY_SOURCE_TYPE_LABELS[sourceType]}</option>
            ))}
          </select>
          <div className="mt-3">{gallerySourcePicker}</div>
          <div className="mt-3">
            <FieldLabel>Photo limit</FieldLabel>
            <input
              type="number"
              min={1}
              max={100}
              className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
              value={data.limit ?? ""}
              onChange={(e) => patchData({ limit: e.target.value ? Number(e.target.value) : undefined })}
            />
            <p className="mt-1 text-xs text-base-content/55">Maximum photos to display. Leave blank for the renderer default.</p>
          </div>
        </CollapsibleFormSection>
      );
    }

    if (block.embedKind === "map") {
      const data = (block.data ?? { eventIds: [], mapMode: "events" }) as StoryMapEmbedData;
      const eventLabels = (dataRecord.eventLabels ?? {}) as Record<string, string>;
      return (
        <CollapsibleFormSection title="Map configuration" defaultOpen>
          <FieldLabel>Map mode</FieldLabel>
          <select
            className={cn("select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            value={data.mapMode ?? "events"}
            onChange={(e) => patchData({ mapMode: e.target.value })}
          >
            {MAP_MODES.map((mode) => (
              <option key={mode} value={mode}>{MAP_MODE_LABELS[mode]}</option>
            ))}
          </select>
          <div className="mt-4">
            <FieldLabel>Events on this map</FieldLabel>
            {(data.eventIds ?? []).length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(data.eventIds ?? []).map((id) => (
                  <span
                    key={id}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-base-content/15 bg-base-200/60 px-2.5 py-0.5 text-xs font-medium text-base-content"
                  >
                    <span className="truncate">{eventLabels[id] ?? id}</span>
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-base-content/60 hover:bg-base-300/80 hover:text-base-content"
                      onClick={() => {
                        const nextLabels = { ...eventLabels };
                        delete nextLabels[id];
                        patchData({ eventIds: (data.eventIds ?? []).filter((x) => x !== id), eventLabels: nextLabels });
                      }}
                      aria-label={`Remove ${eventLabels[id] ?? id}`}
                    >
                      <X className="size-3 shrink-0" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-xs text-base-content/55">No events added yet.</p>
            )}
            <EventPickerButton
              excludeEventIds={new Set(data.eventIds ?? [])}
              touchComfort={touchComfort}
              onPick={(id, label) => {
                patchData({
                  eventIds: [...(data.eventIds ?? []), id],
                  eventLabels: { ...eventLabels, [id]: label },
                });
              }}
            />
          </div>
        </CollapsibleFormSection>
      );
    }

    if (block.embedKind === "event") {
      const data = (block.data ?? {}) as StoryEventEmbedData;
      return (
        <CollapsibleFormSection title="Event configuration" defaultOpen>
          {data.eventLabel || data.eventId || data.eventXref ? (
            <p className="mb-3 rounded-lg border border-base-content/10 bg-base-content/[0.03] px-3 py-2 text-sm text-base-content/70">
              {data.eventLabel || data.eventXref || data.eventId}
            </p>
          ) : (
            <p className="mb-3 text-xs text-base-content/55">No event selected. Use the button below to find one.</p>
          )}
          <EventPickerButton
            excludeEventIds={data.eventId ? new Set([data.eventId]) : new Set()}
            touchComfort={touchComfort}
            onPick={(id, label) => {
              patchData({ eventId: id, eventLabel: label });
              onPatch({ subject: { type: "event", id, label } });
            }}
          />
        </CollapsibleFormSection>
      );
    }

    if (block.embedKind === "familyGroup") {
      const data = (block.data ?? {}) as StoryFamilyGroupEmbedData;
      return (
        <CollapsibleFormSection title="Family group configuration" defaultOpen>
          <p className="mb-3 text-xs leading-relaxed text-base-content/55">
            Displays partners, children, and key events for the selected family unit.
          </p>
          {data.familyLabel || data.familyId || data.familyXref ? (
            <p className="mb-3 rounded-lg border border-base-content/10 bg-base-content/[0.03] px-3 py-2 text-sm text-base-content/70">
              {data.familyLabel || data.familyXref || data.familyId}
            </p>
          ) : null}
          {FamilySearchPicker ? (
            <FamilySearchPicker
              idPrefix={`story-family-group-${block.id}`}
              onPick={(fam) => {
                const label = fam.primaryLine ?? fam.xref ?? fam.id;
                patchData({ familyId: fam.id, familyXref: fam.xref, familyLabel: label });
                onPatch({ subject: { type: "family", id: fam.id, xref: fam.xref, label } });
              }}
            />
          ) : null}
        </CollapsibleFormSection>
      );
    }

    if (block.embedKind === "recipe") {
      const data = (block.data ?? { ingredientGroups: [], stepGroups: [] }) as StoryRecipeEmbedData;
      return (
        <CollapsibleFormSection title="Recipe configuration" defaultOpen>
          <p className="mb-3 text-xs leading-relaxed text-base-content/55">
            Recipe embeds store structured ingredient and step data. A full ingredient and step editor is coming; for now configure the basic recipe details.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Yield</FieldLabel>
              <input
                className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                placeholder="e.g. 4 servings, 12 cookies"
                value={data.yield ?? ""}
                onChange={(e) => patchData({ yield: e.target.value || undefined })}
              />
            </div>
            <div>
              <FieldLabel>Prep time (min)</FieldLabel>
              <input type="number" min={0} className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)} value={data.prepTimeMinutes ?? ""} onChange={(e) => patchData({ prepTimeMinutes: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <FieldLabel>Cook time (min)</FieldLabel>
              <input type="number" min={0} className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)} value={data.cookTimeMinutes ?? ""} onChange={(e) => patchData({ cookTimeMinutes: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <FieldLabel>Total time (min)</FieldLabel>
              <input type="number" min={0} className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)} value={data.totalTimeMinutes ?? ""} onChange={(e) => patchData({ totalTimeMinutes: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <FieldLabel>Difficulty</FieldLabel>
              <select
                className={cn("select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                value={data.difficulty ?? ""}
                onChange={(e) => patchData({ difficulty: (e.target.value as StoryRecipeEmbedData["difficulty"]) || undefined })}
              >
                <option value="">Not set</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <FieldLabel>Cuisine</FieldLabel>
              <input className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)} placeholder="e.g. Portuguese, Cape Verdean" value={data.cuisine ?? ""} onChange={(e) => patchData({ cuisine: e.target.value || undefined })} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Source / credit</FieldLabel>
              <input className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)} placeholder="Where this recipe comes from" value={data.source ?? ""} onChange={(e) => patchData({ source: e.target.value || undefined })} />
            </div>
          </div>
          <p className="mt-4 text-xs text-base-content/45">
            {data.ingredientGroups.length} ingredient group{data.ingredientGroups.length === 1 ? "" : "s"} · {data.stepGroups.length} step group{data.stepGroups.length === 1 ? "" : "s"} — full editor coming soon.
          </p>
        </CollapsibleFormSection>
      );
    }

    return (
      <CollapsibleFormSection title="Source" defaultOpen>
        <p className="mb-3 text-xs leading-relaxed text-base-content/55">
          This embed type doesn&apos;t have a dedicated picker yet. Enter the source ID and a display label so
          the renderer can resolve it when it is ready.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Source ID</FieldLabel>
            <input
              className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
              placeholder="Internal ID for the source record"
              value={String(dataRecord.documentId ?? dataRecord.subjectId ?? "")}
              onChange={(e) => patchData({ documentId: e.target.value || undefined, subjectId: e.target.value || undefined })}
            />
          </div>
          <div>
            <FieldLabel>Display label</FieldLabel>
            <input
              className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
              placeholder="Name shown in the editor preview"
              value={String(dataRecord.documentLabel ?? dataRecord.subjectLabel ?? "")}
              onChange={(e) => patchData({ documentLabel: e.target.value || undefined, subjectLabel: e.target.value || undefined })}
            />
          </div>
        </div>
      </CollapsibleFormSection>
    );
  })();

  return (
    <div className="space-y-3">
      <HelperCard title="Semantic embed">
        Embeds store the meaning and source for a structured block. The admin preview is only a lightweight visualization;
        final styling belongs to the public renderer.
      </HelperCard>

      <CollapsibleFormSection title="Source" defaultOpen>
        <FieldLabel>Preview</FieldLabel>
        <div className="mt-2 rounded-xl border border-base-content/10 bg-base-100/70 p-3 shadow-sm ring-1 ring-base-content/[0.04]">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-base-300 via-base-300/90 to-base-200/80 shadow-inner ring-1 ring-base-content/[0.06]">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.04)_50%,transparent_60%)]" aria-hidden />
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-base-content">{title || "Untitled embed"}</p>
          <p className="mt-0.5 truncate text-xs text-base-content/50">{EMBED_KIND_LABELS[block.embedKind] ?? block.embedKind} · local draft</p>
        </div>
        <div className="mt-4">
          <FieldLabel>Embed type</FieldLabel>
          <select
            className={cn("select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            value={block.embedKind}
            onChange={(e) => onPatch({ embedKind: e.target.value as StoryGeneralEmbedKind })}
          >
            {OTHER_EMBED_KINDS.map((k) => (
              <option key={k} value={k}>{EMBED_KIND_LABELS[k]}</option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-relaxed text-base-content/55">
            Choose what this block means. Kind-specific configuration lives in the data section, not in visual style fields.
          </p>
        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Editorial metadata" defaultOpen={textSectionOpenDefault}>
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            value={title}
            onChange={(e) => onPatch({ title: e.target.value, label: e.target.value })}
          />
        </div>
        <div className="mt-3">
          <FieldLabel>Editorial note</FieldLabel>
          <input
            className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
            placeholder="Optional short line for the preview"
            value={block.sublabel ?? ""}
            onChange={(e) => onPatch({ sublabel: e.target.value || undefined })}
          />
        </div>
        <div className="mt-3">
          <FieldLabel>Caption</FieldLabel>
          <StoryCaptionRichTextEditor
            caption={block.caption}
            placeholder="Optional caption…"
            touchComfort={touchComfort}
            onChange={(caption) => onPatch({ caption })}
          />
        </div>
        <div className="mt-4 space-y-3 rounded-lg border border-base-content/10 bg-base-100/50 p-3">
          <p className="text-xs font-semibold text-base-content/70">Story display</p>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-base-content/80">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-2 border-base-content/45 bg-base-100 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              checked={!block.hideTitle}
              onChange={(e) => onPatch({ hideTitle: !e.target.checked })}
            />
            <span>
              <span className="font-medium text-base-content">Display title in story</span>
              <span className="mt-0.5 block text-xs leading-snug text-base-content/55">Keep the title editable here, but omit it from every story rendering when this is off.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-base-content/80">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-2 border-base-content/45 bg-base-100 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              checked={!block.hideCaption}
              onChange={(e) => onPatch({ hideCaption: !e.target.checked })}
            />
            <span>
              <span className="font-medium text-base-content">Display caption in story</span>
              <span className="mt-0.5 block text-xs leading-snug text-base-content/55">Keep the caption editable here, but omit it from every story rendering when this is off.</span>
            </span>
          </label>
        </div>
      </CollapsibleFormSection>

      {semanticConfig}

      <CollapsibleFormSection title="Preview behavior" defaultOpen={false}>
        <FieldLabel>Frame style</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["none", "minimal", "full"] as const).map((chrome) => {
            const chromeLabels = { none: "No frame", minimal: "Minimal", full: "Full" } as const;
            return (
              <button
                key={chrome}
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                  (presentation.chrome ?? "minimal") === chrome
                    ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
                    : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
                )}
                onClick={() => onPatch({ presentation: { ...presentation, chrome } })}
              >
                {chromeLabels[chrome]}
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-base-content/70">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={presentation.controls ?? false}
            onChange={(e) => onPatch({ presentation: { ...presentation, controls: e.target.checked } })}
          />
          Show preview/editor controls when this embed supports them
        </label>
      </CollapsibleFormSection>

      <CollapsibleFormSection title="Advanced" defaultOpen={false}>
        <FieldLabel>Block ID</FieldLabel>
        <input readOnly className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-200/40 font-mono text-xs", controlH)} value={block.id} />
        <div className="mt-3">
          <FieldLabel>Stored type</FieldLabel>
          <p className="mt-1 rounded-lg border border-base-content/10 bg-base-200/30 px-3 py-2 font-mono text-xs text-base-content/75">embed</p>
        </div>
        <div className="mt-3">
          <FieldLabel>Compatibility aliases</FieldLabel>
          <p className="mt-1 break-all font-mono text-[10px] leading-relaxed text-base-content/50">
            label={block.label || "—"} · widthPreset={block.widthPreset ?? "—"} · layoutAlign={block.layoutAlign ?? "—"}
          </p>
        </div>
      </CollapsibleFormSection>
    </div>
  );
}
