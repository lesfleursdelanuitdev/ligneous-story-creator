type PlaceLabelInput = {
  id?: string;
  original?: string | null;
  name?: string | null;
  county?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** Produces a compact display label for a place (e.g. "Boston, Suffolk, Massachusetts, USA"). */
export function formatPlaceSuggestionLabel(place: PlaceLabelInput): string {
  const parts: string[] = [];
  if (place.name?.trim()) parts.push(place.name.trim());
  if (place.county?.trim()) parts.push(place.county.trim());
  if (place.state?.trim()) parts.push(place.state.trim());
  if (place.country?.trim()) parts.push(place.country.trim());
  if (parts.length > 0) return parts.join(", ");
  return place.original?.trim() || place.id || "Unknown place";
}
