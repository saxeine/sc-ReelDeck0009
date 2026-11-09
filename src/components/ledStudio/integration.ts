/**
 * LED Studio ⇄ SeqCarver integration
 * ==================================
 *
 * The LED Studio (ported from the `led-studioCombined` bundle) keeps its own
 * preview wall. Nothing it draws touches SeqCarver until a **submit** happens:
 *
 *   LedStudioApp → SequencerModal (`onSubmitToFrontPage`)
 *                → LedStudioModal.submit('all', { closeAfter })
 *                → application `onSubmitToFrontPage(program)`
 *
 * This module owns that contract: the serialisable `LedStudioProgram` snapshot,
 * the resolver that builds it from the live engine, and artwork baking (poster
 * slices / tints → ordinary image URLs SeqCarver can consume).
 */

import type {
  AdvertAsset,
  AdvertPanel,
  ChoreoCue,
  ControllerMode,
  MappingMode,
  SeqBehavior,
  SeqMode,
  SpreadSlice,
} from "./types";
import type { AdvertEngine } from "./engine/useAdvertEngine";
import type { SequencerTurnMode, SequencerWrapMode } from "../../utils/sequencerPresets";
type TileLinkConfig = { url: string; target: string; hoverEffect: "none" | "spin" | "change-image"; hoverImage?: string };
import type { FrontPanelGridRegion } from "../../types/frontPanelGrid";

export const LED_STUDIO_PROGRAM_SCHEMA = "seqcarver.led-studio/v1";
/** app_states / IndexedDB key — persisted with SeqCarver's storage helpers. */
export const LED_STUDIO_PROGRAM_KEY = "ledStudioProgram";

/**
 * Route configuration shared with SeqCarver's sequencer. The studio never keeps
 * a second copy: it seeds from this, edits it and reports every change back.
 */
export interface LedStudioRouteConfig {
  path: number[];
  activeSlots: number[];
  wrapMode: SequencerWrapMode;
  turnMode: SequencerTurnMode;
  /** Preserve flash / reveal as well as the Sequencer's step, spin and pulse. */
  behavior?: SeqBehavior;
  stepIntervalMs: number;
  playing: boolean;
  bypassed: boolean;
  locked: boolean;
  /**
   * The front page's panel grid configurator output. It is carried rather than
   * edited here: the studio previews on the same geometry the front page uses
   * and SC2F transmits it back unchanged.
   */
  layout?: FrontPanelGridRegion[];
}

/** LED behaviour → the front page's turn mode (flash/reveal have no board twin). */
export function turnModeFromBehavior(behavior: SeqBehavior): SequencerTurnMode {
  if (behavior === "spin") return "spin";
  if (behavior === "pulse") return "pulse";
  return "step";
}

/** The front page's turn mode → the studio's behaviour vocabulary. */
export function behaviorFromTurnMode(mode: SequencerTurnMode): SeqBehavior {
  if (mode === "spin") return "spin";
  if (mode === "pulse") return "pulse";
  return "flash";
}

/** Both sides use loop / ping-pong / once. */
export function wrapModeFromSeqMode(mode: SeqMode): SequencerWrapMode {
  return mode;
}

export const DEFAULT_LED_STUDIO_ROUTE: LedStudioRouteConfig = {
  path: [1, 2, 3, 4, 8, 12, 16, 9],
  activeSlots: Array.from({ length: 16 }, (_, index) => index + 1),
  wrapMode: "loop",
  turnMode: "step",
  stepIntervalMs: 900,
  playing: false,
  bypassed: false,
  locked: false,
};

export interface LedStudioWall {
  size: number;
  gap: number;
  mode: MappingMode;
  outlines: boolean;
  /**
   * The front page's panel grid configurator output (merged spans + disabled
   * panels). The studio draws its preview on the same geometry the front page
   * uses, so a formation lands on the real panels.
   */
  layout?: FrontPanelGridRegion[];
}

/** Link config as the studio authored it (includes the zoom hover effect). */
export interface LedStudioLinkProgram {
  url: string;
  target: "_blank" | "_self";
  hoverEffect: "none" | "change-image" | "zoom";
  hoverImage?: string;
}

export interface LedStudioPanelProgram {
  slot: number;
  /** Artwork as SeqCarver can render it (spread slices and tints baked in). */
  artwork: string;
  /** Untouched source artwork / slice, kept for re-editing. */
  source: string;
  spread: SpreadSlice | null;
  /** Frame set the panel flips through (cast frames). */
  rotation: string[];
  /** Original unbaked frames for lossless re-editing. */
  sourceRotation?: string[];
  rotationInterval: number;
  rotating: boolean;
  link: LedStudioLinkProgram;
  style: AdvertPanel["style"];
  parallax: boolean;
  tilt: number;
}

export interface LedStudioShowProgram {
  cues: ChoreoCue[];
  bpm: number;
  timeScale: number;
  loop: boolean;
}

export interface LedStudioProgram {
  schema: typeof LED_STUDIO_PROGRAM_SCHEMA;
  submittedAt: string;
  /** Show mode transmits and starts the choreography; route mode sends none. */
  mode: ControllerMode;
  wall: LedStudioWall;
  panels: Record<number, LedStudioPanelProgram>;
  panelsBySlot: number[];
  route: LedStudioRouteConfig;
  /** `null` in route mode — the drawn path owns the wall. */
  show: LedStudioShowProgram | null;
  /** Cast anchors per scene, flattened for the front-page panel matrix. */
  castSlots: number[];
  /** Per-panel frame sets used by the show cast (cast frames). */
  castFrames: Record<number, string[]>;
  pool: Array<Pick<AdvertAsset, "id" | "name" | "url" | "source">>;
}

/** Which part of the studio a submit covers. `all` is the SC2F contract. */
export type LedStudioSubmitScope = "all" | "panels" | "show" | "route";

export interface LedStudioSubmitOptions {
  /** Close the wall modal once the program is accepted by the front page. */
  closeAfter?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                              artwork baking                                */
/* -------------------------------------------------------------------------- */

/**
 * Draw one spread slice (and tint / opacity) into a square PNG so the existing
 * board, sequencer and storyboard — which all speak plain image URLs — receive
 * exactly the composited artwork the studio auditioned.
 */
export async function bakePanelArtwork(
  panel: AdvertPanel,
  artwork: string,
  size = 512,
): Promise<string> {
  const slice = panel.spread;
  const tintAmount = panel.style?.tintAmount ?? 0;
  const tint = panel.style?.tint;
  const opacity = panel.style?.opacity ?? 1;
  if (!slice && tintAmount <= 0 && opacity >= 1) return artwork;
  if (!artwork) return "";

  const image = new Image();
  image.crossOrigin = "anonymous";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load LED studio artwork for export."));
      image.src = artwork;
    });
  } catch {
    // Many external hosts allow display in <img> but disallow canvas/CORS.
    // Preserve the URL rather than rejecting an otherwise usable program.
    console.warn("LED studio artwork could not be baked; sending the original URL.");
    return artwork;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable.");

  if (slice) {
    // Mirrors `spreadBackground()` — the same background-size / -position maths.
    const width = canvas.width * slice.cols * slice.stretchX;
    const height = canvas.height * slice.rows * slice.stretchY;
    const x = slice.cols > 1 ? slice.col / (slice.cols - 1) : 0.5;
    const y = slice.rows > 1 ? slice.row / (slice.rows - 1) : 0.5;
    ctx.filter = slice.filter && slice.filter !== "none" ? slice.filter : "none";
    ctx.drawImage(image, (canvas.width - width) * x, (canvas.height - height) * y, width, height);
    ctx.filter = "none";
  } else {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  if (tint && tintAmount > 0) {
    ctx.globalAlpha = Math.min(1, Math.max(0, tintAmount));
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  // JPEG keeps a 16-panel submission in the hundreds of KB instead of megabytes,
  // so the front page (and its own persistence) stays responsive.
  try {
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    // A cross-origin artwork without CORS headers taints the canvas. Transmit
    // the untouched artwork rather than failing the whole submission.
    console.warn("LED studio artwork could not be baked (cross-origin image); sending the original URL.");
    return artwork;
  }
}

function panelArtworkFor(panel: AdvertPanel, slot: number, frames: Record<number, number>): string {
  if (panel.rotation.length > 0) {
    const index = ((frames[slot] ?? (slot - 1) % panel.rotation.length) % panel.rotation.length + panel.rotation.length) % panel.rotation.length;
    return panel.rotation[index] ?? panel.rotation[0] ?? "";
  }
  return panel.spread?.url || panel.image;
}

/** Resolve one panel into the front-page program shape (baking when required). */
export async function toPanelProgram(
  panel: AdvertPanel,
  slot: number,
  frames: Record<number, number>,
): Promise<LedStudioPanelProgram> {
  const source = panelArtworkFor(panel, slot, frames);
  // Frames override a spread in the studio; do not slice each frame again.
  const framePanel = panel.rotation.length ? { ...panel, spread: null } : panel;
  const artwork = await bakePanelArtwork(framePanel, source);
  const rotation = panel.rotation.length
    ? await Promise.all(panel.rotation.map((url) => bakePanelArtwork(framePanel, url)))
    : artwork
      ? [artwork]
      : [];

  return {
    slot,
    artwork,
    source,
    spread: panel.spread,
    rotation,
    sourceRotation: [...panel.rotation],
    rotationInterval: panel.rotationInterval,
    rotating: Boolean(panel.rotating) && rotation.length > 1,
    link: {
      url: panel.link.url ?? "",
      target: panel.link.target === "_self" ? "_self" : "_blank",
      hoverEffect: panel.link.hoverEffect,
      hoverImage: panel.link.hoverImage,
    },
    style: { ...panel.style },
    parallax: Boolean(panel.parallax),
    tilt: panel.tilt,
  };
}

/* -------------------------------------------------------------------------- */
/*                              program building                              */
/* -------------------------------------------------------------------------- */

export interface BuildLedStudioProgramArgs {
  engine: AdvertEngine;
  wall: LedStudioWall;
  route: LedStudioRouteConfig;
  /** Restrict the export to the visible grid of the front page (9 or 16). */
  panelCount?: number;
}

/** Assemble the complete studio program that SC2F / Submit transmit. */
export async function buildLedStudioProgram({
  engine,
  wall,
  route,
  panelCount = 16,
}: BuildLedStudioProgramArgs): Promise<LedStudioProgram> {
  const total = Math.min(panelCount, engine.panelCount);
  const panels: Record<number, LedStudioPanelProgram> = {};
  const entries = await Promise.all(
    Array.from({ length: total }, (_, index) => index + 1).map(async (slot) => {
      const panel = engine.panels[slot];
      if (!panel) return null;
      return [slot, await toPanelProgram(panel, slot, engine.frames)] as const;
    }),
  );
  for (const entry of entries) {
    if (entry) panels[entry[0]] = entry[1];
  }
  if (Object.keys(panels).length === 0) {
    throw new Error("The LED studio has no panels with artwork to submit yet.");
  }

  const show: LedStudioShowProgram | null =
    engine.controllerMode === "show"
      ? {
          cues: engine.choreography.cues,
          bpm: engine.choreography.bpm,
          timeScale: engine.choreography.timeScale,
          loop: engine.choreography.loop,
        }
      : null;

  const castSlots = Array.from(
    new Set((show?.cues ?? []).flatMap((cue) => cue.castSlots.filter((slot) => slot >= 1 && slot <= total))),
  ).sort((a, b) => a - b);

  const castFrames: Record<number, string[]> = {};
  for (const [key, panel] of Object.entries(panels)) {
    if (panel.rotation.length > 1) castFrames[Number(key)] = panel.rotation;
  }

  return {
    schema: LED_STUDIO_PROGRAM_SCHEMA,
    submittedAt: new Date().toISOString(),
    mode: engine.controllerMode,
    wall: { ...wall },
    panels,
    panelsBySlot: Object.keys(panels)
      .map(Number)
      .sort((a, b) => a - b),
    route: {
      ...route,
      path: [...route.path],
      activeSlots: [...route.activeSlots],
      // The route clock only owns the wall when no show is transmitted, and it
      // starts on submit so the submitted path runs immediately.
      playing: engine.controllerMode === "route" ? route.path.length > 0 : false,
      // Explicitly submitting a route re-arms it even after a show parked it.
      bypassed: engine.controllerMode === "show",
    },
    show,
    castSlots,
    castFrames,
    pool: engine.pool.map(({ id, name, url, source }) => ({ id, name, url, source })),
  };
}

/* -------------------------------------------------------------------------- */
/*                          board mapping (apply side)                        */
/* -------------------------------------------------------------------------- */

/** Everything the front page needs to render the submitted panels. */
export interface LedStudioPanelUpdates {
  images: Record<number, string>;
  series: Record<number, string[]>;
  intervals: Record<number, number>;
  rotating: Record<number, boolean>;
  links: Record<number, TileLinkConfig>;
  secondaryImages: Record<number, string>;
}

/**
 * Translate a program into SeqCarver's panel slices. Kept pure (and outside the
 * 18k-line App component) so the mapping is covered by tests.
 */
export function panelUpdatesFromProgram(program: LedStudioProgram, totalSlots = 16): LedStudioPanelUpdates {
  const images: Record<number, string> = {};
  const series: Record<number, string[]> = {};
  const intervals: Record<number, number> = {};
  const rotating: Record<number, boolean> = {};
  const links: Record<number, TileLinkConfig> = {};
  const secondaryImages: Record<number, string> = {};

  for (const slot of program.panelsBySlot) {
    if (slot < 1 || slot > totalSlots) continue;
    const panel = program.panels[slot];
    if (!panel) continue;
    const artwork = panel.artwork || panel.source;
    if (artwork) images[slot] = artwork;
    const frames = panel.rotation.length > 0 ? panel.rotation : artwork ? [artwork] : [];
    if (frames.length > 0) series[slot] = frames;
    intervals[slot] = panel.rotationInterval > 0 ? panel.rotationInterval : 3;
    rotating[slot] = Boolean(panel.rotating) && frames.length > 1;
    if (panel.link?.url) {
      links[slot] = {
        url: panel.link.url,
        target: panel.link.target === "_self" ? "_self" : "_blank",
        hoverEffect:
          panel.link.hoverEffect === "change-image"
            ? "change-image"
            : panel.link.hoverEffect === "zoom"
              ? "spin"
              : "none",
        hoverImage: panel.link.hoverImage,
      };
    }
  }

  // Cast frames double as the sequencer's secondary artwork for route slots.
  for (const slot of program.route.path) {
    if (slot < 1 || slot > totalSlots) continue;
    const frames = series[slot];
    if (frames && frames.length > 0) secondaryImages[slot] = frames[0];
  }

  return { images, series, intervals, rotating, links, secondaryImages };
}

/* -------------------------------------------------------------------------- */
/*                              persistence                                   */
/* -------------------------------------------------------------------------- */

export function serializeLedStudioProgram(program: LedStudioProgram): string {
  return JSON.stringify(program);
}

const isDataUrl = (value: string) => value.startsWith("data:");

/**
 * A persistable copy of the program: baked `data:` URLs are dropped (the board
 * keeps its own copies) so the record stays far below the storage budget and a
 * guest / offline session can still store it locally.
 */
export function toStorableProgram(program: LedStudioProgram): LedStudioProgram {
  const strip = (value: string) => (isDataUrl(value) ? "" : value);
  const panels: Record<number, LedStudioPanelProgram> = {};
  for (const [key, panel] of Object.entries(program.panels)) {
    const spread = panel.spread;
    const spreadUrl = spread ? strip(spread.url) : "";
    panels[Number(key)] = {
      ...panel,
      artwork: strip(panel.artwork),
      source: strip(panel.source) || spreadUrl,
      rotation: panel.rotation.map(strip).filter(Boolean),
      spread: spread ? { ...spread, url: spreadUrl } : null,
    };
  }
  const castFrames: Record<number, string[]> = {};
  for (const [key, frames] of Object.entries(program.castFrames)) {
    const clean = frames.map(strip).filter(Boolean);
    if (clean.length > 0) castFrames[Number(key)] = clean;
  }
  return { ...program, panels, castFrames };
}

export function describeLedStudioProgram(program: LedStudioProgram): string {
  const panels = program.panelsBySlot.length;
  const frames = Object.values(program.castFrames).reduce((sum, list) => sum + list.length, 0);
  if (program.mode === "show" && program.show) {
    const cues = program.show.cues.length;
    return `${panels} panels · ${frames} cast frames · ${cues} scene${cues === 1 ? "" : "s"} · show running`;
  }
  return `${panels} panels · ${frames} frames · ${program.route.path.length}-step route · ${program.route.wrapMode}/${program.route.turnMode}`;
}
