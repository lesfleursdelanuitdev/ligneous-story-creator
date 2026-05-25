"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import type {
  StoryBlockDateAnnotation,
  StoryBlockDesign,
  StoryBlockPlaceAnnotation,
  StoryBlockRowAlignment,
  StoryBlockRowLayout,
  StoryBlockWidthMode,
  StoryBlockWidthUnit,
  StoryDocumentKind,
} from "../../types";
import { newStoryId } from "../../types";
import { effectiveRowLayout } from "../../utils/story-block-layout";
import { cn } from "../../cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CollapsibleFormSection } from "../ui/collapsible-form-section";

// ─── Shared primitives ────────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">{children}</p>;
}

export function HelperCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-base-content/10 bg-base-100/70 p-4 shadow-sm ring-1 ring-base-content/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/45">{title}</p>
      <div className="mt-2.5 text-sm leading-relaxed text-base-content/70">{children}</div>
    </div>
  );
}

export const STORY_KIND_OPTIONS: { value: StoryDocumentKind; label: string; hint: string }[] = [
  { value: "story", label: "Story", hint: "Narrative, chapter-led family story." },
  { value: "article", label: "Article", hint: "Long-form article layout and tone." },
  { value: "post", label: "Post", hint: "Shorter update or blog-style post." },
  { value: "folklore", label: "Folklore", hint: "Legends, sayings, oral history, and family lore." },
];

export function tagsToCommaInput(tags: string[] | undefined): string {
  return (tags ?? []).join(", ");
}

export function parseCommaTags(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── BlockDateAnnotationInspector ─────────────────────────────────────────────

export function BlockDateAnnotationInspector({
  title = "Date & Place Annotation",
  defaultOpen = false,
  dateAnnotations,
  legacyDateAnnotation,
  placeAnnotations,
  onCommit,
  touchComfort,
}: {
  title?: string;
  defaultOpen?: boolean;
  dateAnnotations?: StoryBlockDateAnnotation[];
  legacyDateAnnotation?: StoryBlockDateAnnotation;
  placeAnnotations?: StoryBlockPlaceAnnotation[];
  onCommit: (next: { dateAnnotations?: StoryBlockDateAnnotation[]; placeAnnotations?: StoryBlockPlaceAnnotation[] }) => void;
  touchComfort?: boolean;
}) {
  const controlH = touchComfort ? "h-11 min-h-[44px]" : "h-10";
  type DateDraft = { id: string; date: string; dateDisplay: string; endDate: string };
  type PlaceDraft = { id: string; label: string; placeId: string };

  const initialAnnotationState = useMemo((): { sourceKey: string; dates: DateDraft[]; places: PlaceDraft[] } => {
    const incomingDates =
      dateAnnotations && dateAnnotations.length > 0
        ? dateAnnotations
        : legacyDateAnnotation
          ? [legacyDateAnnotation]
          : [];
    return {
      sourceKey: JSON.stringify({ dates: incomingDates, places: placeAnnotations ?? [] }),
      dates: incomingDates.map((a) => ({
        id: newStoryId(),
        date: a.date ?? "",
        dateDisplay: a.dateDisplay ?? "",
        endDate: a.endDate ?? "",
      })),
      places: (placeAnnotations ?? []).map((p) => ({
        id: newStoryId(),
        label: p.label ?? "",
        placeId: p.placeId ?? "",
      })),
    };
  }, [dateAnnotations, legacyDateAnnotation, placeAnnotations]);

  const [annotationState, setAnnotationState] = useState(() => initialAnnotationState);
  const activeAnnotationState =
    annotationState.sourceKey === initialAnnotationState.sourceKey ? annotationState : initialAnnotationState;
  const dates = activeAnnotationState.dates;
  const places = activeAnnotationState.places;

  const setDates = useCallback(
    (next: DateDraft[] | ((cur: DateDraft[]) => DateDraft[])) => {
      setAnnotationState((prev) => {
        const base = prev.sourceKey === initialAnnotationState.sourceKey ? prev : initialAnnotationState;
        const datesNext = typeof next === "function" ? next(base.dates) : next;
        return { ...base, dates: datesNext };
      });
    },
    [initialAnnotationState],
  );

  const setPlaces = useCallback(
    (next: PlaceDraft[] | ((cur: PlaceDraft[]) => PlaceDraft[])) => {
      setAnnotationState((prev) => {
        const base = prev.sourceKey === initialAnnotationState.sourceKey ? prev : initialAnnotationState;
        const placesNext = typeof next === "function" ? next(base.places) : next;
        return { ...base, places: placesNext };
      });
    },
    [initialAnnotationState],
  );

  const flush = useCallback(() => {
    const nextDates = dates
      .map((a) => ({
        date: a.date.trim(),
        dateDisplay: a.dateDisplay.trim(),
        ...(a.endDate.trim() ? { endDate: a.endDate.trim() } : {}),
      }))
      .filter((a) => a.date.length > 0 && a.dateDisplay.length > 0);
    const nextPlaces = places
      .map((p) => ({
        label: p.label.trim(),
        ...(p.placeId.trim() ? { placeId: p.placeId.trim() } : {}),
      }))
      .filter((p) => p.label.length > 0);
    onCommit({
      dateAnnotations: nextDates.length > 0 ? nextDates : undefined,
      placeAnnotations: nextPlaces.length > 0 ? nextPlaces : undefined,
    });
  }, [dates, places, onCommit]);

  const patchDate = (id: string, patch: Partial<{ date: string; dateDisplay: string; endDate: string }>) =>
    setDates((cur) => cur.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const patchPlace = (id: string, patch: Partial<{ label: string; placeId: string }>) =>
    setPlaces((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <CollapsibleFormSection title={title} defaultOpen={defaultOpen}>
      <p className="mb-3 text-xs leading-relaxed text-base-content/55">
        Add one or more timeline markers. Use ISO 8601 dates (for example <span className="font-mono">1887-03-14</span>)
        and a human-readable label.
      </p>
      <div className="space-y-4">
        {dates.map((a, idx) => (
          <div key={a.id} className="space-y-3 rounded-lg border border-base-content/10 bg-base-100/60 p-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Date annotation {idx + 1}</FieldLabel>
              <button
                type="button"
                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                onClick={() => {
                  setDates((cur) => cur.filter((x) => x.id !== a.id));
                  queueMicrotask(flush);
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
            <input
              className={cn(
                "input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100 font-mono text-xs",
                controlH,
              )}
              placeholder="1887-03-14"
              value={a.date}
              onChange={(e) => patchDate(a.id, { date: e.target.value })}
              onBlur={flush}
              spellCheck={false}
            />
            <input
              className={cn(
                "input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100 text-sm",
                controlH,
              )}
              placeholder="March 1887"
              value={a.dateDisplay}
              onChange={(e) => patchDate(a.id, { dateDisplay: e.target.value })}
              onBlur={flush}
            />
            <input
              className={cn(
                "input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100 font-mono text-xs",
                controlH,
              )}
              placeholder="1920-12-31 (optional end date)"
              value={a.endDate}
              onChange={(e) => patchDate(a.id, { endDate: e.target.value })}
              onBlur={flush}
              spellCheck={false}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("w-full gap-2 font-medium", touchComfort ? "min-h-11 h-11" : "h-9")}
          onClick={() => setDates((cur) => [...cur, { id: newStoryId(), date: "", dateDisplay: "", endDate: "" }])}
        >
          <Plus className="size-3.5" aria-hidden />
          Add date annotation
        </Button>
      </div>

      <div className="mt-5 border-t border-base-content/10 pt-4">
        <p className="mb-3 text-xs leading-relaxed text-base-content/55">Add one or more place annotations.</p>
        <div className="space-y-3">
          {places.map((p, idx) => (
            <div key={p.id} className="space-y-2 rounded-lg border border-base-content/10 bg-base-100/60 p-3">
              <div className="flex items-center justify-between">
                <FieldLabel>Place annotation {idx + 1}</FieldLabel>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                  onClick={() => {
                    setPlaces((cur) => cur.filter((x) => x.id !== p.id));
                    queueMicrotask(flush);
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
              <input
                className={cn(
                  "input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100 text-sm",
                  controlH,
                )}
                placeholder="Place label"
                value={p.label}
                onChange={(e) => patchPlace(p.id, { label: e.target.value })}
                onBlur={flush}
              />
              <input
                className={cn(
                  "input input-bordered input-sm w-full rounded-lg border-base-content/12 bg-base-100 font-mono text-xs",
                  controlH,
                )}
                placeholder="place id (optional)"
                value={p.placeId}
                onChange={(e) => patchPlace(p.id, { placeId: e.target.value })}
                onBlur={flush}
                spellCheck={false}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("w-full gap-2 font-medium", touchComfort ? "min-h-11 h-11" : "h-9")}
            onClick={() => setPlaces((cur) => [...cur, { id: newStoryId(), label: "", placeId: "" }])}
          >
            <Plus className="size-3.5" aria-hidden />
            Add place annotation
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("w-full gap-2 font-medium", touchComfort ? "min-h-11 h-11" : "h-9")}
          onClick={() => {
            setDates([]);
            setPlaces([]);
            onCommit({});
          }}
        >
          Clear annotations
        </Button>
      </div>
    </CollapsibleFormSection>
  );
}

// ─── StoryBlockRowLayoutInspector ─────────────────────────────────────────────

const ROW_WIDTH_MODE_OPTIONS: { value: StoryBlockWidthMode; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "wide", label: "Wide" },
  { value: "medium", label: "Medium" },
  { value: "narrow", label: "Narrow" },
  { value: "custom", label: "Custom" },
];

const ROW_ALIGN_OPTIONS: { value: StoryBlockRowAlignment; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

export function StoryBlockRowLayoutInspector({
  rowLayout,
  onPatch,
  touchComfort,
}: {
  rowLayout: StoryBlockRowLayout | undefined;
  onPatch: (patch: Partial<StoryBlockRowLayout>) => void;
  touchComfort?: boolean;
}) {
  const rl = effectiveRowLayout(rowLayout);
  const controlH = touchComfort ? "min-h-11 h-11" : "h-10";
  const chip = touchComfort ? "min-h-11 px-3 text-sm" : "h-9 px-2.5 text-xs";
  const chipBtn = (active: boolean) =>
    cn(
      "rounded-lg border text-center font-semibold uppercase tracking-wide transition-colors",
      chip,
      active
        ? "border-primary/45 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/15"
        : "border-base-content/10 bg-base-100/60 text-base-content/55 hover:border-base-content/18",
    );

  return (
    <div className="space-y-4">
      <CollapsibleFormSection title="Block width" defaultOpen>
        <p className="mb-3 text-xs leading-relaxed text-base-content/55">
          Controls how wide this block sits in the story column. Media and embed blocks use the Size & alignment section
          instead.
        </p>
        <FieldLabel>Width preset</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROW_WIDTH_MODE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={chipBtn(rl.widthMode === value)}
              onClick={() => onPatch({ widthMode: value })}
            >
              {label}
            </button>
          ))}
        </div>
        {rl.widthMode === "custom" ? (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <FieldLabel>Value</FieldLabel>
              <Input
                type="number"
                min={1}
                max={9999}
                step={1}
                className={cn("input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100", controlH)}
                value={rl.widthValue ?? 100}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onPatch({ widthValue: Number.isFinite(n) ? n : undefined });
                }}
              />
            </div>
            <div className="w-28">
              <FieldLabel>Unit</FieldLabel>
              <select
                className={cn(
                  "select select-bordered select-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100",
                  controlH,
                )}
                value={rl.widthUnit ?? "%"}
                onChange={(e) => onPatch({ widthUnit: e.target.value as StoryBlockWidthUnit })}
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>
        ) : null}
        <div className="mt-4">
          <FieldLabel>Alignment in column</FieldLabel>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROW_ALIGN_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                title={label}
                onClick={() => onPatch({ alignment: value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  touchComfort ? "min-h-[44px] py-2" : "py-2.5",
                  rl.alignment === value
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
    </div>
  );
}

// ─── StoryBlockDesignInspector ────────────────────────────────────────────────

export function StoryBlockDesignInspector({
  blockId,
  design,
  onPatchDesign,
  touchComfort,
}: {
  blockId: string;
  design: StoryBlockDesign | undefined;
  onPatchDesign: (patch: Partial<StoryBlockDesign> | null) => void;
  touchComfort?: boolean;
}) {
  const controlH = touchComfort ? "h-11 min-h-[44px]" : "h-10";
  const taMin = touchComfort ? "min-h-[120px]" : "min-h-[100px]";

  return (
    <CollapsibleFormSection title="Advanced design" defaultOpen={false}>
      <p className="text-xs leading-relaxed text-base-content/55">
        Custom classes merge onto the block&apos;s row wrapper. CSS is wrapped in{" "}
        <code className="rounded bg-base-200/80 px-1 font-mono text-[10px]">@scope</code> for{" "}
        <code className="rounded bg-base-200/80 px-1 font-mono text-[10px]">data-story-block-scope</code> so rules
        cannot leak to other blocks or the editor chrome (requires a modern browser).
      </p>
      <div>
        <FieldLabel>Scope attribute</FieldLabel>
        <p className="break-all font-mono text-[10px] leading-relaxed text-base-content/55">
          data-story-block-scope=&quot;{blockId}&quot;
        </p>
      </div>
      <div>
        <FieldLabel>Custom class names</FieldLabel>
        <p className="mb-2 text-xs text-base-content/55">
          Space-separated utility classes; unsafe characters are stripped on save.
        </p>
        <Input
          className={cn(
            "input input-bordered input-sm mt-1 w-full rounded-lg border-base-content/12 bg-base-100 font-mono text-sm",
            controlH,
          )}
          value={design?.className ?? ""}
          placeholder="e.g. opacity-95 rounded-2xl"
          onChange={(e) => onPatchDesign({ className: e.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Scoped CSS</FieldLabel>
        <p className="mb-2 text-xs text-base-content/55">
          Target inner markup with descendant selectors, or the wrapper with{" "}
          <code className="font-mono text-[10px]">:scope</code>.
        </p>
        <textarea
          className={cn(
            "textarea textarea-bordered textarea-sm mt-1 w-full resize-y rounded-lg border-base-content/12 bg-base-100 font-mono text-xs leading-relaxed text-base-content placeholder:text-base-content/45",
            taMin,
          )}
          value={design?.css ?? ""}
          placeholder={":scope { box-shadow: inset 0 0 0 1px oklch(0.5 0.02 250 / 0.25); }"}
          spellCheck={false}
          onChange={(e) => onPatchDesign({ css: e.target.value })}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("mt-1 gap-2 font-medium", touchComfort ? "min-h-11 h-11" : "h-9")}
        onClick={() => onPatchDesign(null)}
      >
        <RotateCcw className="size-3.5 opacity-80" aria-hidden />
        Reset custom design
      </Button>
    </CollapsibleFormSection>
  );
}
