/**
 * The Control Deck's **Live preview** — one definition, shared
 * ===========================================================
 *
 * The Control Deck's SPREAD pane shows one artwork (`artworkSource`) inside a
 * square frame, with a colour treatment, a stretch and a pan. Everything else in
 * the app that claims to show "the main image" must render exactly that.
 *
 * This module is the single source of truth for those values:
 *
 *   • the storage keys the Control Deck writes
 *   • the colour-treatment → CSS `filter` map
 *   • normalisation of the persisted spread settings
 *
 * The LED studio's L1 layer imports it, so the Perimeter choreographer's live
 * image can never drift away from the Live preview, and the Control Deck itself
 * imports the filter map instead of keeping its own copy.
 */

import campaign from "../assets/adshop-campaign.jpg?inline";

/** Artwork currently being previewed / carved in the Control Deck. */
export const LIVE_PREVIEW_ARTWORK_KEY = "seqcarver_control_deck_artwork_source";
/** Colour treatment, stretch and pan of the Live preview. */
export const LIVE_PREVIEW_SPREAD_KEY = "seqcarver_control_deck_spread_settings";

/** The artwork the Live preview falls back to. */
export const LIVE_PREVIEW_DEFAULT_ARTWORK = campaign;

export type LivePreviewTreatment =
  | "None"
  | "Grayscale"
  | "Sepia"
  | "Invert"
  | "Contrast"
  | "Saturate"
  | "Cool"
  | "Warm";

/**
 * Colour treatment → CSS filter. Kept byte-identical to the strings the Control
 * Deck has always rendered, so a carved panel and its Live preview match.
 */
export function livePreviewFilter(treatment?: string | null): string {
  switch (treatment) {
    case "Grayscale":
      return "grayscale(100%)";
    case "Sepia":
      return "sepia(100%)";
    case "Invert":
      return "invert(100%)";
    case "Contrast":
      return "contrast(180%)";
    case "Saturate":
      return "saturate(200%)";
    case "Cool":
      return "hue-rotate(180deg) saturate(120%)";
    case "Warm":
      return "sepia(40%) saturate(160%) hue-rotate(-20deg)";
    default:
      return "none";
  }
}

/**
 * Is this colour treatment the identity (no filter)?
 * Lets a caller skip a `filter` layer entirely instead of painting `none`.
 */
export function isNeutralTreatment(treatment?: string | null): boolean {
  return livePreviewFilter(treatment) === "none";
}

/** Everything needed to paint one Live-preview crop. */
export interface LivePreviewTransform {
  /** Artwork the preview shows. */
  artwork: string;
  /** Colour treatment name (`"None"` by default). */
  treatment: string;
  /** CSS filter for `treatment` (`"none"` when untreated). */
  filter: string;
  /** Horizontal / vertical scale applied about the frame centre. */
  stretchX: number;
  stretchY: number;
  /** Pan as a fraction of the frame (-0.75 … 0.75, as the drag handler clamps). */
  panX: number;
  panY: number;
}

export const DEFAULT_LIVE_PREVIEW_TRANSFORM: LivePreviewTransform = {
  artwork: LIVE_PREVIEW_DEFAULT_ARTWORK,
  treatment: "None",
  filter: "none",
  stretchX: 1,
  stretchY: 1,
  panX: 0,
  panY: 0,
};

const clampPan = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(-0.75, Math.min(0.75, value)) : 0;

const clampStretch = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.max(0.05, Math.min(8, value)) : 1;

export interface LivePreviewInput {
  artwork?: string | null;
  colourTreatment?: string | null;
  stretchX?: number;
  stretchY?: number;
  panX?: number;
  panY?: number;
}

/** Normalise loose persisted settings into a renderable transform. */
export function normalizeLivePreviewTransform(input: LivePreviewInput = {}): LivePreviewTransform {
  const artwork = typeof input.artwork === "string" && input.artwork.length > 0
    ? input.artwork
    : LIVE_PREVIEW_DEFAULT_ARTWORK;
  const treatment = typeof input.colourTreatment === "string" && input.colourTreatment.length > 0
    ? input.colourTreatment
    : "None";
  return {
    artwork,
    treatment,
    filter: livePreviewFilter(treatment),
    stretchX: clampStretch(input.stretchX),
    stretchY: clampStretch(input.stretchY),
    panX: clampPan(input.panX),
    panY: clampPan(input.panY),
  };
}

/**
 * Build the transform from the two raw store values the Control Deck persists.
 * Malformed JSON is ignored rather than thrown — a corrupt cache must never take
 * the wall down.
 */
export function livePreviewTransformFrom(
  rawArtwork: string | null | undefined,
  rawSpread: string | null | undefined,
): LivePreviewTransform {
  let settings: Record<string, unknown> = {};
  if (rawSpread) {
    try {
      const parsed = JSON.parse(rawSpread);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        settings = parsed as Record<string, unknown>;
      }
    } catch {
      settings = {};
    }
  }
  return normalizeLivePreviewTransform({
    artwork: rawArtwork && rawArtwork.length > 0 ? rawArtwork : null,
    colourTreatment: typeof settings.colourTreatment === "string" ? settings.colourTreatment : null,
    stretchX: typeof settings.stretchX === "number" ? settings.stretchX : undefined,
    stretchY: typeof settings.stretchY === "number" ? settings.stretchY : undefined,
    panX: typeof settings.panX === "number" ? settings.panX : undefined,
    panY: typeof settings.panY === "number" ? settings.panY : undefined,
  });
}
