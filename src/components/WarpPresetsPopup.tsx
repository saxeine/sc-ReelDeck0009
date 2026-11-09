import React, { useEffect, useState } from "react";
import { Check, Pause, Play, Sparkles, X } from "lucide-react";
import { cn } from "../utils/cn";
import { CustomizableContainer } from "./CustomizableContainer";
import { CustomizableLabel } from "./CustomizableLabel";
import { CustomizableButton } from "./CustomizableButton";
import {
  SEQUENCER_WARP_PRESETS,
  type SequencerWarp,
} from "../utils/sequencerPresets";
import { remoteStore } from "../services/remoteKeyValueStore";
import { getStoredJson, saveStoredJson } from "../utils/idbStorage";

interface WarpPresetsPopupProps {
  activeWarp: SequencerWarp;
  previewImageUrl?: string;
  onSelectWarp: (warp: SequencerWarp) => void;
  onClose: () => void;
}

type WarpFilterGroup = "all" | "core" | "extended";

interface WarpPopupUiState {
  filterGroup: WarpFilterGroup;
  animateTiles: boolean;
}

const WARP_POPUP_UI_KEY = "seqcarver_warp_popup_ui_v1";

export const WarpPresetsPopup: React.FC<WarpPresetsPopupProps> = ({
  activeWarp,
  previewImageUrl,
  onSelectWarp,
  onClose,
}) => {
  const [filterGroup, setFilterGroup] = useState<WarpFilterGroup>(() => {
    try {
      const raw = remoteStore.getItem(WARP_POPUP_UI_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WarpPopupUiState>;
        if (parsed.filterGroup === "all" || parsed.filterGroup === "core" || parsed.filterGroup === "extended") {
          return parsed.filterGroup;
        }
      }
    } catch {}
    return "all";
  });

  const [animateTiles, setAnimateTiles] = useState<boolean>(() => {
    try {
      const raw = remoteStore.getItem(WARP_POPUP_UI_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WarpPopupUiState>;
        if (typeof parsed.animateTiles === "boolean") return parsed.animateTiles;
      }
    } catch {}
    return true;
  });

  const [pulsePhase, setPulsePhase] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getStoredJson<WarpPopupUiState>("sequencer_warp_popup_ui")
      .then((saved) => {
        if (!mounted || !saved) return;
        if (saved.filterGroup === "all" || saved.filterGroup === "core" || saved.filterGroup === "extended") {
          setFilterGroup(saved.filterGroup);
        }
        if (typeof saved.animateTiles === "boolean") {
          setAnimateTiles(saved.animateTiles);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const persistUiState = (nextFilter: WarpFilterGroup, nextAnimate: boolean) => {
    const payload: WarpPopupUiState = {
      filterGroup: nextFilter,
      animateTiles: nextAnimate,
    };
    try {
      remoteStore.setItem(WARP_POPUP_UI_KEY, JSON.stringify(payload));
    } catch {}
    saveStoredJson("sequencer_warp_popup_ui", payload).catch(() => {});
  };

  useEffect(() => {
    if (!animateTiles) {
      setPulsePhase(true);
      return;
    }
    const timer = window.setInterval(() => {
      setPulsePhase((prev) => !prev);
    }, 1100);
    return () => window.clearInterval(timer);
  }, [animateTiles]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filteredPresets = SEQUENCER_WARP_PRESETS.filter((preset) =>
    filterGroup === "all" ? true : preset.group === filterGroup
  );

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[170] flex items-end justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <CustomizableContainer
        ibcId="sequencer_more_warps_popup"
        componentType="modal"
        defaultTitle="More warp presets"
        role="dialog"
        aria-modal="true"
        aria-label="More warp presets"
        className="w-full max-w-5xl rounded-2xl border border-cyan-500/40 bg-[#061220] text-slate-100 shadow-2xl overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <CustomizableLabel
                labelId="sequencer_more_warps_title"
                defaultLabel="More warp presets"
                as="h3"
                className="text-sm font-bold text-slate-100 truncate"
              />
              <p className="text-[11px] text-slate-400 truncate">
                Select a distortion preset for active sequence tiles · <span className="font-mono tabular-nums">{SEQUENCER_WARP_PRESETS.length}</span> available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 border border-slate-800 p-0.5">
              {(
                [
                  ["all", "All warps"],
                  ["core", "Core"],
                  ["extended", "Extended"],
                ] as const
              ).map(([id, label]) => (
                <CustomizableButton
                  key={id}
                  buttonId={`sequencer_more_warps_filter_${id}`}
                  defaultLabel={label}
                  showLabelAlways
                  onClick={() => {
                    setFilterGroup(id);
                    persistUiState(id, animateTiles);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                    filterGroup === id
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  )}
                />
              ))}
            </div>

            <CustomizableButton
              buttonId="sequencer_more_warps_animate_toggle"
              defaultLabel={animateTiles ? "Pause preview" : "Animate preview"}
              defaultIcon={animateTiles ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              showLabelAlways
              onClick={() => {
                const next = !animateTiles;
                setAnimateTiles(next);
                persistUiState(filterGroup, next);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400 whitespace-nowrap shrink-0 cursor-pointer"
            />

            <CustomizableButton
              buttonId="sequencer_more_warps_close"
              defaultLabel="Close"
              defaultIcon={<X className="h-4 w-4" />}
              forceZeroText
              aria-label="Close warp presets popup"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
            />
          </div>
        </div>

        <div className="max-h-[48vh] overflow-y-auto p-3.5 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
            {filteredPresets.map((preset) => {
              const isSelected = activeWarp === preset.id;
              const previewTransform =
                preset.id === "none"
                  ? "none"
                  : !animateTiles || pulsePhase
                  ? preset.transform
                  : "none";

              return (
                <CustomizableButton
                  key={preset.id}
                  buttonId={`sequencer_warp_preset_${preset.id}`}
                  defaultLabel={preset.name}
                  title={preset.description}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelectWarp(preset.id);
                    onClose();
                  }}
                  className={cn(
                    "group flex flex-col items-stretch gap-2 rounded-xl border p-2 text-left transition-colors cursor-pointer",
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/60 text-cyan-100"
                      : "border-slate-800 bg-[#081728] text-slate-200 hover:border-cyan-500/60 hover:bg-[#0b1f35]"
                  )}
                >
                  {() => (
                    <>
                      <div className="relative flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-[#040a14] border border-slate-800/80 p-2">
                        <div
                          style={{
                            transform: previewTransform,
                            transition: "transform 360ms cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                          className={cn(
                            "h-10 w-10 rounded-md border overflow-hidden relative flex items-center justify-center",
                            isSelected ? "border-cyan-300" : "border-cyan-500/50"
                          )}
                        >
                          {previewImageUrl ? (
                            <img
                              src={previewImageUrl}
                              alt={preset.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              className="h-full w-full"
                              style={{
                                backgroundImage:
                                  "linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(16,185,129,0.25) 50%, rgba(15,23,42,0.9) 100%)",
                              }}
                            />
                          )}
                          <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2 border border-white/15">
                            <span className="border-r border-b border-white/15" />
                            <span className="border-b border-white/15" />
                            <span className="border-r border-white/15" />
                            <span />
                          </div>
                        </div>
                        {isSelected && (
                          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold truncate">{preset.name}</span>
                        </div>
                        <span className="block text-[10px] text-slate-400 line-clamp-2 leading-tight mt-0.5">
                          {preset.description}
                        </span>
                      </div>
                    </>
                  )}
                </CustomizableButton>
              );
            })}
          </div>
        </div>
      </CustomizableContainer>
    </div>
  );
};
