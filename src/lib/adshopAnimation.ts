import type { SequencerPanelState } from "../components/SequencerPanel";
import type { LedStudioProgram } from "../components/ledStudio/integration";
import { frontPanelRegionAnchor, type FrontPanelGridRegion } from "../types/frontPanelGrid";

export const activeRegionSlots = (regions: FrontPanelGridRegion[]): number[] =>
  regions.filter((region) => region.active).map((region) => frontPanelRegionAnchor(region, 4)).sort((a, b) => a - b);

/** One beat of the same route state used by the Sequencer and AdShop. */
export function advanceAdShopSequence(state: SequencerPanelState): SequencerPanelState {
  const path = state.path.filter((slot) => slot >= 1 && slot <= 16 && state.activeSlots.includes(slot));
  if (!path.length) return { ...state, playing: false, currentStep: 1 };
  const current = Math.max(1, Math.min(path.length, state.currentStep));
  let next = current;
  let direction = state.direction;
  let playing = state.playing;
  if (state.wrapMode === "once") {
    if (current >= path.length) { playing = false; direction = 1; }
    else { next = current + 1; direction = 1; }
  } else if (state.wrapMode === "pingpong") {
    if (path.length === 1) { next = 1; direction = 1; }
    else {
      next = current + direction;
      if (next > path.length) { direction = -1; next = path.length - 1; }
      else if (next < 1) { direction = 1; next = 2; }
    }
  } else { next = current >= path.length ? 1 : current + 1; direction = 1; }
  const behavior = state.routeBehavior ?? (state.turnMode === "step" ? "flash" : state.turnMode);
  const targets = behavior === "spin" ? new Set(path)
    : behavior === "step" || behavior === "flash" ? new Set([path[next - 1]]) : new Set<number>();
  let flipFrameIndices = state.flipFrameIndices;
  for (const slot of targets) {
    const frames = state.flipFrames?.[slot];
    if (!frames || frames.length < 2) continue;
    flipFrameIndices = { ...flipFrameIndices, [slot]: ((flipFrameIndices?.[slot] ?? 0) + 1) % frames.length };
  }
  return { ...state, currentStep: next, direction, playing, manualStep: state.wrapMode === "once" && !playing ? true : state.manualStep, flipFrameIndices };
}

/** A submit replaces route parameters atomically; choreography parks its clock. */
export function sequenceFromProgram(
  previous: SequencerPanelState,
  program: LedStudioProgram,
  regions: FrontPanelGridRegion[],
  secondary: Record<number, string>,
  series: Record<number, string[]> = {},
): SequencerPanelState {
  const secondaryImages = { ...previous.secondaryImages };
  const flipFrames = { ...previous.flipFrames };
  for (const slot of program.panelsBySlot) {
    delete secondaryImages[slot];
    delete flipFrames[slot];
    const frames = series[slot];
    if (frames?.length) secondaryImages[slot] = frames[0];
    if (frames && frames.length > 1) flipFrames[slot] = [...frames];
  }
  Object.assign(secondaryImages, secondary);
  return {
    ...previous,
    path: program.route.path.filter((slot) => Number.isInteger(slot) && slot >= 1 && slot <= 16),
    activeSlots: activeRegionSlots(regions),
    wrapMode: program.route.wrapMode,
    turnMode: program.route.turnMode,
    routeBehavior: program.route.behavior ?? (program.route.turnMode === "step" ? "flash" : program.route.turnMode),
    stepIntervalMs: program.route.stepIntervalMs,
    currentStep: 1,
    direction: 1,
    manualStep: false,
    secondaryImages, flipFrames, flipFrameIndices: {},
    playing: program.mode === "route" && program.route.playing,
    bypassed: program.mode === "show" || program.route.bypassed,
    locked: program.route.locked,
  };
}

/** Only navigable web/relative URLs may be attached to a live panel. */
export function safePanelLink(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, typeof window === "undefined" ? "https://example.com/" : window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined;
  } catch { return undefined; }
}
