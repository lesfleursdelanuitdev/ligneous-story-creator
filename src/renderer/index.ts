/**
 * Story public renderer entry point.
 * This entry point has NO TipTap dependency — safe to import on public-facing
 * story viewer pages without paying the editor bundle cost.
 *
 * Renderer components are extracted from the-gonsalves-family-admin as part of Track A.
 * See: story-creator-preview.tsx and each embed/*Embed.tsx component.
 *
 * Each embed renderer accepts an async resolver injected by the host app so the
 * package itself has no knowledge of the underlying data source.
 *
 * Example future exports:
 *   export { StoryPublicRenderer } from "./StoryPublicRenderer";
 *   export type { EmbedResolver } from "./types";
 */

export {};
