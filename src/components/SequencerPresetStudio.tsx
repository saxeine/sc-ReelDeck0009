import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  Save,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { CustomizableContainer } from "./CustomizableContainer";
import { CustomizableLabel } from "./CustomizableLabel";
import { CustomizableButton } from "./CustomizableButton";
import { WarpPresetsPopup } from "./WarpPresetsPopup";
import { SEQUENCER_SOURCE_IMAGES, type SequencerPanelState } from "./SequencerPanel";
import {
  BUILTIN_SEQUENCER_PRESETS,
  SEQUENCER_WARP_PRESETS,
  deleteSequencerPreset,
  effectiveSequencerInterval,
  getPresetPath,
  getSequencerWarpTransform,
  listSequencerPresets,
  parseSequencerPath,
  saveSequencerPreset,
  sequencerImageStretch,
  type CustomSequencerPreset,
  type SequencerPreset,
  type SequencerTurnMode,
  type SequencerWarp,
  type SequencerWrapMode,
} from "../utils/sequencerPresets";
import { remoteStore } from "../services/remoteKeyValueStore";
import { getStoredJson, saveStoredJson } from "../utils/idbStorage";

type Props = {
  totalSlots: number;
  state: SequencerPanelState;
  setState: React.Dispatch<React.SetStateAction<SequencerPanelState>>;
  boxImages?: Record<number, string>;
  onClose: () => void;
};

type Draft = Pick<
  CustomSequencerPreset,
  "wrapMode" | "turnMode" | "warp" | "stepIntervalMs" | "timingScale" | "stretchX" | "stretchY"
>;

interface StudioPanelsUiState {
  showMotionDialog: boolean;
  showStretchDialog: boolean;
  previewPlaying: boolean;
}

const STUDIO_PANELS_UI_KEY = "seqcarver_sequencer_studio_panels_ui_v1";

const button =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer";
const field =
  "rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100";

function loadInitialStudioUi(): StudioPanelsUiState {
  try {
    const raw = remoteStore.getItem(STUDIO_PANELS_UI_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudioPanelsUiState>;
      return {
        showMotionDialog: typeof parsed.showMotionDialog === "boolean" ? parsed.showMotionDialog : true,
        showStretchDialog: typeof parsed.showStretchDialog === "boolean" ? parsed.showStretchDialog : true,
        previewPlaying: typeof parsed.previewPlaying === "boolean" ? parsed.previewPlaying : true,
      };
    }
  } catch {}
  return {
    showMotionDialog: true,
    showStretchDialog: true,
    previewPlaying: true,
  };
}

/** Device-local path library, staged draft live preview, editor, and live transport. Edits are staged until Apply. */
export function SequencerPresetStudio({ totalSlots, state, setState, boxImages, onClose }: Props) {
  const [saved, setSaved] = useState<CustomSequencerPreset[]>([]);
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [selected, setSelected] = useState<SequencerPreset>(state.preset);
  const [pathText, setPathText] = useState(state.path.filter((slot) => slot <= totalSlots).join(", "));
  const [draft, setDraft] = useState<Draft>({
    wrapMode: state.wrapMode,
    turnMode: state.turnMode,
    warp: state.warp,
    stepIntervalMs: state.stepIntervalMs,
    timingScale: state.timingScale ?? 1,
    stretchX: state.stretchX ?? 1,
    stretchY: state.stretchY ?? 1,
  });

  const initialUi = useMemo(() => loadInitialStudioUi(), []);
  const [showMotionDialog, setShowMotionDialog] = useState<boolean>(initialUi.showMotionDialog);
  const [showStretchDialog, setShowStretchDialog] = useState<boolean>(initialUi.showStretchDialog);
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(initialUi.previewPlaying);
  const [previewStepIndex, setPreviewStepIndex] = useState<number>(0);
  const [previewDirection, setPreviewDirection] = useState<1 | -1>(1);
  const [showMoreWarps, setShowMoreWarps] = useState<boolean>(false);
  const [failedPreviewImages, setFailedPreviewImages] = useState<Record<string, boolean>>({});

  const closeRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;

  const persistStudioUi = (nextMotion: boolean, nextStretch: boolean, nextPreviewPlay: boolean) => {
    const payload: StudioPanelsUiState = {
      showMotionDialog: nextMotion,
      showStretchDialog: nextStretch,
      previewPlaying: nextPreviewPlay,
    };
    try {
      remoteStore.setItem(STUDIO_PANELS_UI_KEY, JSON.stringify(payload));
    } catch {}
    saveStoredJson("sequencer_studio_panels_ui", payload).catch(() => {});
  };

  useEffect(() => {
    let active = true;
    getStoredJson<StudioPanelsUiState>("sequencer_studio_panels_ui")
      .then((cloudUi) => {
        if (!active || !cloudUi) return;
        if (typeof cloudUi.showMotionDialog === "boolean") setShowMotionDialog(cloudUi.showMotionDialog);
        if (typeof cloudUi.showStretchDialog === "boolean") setShowStretchDialog(cloudUi.showStretchDialog);
        if (typeof cloudUi.previewPlaying === "boolean") setPreviewPlaying(cloudUi.previewPlaying);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showMoreWarps) return;
        event.preventDefault();
        event.stopPropagation();
        closeHandler.current();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
        ) || []
      );
      const index = nodes.indexOf(document.activeElement as HTMLElement);
      if (nodes.length && event.shiftKey && index <= 0) {
        event.preventDefault();
        nodes[nodes.length - 1].focus();
      }
      if (nodes.length && !event.shiftKey && (index < 0 || index === nodes.length - 1)) {
        event.preventDefault();
        nodes[0].focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (before?.isConnected) before.focus();
    };
  }, [showMoreWarps]);

  useEffect(() => {
    let active = true;
    listSequencerPresets()
      .then((items) => {
        if (active) setSaved(items);
      })
      .catch(() => {
        if (active) {
          setStorageError("Device preset storage is unavailable. You can still apply a path, but cannot save it.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const runtimePath = useMemo(
    () => state.path.filter((n) => n >= 1 && n <= totalSlots && state.activeSlots.includes(n)),
    [state.path, state.activeSlots, totalSlots]
  );

  let path: number[] = [];
  let pathError = "";
  try {
    path = parseSequencerPath(pathText, totalSlots);
  } catch (e) {
    pathError = e instanceof Error ? e.message : "Invalid path";
  }

  const pathSet = new Set(path);
  const activePreviewSteps = useMemo(() => {
    const filtered = path.filter((slot) => state.activeSlots.includes(slot));
    return filtered.length > 0 ? filtered : path;
  }, [path, state.activeSlots]);

  const previewIntervalMs = effectiveSequencerInterval(draft.stepIntervalMs, draft.timingScale);

  // Reset preview index when staged path length shrinks
  useEffect(() => {
    setPreviewStepIndex((idx) => (activePreviewSteps.length ? idx % activePreviewSteps.length : 0));
    setPreviewDirection(1);
  }, [pathText, draft.wrapMode, activePreviewSteps.length]);

  // Real-time staged draft preview ticker
  useEffect(() => {
    if (!previewPlaying || activePreviewSteps.length <= 1) return;
    const timer = window.setInterval(() => {
      setPreviewStepIndex((currentIdx) => {
        const len = activePreviewSteps.length;
        if (len <= 1) return 0;
        if (draft.wrapMode === "pingpong") {
          const next = currentIdx + previewDirection;
          if (next >= len) {
            setPreviewDirection(-1);
            return Math.max(0, len - 2);
          }
          if (next < 0) {
            setPreviewDirection(1);
            return Math.min(len - 1, 1);
          }
          return next;
        }
        if (draft.wrapMode === "once") {
          if (currentIdx + 1 >= len) {
            setPreviewPlaying(false);
            return len - 1;
          }
          return currentIdx + 1;
        }
        return (currentIdx + 1) % len;
      });
    }, previewIntervalMs);
    return () => window.clearInterval(timer);
  }, [previewPlaying, activePreviewSteps.length, draft.wrapMode, previewDirection, previewIntervalMs]);

  const currentPreviewSlot = activePreviewSteps.length
    ? activePreviewSteps[Math.min(previewStepIndex, activePreviewSteps.length - 1)]
    : null;

  const changePath = (value: string) => {
    setPathText(value);
    setSelected("custom");
    setError("");
    setNotice("");
  };

  const loadBuiltin = (id: SequencerPreset) => {
    setSelected(id);
    setEditingName(null);
    setName("");
    setPathText(getPresetPath(id, totalSlots).join(", "));
    setPreviewStepIndex(0);
    setPreviewDirection(1);
    setError("");
    setNotice("");
  };

  const loadSaved = (preset: CustomSequencerPreset) => {
    setSelected("custom");
    setEditingName(preset.name);
    setName(preset.name);
    setPathText(preset.path.join(", "));
    setDraft({
      wrapMode: preset.wrapMode,
      turnMode: preset.turnMode,
      warp: preset.warp,
      stepIntervalMs: preset.stepIntervalMs,
      timingScale: preset.timingScale,
      stretchX: preset.stretchX,
      stretchY: preset.stretchY,
    });
    setPreviewStepIndex(0);
    setPreviewDirection(1);
    setError("");
    setNotice(`Loaded ${preset.name} for editing.`);
  };

  const save = async () => {
    if (pathError) {
      setError(pathError);
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name for this preset.");
      return;
    }
    if (saved.some((preset) => preset.name === trimmed) && editingName !== trimmed) {
      setError("A preset with this name exists. Select it to update it, or choose another name.");
      return;
    }
    try {
      await saveSequencerPreset({ name: trimmed, totalSlots, path, ...draft });
      setSaved(await listSequencerPresets());
      setEditingName(trimmed);
      setSelected("custom");
      setError("");
      setNotice(`Saved “${trimmed}” on this device.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preset.");
    }
  };

  const remove = async (preset: CustomSequencerPreset) => {
    if (confirmDeleteName !== preset.name) {
      setConfirmDeleteName(preset.name);
      return;
    }
    setConfirmDeleteName(null);
    try {
      await deleteSequencerPreset(preset.name);
      setSaved(await listSequencerPresets());
      if (editingName === preset.name) setEditingName(null);
      setError("");
      setNotice(`Deleted “${preset.name}”.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete preset.");
    }
  };

  const apply = () => {
    if (pathError) {
      setError(pathError);
      return;
    }
    setState((prev) => ({
      ...prev,
      ...draft,
      preset: selected,
      path,
      customPath: selected === "custom" ? path : undefined,
      customGridSlots: selected === "custom" ? totalSlots : undefined,
      currentStep: 1,
      direction: 1,
    }));
    onClose();
  };

  const transport = (action: "reset" | "previous" | "next" | "play") => {
    setState((prev) => {
      const length = prev.path.filter((n) => n >= 1 && n <= totalSlots && prev.activeSlots.includes(n)).length;
      if (!length) return { ...prev, playing: false };
      const step = Math.max(1, Math.min(prev.currentStep, length));
      if (action === "play") {
        return { ...prev, playing: !prev.playing, manualStep: prev.playing, bypassed: false, currentStep: step };
      }
      if (action === "reset") {
        return { ...prev, currentStep: 1, direction: 1, manualStep: true, bypassed: false };
      }
      return {
        ...prev,
        currentStep: action === "previous" ? (step === 1 ? length : step - 1) : step === length ? 1 : step + 1,
        direction: 1,
        manualStep: true,
        bypassed: false,
      };
    });
  };

  const numberField = (
    displayLabel: string,
    ariaLabel: string,
    key: "stepIntervalMs" | "timingScale" | "stretchX" | "stretchY",
    min: number,
    max: number,
    step: number,
    suffix: string
  ) => (
    <CustomizableLabel
      labelId="sequencer_preset_studio_item_4"
      as="label"
      className="flex flex-col gap-1 text-xs text-slate-300"
    >
        {() => (
            <>
              <span className="flex items-center justify-between gap-1">
        <span>{displayLabel}</span>
        <strong className="font-mono tabular-nums text-cyan-200">
          {draft[key]}
          {suffix}
        </strong>
      </span>
            <input
        aria-label={ariaLabel}
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft[key]}
        onChange={(event) => setDraft((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
        className="w-full accent-cyan-400 cursor-pointer"
      />
            </>
          )}
    </CustomizableLabel>
  );

  const gridSide = Math.sqrt(totalSlots);

  const getPreviewTileStyle = (isActiveTile: boolean): React.CSSProperties => {
    if (!isActiveTile) return {};
    const style: React.CSSProperties = {
      transition: `transform ${Math.min(previewIntervalMs * 0.45, 380)}ms cubic-bezier(0.2, 0.9, 0.3, 1.2)`,
    };
    const warpCss = getSequencerWarpTransform(draft.warp);
    if (draft.warp !== "none" && warpCss) {
      style.transform = warpCss;
    }
    if (draft.turnMode === "spin") {
      style.animation = "sequencer-spin 0.9s linear infinite";
    } else if (draft.turnMode === "pulse") {
      style.animation = "sequencer-pulse 0.75s ease-in-out infinite";
    }
    if (!previewPlaying) {
      style.animationPlayState = "paused";
    }
    return style;
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-3">
      {showMoreWarps && (
        <WarpPresetsPopup
          activeWarp={draft.warp}
          previewImageUrl={
            (currentPreviewSlot && (state.secondaryImages[currentPreviewSlot] || boxImages?.[currentPreviewSlot])) ||
            boxImages?.[1] ||
            SEQUENCER_SOURCE_IMAGES[0]
          }
          onSelectWarp={(warp) => setDraft((prev) => ({ ...prev, warp }))}
          onClose={() => setShowMoreWarps(false)}
        />
      )}

      <CustomizableContainer
        ref={dialogRef}
        ibcId="sequencer_preset_studio_modal"
        componentType="modal"
        defaultTitle="Sequence path library"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sequence-preset-studio-title"
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#071321] text-slate-100 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <CustomizableLabel
              id="sequence-preset-studio-title"
              labelId="sequencer_preset_studio_title"
              defaultLabel="Sequence path library"
              as="h2"
              className="text-lg font-bold"
            />
            <p className="text-xs text-slate-400">
              <span className="font-mono tabular-nums">{totalSlots}</span> slots · Custom presets are saved on this device.
            </p>
          </div>
          <CustomizableButton
            ref={closeRef}
            buttonId="sequencer_preset_close"
            defaultLabel="Close"
            defaultIcon={<X className="h-4 w-4" />}
            forceZeroText
            aria-label="Close sequence path library"
            onClick={onClose}
            className={button}
          />
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[268px_1fr]">
          {/* LEFT ASIDE: Doubled-up Built-in paths + Actual Live Preview + Saved Presets */}
          <aside className="space-y-3 min-w-0">
            <CustomizableContainer
              ibcId="sequencer_preset_builtin_panel"
              componentType="panel"
              defaultTitle="Built-in paths"
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <CustomizableLabel
                  labelId="sequencer_preset_builtin_heading"
                  defaultLabel="Built-in paths"
                  as="h3"
                  className="text-sm font-bold text-cyan-300"
                />
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {BUILTIN_SEQUENCER_PRESETS.length} paths
                </span>
              </div>
              {/* Doubled up (2 columns) across all breakpoints */}
              <div className="grid max-h-52 grid-cols-2 gap-1 overflow-y-auto pr-0.5">
                {BUILTIN_SEQUENCER_PRESETS.map((preset) => (
                  <CustomizableButton
                    key={preset.id}
                    buttonId="sequencer_preset_builtin"
                    onClick={() => loadBuiltin(preset.id)}
                    title={preset.description}
                    aria-pressed={selected === preset.id}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-left truncate transition-colors cursor-pointer",
                      selected === preset.id
                        ? "border-cyan-400 bg-cyan-950 text-cyan-100"
                        : "border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400"
                    )}
                  >
                    {() => <span className="truncate block">{preset.name}</span>}
                  </CustomizableButton>
                ))}
              </div>
            </CustomizableContainer>

            {/* ACTUAL LIVE PREVIEW OF STAGED DRAFT */}
            <CustomizableContainer
              ibcId="sequencer_preset_live_preview_panel"
              componentType="panel"
              defaultTitle="Live preview"
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-1.5">
                <CustomizableLabel
                  labelId="sequencer_preset_live_preview_heading"
                  defaultLabel="Live preview"
                  as="h3"
                  className="text-xs font-bold text-cyan-300"
                />
                <div className="flex items-center gap-1">
                  <CustomizableButton
                    buttonId="sequencer_preset_preview_reset"
                    defaultLabel="Reset preview"
                    defaultIcon={<RotateCcw className="h-3 w-3" />}
                    forceZeroText
                    aria-label="Restart live preview"
                    title="Restart live preview at step 1"
                    onClick={() => {
                      setPreviewStepIndex(0);
                      setPreviewDirection(1);
                      setPreviewPlaying(true);
                      persistStudioUi(showMotionDialog, showStretchDialog, true);
                    }}
                    className="rounded-md border border-slate-700 bg-slate-900 p-1 text-slate-300 hover:border-cyan-400 cursor-pointer"
                  />
                  <CustomizableButton
                    buttonId="sequencer_preset_preview_play"
                    defaultLabel={previewPlaying ? "Pause" : "Play"}
                    defaultIcon={previewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    showLabelAlways
                    aria-label={previewPlaying ? "Pause live preview" : "Play live preview"}
                    onClick={() => {
                      const next = !previewPlaying;
                      if (next && draft.wrapMode === "once" && previewStepIndex >= activePreviewSteps.length - 1) {
                        setPreviewStepIndex(0);
                      }
                      setPreviewPlaying(next);
                      persistStudioUi(showMotionDialog, showStretchDialog, next);
                    }}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="mx-auto aspect-square w-full max-w-[184px] rounded-xl border border-slate-800 bg-[#040a13] p-1.5 overflow-hidden">
                <div
                  className="grid h-full w-full gap-1"
                  style={{ gridTemplateColumns: `repeat(${gridSide}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: totalSlots }, (_, idx) => idx + 1).map((slot) => {
                    const isSlotEnabled = state.activeSlots.includes(slot);
                    const isCurrent = currentPreviewSlot === slot && !pathError;
                    const inPath = pathSet.has(slot);
                    const imgSrc = isCurrent
                      ? state.secondaryImages[slot] ||
                        boxImages?.[slot] ||
                        SEQUENCER_SOURCE_IMAGES[(slot - 1) % SEQUENCER_SOURCE_IMAGES.length]
                      : boxImages?.[slot] ||
                        SEQUENCER_SOURCE_IMAGES[(slot - 1) % SEQUENCER_SOURCE_IMAGES.length];
                    const imgKey = `${slot}:${imgSrc}`;

                    return (
                      <div
                        key={`live-prev-slot-${slot}`}
                        style={getPreviewTileStyle(isCurrent)}
                        className={cn(
                          "relative overflow-hidden rounded-md border flex items-center justify-center",
                          isCurrent
                            ? "border-cyan-300 ring-1 ring-cyan-400/70 z-10"
                            : inPath && isSlotEnabled
                            ? "border-cyan-500/35"
                            : "border-slate-800/80 opacity-45"
                        )}
                      >
                        {imgSrc && !failedPreviewImages[imgKey] ? (
                          <img
                            src={imgSrc}
                            alt={`Slot ${slot}`}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedPreviewImages((prev) => ({ ...prev, [imgKey]: true }))
                            }
                            style={sequencerImageStretch(draft.stretchX, draft.stretchY, isCurrent)}
                            className="h-full w-full object-cover transition-transform duration-150"
                          />
                        ) : (
                          <div
                            style={sequencerImageStretch(draft.stretchX, draft.stretchY, isCurrent)}
                            className={cn(
                              "h-full w-full flex items-center justify-center",
                              isCurrent ? "bg-cyan-900/70" : "bg-slate-900/80"
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "pointer-events-none absolute bottom-0.5 right-0.5 rounded px-1 text-[9px] font-mono font-bold tabular-nums leading-tight",
                            isCurrent ? "bg-cyan-400 text-slate-950" : "bg-black/70 text-slate-200"
                          )}
                        >
                          {slot}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                <span>
                  {pathError
                    ? "Invalid path"
                    : `Step ${Math.min(previewStepIndex + 1, Math.max(1, activePreviewSteps.length))}/${activePreviewSteps.length}`}
                </span>
                <span>·</span>
                <span className="text-cyan-300">{currentPreviewSlot ? `Slot #${currentPreviewSlot}` : "—"}</span>
                <span>·</span>
                <span className="capitalize">{draft.warp}</span>
              </div>
            </CustomizableContainer>

            {/* SAVED ON THIS DEVICE */}
            <CustomizableContainer
              ibcId="sequencer_preset_saved_panel"
              componentType="panel"
              defaultTitle="Saved on this device"
              className="space-y-1.5"
            >
              <CustomizableLabel
                labelId="sequencer_preset_saved_heading"
                defaultLabel="Saved on this device"
                as="h3"
                className="text-sm font-bold text-cyan-300"
              />
              {storageError && (
                <p role="alert" className="text-xs text-amber-300">
                  {storageError}
                </p>
              )}
              {!saved.length && !storageError && (
                <p className="text-xs text-slate-400">No saved presets yet.</p>
              )}
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {saved.map((preset) => (
                  <div key={preset.name} className="flex gap-1">
                    <CustomizableButton
                      buttonId="sequencer_preset_load"
                      onClick={() => loadSaved(preset)}
                      disabled={preset.totalSlots !== totalSlots}
                      title={
                        preset.totalSlots !== totalSlots
                          ? `Switch to a ${Math.sqrt(preset.totalSlots)}×${Math.sqrt(preset.totalSlots)} grid to use this preset`
                          : `Edit ${preset.name}`
                      }
                      className={cn(button, "min-w-0 flex-1 truncate text-left")}
                    >
                      {() => (
                        <span className="truncate">
                          {preset.name} ({preset.totalSlots})
                        </span>
                      )}
                    </CustomizableButton>
                    <CustomizableButton
                      buttonId="sequencer_preset_delete"
                      defaultLabel={confirmDeleteName === preset.name ? "Confirm" : "Delete"}
                      defaultIcon={
                        confirmDeleteName === preset.name ? (
                          <Check className="h-3.5 w-3.5 text-rose-300" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )
                      }
                      forceZeroText={confirmDeleteName !== preset.name}
                      showLabelAlways={confirmDeleteName === preset.name}
                      aria-label={`Delete preset ${preset.name}`}
                      title={
                        confirmDeleteName === preset.name
                          ? `Click again to delete ${preset.name}`
                          : `Delete preset ${preset.name}`
                      }
                      onClick={() => void remove(preset)}
                      className={cn(
                        button,
                        confirmDeleteName === preset.name && "border-rose-400 bg-rose-950/70 text-rose-200"
                      )}
                    />
                  </div>
                ))}
              </div>
            </CustomizableContainer>
          </aside>

          {/* RIGHT MAIN WORKSPACE */}
          <div className="min-w-0 space-y-3.5">
            {/* 1. Configure path */}
            <CustomizableContainer
              ibcId="sequencer_preset_configure_path_panel"
              componentType="panel"
              defaultTitle="Configure path"
              as="section"
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
            >
              <CustomizableLabel
                labelId="sequencer_preset_configure_path_heading"
                defaultLabel="Configure path"
                as="h3"
                className="font-bold"
              />
              <p className="mt-1 text-xs text-slate-400">
                Click slots to append steps, or edit the ordered list. Repeated numbers revisit a slot. Only active matrix slots play.
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-4">
                <div
                  className="grid w-44 gap-1"
                  style={{ gridTemplateColumns: `repeat(${gridSide}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: totalSlots }, (_, i) => i + 1).map((slot) => (
                    <CustomizableButton
                      key={slot}
                      buttonId="sequencer_preset_slot"
                      onClick={() => changePath(pathText.trim() ? `${pathText.trim()}, ${slot}` : String(slot))}
                      aria-label={`Add slot ${slot} to path`}
                      title={`Append slot ${slot}`}
                      className={cn(
                        "h-9 rounded-md border text-xs font-bold font-mono tabular-nums cursor-pointer",
                        pathSet.has(slot)
                          ? "border-cyan-400 bg-cyan-950 text-cyan-100"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50"
                      )}
                    >
                      {() => <span>{slot}</span>}
                    </CustomizableButton>
                  ))}
                </div>
                <div className="min-w-[180px] flex-1">
                  <CustomizableLabel
                    labelId="sequencer_preset_ordered_slots_label"
                    defaultLabel="Ordered slots"
                    as="label"
                    htmlFor="sequence-path-input"
                    className="block text-xs text-slate-300"
                  />
                  <textarea
                    id="sequence-path-input"
                    value={pathText}
                    onChange={(e) => changePath(e.target.value)}
                    className={`${field} mt-1 h-20 w-full resize-y font-mono tabular-nums`}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <CustomizableButton
                      buttonId="sequencer_preset_undo"
                      showLabelAlways
                      defaultLabel="Remove last"
                      onClick={() =>
                        changePath(
                          pathText
                            .trim()
                            .split(/[\s,]+/)
                            .filter(Boolean)
                            .slice(0, -1)
                            .join(", ")
                        )
                      }
                      className={button}
                    />
                    <CustomizableButton
                      buttonId="sequencer_preset_clear"
                      showLabelAlways
                      defaultLabel="Clear path"
                      onClick={() => changePath("")}
                      className={button}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                    {pathError || `${path.length} steps`}
                  </p>
                </div>
              </div>
            </CustomizableContainer>

            {/* 2. Configure motion & stretch — Split in 2 with Show / Hide dialog controls */}
            <CustomizableContainer
              ibcId="sequencer_preset_motion_stretch_bar"
              componentType="panel"
              defaultTitle="Configure motion & stretch"
              as="section"
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CustomizableLabel
                    labelId="sequencer_preset_motion_stretch_heading"
                    defaultLabel="Configure motion & stretch"
                    as="h3"
                    className="font-bold text-sm"
                  />
                  <p className="text-[11px] text-slate-400">
                    <span className="capitalize">{draft.wrapMode}</span> · <span className="capitalize">{draft.turnMode}</span> · <span className="capitalize">{draft.warp}</span> · <span className="font-mono tabular-nums">{previewIntervalMs} ms</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <CustomizableButton
                    buttonId="sequencer_preset_toggle_motion_dialog"
                    defaultLabel={showMotionDialog ? "Hide motion & warp" : "Show motion & warp"}
                    defaultIcon={showMotionDialog ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    showLabelAlways
                    aria-expanded={showMotionDialog}
                    onClick={() => {
                      const next = !showMotionDialog;
                      setShowMotionDialog(next);
                      persistStudioUi(next, showStretchDialog, previewPlaying);
                    }}
                    className={cn(
                      button,
                      showMotionDialog && "border-cyan-500/60 bg-cyan-950/50 text-cyan-100"
                    )}
                  />
                  <CustomizableButton
                    buttonId="sequencer_preset_toggle_stretch_dialog"
                    defaultLabel={showStretchDialog ? "Hide timing & stretch" : "Show timing & stretch"}
                    defaultIcon={showStretchDialog ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    showLabelAlways
                    aria-expanded={showStretchDialog}
                    onClick={() => {
                      const next = !showStretchDialog;
                      setShowStretchDialog(next);
                      persistStudioUi(showMotionDialog, next, previewPlaying);
                    }}
                    className={cn(
                      button,
                      showStretchDialog && "border-cyan-500/60 bg-cyan-950/50 text-cyan-100"
                    )}
                  />
                </div>
              </div>

              {(showMotionDialog || showStretchDialog) && (
                <div
                  className={cn(
                    "grid gap-3 pt-1 border-t border-slate-800/80",
                    showMotionDialog && showStretchDialog ? "lg:grid-cols-2" : "grid-cols-1"
                  )}
                >
                  {/* Split Dialog 1: Motion & warp */}
                  {showMotionDialog && (
                    <CustomizableContainer
                      ibcId="sequencer_preset_motion_dialog"
                      componentType="panel"
                      defaultTitle="Motion & warp"
                      className="rounded-lg border border-slate-800/90 bg-[#06101d] p-2.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <CustomizableLabel
                          labelId="sequencer_preset_motion_subheading"
                          defaultLabel="Motion & warp"
                          as="h4"
                          className="text-xs font-bold text-cyan-300"
                        />
                        <CustomizableButton
                          buttonId="sequencer_preset_open_more_warps"
                          defaultLabel="More"
                          showLabelAlways
                          onClick={() => setShowMoreWarps(true)}
                          title="Open more warp distortion presets at the bottom"
                          className="rounded border border-cyan-500/60 bg-cyan-950 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900 cursor-pointer"
                        />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <CustomizableLabel
                          labelId="sequencer_preset_studio_item_3"
                          as="label"
                          className="flex flex-col gap-1 text-xs text-slate-300"
                        >
                            {() => (
                                <>
                                  <span>Playback</span>
                                <select
                            className={field}
                            value={draft.wrapMode}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, wrapMode: e.target.value as SequencerWrapMode }))
                            }
                          >
                            {(["loop", "pingpong", "once"] as const).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                                </>
                              )}
                        </CustomizableLabel>

                        <CustomizableLabel
                          labelId="sequencer_preset_studio_item_2"
                          as="label"
                          className="flex flex-col gap-1 text-xs text-slate-300"
                        >
                            {() => (
                                <>
                                  <span>Turn</span>
                                <select
                            className={field}
                            value={draft.turnMode}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, turnMode: e.target.value as SequencerTurnMode }))
                            }
                          >
                            {(["step", "spin", "pulse"] as const).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                                </>
                              )}
                        </CustomizableLabel>

                        <CustomizableLabel
                          labelId="sequencer_preset_studio_item_1"
                          as="label"
                          className="flex flex-col gap-1 text-xs text-slate-300"
                        >
                            {() => (
                                <>
                                  <span>Warp</span>
                                <select
                            className={field}
                            value={draft.warp}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, warp: e.target.value as SequencerWarp }))
                            }
                          >
                            {SEQUENCER_WARP_PRESETS.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.name}
                              </option>
                            ))}
                          </select>
                                </>
                              )}
                        </CustomizableLabel>
                      </div>
                    </CustomizableContainer>
                  )}

                  {/* Split Dialog 2: Timing & stretch */}
                  {showStretchDialog && (
                    <CustomizableContainer
                      ibcId="sequencer_preset_stretch_dialog"
                      componentType="panel"
                      defaultTitle="Timing & stretch"
                      className="rounded-lg border border-slate-800/90 bg-[#06101d] p-2.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <CustomizableLabel
                          labelId="sequencer_preset_stretch_subheading"
                          defaultLabel="Timing & stretch"
                          as="h4"
                          className="text-xs font-bold text-cyan-300"
                        />
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          Effective step: {previewIntervalMs} ms
                        </span>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {numberField("Base interval", "Base interval", "stepIntervalMs", 120, 2500, 20, " ms")}
                        {numberField("Timing stretch", "Timing stretch", "timingScale", 0.25, 4, 0.05, "×")}
                        {numberField("Image stretch x", "Image stretch X", "stretchX", 0.5, 2, 0.05, "×")}
                        {numberField("Image stretch y", "Image stretch Y", "stretchY", 0.5, 2, 0.05, "×")}
                      </div>
                    </CustomizableContainer>
                  )}
                </div>
              )}
            </CustomizableContainer>

            {/* 3. Live transport */}
            <CustomizableContainer
              ibcId="sequencer_preset_transport_panel"
              componentType="panel"
              defaultTitle="Live transport"
              as="section"
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
            >
              <CustomizableLabel
                labelId="sequencer_preset_transport_heading"
                defaultLabel="Live transport"
                as="h3"
                className="font-bold"
              />
              <p className="mt-1 text-xs text-slate-400">
                Controls the current sequence; apply your draft first to play it. Step{" "}
                <span className="font-mono tabular-nums">{Math.min(state.currentStep, runtimePath.length || 1)}</span> /{" "}
                <span className="font-mono tabular-nums">{runtimePath.length}</span>.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["reset", "Reset transport", RotateCcw],
                    ["previous", "Previous step", SkipBack],
                    ["play", state.playing ? "Pause" : "Play", state.playing ? Pause : Play],
                    ["next", "Next step", SkipForward],
                  ] as const
                ).map(([action, label, Icon]) => (
                  <CustomizableButton
                    key={action}
                    buttonId={`sequencer_transport_${action}`}
                    defaultLabel={label}
                    defaultIcon={<Icon className="h-4 w-4" />}
                    disabled={!runtimePath.length}
                    onClick={() => transport(action)}
                    aria-label={label}
                    className={button}
                  />
                ))}
              </div>
            </CustomizableContainer>

            {/* 4. Save custom preset */}
            <CustomizableContainer
              ibcId="sequencer_preset_save_custom_panel"
              componentType="panel"
              defaultTitle="Save custom preset"
              as="section"
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
            >
              <CustomizableLabel
                labelId="sequencer_preset_save_custom_label"
                defaultLabel="Save custom preset"
                as="label"
                htmlFor="sequence-preset-name"
                className="text-xs font-bold"
              />
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  id="sequence-preset-name"
                  value={name}
                  maxLength={80}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="Preset name"
                  className={`${field} min-w-0 flex-1`}
                />
                <CustomizableButton
                  buttonId="sequencer_preset_save"
                  showLabelAlways
                  defaultLabel={editingName === name.trim() && name.trim() !== "" ? "Update preset" : "Save preset"}
                  defaultIcon={<Save className="h-4 w-4" />}
                  disabled={!!storageError}
                  onClick={() => void save()}
                  className={button}
                />
              </div>
              {notice && (
                <p role="status" className="mt-2 text-xs text-emerald-300">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="mt-2 text-xs text-rose-300">
                  {error}
                </p>
              )}
            </CustomizableContainer>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-slate-800 px-4 py-3">
          <span className="text-xs text-slate-400">Changes apply only when you choose Apply.</span>
          <CustomizableButton
            buttonId="sequencer_preset_apply"
            showLabelAlways
            defaultLabel="Apply path"
            onClick={apply}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          />
        </footer>
      </CustomizableContainer>
    </div>
  );
}
