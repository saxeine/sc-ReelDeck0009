import { describe, expect, it } from "vitest";
import { activeRegionSlots, advanceAdShopSequence, safePanelLink, sequenceFromProgram } from "../src/lib/adshopAnimation";
import { createSequencerPanelState } from "../src/components/SequencerPanel";
import { defaultFrontPanelGridRegions, normalizeFrontPanelGridRegions } from "../src/types/frontPanelGrid";
import { advanceShowClock, LED_SHOW_CLOCK_START, showFrameAt, showTileRect } from "../src/components/ledStudio/frontPageShow";
import { buildChoreoFrame, createChoreoCue } from "../src/components/ledStudio/engine/choreography";
import { parseChoreographyShow } from "../src/components/ledStudio/engine/showFile";
import { createAdvertPanel } from "../src/components/ledStudio/engine/advertPanels";
import { buildLedStudioProgram, panelUpdatesFromProgram, toPanelProgram, type LedStudioRouteConfig } from "../src/components/ledStudio/integration";
import { computeSpreadSlices } from "../src/components/ledStudio/utils/spread";
import type { AdvertEngine } from "../src/components/ledStudio/engine/useAdvertEngine";

const quadrants = [
  { row: 0, col: 0, rowSpan: 2, colSpan: 2, active: true },
  { row: 0, col: 2, rowSpan: 2, colSpan: 2, active: false },
  { row: 2, col: 0, rowSpan: 2, colSpan: 2, active: true },
  { row: 2, col: 2, rowSpan: 2, colSpan: 2, active: true },
];

const route: LedStudioRouteConfig = {
  path: [1, 9, 11], activeSlots: [1, 9, 11], wrapMode: "loop", turnMode: "step", behavior: "reveal",
  stepIntervalMs: 600, playing: true, bypassed: true, locked: false, layout: quadrants,
};
const cues = [
  createChoreoCue(["data:image/png;base64,first"], { name: "Intro", durationBeats: 4 }),
  createChoreoCue(["data:image/png;base64,second"], { name: "Finale", durationBeats: 4 }),
];
function engine(mode: "show" | "route") {
  const panel = createAdvertPanel();
  panel.image = "data:image/png;base64,first";
  panel.rotation = [panel.image, "data:image/png;base64,second"];
  panel.rotationInterval = 1.5;
  return {
    panelCount: 16, controllerMode: mode, panels: { 1: panel }, frames: {},
    pool: [{ id: "one", name: "One", url: panel.image, source: "upload" }],
    choreography: { cues, bpm: 120, timeScale: 1, loop: true },
  } as unknown as AdvertEngine;
}
const wall = { size: 500, gap: 50, mode: "compensated" as never, outlines: true, layout: quadrants };

describe("shared AdShop sequencing", () => {
  it("advances filtered paths for loop, ping-pong and one-shot, holding the final step", () => {
    const base = { ...createSequencerPanelState(), path: [1, 2, 3], activeSlots: [1, 3], playing: true };
    const second = advanceAdShopSequence(base);
    expect(second.currentStep).toBe(2);
    expect(advanceAdShopSequence(second).currentStep).toBe(1);
    const ping = advanceAdShopSequence({ ...second, wrapMode: "pingpong" });
    expect([ping.currentStep, ping.direction]).toEqual([1, -1]);
    const once = advanceAdShopSequence({ ...second, wrapMode: "once" });
    expect([once.currentStep, once.playing, once.manualStep]).toEqual([2, false, true]);
    expect(advanceAdShopSequence({ ...base, activeSlots: [] }).playing).toBe(false);
  });

  it("advances per-panel frames according to the original route behavior", () => {
    const state = { ...createSequencerPanelState(), path: [1, 2], activeSlots: [1, 2], playing: true,
      flipFrames: { 1: ["a", "b"], 2: ["c", "d"] }, flipFrameIndices: { 1: 0, 2: 0 } };
    expect(advanceAdShopSequence({ ...state, routeBehavior: "flash" }).flipFrameIndices).toEqual({ 1: 0, 2: 1 });
    expect(advanceAdShopSequence({ ...state, routeBehavior: "spin" }).flipFrameIndices).toEqual({ 1: 1, 2: 1 });
    expect(advanceAdShopSequence({ ...state, routeBehavior: "reveal" }).flipFrameIndices).toEqual({ 1: 0, 2: 0 });
  });

  it("submits frame artwork without slicing it through a previously configured spread", async () => {
    const panel = createAdvertPanel();
    panel.spread = computeSpreadSlices([1, 2, 3, 4], 4, "poster")[1];
    panel.rotation = ["frame-a", "frame-b"];
    const result = await toPanelProgram(panel, 1, {});
    expect(result.artwork).toBe("frame-a");
    expect(result.rotation).toEqual(["frame-a", "frame-b"]);
    expect(result.sourceRotation).toEqual(["frame-a", "frame-b"]);
  });

  it("shares merged/disabled anchor slots and rejects invalid geometry and unsafe links", () => {
    expect(activeRegionSlots(quadrants)).toEqual([1, 9, 11]);
    expect(normalizeFrontPanelGridRegions(quadrants, 4)).toEqual(quadrants);
    expect(normalizeFrontPanelGridRegions(quadrants.slice(1), 4)).toEqual(defaultFrontPanelGridRegions(4));
    expect(safePanelLink("javascript:alert(1)")).toBeUndefined();
    expect(safePanelLink("https://example.com")).toBe("https://example.com");
  });

  it("maps a full route submission, preserving reveal and re-arming a previously bypassed route", async () => {
    const program = await buildLedStudioProgram({ engine: engine("route"), wall, route });
    expect(program.show).toBeNull();
    expect(program.route.bypassed).toBe(false);
    expect(program.route.playing).toBe(true);
    expect(program.panels[1].sourceRotation).toEqual(["data:image/png;base64,first", "data:image/png;base64,second"]);
    const updates = panelUpdatesFromProgram(program);
    expect(updates.series[1]).toHaveLength(2);
    expect(updates.intervals[1]).toBe(1.5);
    const state = sequenceFromProgram(createSequencerPanelState(), program, quadrants, updates.secondaryImages, updates.series);
    expect(state.activeSlots).toEqual([1, 9, 11]);
    expect(state.flipFrames?.[1]).toEqual(["data:image/png;base64,first", "data:image/png;base64,second"]);
    expect(state.path).toEqual([1, 9, 11]);
    expect(state.routeBehavior).toBe("reveal");
    expect(state.playing).toBe(true);
    expect(state.bypassed).toBe(false);
  });

  it("transmits choreography and parks the route without losing the shared layout", async () => {
    const program = await buildLedStudioProgram({ engine: engine("show"), wall, route });
    expect(program.show?.cues).toEqual(cues);
    expect(program.wall.layout).toEqual(quadrants);
    const state = sequenceFromProgram(createSequencerPanelState(), program, quadrants, {});
    expect(state.playing).toBe(false);
    expect(state.bypassed).toBe(true);
    expect(state.path).toEqual(route.path);
  });
});

describe("choreography playback", () => {
  it("uses the studio's deterministic beat clock and frame resolver", () => {
    let clock = { ...LED_SHOW_CLOCK_START };
    for (let i = 0; i < 20; i++) clock = advanceShowClock(clock, cues, { bpm: 120, timeScale: 1, loop: true, deltaMs: 100 });
    expect([clock.cueIndex, clock.elapsedMs]).toEqual([1, 0]);
    expect(showFrameAt(cues, clock, 120).frame).toEqual(buildChoreoFrame(cues[1], 0, 120, 4));
    for (let i = 0; i < 20; i++) clock = advanceShowClock(clock, cues, { bpm: 120, timeScale: 1, loop: false, deltaMs: 100 });
    expect([clock.complete, clock.playing, clock.cueIndex]).toEqual([true, false, 1]);
  });

  it("imports a complete show cast rather than truncating it to the default four", () => {
    const assets = ["one", "two", "three", "four", "five", "six"];
    const parsed = parseChoreographyShow(JSON.stringify({ schema: "gridline.choreography/v2", bpm: 100,
      timeScale: 0.5, loop: false, cues: [{ name: "Wide cast", assetUrls: assets, castSlots: [1, 2, 3, 4, 5, 6] }] }));
    expect(parsed.cues[0].assetUrls).toEqual(assets);
    expect(parsed.cues[0].castSlots).toEqual([1, 2, 3, 4, 5, 6]);
    expect([parsed.bpm, parsed.timeScale, parsed.loop]).toEqual([100, 0.5, false]);
    expect(() => parseChoreographyShow('{"schema":"wrong","cues":[]}')).toThrow();
  });

  it("aligns overlays to independent horizontal and vertical gaps, including merged panels", () => {
    const tile = showTileRect(1, 4, { x: 0.1, y: 0.3 }, quadrants)!;
    expect(tile.width).toBeCloseTo((2.1 / 4.3) * 100);
    expect(tile.height).toBeCloseTo((2.3 / 4.9) * 100);
    expect(showTileRect(2, 4, { x: 0.1, y: 0.3 }, quadrants)).toBeNull(); // covered by panel 1
    expect(showTileRect(3, 4, { x: 0.1, y: 0.3 }, quadrants)).toBeNull(); // inactive
    const lower = showTileRect(9, 4, { x: 0.1, y: 0.3 }, quadrants)!;
    expect(lower.top).toBeCloseTo((2.6 / 4.9) * 100);
  });
});
