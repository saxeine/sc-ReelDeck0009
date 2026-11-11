import sequenceSource01 from "../assets/sequencer-sources/source-01.jpg?inline";
import sequenceSource02 from "../assets/sequencer-sources/source-02.jpg?inline";
import sequenceSource03 from "../assets/sequencer-sources/source-03.jpg?inline";
import sequenceSource04 from "../assets/sequencer-sources/source-04.jpg?inline";
import sequenceSource05 from "../assets/sequencer-sources/source-05.jpg?inline";
import sequenceSource06 from "../assets/sequencer-sources/source-06.jpg?inline";
import sequenceSource07 from "../assets/sequencer-sources/source-07.jpg?inline";
import sequenceSource08 from "../assets/sequencer-sources/source-08.jpg?inline";
import sequenceSource09 from "../assets/sequencer-sources/source-09.jpg?inline";
import sequenceSource10 from "../assets/sequencer-sources/source-10.jpg?inline";
import sequenceSource11 from "../assets/sequencer-sources/source-11.jpg?inline";
import sequenceSource12 from "../assets/sequencer-sources/source-12.jpg?inline";
import { ImageSourceDot } from "./ImageSourceIndicator";
import type { SeqBehavior } from "./ledStudio/types";
import { SequenceRouteOverlay } from "./flipMe/components/SequenceRouteOverlay";
import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  GitBranch,
  ImagePlus,
  Images,
  Lock,
  LockOpen,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { uiText } from "../hooks/useUIConfig";
import { CustomizableLabel } from "./CustomizableLabel";
import { CustomizableButton } from "./CustomizableButton";
import { AssetPicker } from "./assetProvider/AssetProvider";
import type { LibraryAsset } from "../services/assetLibrary";
import { SequencerPresetStudio } from "./SequencerPresetStudio";
import { WarpPresetsPopup } from "./WarpPresetsPopup";
import {
  defaultFrontPanelGridRegions,
  frontPanelRegionAnchor,
  normalizeFrontPanelGridRegions,
  type FrontPanelGridRegion,
} from "../types/frontPanelGrid";
import {
  getPresetPath,
  effectiveSequencerInterval,
  sequencerImageStretch,
  getSequencerWarpTransform,
  type SequencerPreset,
  type SequencerTurnMode,
  type SequencerWarp,
  type SequencerWrapMode,
} from "../utils/sequencerPresets";
export { getPresetPath } from "../utils/sequencerPresets";
export type { SequencerPreset, SequencerTurnMode, SequencerWarp, SequencerWrapMode } from "../utils/sequencerPresets";

export interface SequencerSource {
  id: string;
  name: string;
  url: string;
  timestamp: string;
}

export interface SequencerPanelState {
  /** flipMe frame stacks share the existing transport and persisted workspace. */
  flipRouteOverlay?: boolean;
  flipFrames?: Record<number, string[]>;
  flipFrameIndices?: Record<number, number>;

  /** Secondary artwork chosen for each front-page slot. */
  secondaryImages: Record<number, string>;
  /** Slots currently switched on in the Sequence Selection Matrix. */
  activeSlots: number[];
  /** Ordered runtime path shown by the transport. */
  path: number[];
  wrapMode: SequencerWrapMode;
  turnMode: SequencerTurnMode;
  /** The original wall also supports flash and cumulative reveal. */
  routeBehavior?: SeqBehavior;
  warp: SequencerWarp;
  preset: SequencerPreset;
  stepIntervalMs: number;
  timingScale?: number;
  stretchX?: number;
  stretchY?: number;
  customPath?: number[];
  customGridSlots?: number;
  currentStep: number;
  direction: 1 | -1;
  playing: boolean;
  /** Show a manually stepped frame while the transport is paused. */
  manualStep?: boolean;
  /** When bypassed, the front page ignores the sequencer runtime. */
  bypassed: boolean;
  /** When locked, source assignments cannot be replaced accidentally. */
  locked: boolean;
  /** When true, locked padlock icon is displayed on front screen panels with mouse-over images. Default is false. */
  showMouseOverLockIcons?: boolean;
  notes: string;
}

export const SEQUENCER_SOURCE_IMAGES = [
  sequenceSource01, sequenceSource02, sequenceSource03, sequenceSource04, sequenceSource05, sequenceSource06, sequenceSource07, sequenceSource08, sequenceSource09, sequenceSource10, sequenceSource11, sequenceSource12
];

/** Clean default opening state without hardcoded secondary locks so windows are not permanently stuck. */
export const DEFAULT_SEQUENCER_PANEL_STATE: SequencerPanelState = {
  secondaryImages: {},
  activeSlots: Array.from({ length: 16 }, (_, index) => index + 1),
  path: [1, 2, 3, 4, 8, 12, 16, 9],
  wrapMode: "loop",
  turnMode: "step",
  routeBehavior: "flash",
  warp: "bend",
  preset: "ring",
  stepIntervalMs: 900,
  timingScale: 1,
  stretchX: 1,
  stretchY: 1,
  currentStep: 1,
  direction: 1,
  playing: false,
  bypassed: false,
  locked: false,
  showMouseOverLockIcons: false,
  notes: "",
};

export function createSequencerPanelState(totalSlots = 16): SequencerPanelState {
  const slots = Array.from({ length: totalSlots }, (_, index) => index + 1);
  return {
    ...DEFAULT_SEQUENCER_PANEL_STATE,
    secondaryImages: {},
    activeSlots: slots,
    path: getPresetPath("ring", totalSlots),
  };
}

/** Shared by the deck preview and the live front-page board. */
export function getSequencerRuntimeStyle(
  warp: SequencerWarp,
  turnMode: SequencerTurnMode,
  isActive: boolean,
  intervalMs: number,
): React.CSSProperties {
  if (!isActive) return {};

  const style: React.CSSProperties = {
    transition: `transform ${Math.min(intervalMs * 0.45, 420)}ms cubic-bezier(0.2, 0.9, 0.3, 1.2)`,
  };

  const transformValue = getSequencerWarpTransform(warp);
  if (warp !== "none" && transformValue) {
    style.transform = transformValue;
  }
  if (turnMode === "spin") {
    style.animation = "sequencer-spin 0.9s linear infinite";
  } else if (turnMode === "pulse") {
    style.animation = "sequencer-pulse 0.75s ease-in-out infinite";
  }

  return style;
}

const VIEWER_SURFACE =
  "rounded-2xl border border-[#112439] bg-gradient-to-b from-[#071322] to-[#040913] shadow-[0_12px_32px_rgba(0,0,0,0.6)]";
const CONTROL_SURFACE =
  "rounded-2xl border border-[#12283f] bg-gradient-to-b from-[#061424] to-[#030913] shadow-[0_10px_28px_rgba(0,0,0,0.55)]";
const RED_TILE_STYLE: React.CSSProperties = {
  backgroundColor: "#160507",
  backgroundImage:
    "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(127,29,29,0.3) 50%, rgba(41,5,8,0.85) 100%)",
};

interface SequencerPanelProps {
  totalSlots: number;
  sources: SequencerSource[];
  boxImages?: Record<number, string>;
  gridRegions?: FrontPanelGridRegion[];
  state: SequencerPanelState;
  onActiveSlotsChange?: (slots: number[]) => void;
  setState: React.Dispatch<React.SetStateAction<SequencerPanelState>>;
  sourceUploadRef: React.RefObject<HTMLInputElement | null>;
  onAddSource: (source: SequencerSource) => void;
  onDeleteSource: (id: string) => void;
  onToggleLock: () => void;
  onRequestFill: () => void;
  onOpenFlipMe?: () => void;
  showToast: (message: string) => void;
  syncStatus?: "saving" | "synced" | "device" | "error";
  lastSavedAt?: string | null;
}

export const SequencerPanel: React.FC<SequencerPanelProps> = ({
  totalSlots,
  sources: incomingSources,
  boxImages,
  gridRegions,
  state,
  setState,
  onActiveSlotsChange,
  sourceUploadRef,
  onAddSource,
  onDeleteSource,
  onToggleLock,
  onRequestFill,
  onOpenFlipMe,
  showToast,
}) => {
  const columns = Math.round(Math.sqrt(totalSlots));
  const effectiveGridRegions = useMemo(
    () => normalizeFrontPanelGridRegions(gridRegions ?? defaultFrontPanelGridRegions(columns), columns),
    [gridRegions, columns],
  );
  const regionBySlot = useMemo(
    () => new Map(effectiveGridRegions.map((region) => [frontPanelRegionAnchor(region, columns), region])),
    [effectiveGridRegions, columns],
  );
  const slotList = useMemo(
    () => effectiveGridRegions.map((region) => frontPanelRegionAnchor(region, columns)),
    [effectiveGridRegions, columns],
  );
  const [sources, setSources] = useState<SequencerSource[]>(() => incomingSources);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    () => incomingSources[0]?.id || "",
  );
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [showPresetStudio, setShowPresetStudio] = useState(false);
  const [showMoreWarpsPopup, setShowMoreWarpsPopup] = useState(false);
  /** Route point being dragged: the slot whose P-badge is the drag source. */
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  useEffect(() => {
    setSources(incomingSources);
  }, [incomingSources]);

  useEffect(() => {
    if (!sources.some((source) => source.id === selectedSourceId)) {
      setSelectedSourceId(sources[0]?.id || "");
    }
  }, [sources, selectedSourceId]);

  useEffect(() => {
    if (!slotList.includes(selectedSlot)) setSelectedSlot(slotList[0] ?? 1);
  }, [slotList, selectedSlot]);

  const runtimePath = useMemo(
    () => state.path.filter((slot) => slot <= totalSlots && state.activeSlots.includes(slot)),
    [state.path, state.activeSlots, totalSlots],
  );

  const activeRuntimeSlot = runtimePath[state.currentStep - 1] ?? null;
  const selectedSource = sources.find((source) => source.id === selectedSourceId) || sources[0];
  const assignedCount = Object.values(state.secondaryImages).filter(Boolean).length;
  const isLive = !state.bypassed && runtimePath.length > 0;

  const updateState = (updates: Partial<SequencerPanelState>) => {
    setState((previous) => ({ ...previous, ...updates }));
  };

  const startRuntimeIfPossible = (extra: Partial<SequencerPanelState> = {}) => {
    setState((previous) => {
      const merged: SequencerPanelState = {
        ...previous,
        ...extra,
        bypassed: false,
      };
      const candidatePath = merged.path.filter(
        (slot) => slot <= totalSlots && merged.activeSlots.includes(slot),
      );
      return {
        ...merged,
        playing: candidatePath.length > 0 ? true : previous.playing,
        currentStep: previous.currentStep > candidatePath.length ? 1 : previous.currentStep,
      };
    });
  };

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
    const isActive = state.activeSlots.includes(slot);
    const nextActiveSlots = isActive
      ? state.activeSlots.filter((candidate) => candidate !== slot)
      : [...state.activeSlots, slot].sort((a, b) => a - b);
    onActiveSlotsChange?.(nextActiveSlots);
    setState((previous) => {
      const nextSecondary = { ...previous.secondaryImages };
      if (isActive) delete nextSecondary[slot];
      return {
        ...previous,
        activeSlots: isActive
          ? previous.activeSlots.filter((candidate) => candidate !== slot)
          : [...previous.activeSlots, slot].sort((a, b) => a - b),
        secondaryImages: nextSecondary,
        currentStep: 1,
      };
    });
  };

  /** Drag a route point onto another panel to reposition that visit in the route. */
  const moveRoutePoint = (from: number, to: number) => {
    const fromIndex = state.path.indexOf(from);
    if (from === to || fromIndex < 0) return;
    const next = [...state.path];
    const toIndex = next.indexOf(to);
    next[fromIndex] = to;
    // A point already sitting on the target panel swaps onto the source panel.
    if (toIndex >= 0) next[toIndex] = from;
    const nextActiveSlots = state.activeSlots.includes(to)
      ? state.activeSlots
      : [...state.activeSlots, to].sort((a, b) => a - b);
    if (nextActiveSlots !== state.activeSlots) onActiveSlotsChange?.(nextActiveSlots);
    setState((previous) => ({
      ...previous,
      path: next,
      customPath: next,
      customGridSlots: totalSlots,
      preset: "custom",
      activeSlots: nextActiveSlots,
      currentStep: 1,
      direction: 1,
    }));
    showToast(`✓ Route point moved to slot #${to}`);
  };

  const handleSourceClick = (source: SequencerSource) => {
    setSelectedSourceId(source.id);
    if (state.locked) {
      showToast("Images are locked in — unlock to replace an assignment");
      return;
    }

    const targetSlot = slotList.includes(selectedSlot) ? selectedSlot : slotList[0] ?? 1;
    const nextActiveSlots = state.activeSlots.includes(targetSlot)
      ? state.activeSlots
      : [...state.activeSlots, targetSlot].sort((a, b) => a - b);
    onActiveSlotsChange?.(nextActiveSlots);
    setState((previous) => ({
      ...previous,
      secondaryImages: { ...previous.secondaryImages, [targetSlot]: source.url },
      activeSlots: previous.activeSlots.includes(targetSlot)
        ? previous.activeSlots
        : [...previous.activeSlots, targetSlot].sort((a, b) => a - b),
      currentStep: 1,
    }));
    showToast(`✓ Secondary image assigned to slot #${targetSlot}`);
  };

  const handleClearSlotSecondary = (slot: number) => {
    setState((previous) => {
      const next = { ...previous.secondaryImages };
      delete next[slot];
      return { ...previous, secondaryImages: next };
    });
    showToast(`✓ Unlocked and cleared slot #${slot}`);
  };

  const handleClearAllSecondary = () => {
    setState((previous) => ({
      ...previous,
      secondaryImages: {},
    }));
    showToast("✓ Unlocked and cleared all secondary images");
  };

  const toggleMouseOverLockIcons = () => {
    const nextVal = !state.showMouseOverLockIcons;
    setState((previous) => ({
      ...previous,
      showMouseOverLockIcons: nextVal,
    }));
    showToast(
      nextVal
        ? "✓ Mouse-over lock icons shown on front screen"
        : "Mouse-over lock icons hidden on front screen (default off)",
    );
  };

  const handleBulkSlots = (action: "all" | "blank" | "invert") => {
    const nextActiveSlots =
      action === "all"
        ? [...slotList]
        : action === "blank"
          ? []
          : slotList.filter((slot) => !state.activeSlots.includes(slot));
    onActiveSlotsChange?.(nextActiveSlots);
    setState((previous) => {
      const nextActive = nextActiveSlots;
      const nextSecondary = { ...previous.secondaryImages };
      Object.keys(nextSecondary).forEach((k) => {
        const slotNum = Number(k);
        if (!nextActive.includes(slotNum)) {
          delete nextSecondary[slotNum];
        }
      });
      return {
        ...previous,
        activeSlots: nextActive,
        secondaryImages: nextSecondary,
        currentStep: 1,
      };
    });
  };

  const handleWarp = (warp: SequencerWarp) => {
    startRuntimeIfPossible({ warp });
    showToast(`✓ ${warp} warp applied`);
  };

  const handleSourceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result?.toString() || "";
      if (!url) return;
      const source: SequencerSource = {
        id: `seq_source_${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        url,
        timestamp: new Date().toISOString(),
      };
      setSources((previous) => [source, ...previous]);
      setSelectedSourceId(source.id);
      onAddSource(source);
      showToast(`✓ Added "${source.name}" to Saved sources`);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleLibrarySend = (assets: LibraryAsset[]) => {
    if (!assets.length) return;
    const stamp = Date.now();
    const added: SequencerSource[] = assets.map((asset, index) => ({
      id: `seq_library_${stamp}_${index}`,
      name: asset.name,
      url: asset.src,
      timestamp: new Date().toISOString(),
    }));
    setSources((previous) => [...added, ...previous]);
    setSelectedSourceId(added[0].id);
    added.forEach(onAddSource);
    showToast(`✓ Added ${added.length} library image${added.length === 1 ? "" : "s"} to Saved sources`);
    setLibraryOpen(false);
  };

  const handleDeleteSelectedSource = () => {
    if (!selectedSource) {
      showToast("Select a saved source to remove");
      return;
    }
    if (state.locked) {
      showToast("Unlock images before removing a saved source");
      return;
    }
    setSources((previous) => previous.filter((source) => source.id !== selectedSource.id));
    setState((previous) => {
      const secondaryImages = { ...previous.secondaryImages };
      Object.keys(secondaryImages).forEach((key) => {
        if (secondaryImages[Number(key)] === selectedSource.url) delete secondaryImages[Number(key)];
      });
      return { ...previous, secondaryImages };
    });
    onDeleteSource(selectedSource.id);
    showToast(`✓ Removed "${selectedSource.name}"`);
  };

  const toggleBypass = () => {
    setState((previous) => ({
      ...previous,
      bypassed: !previous.bypassed,
      playing: previous.bypassed ? previous.playing : false,
    }));
    showToast(state.bypassed ? "✓ Sequencer transmitting to front page" : "Sequencer bypassed");
  };

  const activeRuntimeStyle = getSequencerRuntimeStyle(
    state.warp,
    state.turnMode,
    Boolean((state.playing || state.manualStep) && isLive),
    effectiveSequencerInterval(state.stepIntervalMs, state.timingScale),
  );

  if (!state.playing) activeRuntimeStyle.animationPlayState = "paused";

  return (
    <div className="flex w-full flex-col gap-2 text-slate-200 select-none">
      {showPresetStudio && (
        <SequencerPresetStudio
          totalSlots={totalSlots}
          state={state}
          setState={setState}
          boxImages={boxImages}
          onClose={() => setShowPresetStudio(false)}
        />
      )}
      {showMoreWarpsPopup && (
        <WarpPresetsPopup
          activeWarp={state.warp}
          previewImageUrl={
            (activeRuntimeSlot && (state.secondaryImages[activeRuntimeSlot] || boxImages?.[activeRuntimeSlot])) ||
            selectedSource?.url ||
            boxImages?.[1] ||
            SEQUENCER_SOURCE_IMAGES[0]
          }
          onSelectWarp={(warp) => handleWarp(warp)}
          onClose={() => setShowMoreWarpsPopup(false)}
        />
      )}
      <input
        ref={sourceUploadRef}
        type="file"
        accept="image/*"
        onChange={handleSourceUpload}
        className="hidden"
      />

      {/* Matrix and preview above transport; saved sources span the right column. */}
      <div className="grid min-h-0 grid-cols-1 gap-3 md:grid-cols-2 lg:h-[min(68vh,600px)] lg:min-h-[440px] lg:grid-cols-[1fr_1fr_0.9fr] lg:grid-rows-[minmax(280px,1fr)_140px]">
        <section aria-label="Sequence selection matrix" className={cn(VIEWER_SURFACE, "order-1 flex min-h-[280px] min-w-0 flex-col overflow-hidden p-3 lg:col-start-1 lg:row-start-1 lg:min-h-0")}>
          <div className="mb-1 flex h-5 shrink-0 items-center justify-between px-1">
            <CustomizableLabel
              labelId="sequencer_panel_item_17"
              as="h3"
              className="text-sm font-bold tracking-tight text-white"
            >
                {() => (
                    <>
                      {uiText("sequencer.matrix_title", "Sequence selection matrix")}
                    </>
                  )}
            </CustomizableLabel>
            <span className="text-[8.5px] font-mono text-cyan-400 font-bold">
              {runtimePath.length} steps
            </span>
          </div>

          <div
            className="relative grid min-h-0 flex-1 gap-1"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {slotList.map((slot) => {
              const region = regionBySlot.get(slot)!;
              const pathIndex = runtimePath.indexOf(slot);
              const active = state.activeSlots.includes(slot);
              const isRuntimeSlot = (state.playing || state.manualStep) && isLive && activeRuntimeSlot === slot;
              const slotImage = state.secondaryImages[slot];
              const isSelected = selectedSlot === slot;

              return (
                <CustomizableButton
                  buttonId="sequencer_panel_btn_16"
                  key={`sequence-matrix-${slot}`}
type="button"
onClick={() => handleSlotClick(slot)}
onDragOver={(e) => {
                  if (dragFrom == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverSlot(slot);
                }}
onDrop={(e) => {
                  if (dragFrom == null) return;
                  e.preventDefault();
                  const from = dragFrom;
                  setDragFrom(null);
                  setDragOverSlot(null);
                  if (from !== slot) moveRoutePoint(from, slot);
                }}
title={`Region #${slot} — ${active ? "Active" : "Excluded"}${region.rowSpan > 1 || region.colSpan > 1 ? `, merged ${region.colSpan}×${region.rowSpan}` : ""}`}
style={{ gridColumn: `${region.col + 1} / span ${region.colSpan}`, gridRow: `${region.row + 1} / span ${region.rowSpan}` }}
className={cn(
                    "relative min-h-0 overflow-hidden rounded-lg border text-center transition-all cursor-pointer",
                    active
                      ? "border-emerald-500/80 bg-[#151c18]"
                      : "border-slate-800 bg-[#09101b] opacity-60",
                    isRuntimeSlot && "border-cyan-300 ring-2 ring-cyan-400/50",
                    isSelected && "outline outline-1 outline-amber-400",
                    dragOverSlot === slot && dragFrom != null && dragFrom !== slot && "ring-2 ring-amber-300/90 border-amber-300",
                  )}
                >
                    {() => (
                        <>
                          <span className="absolute bottom-1 left-1 z-10"><ImageSourceDot kind="slots" /></span>
                          {slotImage && (
                    <img
                      src={slotImage}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale-[0.3]"
                    />
                  )}
                        {pathIndex >= 0 && (
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(slot));
                      setDragFrom(slot);
                    }}
                    onDragEnd={() => { setDragFrom(null); setDragOverSlot(null); }}
                    title={`Route point P${pathIndex + 1} — drag it onto another panel to reposition the route`}
                    className={cn(
                      "absolute left-1 top-0.5 z-20 cursor-grab rounded-[3px] border border-cyan-400/40 bg-cyan-950/70 px-1 text-[7px] font-mono text-slate-300 transition-colors hover:border-cyan-300 hover:text-cyan-200 active:cursor-grabbing",
                      dragFrom === slot && "opacity-40",
                    )}
                  >
                    {`P${pathIndex + 1}`}
                  </span>
                )}
                        <span className="relative z-10 flex h-full flex-col items-center justify-center">
                    <span className="text-base font-black text-white">#{slot}</span>
                    <span
                      className={cn(
                        "text-[7px] font-mono font-bold leading-none",
                        active ? "text-emerald-400" : "text-slate-500",
                      )}
                    >
                      {active ? "ACTIVE" : "EXCLUDED"}{region.rowSpan > 1 || region.colSpan > 1 ? ` · ${region.colSpan}×${region.rowSpan}` : ""}
                    </span>
                  </span>
                        </>
                      )}
                </CustomizableButton>
              );
            })}
            {state.flipRouteOverlay && <SequenceRouteOverlay path={runtimePath} columns={columns} regions={regionBySlot} currentStep={state.currentStep} playing={!state.bypassed && (state.playing || Boolean(state.manualStep))} />}
          </div>

          <div className="mt-1 flex h-6 shrink-0 items-center justify-between gap-1 px-0.5">
            <div className="flex items-center gap-1">
              {(["all", "blank", "invert"] as const).map((action) => (
                <CustomizableButton
                  buttonId="sequencer_panel_btn_15"
                  key={`bulk-${action}`}
type="button"
onClick={() => handleBulkSlots(action)}
className="h-[18px] px-1.5 text-[8.5px] font-bold rounded-md border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-300 capitalize cursor-pointer transition-colors"
                >
                    {() => (
                        <>
                          {action}
                        </>
                      )}
                </CustomizableButton>
              ))}
            </div>
            <CustomizableButton
              buttonId="sequencer_panel_btn_14"
              type="button"
onClick={onToggleLock}
title={state.locked ? "Unlock secondary assignments" : "Lock secondary assignments"}
className={cn(
                "h-[18px] px-1.5 flex items-center gap-1 rounded-md border text-[8.5px] font-bold cursor-pointer transition-colors",
                state.locked
                  ? "border-emerald-400/80 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white",
              )}
            >
                {() => (
                    <>
                      {state.locked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                    <span>{state.locked ? "Locked" : "Unlocked"}</span>
                    </>
                  )}
            </CustomizableButton>
          </div>
        </section>
        <section aria-label="Sequencer preview" className={cn(VIEWER_SURFACE, "order-2 flex min-h-[280px] min-w-0 flex-col overflow-hidden p-3 lg:col-start-2 lg:row-start-1 lg:min-h-0")}>
          <div className="mb-1 flex h-5 shrink-0 items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <CustomizableLabel
                labelId="sequencer_panel_item_9"
                as="h3"
                className="text-sm font-bold tracking-tight text-[#9db4cc]"
              >
                  {() => (
                      <>
                        {uiText("sequencer.preview", "Preview")}
                      </>
                    )}
              </CustomizableLabel>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isLive ? "bg-emerald-400 shadow-[0_0_6px_#00df91]" : "bg-slate-600",
                )}
              />
            </div>
            <span className="text-[8.5px] font-mono text-cyan-400">
              {assignedCount} assigned
            </span>
          </div>

          <div
            className="relative grid min-h-0 flex-1 gap-1"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {slotList.map((slot) => {
              const region = regionBySlot.get(slot)!;
              const secondaryImage = state.activeSlots.includes(slot) ? state.secondaryImages[slot] : undefined;
              const isRuntimeSlot = (state.playing || state.manualStep) && isLive && activeRuntimeSlot === slot;

              return (
                <div
                  key={`secondary-preview-${slot}`}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "group relative min-h-0 overflow-hidden rounded-lg border border-slate-800 transition-all cursor-pointer",
                    isRuntimeSlot && "ring-2 ring-cyan-300/80 ring-offset-1 ring-offset-[#06101d]",
                    selectedSlot === slot && "border-amber-400",
                  )}
                  style={{
                    ...RED_TILE_STYLE,
                    gridColumn: `${region.col + 1} / span ${region.colSpan}`,
                    gridRow: `${region.row + 1} / span ${region.rowSpan}`,
                  }}
                  title={
                    secondaryImage
                      ? `Slot #${slot} secondary image (click padlock or X to clear)`
                      : `Slot #${slot} (no secondary image)`
                  }
                >
                  <span className="pointer-events-none absolute bottom-1 left-1 z-10"><ImageSourceDot kind="secondary" /></span>
                  {secondaryImage ? (
                    <>
                      <img
                        src={secondaryImage}
                        alt={`Slot ${slot}`}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={sequencerImageStretch(state.stretchX, state.stretchY, isRuntimeSlot)}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-[#c6202a]/15 mix-blend-color" />
                      {/* Clickable padlock icon representation */}
                      <CustomizableButton
                        buttonId="sequencer_panel_btn_8"
                        defaultIcon={<Lock className="h-2 w-2" />}
                        type="button"
onClick={(e) => {
                          e.stopPropagation();
                          handleClearSlotSecondary(slot);
                        }}
title={`Click to unlock and clear slot #${slot}`}
className="absolute right-0.5 top-0.5 z-10 rounded-full bg-black/70 hover:bg-rose-950 p-0.5 text-emerald-300 hover:text-rose-300 transition-colors cursor-pointer"
                      />
                      {/* Clickable quick unlock/remove button to prevent windows from staying permanently locked */}
                      <CustomizableButton
                        buttonId="sequencer_panel_btn_7"
                        defaultIcon={<X className="h-2 w-2 stroke-[3]" />}
                        type="button"
onClick={(e) => {
                          e.stopPropagation();
                          handleClearSlotSecondary(slot);
                        }}
title={`Unlock and clear secondary image for window #${slot}`}
className="absolute left-0.5 top-0.5 z-20 rounded bg-rose-950/90 hover:bg-rose-700 p-0.5 text-rose-200 border border-rose-500/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] font-mono text-slate-600">
                      #{slot}
                    </div>
                  )}

                  {isRuntimeSlot && (
                    <div
                      className="pointer-events-none absolute inset-[2px] rounded border border-cyan-200/70"
                      style={activeRuntimeStyle}
                    />
                  )}
                </div>
              );
            })}
            {state.flipRouteOverlay && <SequenceRouteOverlay path={runtimePath} columns={columns} regions={regionBySlot} currentStep={state.currentStep} playing={!state.bypassed && (state.playing || Boolean(state.manualStep))} />}
          </div>

          <div className="mt-1 flex h-6 shrink-0 items-center justify-between gap-1 px-0.5">
            <span className="text-[8.5px] font-mono text-slate-400 truncate">
              Slot #{selectedSlot}
            </span>
            <div className="flex items-center gap-1">
            <CustomizableButton
              buttonId="sequencer_panel_fill_individual_images"
              defaultLabel="Fill second images"
              defaultIcon={<Images className="h-3 w-3" />}
              forceZeroText={true}
              onClick={onRequestFill}
              aria-label="Fill second images from storyboard or saved artwork"
              title="Fill second images from storyboard or saved artwork"
              className="h-6 w-6 flex items-center justify-center rounded-md border border-amber-400/60 bg-amber-950/60 text-amber-300 hover:bg-amber-900 cursor-pointer"
            />
            <CustomizableButton
              buttonId="sequencer_panel_clear_all"
              defaultLabel={"Clear all"}
              type="button"
onClick={handleClearAllSecondary}
title="Unlock and clear all secondary window assignments"
className="h-[18px] px-1.5 text-[8.5px] font-bold rounded-md border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 cursor-pointer transition-colors"
            />
            </div>
          </div>
        </section>
        <section aria-label="Saved sources" className={cn(VIEWER_SURFACE, "order-5 flex min-h-[400px] min-w-0 flex-col overflow-hidden p-3 lg:order-3 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:min-h-0")}>
          <div className="mb-1 flex h-5 shrink-0 items-center justify-between px-1">
            <CustomizableLabel
              labelId="sequencer_panel_item_13"
              as="h3"
              className="text-sm font-bold tracking-tight text-[#9db4cc]"
            >
                {() => (
                    <>
                      {uiText("sequencer.saved_sources", "Saved sources")}
                    </>
                  )}
            </CustomizableLabel>
            <span className="text-[8.5px] font-mono text-slate-500">
              {sources.length} sources
            </span>
          </div>

          <div
            className="grid min-h-0 flex-1 grid-cols-4 gap-1.5 overflow-y-auto"
            style={{ gridTemplateRows: `repeat(${Math.max(8, Math.ceil(sources.length / 4))}, minmax(40px, 1fr))` }}
          >
            {Array.from({ length: Math.max(32, sources.length) }, (_, index) => {
              const source = sources[index];
              if (!source) {
                return (
                  <div
                    key={`empty-source-${index}`}
                    className="rounded-md border border-dashed border-slate-800 bg-[#07101d]"
                  />
                );
              }
              const selected = selectedSourceId === source.id;
              return (
                <CustomizableButton
                  buttonId="sequencer_panel_btn_12"
                  key={source.id}
type="button"
onClick={() => handleSourceClick(source)}
title={`${source.name} — assign to slot #${selectedSlot}`}
className={cn(
                    "group relative min-h-0 overflow-hidden rounded-md border bg-black transition-all cursor-pointer",
                    selected
                      ? "border-emerald-400 shadow-[0_0_8px_rgba(0,223,145,0.35)] ring-1 ring-emerald-400"
                      : "border-slate-800 opacity-90 hover:opacity-100",
                  )}
                >
                    {() => (
                        <>
                          <img src={source.url} alt={source.name} className="h-full w-full object-cover" />
                        {selected && (
                    <span className="absolute right-0.5 top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                      <Check className="h-2 w-2 stroke-[3]" />
                    </span>
                  )}
                        </>
                      )}
                </CustomizableButton>
              );
            })}
          </div>

          <div className="mt-1 flex h-6 shrink-0 items-center justify-between gap-1 px-0.5">
            <div className="flex items-center gap-1">
            <CustomizableButton
              buttonId="sequencer_panel_btn_11"
              defaultIcon={<ImagePlus className="h-2.5 w-2.5" />}
              type="button"
onClick={() => sourceUploadRef.current?.click()}
className="flex h-[18px] items-center gap-1 rounded-md border border-emerald-400/60 bg-emerald-950/40 px-2 text-[8.5px] font-bold text-emerald-300 hover:bg-emerald-900/60 cursor-pointer transition-colors"
            >
                {() => (
                    <>
                      <span>+ Image</span>
                    </>
                  )}
            </CustomizableButton>
            <CustomizableButton
              buttonId="sequencer_panel_btn_12"
              defaultIcon={<Images className="h-2.5 w-2.5" />}
              type="button"
onClick={() => setLibraryOpen(true)}
title="Add saved sources from the asset library"
className="flex h-[18px] items-center gap-1 rounded-md border border-emerald-400/60 bg-emerald-950/40 px-2 text-[8.5px] font-bold text-emerald-300 hover:bg-emerald-900/60 cursor-pointer transition-colors"
            >
                {() => (
                    <>
                      <span>+ Library</span>
                    </>
                  )}
            </CustomizableButton>
            </div>
            <CustomizableButton
              buttonId="sequencer_panel_btn_10"
              defaultIcon={<Trash2 className="h-2.5 w-2.5" />}
              type="button"
onClick={handleDeleteSelectedSource}
title={uiText("sequencer.delete_source.title", "Delete selected saved source")}
className="flex h-[18px] items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-[8.5px] text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
            />
          </div>
        </section>
        <section aria-label="Sequencer timing" className={cn(CONTROL_SURFACE, "order-3 flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden p-3 lg:order-4 lg:col-start-1 lg:row-start-2")}>
          <div className="flex items-center gap-2">
            {/* No transport here: the single stop button in the front-page header
                starts and stops every animation, so the sequencer only reports
                and tunes the airing sequence. */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  {uiText("sequencer.transport", "Transport")}
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-300">
                  Step {Math.min(state.currentStep, runtimePath.length || 1)}/{runtimePath.length}
                </span>
              </div>
              <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-[#18263b]">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-200"
                  style={{
                    width: `${runtimePath.length ? (Math.min(state.currentStep, runtimePath.length) / runtimePath.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <span className="text-[8.5px] font-mono text-slate-400 shrink-0">
              Speed: {effectiveSequencerInterval(state.stepIntervalMs, state.timingScale)}ms
            </span>
            <input
              type="range"
              min={120}
              max={2500}
              step={20}
              value={state.stepIntervalMs}
              onChange={(event) => updateState({ stepIntervalMs: Number(event.target.value) })}
              aria-label="Sequence speed in milliseconds"
              className="sequencer-range h-1 w-full cursor-pointer rounded-full"
            />
          </div>
        </section>
        <section aria-label="Sequence tools" className="order-4 flex min-h-[100px] items-center justify-center gap-2 lg:order-5 lg:col-start-2 lg:row-start-2">
          <CustomizableButton
            buttonId="sequencer_open_flip_me" defaultLabel="Sequence" showLabelAlways
            onClick={onOpenFlipMe} disabled={!onOpenFlipMe}
            title="Open the shared route painter" aria-label="Open the shared route painter"
            className="cursor-pointer rounded-lg border border-violet-400/70 bg-violet-900/70 px-3 py-2 text-sm font-bold text-violet-100 shadow-sm transition-colors hover:bg-violet-800 disabled:opacity-40"
          />
          <CustomizableButton
            buttonId="sequencer_open_preset_studio" defaultLabel="Path" showLabelAlways
            onClick={() => setShowPresetStudio(true)} title="Open sequence path library" aria-label="Open sequence path library"
            className="cursor-pointer rounded-lg border border-cyan-500/60 bg-cyan-950/80 px-3 py-2 text-sm text-cyan-200 transition-colors hover:bg-cyan-900"
          />
          <CustomizableButton
            buttonId="sequencer_open_more_warps" defaultLabel="Warp" showLabelAlways
            onClick={() => setShowMoreWarpsPopup(true)} title="Open warp distortion presets" aria-label="Open warp distortion presets"
            className="cursor-pointer rounded-lg border border-cyan-500/60 bg-cyan-950/80 px-3 py-2 text-sm text-cyan-200 transition-colors hover:bg-cyan-900"
          />
        </section>
      </div>

      {/* DROPPED DOWN TO THE END: Sequencer bypassed panel + Front screen lock icons toggle */}
      <section className={cn(CONTROL_SURFACE, "min-h-[46px] shrink-0 flex-wrap rounded-xl px-3 py-2 flex items-center justify-between gap-3")}>
        {/* Left: Sequencer bypassed switch */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <GitBranch className={cn("h-4 w-4", state.bypassed ? "text-slate-500" : "text-emerald-400")} />
            <span className="text-xs font-bold text-white">
              {state.bypassed ? "Sequencer bypassed" : "Sequencer active"}
            </span>
          </div>

          <CustomizableButton
            buttonId="sequencer_panel_btn_1"
            type="button"
onClick={toggleBypass}
title={state.bypassed ? "Transmit sequence to front page" : "Bypass front-page sequence"}
className={cn(
              "relative h-5 w-10 shrink-0 rounded-full p-[2px] transition-colors cursor-pointer",
              state.bypassed ? "bg-slate-700" : "bg-[#00d68a]",
            )}
          >
              {() => (
                  <>
                    <span
              className={cn(
                "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                !state.bypassed && "translate-x-5",
              )}
            />
                  </>
                )}
          </CustomizableButton>
        </div>

        {/* Center: Live runtime chips */}
        <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Slot: <strong className="text-cyan-300">{activeRuntimeSlot ? `#${activeRuntimeSlot}` : "—"}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Mode: <strong className="text-slate-200">{state.wrapMode}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Warp: <strong className="text-slate-200">{state.warp}</strong>
          </span>
        </div>

        {/* Right: Front screen lock icon representation toggle + Unlock all button */}
        <div className="flex items-center gap-2 shrink-0">
          <CustomizableButton
            buttonId="sequencer_panel_toggle_mouse_over_locked_icon_repr"
            defaultIcon={<Lock className="w-2.5 h-2.5 text-emerald-400" />}
            type="button"
onClick={toggleMouseOverLockIcons}
title="Toggle mouse-over locked icon representation on front screen (Default: Off)"
className={cn(
              "h-[24px] px-2 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs active:scale-95",
              state.showMouseOverLockIcons
                ? "border-emerald-400/80 bg-emerald-950/60 text-emerald-300 shadow-[0_0_8px_rgba(0,223,145,0.3)]"
                : "border-slate-700 bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:border-slate-600",
            )}
          >
              {() => (
                  <>
                    <span>Front screen lock icons:</span>
                  <strong className={state.showMouseOverLockIcons ? "text-emerald-300" : "text-slate-500"}>
              {state.showMouseOverLockIcons ? "ON" : "OFF"}
            </strong>
                  </>
                )}
          </CustomizableButton>

          <CustomizableButton
            buttonId="sequencer_panel_unlock_and_clear_all_secondary_win"
            defaultIcon={<RotateCcw className="w-2.5 h-2.5" />}
            type="button"
onClick={handleClearAllSecondary}
title="Unlock and clear all secondary window assignments"
className="h-[24px] px-2 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 cursor-pointer transition-colors"
          >
              {() => (
                  <>
                    <span>Reset windows</span>
                  </>
                )}
          </CustomizableButton>
        </div>
      </section>
      <AssetPicker
        open={libraryOpen}
        title="Add sources from library"
        onClose={() => setLibraryOpen(false)}
        onSend={handleLibrarySend}
      />
    </div>
  );
};
