import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createSequencerPanelState, type SequencerPanelState } from "./SequencerPanel";
import { effectiveSequencerInterval } from "../utils/sequencerPresets";
import { activeRegionSlots, advanceAdShopSequence, sequenceFromProgram } from "../lib/adshopAnimation";
import { defaultFrontPanelGridRegions, normalizeFrontPanelGridRegions, type FrontPanelGridRegion } from "../types/frontPanelGrid";
import { behaviorFromTurnMode, panelUpdatesFromProgram, type LedStudioPanelProgram, type LedStudioProgram, type LedStudioRouteConfig } from "./ledStudio/integration";
import { IDLE_LED_SHOW_TRANSPORT, programCleared, programCompleted, programTransmitted, transportToggled } from "./ledStudio/frontPageTransport";

/** Session-owned shared state: both studios and the live AdShop read this model. */
export function useAdShopAnimation() {
  const [regions, setRegions] = useState<FrontPanelGridRegion[]>(() => defaultFrontPanelGridRegions(4));
  const [sequence, setSequence] = useState<SequencerPanelState>(() => createSequencerPanelState(16));
  const [lastProgram, setLastProgram] = useState<LedStudioProgram | null>(null);
  const [panelPrograms, setPanelPrograms] = useState<Record<number, LedStudioPanelProgram> | null>(null);
  const [show, setShow] = useState(IDLE_LED_SHOW_TRANSPORT);
  const [scene, setScene] = useState(0);
  const [mode, setMode] = useState<"show" | "route">("route");
  const [rotationIndices, setRotationIndices] = useState<Record<number, number>>({});

  const route = useMemo<LedStudioRouteConfig>(() => ({
    path: sequence.path, activeSlots: sequence.activeSlots, wrapMode: sequence.wrapMode,
    turnMode: sequence.turnMode, behavior: sequence.routeBehavior ?? behaviorFromTurnMode(sequence.turnMode), stepIntervalMs: sequence.stepIntervalMs,
    playing: sequence.playing, bypassed: sequence.bypassed, locked: sequence.locked, layout: regions,
  }), [sequence.path, sequence.activeSlots, sequence.wrapMode, sequence.turnMode, sequence.stepIntervalMs,
    sequence.playing, sequence.bypassed, sequence.locked, sequence.routeBehavior, regions]);

  const onRouteChange = useCallback((patch: Pick<LedStudioRouteConfig, "path" | "wrapMode" | "turnMode" | "stepIntervalMs" | "behavior">) => {
    setSequence((old) => {
      if (old.wrapMode === patch.wrapMode && old.turnMode === patch.turnMode && old.stepIntervalMs === patch.stepIntervalMs &&
        old.routeBehavior === patch.behavior && old.path.length === patch.path.length && old.path.every((slot, i) => slot === patch.path[i])) return old;
      const { behavior, ...routePatch } = patch;
      return { ...old, ...routePatch, routeBehavior: behavior, path: [...patch.path], currentStep: 1, direction: 1 };
    });
  }, []);

  const applyRegions = useCallback((next: FrontPanelGridRegion[]) => {
    const normalized = normalizeFrontPanelGridRegions(next, 4);
    setRegions(normalized);
    setSequence((old) => ({ ...old, activeSlots: activeRegionSlots(normalized), currentStep: 1, direction: 1 }));
  }, []);
  const onActiveSlotsChange = useCallback((slots: number[]) => {
    const active = new Set(slots);
    setRegions((old) => old.map((region) => ({ ...region, active: active.has(region.row * 4 + region.col + 1) })));
  }, []);

  const submit = useCallback(async (program: LedStudioProgram) => {
    const nextRegions = normalizeFrontPanelGridRegions(program.wall.layout ?? program.route.layout ?? regions, 4);
    const updates = panelUpdatesFromProgram(program, 16);
    setRegions(nextRegions);
    setSequence((old) => sequenceFromProgram(old, program, nextRegions, updates.secondaryImages, updates.series));
    // SC2F always submits the complete panel deck, not just the show/route.
    setPanelPrograms(program.panels);
    setRotationIndices({});
    if (program.mode === "route") {
      setShow((old) => programCleared(old));
      setMode("route");
    } else {
      setShow((old) => programTransmitted(old, program.show));
      setScene(0);
      setMode("show");
    }
    setLastProgram(program);
  }, [regions]);

  // Starting the original Sequencer takes the wall back from a running show.
  useEffect(() => {
    if (!sequence.playing || sequence.bypassed) return;
    setMode("route");
    setShow((old) => old.visible || old.playing ? { ...old, visible: false, playing: false } : old);
  }, [sequence.playing, sequence.bypassed]);

  useEffect(() => {
    if (sequence.bypassed || !sequence.playing) return;
    const timer = window.setInterval(() => setSequence((old) => advanceAdShopSequence(old)),
      effectiveSequencerInterval(sequence.stepIntervalMs, sequence.timingScale));
    return () => window.clearInterval(timer);
  }, [sequence.playing, sequence.bypassed, sequence.stepIntervalMs, sequence.timingScale]);

  const running = mode === "show" ? show.playing : sequence.playing && !sequence.bypassed;
  useEffect(() => {
    if (!running || !panelPrograms) return;
    const timers = Object.entries(panelPrograms).flatMap(([key, panel]) => {
      if (!panel.rotating || panel.rotation.length < 2) return [];
      const slot = Number(key);
      const delay = Math.max(200, (panel.rotationInterval || 2.5) * 1000);
      return [window.setInterval(() => setRotationIndices((old) => ({
        ...old, [slot]: ((old[slot] ?? 0) + 1) % panel.rotation.length,
      })), delay)];
    });
    return () => timers.forEach(window.clearInterval);
  }, [running, panelPrograms]);

  const toggleTransport = useCallback(() => {
    if (mode === "show" && show.program) {
      setShow((old) => transportToggled(old, old.playing));
      if (!show.playing) {
        setScene(0);
        setSequence((old) => ({ ...old, playing: false, bypassed: true }));
      }
      return;
    }
    setSequence((old) => {
      if (old.playing && !old.bypassed) return { ...old, playing: false, manualStep: false };
      const hasPath = old.path.some((slot) => old.activeSlots.includes(slot));
      return { ...old, playing: hasPath, bypassed: false, currentStep: 1, direction: 1, manualStep: false };
    });
  }, [mode, show.program, show.playing]);

  const toggleRoute = useCallback(() => {
    setSequence((old) => {
      if (old.playing && !old.bypassed) return { ...old, playing: false, manualStep: true };
      const pathLength = old.path.filter((slot) => old.activeSlots.includes(slot)).length;
      const resume = old.manualStep && !old.bypassed && !(old.wrapMode === "once" && old.currentStep >= pathLength);
      return { ...old, playing: pathLength > 0, bypassed: false, currentStep: resume ? old.currentStep : 1,
        direction: resume ? old.direction : 1, manualStep: false };
    });
  }, []);

  const resumeShow = useCallback(() => {
    if (!show.program) return;
    setSequence((old) => ({ ...old, playing: false, bypassed: true }));
    setMode("show"); setScene(0);
    setShow((old) => transportToggled(old, false));
  }, [show.program]);
  const completeShow = useCallback(() => setShow((old) => programCompleted(old)), []);
  const clearPanelPrograms = useCallback(() => {
    // Drop values that came from the old panel deck, while leaving independent
    // sequencer assignments intact when they have since been changed.
    if (panelPrograms) setSequence((old) => {
      const secondaryImages = { ...old.secondaryImages };
      const flipFrames = { ...old.flipFrames };
      for (const [key, panel] of Object.entries(panelPrograms)) {
        const slot = Number(key);
        const sources = [panel.artwork, panel.source, ...panel.rotation].filter(Boolean);
        if (sources.includes(secondaryImages[slot])) delete secondaryImages[slot];
        if (flipFrames[slot]?.every((url) => sources.includes(url))) delete flipFrames[slot];
      }
      return { ...old, secondaryImages, flipFrames, flipFrameIndices: {} };
    });
    setPanelPrograms(null);
    setRotationIndices({});
    setLastProgram((old) => old ? { ...old, panels: {}, panelsBySlot: [], castFrames: {} } : old);
  }, [panelPrograms]);

  const setFromSequencer: Dispatch<SetStateAction<SequencerPanelState>> = useCallback((action) => {
    setSequence((old) => {
      const next = typeof action === "function" ? action(old) : action;
      return next.turnMode === old.turnMode ? next : { ...next, routeBehavior: behaviorFromTurnMode(next.turnMode) };
    });
  }, []);

  return { regions, sequence, setSequence: setFromSequencer, route,
    lastProgram, panelPrograms, rotationIndices, show, scene, mode, running, onRouteChange, onActiveSlotsChange,
    applyRegions, submit, toggleTransport, toggleRoute, resumeShow, completeShow, setScene, clearPanelPrograms };
}
