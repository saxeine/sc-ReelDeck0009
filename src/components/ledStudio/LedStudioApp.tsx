import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowUpRight, Layers, MousePointerClick, Waypoints } from "lucide-react";
import { AppHeader } from "./components/AppHeader";
import { ControlCenter } from "./components/ControlCenter";
import { CustomizationHost } from "./components/CustomizationHost";
import { PreviewCard } from "./components/PreviewCard";
import { Toasts } from "./components/Toasts";
import { AdvertLayer } from "./components/advert/AdvertLayer";
import { AdvertPool } from "./components/advert/AdvertPool";
import { AdvertDeck } from "./components/advert/AdvertDeck";
import { LayerBar } from "./components/advert/LayerBar";
import { SequencerModal } from "./components/advert/SequencerModal";
import { useAdvertEngine } from "./engine/useAdvertEngine";
import {
  ContentType,
  DEFAULT_STATE,
  MappingMode,
  SimulatorState,
  ToastMsg,
  ToastKind,
  WALL_COLS,
  WALL_PANELS,
  type AdvertTab,
  type AdvertAsset,
  type ControllerMode,
} from "./types";
import { calculateOverallDimensionMm, formatDimensionMm } from "./utils/canvasRenderer";
import { cn } from "./utils/cn";
import {
  behaviorFromTurnMode,
  buildLedStudioProgram,
  turnModeFromBehavior,
  type LedStudioProgram,
  type LedStudioRouteConfig,
  type LedStudioSubmitOptions,
} from "./integration";

/**
 * The ported Gridline LED studio.
 *
 * The 4×4 wall inside this component is **only a preview**: every change is
 * auditioned locally and nothing reaches SeqCarver's front page until the
 * explicit submit bridge (`onSubmitToFrontPage`) is fired.
 *
 *   Submit to front page 4×4  → onSubmitToFrontPage({ closeAfter: false })
 *   SC2F                      → onSubmitToFrontPage({ closeAfter: true })
 *   ✕ Close                   → onClose()  (returns to the sequencer desk)
 */
export interface LedStudioAppProps {
  /** Plain close — returns to the sequencer desk, nothing is submitted. */
  onClose: () => void;
  /**
   * The single submit bridge shared with `LedStudioModal.submit('all', …)`.
   * Rejected promises keep the wall open and surface the error.
   */
  onSubmitToFrontPage: (options: LedStudioSubmitOptions) => Promise<void>;
  /** SeqCarver's live sequencer route — the studio never keeps a second copy. */
  route?: LedStudioRouteConfig;
  onRouteChange?: (patch: Pick<LedStudioRouteConfig, "path" | "wrapMode" | "turnMode" | "stepIntervalMs" | "behavior">) => void;
  /** Panels the front page 4×4 grid currently exposes (16, or 9 on 3×3). */
  panelCount?: number;
  submitting?: boolean;
  submitError?: string | null;
  onDismissSubmitError?: () => void;
  /** Last program accepted by the front page, used to seed the desk. */
  lastProgram?: LedStudioProgram | null;
  onNotify?: (text: string, kind?: ToastKind) => void;
  /** Panels the front page grid configurator currently exposes. */
  gridRegionCount?: number;
  /** Open the front page panel grid configurator (the choreography follows it). */
  onOpenGridConfigurator?: () => void;
  /** Report the audition transport so the wall chrome can drive Run show / Stop. */
  /** AdShop artwork, snapshotted when the desk opens. */
  initialAssets?: AdvertAsset[];
  initialDesk?: boolean;
  initialMode?: ControllerMode;
  secondaryImages?: Record<number, string>;
  onTransportChange?: (state: { active: boolean; playing: boolean; canRun: boolean; label: string }) => void;
}

export interface LedStudioAppHandle {
  /** Resolve the complete studio program (panels, route, cast frames, show). */
  buildProgram: () => Promise<LedStudioProgram>;
  /** The audition desk transport, mirrored into the wall chrome. */
  transportState: () => { active: boolean; playing: boolean; canRun: boolean; label: string };
  run: () => void;
  hold: () => void;
  stop: () => void;
}

export const LedStudioApp = forwardRef<LedStudioAppHandle, LedStudioAppProps>(function LedStudioApp(
  {
    onClose,
    onSubmitToFrontPage,
    route,
    onRouteChange,
    panelCount = WALL_PANELS,
    submitting = false,
    submitError,
    onDismissSubmitError,
    lastProgram,
    onNotify,
    gridRegionCount,
    onOpenGridConfigurator,
    onTransportChange,
    initialAssets, initialDesk = false, initialMode, secondaryImages,
  },
  ref,
) {
  /* ----------------------------- LED wall (L1) ---------------------------- */
  const [state, setState] = useState<SimulatorState>(DEFAULT_STATE);
  const [mediaElement, setMediaElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);

  const objectUrlRef = useRef<string | null>(null);
  /** Uploaded media URL, kept in state so L1 can repaint when it changes. */
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const contentTypeRef = useRef<ContentType>(ContentType.Sample);

  /* -------------------------------- toasts ------------------------------- */
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastIdRef = useRef(0);

  const notify = useCallback(
    (text: string, kind: ToastKind = "success") => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, text, kind }]);
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
      onNotify?.(text, kind);
    },
    [onNotify],
  );

  /* --------------------------- the advert engine ------------------------- */
  const engine = useAdvertEngine({
    cols: WALL_COLS,
    panelCount: WALL_PANELS,
    notify,
    initialAssets,
  });

  /**
   * The front page panel grid (configurator output). The studio only *reads* it:
   * its 4×4 preview, the advert cards and every formation resolve on exactly the
   * geometry the front page will air, and SC2F transmits it back unchanged.
   */
  const gridRegions = useMemo(
    () => (route?.layout && route.layout.length > 0 ? route.layout.map((region) => ({ ...region })) : null),
    [route?.layout],
  );

  /* ------------------ shared sequencer route (no duplicates) ------------- */
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !route) return;
    seededRef.current = true;
    engine.setPath(route.path);
    engine.setMode(route.wrapMode);
    engine.setBehavior(route.behavior ?? behaviorFromTurnMode(route.turnMode));
    engine.setIntervalMs(route.stepIntervalMs);
  }, [route, engine]);

  // Reopen the complete last submitted program; otherwise start from AdShop's
  // current sequencer assignments. The L1 campaign remains the live AdShop display.
  const seededProgramRef = useRef(false);
  useEffect(() => {
    if (seededProgramRef.current) return;
    seededProgramRef.current = true;
    if (lastProgram?.panelsBySlot.length) {
      for (const slot of lastProgram.panelsBySlot) {
        const panel = lastProgram.panels[slot];
        if (!panel) continue;
        const secondary = secondaryImages?.[slot];
        const frames = panel.sourceRotation ?? (panel.spread ? [] : panel.rotation);
        const changed = Boolean(secondary && secondary !== frames[0] && secondary !== panel.source && secondary !== panel.artwork);
        engine.updatePanel(slot, {
          image: changed ? secondary! : panel.source || panel.artwork,
          spread: changed ? null : panel.spread,
          rotation: changed ? [secondary!, ...frames.filter((url) => url !== secondary)] : [...frames],
          rotationInterval: panel.rotationInterval, rotating: panel.rotating,
          link: { ...panel.link }, style: { ...panel.style }, parallax: panel.parallax, tilt: panel.tilt,
        });
      }
    } else {
      // The AdShop campaign is already L1 in the shared wall preview. Do not
      // bake it into the advert deck: submitting an unchanged show must not
      // replace/crop the user's background. Only shared sequencer assignments
      // belong on L2 until the user chooses additional panel artwork.
      for (let slot = 1; slot <= panelCount; slot++) {
        const url = secondaryImages?.[slot] || '';
        engine.updatePanel(slot, { image: url, spread: null, rotation: url ? [url] : [], rotating: false });
      }
    }
    if (lastProgram?.show) engine.choreography.loadShow(lastProgram.show.cues, {
      bpm: lastProgram.show.bpm, timeScale: lastProgram.show.timeScale, loop: lastProgram.show.loop,
    });
    engine.setControllerMode(initialMode ?? lastProgram?.mode ?? 'show');
  }, [lastProgram, engine, initialMode, panelCount, secondaryImages]);

  // Do not report the engine's defaults back over the shared route before its
  // initial seed has landed in React state.
  const routeSyncReady = useRef(false);
  useEffect(() => {
    if (!onRouteChange || !route) return;
    if (!routeSyncReady.current) {
      const seeded = engine.path.length === route.path.length && engine.path.every((slot, index) => slot === route.path[index]) &&
        engine.mode === route.wrapMode && engine.behavior === (route.behavior ?? behaviorFromTurnMode(route.turnMode)) &&
        engine.intervalMs === route.stepIntervalMs;
      if (!seeded) return;
      routeSyncReady.current = true;
    }
    onRouteChange({ path: engine.path, wrapMode: engine.mode, turnMode: turnModeFromBehavior(engine.behavior), behavior: engine.behavior, stepIntervalMs: engine.intervalMs });
  }, [engine.path, engine.mode, engine.behavior, engine.intervalMs, onRouteChange, route]);

  /* ------------------------------ drawers -------------------------------- */
  const [sequencerOpen, setSequencerOpen] = useState(initialDesk);
  const [poolOpen, setPoolOpen] = useState(false);
  const [deck, setDeck] = useState<{ open: boolean; tab: AdvertTab }>({ open: false, tab: "artwork" });

  /* ------------------------------ main content --------------------------- */
  const cleanupMedia = useCallback(() => {
    if (mediaRef.current && contentTypeRef.current === ContentType.Video) {
      const video = mediaRef.current as HTMLVideoElement;
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    mediaRef.current = null;
    contentTypeRef.current = ContentType.Sample;
    setMediaElement(null);
    setMediaUrl(null);
  }, []);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  const handleSizeChange = (size: number) => setState((prev) => ({ ...prev, size }));
  const handleGapChange = (gap: number) => setState((prev) => ({ ...prev, gap }));
  const handleModeChange = (mode: MappingMode) => setState((prev) => ({ ...prev, mode }));
  const handleToggleOutlines = () => setState((prev) => ({ ...prev, outlines: !prev.outlines }));

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      notify("Please choose an image or video file.", "error");
      return;
    }

    cleanupMedia();

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const nextType = file.type.startsWith("video/") ? ContentType.Video : ContentType.Image;
    contentTypeRef.current = nextType;

    if (nextType === ContentType.Video) {
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.src = url;
      video.onerror = () => notify("This video could not be decoded by your browser.", "error");
      mediaRef.current = video;
      setMediaElement(video);
      if (state.playing) {
        video.play().catch(() => notify("Video could not be played in this browser.", "error"));
      }
    } else {
      const img = new Image();
      img.onerror = () => notify("This image could not be decoded by your browser.", "error");
      img.src = url;
      mediaRef.current = img;
      setMediaElement(img);
    }

    setMediaUrl(url);
    setState((prev) => ({ ...prev, contentType: nextType, filename: file.name }));
    notify("Main content loaded locally", "success");
  };

  const handleReset = () => {
    cleanupMedia();
    setState(DEFAULT_STATE);
    setResetSignal((prev) => prev + 1);
    engine.stop();
    engine.resetAllPanels();
    notify("Studio reset to defaults", "info");
  };

  const openDeck = useCallback((tab: AdvertTab = "artwork") => {
    setDeck({ open: true, tab });
  }, []);

  const inspectPanel = useCallback(
    (slot: number) => {
      engine.setSelectedSlot(slot);
      setDeck({ open: true, tab: "artwork" });
    },
    [engine],
  );

  /* --------------------------- keyboard shortcuts ------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || el?.isContentEditable) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (engine.active) engine.hold();
        else engine.run();
      } else if (e.key === "r" || e.key === "R") {
        engine.run();
      } else if (e.key === "Escape") {
        if (sequencerOpen || deck.open || poolOpen) return;
        if (engine.boardPaintArmed) engine.setBoardPaintArmed(false);
        else if (engine.active) engine.stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, sequencerOpen, deck.open, poolOpen]);

  /* ------------------------------ submit bridge -------------------------- */
  const wall = useMemo(
    () => ({
      size: state.size,
      gap: state.gap,
      mode: state.mode,
      outlines: state.outlines,
      // The complete program carries the configured panel grid with it.
      layout: gridRegions ?? undefined,
    }),
    [state.size, state.gap, state.mode, state.outlines, gridRegions],
  );

  const buildProgram = useCallback(
    () =>
      buildLedStudioProgram({
        engine,
        wall,
        route:
          route ? { ...route, path: [...engine.path], wrapMode: engine.mode, turnMode: turnModeFromBehavior(engine.behavior), behavior: engine.behavior, stepIntervalMs: engine.intervalMs } :
          ({
            path: engine.path,
            activeSlots: Array.from({ length: panelCount }, (_, index) => index + 1),
            wrapMode: engine.mode,
            turnMode: turnModeFromBehavior(engine.behavior),
            stepIntervalMs: engine.intervalMs,
            playing: engine.active,
            bypassed: false,
            locked: false,
          } satisfies LedStudioRouteConfig),
        panelCount,
      }),
    [engine, wall, route, panelCount],
  );

  /* The wall chrome drives the desk transport (▶ Run show · ■ Stop). */
  const transportReport = useMemo(
    () => ({
      active: engine.active,
      playing: engine.playing,
      canRun: engine.canRun,
      label: engine.statusLabel.label,
    }),
    [engine.active, engine.playing, engine.canRun, engine.statusLabel.label],
  );

  useEffect(() => {
    onTransportChange?.(transportReport);
  }, [onTransportChange, transportReport]);

  useImperativeHandle(
    ref,
    () => ({
      buildProgram,
      transportState: () => transportReport,
      run: () => {
        if (!engine.canRun) {
          notify("Add a scene with at least one advert before running the show", "error");
          return;
        }
        engine.run();
      },
      hold: () => engine.hold(),
      stop: () => engine.stop(),
    }),
    [buildProgram, transportReport, engine, notify],
  );

  const submit = useCallback(
    async (options: LedStudioSubmitOptions = {}) => {
      if (submitting) return;
      await onSubmitToFrontPage(options);
    },
    [onSubmitToFrontPage, submitting],
  );

  const handleInPlaceSubmit = useCallback(() => {
    onDismissSubmitError?.();
    submit({ closeAfter: false }).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : "The front page could not accept this program.", "error");
    });
  }, [notify, onDismissSubmitError, submit]);

  const handleSubmitAndClose = useCallback(() => {
    onDismissSubmitError?.();
    submit({ closeAfter: true }).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : "The front page could not accept this program.", "error");
    });
  }, [notify, onDismissSubmitError, submit]);

  const selectedAdvert = engine.panels[engine.selectedSlot];
  const fullDimension = formatDimensionMm(calculateOverallDimensionMm(state.size, state.gap));
  const submittedLabel = lastProgram ? new Date(lastProgram.submittedAt).toLocaleTimeString() : null;

  return (
    <div className="led-studio-root h-full w-full flex flex-col overflow-hidden bg-led-bg text-[#eef1ed]">
      <AppHeader
        engine={engine}
        main={state}
        sequencerOpen={sequencerOpen}
        poolOpen={poolOpen}
        onOpenSequencer={() => setSequencerOpen(true)}
        onTogglePool={() => setPoolOpen((p) => !p)}
        onOpenDeck={() => openDeck("artwork")}
        onReset={handleReset}
        onSubmitToFrontPage={handleInPlaceSubmit}
        onSubmitAndClose={handleSubmitAndClose}
        submitting={submitting}
        submittedLabel={submittedLabel}
        onCloseWall={onClose}
      />

      {submitError ? (
        <div
          role="alert"
          className="shrink-0 flex items-start gap-2 border-b border-rose-500/40 bg-rose-950/60 px-4 py-2 text-[11px] font-semibold text-rose-200"
        >
          <span className="mt-[1px] font-black uppercase tracking-[0.14em]">Submit failed</span>
          <span className="min-w-0 flex-1 break-words">{submitError}</span>
          {onDismissSubmitError ? (
            <button
              type="button"
              onClick={onDismissSubmitError}
              className="shrink-0 rounded border border-rose-400/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-200 hover:bg-rose-500/20 cursor-pointer"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 flex min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto max-w-[1500px] p-[14px]">
            <div
              className={
                isControlCenterOpen
                  ? "grid grid-cols-[minmax(0,1fr)_minmax(280px,330px)] max-[900px]:grid-cols-[minmax(0,1fr)_258px] max-[620px]:grid-cols-[minmax(0,1fr)_222px] gap-3 items-start"
                  : "grid grid-cols-1 gap-3"
              }
            >
              <div className="min-w-0">
                {/* pinned live wall — stays in view while the column scrolls */}
                <div className="sticky top-0 z-20 -mt-[14px] pt-[14px] pb-1 bg-led-bg/95 backdrop-blur-[3px]">
                  <PreviewCard
                    size={state.size}
                    gap={state.gap}
                    mode={state.mode}
                    outlines={state.outlines}
                    playing={state.playing}
                    contentType={state.contentType}
                    mediaElement={mediaElement}
                    resetSignal={resetSignal}
                    isControlCenterOpen={isControlCenterOpen}
                    onToggleControlCenter={() => setIsControlCenterOpen((prev) => !prev)}
                    onShowToast={(message) => notify(message, "info")}
                    gridPanelCount={gridRegionCount}
                    onConfigureGrid={onOpenGridConfigurator}
                    regions={gridRegions}
                    mediaUrl={mediaUrl}
                    layerBar={<LayerBar engine={engine} />}
                    advertLayer={
                      <AdvertLayer
                        engine={engine}
                        size={state.size}
                        gap={state.gap}
                        onInspect={inspectPanel}
                        onOpenLink={(url, target) => {
                          window.open(url, target === "_self" ? "_self" : "_blank");
                          notify(`Opening advert link in ${target === "_self" ? "this tab" : "a new window"}`, "info");
                        }}
                        showRoute={false}
                        showSteps={false}
                        regions={gridRegions}
                      />
                    }
                  />
                </div>

                {/* ------------------------- status strip ------------------------- */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-[#2e372a] bg-[#11160f] rounded-lg px-3.5 py-2 text-[9.5px] font-mono text-[#8d9a86]">
                  <span className="flex items-center gap-1.5 text-[#dce3d9] font-semibold">
                    <MousePointerClick className="w-3 h-3 text-led-lime" />
                    Panel {String(engine.selectedSlot).padStart(2, "0")} selected
                    <span className="hidden lg:inline text-[#6f7a69] font-normal">· double-click the wall to inspect</span>
                  </span>
                  <span className="hidden md:inline">
                    {WALL_COLS}×{WALL_COLS} · {state.size} mm · gap {state.gap} mm · {fullDimension} mm wall
                  </span>
                  <span className="hidden md:inline">
                    mapping: {state.mode === MappingMode.Compensated ? "gap compensated" : "joined image"}
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <Layers className="w-3 h-3 text-violet-300" />
                    {selectedAdvert?.rotation.length ?? 0} frames
                    {selectedAdvert?.spread ? " · poster slice" : ""}
                    {selectedAdvert?.link.url ? " · linked" : ""}
                    {selectedAdvert?.parallax ? " · 2.5D" : ""}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      engine.active ? "text-led-lime" : engine.path.length ? "text-violet-300/90" : "text-[#6f7a69]",
                    )}
                  >
                    <Waypoints className={cn("w-3 h-3", engine.active && engine.playing && "animate-pulse")} />
                    {engine.controllerMode === "show"
                      ? `${engine.choreography.cues.length} scenes · ${engine.choreography.bpm} BPM · ${engine.choreography.timeScale.toFixed(2)}×`
                      : `${engine.path.length} steps`}
                    {engine.active
                      ? engine.controllerMode === "show"
                        ? ` · ${engine.choreography.currentCue?.name ?? "show"}${engine.playing ? "" : " · held"}`
                        : engine.leaderSlot
                          ? ` · lead S${String(engine.leaderSlot).padStart(2, "0")}${engine.playing ? "" : " · held"}`
                          : " · armed"
                      : " · idle"}
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-[#6f7a69]">{engine.pool.length} advert images</span>
                    <span className="hidden xl:inline text-[#4f5a4b]">alt+click any control to re-skin</span>
                    <button
                      type="button"
                      onClick={() => setSequencerOpen(true)}
                      className="flex items-center gap-1 text-[#bfc9b8] hover:text-led-lime transition-colors cursor-pointer"
                    >
                      open engine <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </span>
                </div>

                {/* --------------------------- title row --------------------------- */}
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3 pb-2">
                  <div>
                    <h2 className="font-led-display font-semibold text-[24px] leading-[1.15] tracking-[-0.9px] m-0">
                      LED wall · Choreograph preview
                    </h2>
                    <p className="mt-1 text-[11px] text-[#8d9a86] max-w-[640px]">
                      The main campaign renders on L1 across this 4×4 preview wall. The perimeter choreographer drives solo
                      adverts, multi-image casts and living mosaics through beat-locked formations on L2. Everything here is
                      auditioned locally — <span className="text-[#c9d6bd]">SC2F</span> or{" "}
                      <span className="text-[#c9d6bd]">Submit to front page 4×4</span> transmits the complete program to
                      AdShop&apos;s display panels.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => engine.applyPoster()}
                      className="px-2.5 py-1.5 rounded-md border border-[#3a4436] text-[10px] font-bold text-[#bfc9b8] hover:border-led-lime/50 hover:text-led-lime transition-colors cursor-pointer"
                    >
                      Master poster
                    </button>
                    <button
                      type="button"
                      onClick={() => engine.distributePool()}
                      className="px-2.5 py-1.5 rounded-md border border-[#3a4436] text-[10px] font-bold text-[#bfc9b8] hover:border-led-lime/50 hover:text-led-lime transition-colors cursor-pointer"
                    >
                      Distribute advert set
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoolOpen(true)}
                      className="px-2.5 py-1.5 rounded-md border border-[#3a4436] text-[10px] font-bold text-[#bfc9b8] hover:border-indigo-400/60 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      Load advert images
                    </button>
                  </div>
                </div>
              </div>

              {isControlCenterOpen && (
                <ControlCenter
                  size={state.size}
                  gap={state.gap}
                  mode={state.mode}
                  outlines={state.outlines}
                  onSizeChange={handleSizeChange}
                  onGapChange={handleGapChange}
                  onModeChange={handleModeChange}
                  onToggleOutlines={handleToggleOutlines}
                  onFileUpload={handleFileUpload}
                />
              )}
            </div>
          </div>
        </main>

        {poolOpen && <AdvertPool engine={engine} onOpenDeck={openDeck} onClose={() => setPoolOpen(false)} />}
      </div>

      <AnimatePresence>
        {sequencerOpen && (
          <SequencerModal
            engine={engine}
            wall={{
              size: state.size,
              gap: state.gap,
              mode: state.mode,
              outlines: state.outlines,
              playing: state.playing,
              contentType: state.contentType,
              mediaElement,
              resetSignal,
              regions: gridRegions,
              mediaUrl,
            }}
            onClose={() => setSequencerOpen(false)}
            onDeskClosed={() => setSequencerOpen(false)}
            onSubmitToFrontPage={submit}
            submitting={submitting}
            regions={gridRegions}
            onConfigureGrid={onOpenGridConfigurator}
          />
        )}
        {deck.open && (
          <AdvertDeck
            engine={engine}
            wall={{
              size: state.size,
              gap: state.gap,
              mode: state.mode,
              outlines: state.outlines,
              playing: state.playing,
              contentType: state.contentType,
              mediaElement,
              resetSignal,
              regions: gridRegions,
              mediaUrl,
            }}
            tab={deck.tab}
            onTab={(tab) => setDeck((d) => ({ ...d, tab }))}
            onClose={() => setDeck((d) => ({ ...d, open: false }))}
          />
        )}
      </AnimatePresence>

      <Toasts items={toasts} />
      <CustomizationHost />
    </div>
  );
});

export default LedStudioApp;
