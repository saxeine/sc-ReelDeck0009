import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns,
  Copy,
  Download,
  Eye,
  Film,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  SplitSquareVertical,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  Sliders,
  Wand2,
  Crosshair,
  Compass,
  Plus,
  Archive,
  Activity,
  FastForward,
  Images,
} from "lucide-react";
import { addLibraryAssets } from "../services/assetLibrary";
import {
  DEFAULT_ZOOM_CONFIG,
  ZOOM_PRESETS,
  generateZoomVariationFrames,
  exportZoomSeriesAsZip,
  exportZoomSeriesAsGif,
  type ZoomAspectRatio,
  type ZoomColorGrade,
  type ZoomEasing,
  type ZoomMode,
  type ZoomPreset,
  type ZoomSpeedRamp,
  type ZoomStudioConfig,
  type GeneratedZoomFrame,
} from "../utils/zoomStudioEngine";
import { cn } from "../utils/cn";

// Minimal persisted state in localStorage for ReelDeck integration
const STORAGE_KEY = "reeldeck.zoom.studio.v1";
function loadPersisted(): { config: ZoomStudioConfig; presetId: string } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw) return null;
    return raw;
  } catch { return null; }
}
function savePersisted(cfg: ZoomStudioConfig, presetId: string) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ config: cfg, presetId })); } catch {}
}

export interface ZoomStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  sliceName?: string;
  sliceIndex?: number | null;
  slices?: Array<{ name: string; url: string }>;
  onNavigateFrame?: (index: number) => void;
  onApplyZoomVariations?: (frames: Array<{ name: string; url: string }>, mode: "append_storyboard" | "replace_frame", targetSliceIndex?: number | null) => void;
  onOpenInAniPlayer?: (frames: Array<{ name: string; url: string }>, targetSliceIndex?: number | null) => void;
}

type TabType = "zoom_params" | "effects" | "presets";
type FocalTargetType = "start" | "end";
type PreviewViewMode = "stage" | "split" | "side_by_side";

const FOCAL_GRID: Array<{ id: string; label: string; x: number; y: number }> = [
  { id: "tl", label: "TL", x: 0.2, y: 0.2 },
  { id: "tc", label: "TC", x: 0.5, y: 0.2 },
  { id: "tr", label: "TR", x: 0.8, y: 0.2 },
  { id: "cl", label: "CL", x: 0.2, y: 0.5 },
  { id: "c", label: "C", x: 0.5, y: 0.5 },
  { id: "cr", label: "CR", x: 0.8, y: 0.5 },
  { id: "bl", label: "BL", x: 0.2, y: 0.8 },
  { id: "bc", label: "BC", x: 0.5, y: 0.8 },
  { id: "br", label: "BR", x: 0.8, y: 0.8 },
];

export function ZoomStudioModal({
  isOpen,
  onClose,
  imageUrl,
  sliceName,
  sliceIndex,
  slices,
  onNavigateFrame,
  onApplyZoomVariations,
  onOpenInAniPlayer,
}: ZoomStudioModalProps) {
  const initial = useRef(loadPersisted());
  const [activeSliceIdx, setActiveSliceIdx] = useState<number | null>(sliceIndex !== undefined ? sliceIndex : null);
  useEffect(() => { setActiveSliceIdx(sliceIndex !== undefined ? sliceIndex : null); }, [sliceIndex, imageUrl, isOpen]);

  const currentSlice = activeSliceIdx !== null && slices && slices[activeSliceIdx] ? slices[activeSliceIdx] : null;
  const activeImageUrl = currentSlice?.url || imageUrl || slices?.[0]?.url || "";
  const activeBaseName = currentSlice?.name || sliceName || slices?.[0]?.name || `Frame ${(activeSliceIdx ?? 0) + 1}`;

  const [config, setConfig] = useState<ZoomStudioConfig>(() => initial.current?.config ?? { ...DEFAULT_ZOOM_CONFIG });
  const [activePresetId, setActivePresetId] = useState<string>(initial.current?.presetId ?? "scifi_warp");
  const [activeTab, setActiveTab] = useState<TabType>("zoom_params");
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isFilmstripVisible, setIsFilmstripVisible] = useState(true);
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const [playbackFps, setPlaybackFps] = useState(10);
  const [activeFocalTarget, setActiveFocalTarget] = useState<FocalTargetType>("start");
  const [previewViewMode, setPreviewViewMode] = useState<PreviewViewMode>("stage");
  const [previewZoomLevel, setPreviewZoomLevel] = useState(1);
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  const [generatedFrames, setGeneratedFrames] = useState<GeneratedZoomFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const generationRunIdRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [customUploadedUrl, setCustomUploadedUrl] = useState<string | null>(null);
  const [customUploadedName, setCustomUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageStageRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const effectiveImageUrl = customUploadedUrl || activeImageUrl;
  const effectiveBaseName = customUploadedName || activeBaseName;

  // persist
  useEffect(() => { savePersisted(config, activePresetId); }, [config, activePresetId]);

  useEffect(() => { if (!isOpen) { setIsPlaying(false); generationRunIdRef.current += 1; } }, [isOpen]);

  const runGeneration = useCallback(async (sourceUrl: string, targetConfig: ZoomStudioConfig, targetBaseName: string) => {
    if (!sourceUrl) { setGeneratedFrames([]); setIsGenerating(false); return; }
    const runId = ++generationRunIdRef.current;
    setIsGenerating(true); setGenerationProgress(0);
    try {
      const frames = await generateZoomVariationFrames(
        sourceUrl, targetConfig, targetBaseName,
        (pct) => { if (generationRunIdRef.current === runId) setGenerationProgress(pct); },
        () => generationRunIdRef.current !== runId
      );
      if (generationRunIdRef.current !== runId) return;
      setGeneratedFrames(frames);
      setCurrentFrameIndex((prev) => Math.min(prev, Math.max(0, frames.length - 1)));
    } catch (err) {
      console.error(err);
      showToast("Generation failed – check image source.");
    } finally {
      if (generationRunIdRef.current === runId) setIsGenerating(false);
    }
  }, [showToast]);

  const prevOpenRef = useRef(false);
  const prevImageRef = useRef("");
  useEffect(() => {
    if (!isOpen) { prevOpenRef.current = false; return; }
    if (!effectiveImageUrl) { setGeneratedFrames([]); return; }
    const justOpened = !prevOpenRef.current;
    const imageChanged = prevImageRef.current !== effectiveImageUrl;
    prevOpenRef.current = true;
    prevImageRef.current = effectiveImageUrl;
    if (justOpened || imageChanged) { void runGeneration(effectiveImageUrl, config, effectiveBaseName); return; }
    const t = window.setTimeout(() => { void runGeneration(effectiveImageUrl, config, effectiveBaseName); }, 150);
    return () => window.clearTimeout(t);
  }, [isOpen, effectiveImageUrl, config, effectiveBaseName, runGeneration]);

  const handleConfigChange = useCallback((updater: (prev: ZoomStudioConfig) => ZoomStudioConfig) => {
    setConfig((prev) => updater(prev));
  }, []);

  // split drag
  useEffect(() => {
    if (!isDraggingSplit) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const el = imageStageRef.current; if (!el) return;
      const rect = el.getBoundingClientRect(); if (rect.width <= 0) return;
      const pos = Math.max(0, Math.min(100, ((cx - rect.left) / rect.width) * 100));
      setSplitPos(Math.round(pos));
    };
    const onUp = () => setIsDraggingSplit(false);
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove); window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
  }, [isDraggingSplit]);

  // playback
  useEffect(() => {
    if (!isPlaying || generatedFrames.length <= 1) return;
    const baseDelay = Math.round(1000 / Math.max(1, playbackFps));
    let tid: number;
    const schedule = (nextIdx: number) => {
      let delay = baseDelay;
      if (config.speedRamp === "bullet_time") {
        const mid = (generatedFrames.length - 1) / 2;
        const dist = Math.abs(nextIdx - mid) / Math.max(1, mid);
        delay = Math.round(baseDelay * (dist < 0.35 ? 2.4 : 0.7));
      } else if (config.speedRamp === "slow_to_fast") {
        const p = nextIdx / Math.max(1, generatedFrames.length - 1);
        delay = Math.round(baseDelay * (p < 0.5 ? 1.7 : 0.6));
      } else if (config.speedRamp === "fast_to_slow") {
        const p = nextIdx / Math.max(1, generatedFrames.length - 1);
        delay = Math.round(baseDelay * (p < 0.5 ? 0.6 : 1.7));
      } else if (config.speedRamp === "hyper_jump") {
        const p = nextIdx / Math.max(1, generatedFrames.length - 1);
        delay = Math.round(baseDelay * (p < 0.3 ? 1.9 : 0.5));
      }
      tid = window.setTimeout(() => { setCurrentFrameIndex(nextIdx); schedule((nextIdx + 1) % generatedFrames.length); }, Math.max(25, delay));
    };
    schedule((currentFrameIndex + 1) % generatedFrames.length);
    return () => window.clearTimeout(tid);
  }, [isPlaying, playbackFps, generatedFrames.length, config.speedRamp, currentFrameIndex]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA");
      if (e.key === "Escape") onClose();
      else if (e.key === " " && !typing && generatedFrames.length > 0) { e.preventDefault(); setIsPlaying(p => !p); }
      else if (e.key === "ArrowLeft" && !typing && generatedFrames.length > 0) { e.preventDefault(); setCurrentFrameIndex((idx) => (idx - 1 + generatedFrames.length) % generatedFrames.length); }
      else if (e.key === "ArrowRight" && !typing && generatedFrames.length > 0) { e.preventDefault(); setCurrentFrameIndex((idx) => (idx + 1) % generatedFrames.length); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, generatedFrames.length]);

  const handleSelectPreset = (preset: ZoomPreset) => {
    setActivePresetId(preset.id);
    setConfig((prev) => ({ ...prev, ...preset.config }));
    if (preset.config.mode !== "ken_burns") setActiveFocalTarget("start");
    showToast(`Preset applied: ${preset.name}`);
  };

  const applyPointerFocal = (clientX: number, clientY: number) => {
    const rect = imageStageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const imgEl = imageStageRef.current?.querySelector("img") as HTMLImageElement | null;
    const box = imgEl?.getBoundingClientRect() ?? rect;
    const nx = Math.max(0, Math.min(1, (clientX - box.left) / Math.max(1, box.width)));
    const ny = Math.max(0, Math.min(1, (clientY - box.top) / Math.max(1, box.height)));
    handleConfigChange((prev) => activeFocalTarget === "start" ? { ...prev, focalX: nx, focalY: ny } : { ...prev, endFocalX: nx, endFocalY: ny });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    setCustomUploadedUrl(url);
    setCustomUploadedName(f.name.replace(/\.[^.]+$/, ""));
    showToast(`Loaded ${f.name}`);
    e.target.value = "";
  };

  const handleStepSlice = (dir: number) => {
    if (!slices || slices.length <= 1 || activeSliceIdx === null) return;
    const next = Math.max(0, Math.min(slices.length - 1, activeSliceIdx + dir));
    if (next === activeSliceIdx) return;
    setActiveSliceIdx(next);
    onNavigateFrame?.(next);
  };

  const handleApplyToReelDeck = (mode: "append_storyboard" | "replace_frame") => {
    if (!onApplyZoomVariations || generatedFrames.length === 0) return;
    const payload = generatedFrames.map((f) => ({ name: f.name, url: f.url }));
    onApplyZoomVariations(payload, mode, activeSliceIdx);
    showToast(mode === "append_storyboard" ? `Appended ${payload.length} frames to ReelDeck` : `Replaced with ${payload.length} frames`);
    onClose();
  };

  const handleSendToAni = () => {
    if (!onOpenInAniPlayer || generatedFrames.length === 0) return;
    const payload = generatedFrames.map((f) => ({ name: f.name, url: f.url }));
    onOpenInAniPlayer(payload, activeSliceIdx);
    onClose();
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_ZOOM_CONFIG });
    setActivePresetId("scifi_warp");
    setPlaybackFps(10);
    setActiveFocalTarget("start");
    setPreviewViewMode("stage");
    setPreviewZoomLevel(1);
    setSplitPos(50);
    showToast("Reset to defaults");
  };

  const handleExportZip = async () => {
    if (!generatedFrames.length) return;
    try { await exportZoomSeriesAsZip(generatedFrames, effectiveBaseName.replace(/\s+/g, "_")); showToast("ZIP downloaded"); } catch { showToast("Export failed"); }
  };

  const handleExportGif = async () => {
    if (!generatedFrames.length) return;
    try {
      const blob = await exportZoomSeriesAsGif(generatedFrames, playbackFps, undefined, config.speedRamp);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${effectiveBaseName.replace(/\s+/g, "_")}_loop.gif`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("GIF exported");
    } catch { showToast("GIF export failed"); }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedFrames.length) return;
    try {
      await addLibraryAssets(generatedFrames.map((frame) => ({ name: frame.name, origin: "zoom", src: frame.url, tags: ["zoom-studio"] })));
      showToast(`${generatedFrames.length} frames saved to the library`);
    } catch { showToast("Could not save to the library"); }
  };

  if (!isOpen) return null;
  const currentFrame = generatedFrames[currentFrameIndex];
  const totalFrames = (config.extraFrames || 5) + 1;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none" onClick={onClose}>
      <div className="w-full max-w-[1520px] h-[94vh] max-h-[960px] bg-[#020617] border border-[#1e293b] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#0f172a] border-b border-[#1e293b] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0"><ZoomIn className="w-5 h-5" /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-slate-100 flex items-center gap-2"><ZoomIn className="w-4 h-4 text-blue-400" /> Zoom Studio</span>
                <span className="hidden sm:inline text-[10px] tracking-widest font-semibold text-blue-400/70 border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 rounded">REELDECK SYNC</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="truncate max-w-[220px] text-slate-300 font-medium font-mono text-[11px]">{effectiveBaseName}</span>
                {slices && slices.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-md px-1 py-0.5 ml-1">
                    <button onClick={() => handleStepSlice(-1)} className="p-0.5 text-slate-400 hover:text-blue-400 rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 px-1">{(activeSliceIdx ?? 0) + 1} / {slices.length}</span>
                    <button onClick={() => handleStepSlice(1)} className="p-0.5 text-slate-400 hover:text-blue-400 rounded"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <span className="hidden md:inline text-[10px] text-slate-500">• Synced with ReelDeck deck ({slices?.length ?? 0} frames)</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-[#020617] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1e293b] rounded-lg text-xs font-semibold flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 text-blue-400" /> Upload</button>
            {customUploadedUrl && (
              <button onClick={() => { setCustomUploadedUrl(null); setCustomUploadedName(null); showToast("Reverted to deck frame"); }} className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Revert</button>
            )}
            <button onClick={handleReset} className="px-3 py-1.5 bg-[#020617] hover:bg-slate-800 text-slate-300 border border-[#1e293b] rounded-lg text-xs font-semibold flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Reset</button>
            <button onClick={() => setIsFilmstripVisible(v => !v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border", isFilmstripVisible ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-blue-600/20 text-blue-300 border-blue-500/40")}><Film className="w-3.5 h-3.5" /> {isFilmstripVisible ? "Hide filmstrip" : "Show filmstrip"}</button>
            <button onClick={() => setIsFooterVisible(v => !v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border", isFooterVisible ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-blue-600/20 text-blue-300 border-blue-500/40")}><Layers className="w-3.5 h-3.5" /> {isFooterVisible ? "Hide actions" : "Show actions"}</button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left controls */}
          <div className={cn("w-[380px] shrink-0 bg-[#020617] border-r border-[#1e293b] flex flex-col overflow-hidden", !isControlsVisible && "hidden")}>
            <div className="flex items-center justify-between px-3 py-2 bg-[#0f172a] border-b border-[#1e293b]">
              <div className="flex items-center gap-1.5">
                <button onClick={() => setActiveTab("zoom_params")} className={cn("px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border", activeTab === "zoom_params" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}><Sliders className="w-3 h-3" /> Zoom</button>
                <button onClick={() => setActiveTab("effects")} className={cn("px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border", activeTab === "effects" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}><Sparkles className="w-3 h-3" /> Effects</button>
                <button onClick={() => setActiveTab("presets")} className={cn("px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border", activeTab === "presets" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}><Wand2 className="w-3 h-3" /> Presets</button>
              </div>
              <button onClick={() => setIsControlsVisible(false)} className="p-1 text-slate-500 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {activeTab === "presets" && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300">Cinematic presets</div>
                  <p className="text-[11px] text-slate-500">One tap loads trajectory + optics. Syncs live to ReelDeck preview.</p>
                  <div className="grid gap-2">
                    {ZOOM_PRESETS.map((preset) => (
                      <button key={preset.id} onClick={() => handleSelectPreset(preset)} className={cn("text-left p-3 rounded-xl border transition", activePresetId === preset.id ? "bg-blue-600/15 border-blue-500/50" : "bg-[#0f172a] border-[#1e293b] hover:border-slate-700")}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-100">{preset.name}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide border", preset.badgeColor, "bg-slate-900 border-slate-700")}>{preset.badge}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{preset.description}</p>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">{preset.shortLabel} • {preset.config.extraFrames && `${(preset.config.extraFrames + 1)} frames`} • {preset.config.startZoom?.toFixed(1)}→{preset.config.endZoom?.toFixed(1)}×</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "zoom_params" && (
                <div className="space-y-4">
                  {/* Sync status */}
                  <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/20">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300"><Activity className="w-3.5 h-3.5" /> ReelDeck sync active</div>
                    <div className="text-[11px] text-blue-200/70 mt-1">Generating from <b className="text-blue-300">{effectiveBaseName}</b>. Apply will insert frames after current deck selection.</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">{slices?.length ?? 0} deck frames • {totalFrames} zoom frames queued</div>
                  </div>

                  {/* Extra frames */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1"><Film className="w-3 h-3 text-slate-400" /> Extra frames</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {[3,5,8,12,16].map(n => (
                        <button key={n} onClick={() => handleConfigChange(prev => ({ ...prev, extraFrames: n }))} className={cn("px-2.5 py-1 rounded text-xs font-semibold border", config.extraFrames === n ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}>{n} (+1={n+1})</button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <input type="range" min={1} max={24} value={config.extraFrames} onChange={(e) => handleConfigChange(p => ({ ...p, extraFrames: Number(e.target.value) }))} className="w-full" />
                      <div className="flex justify-between text-[10px] font-mono text-slate-500"><span>1</span><span className="text-blue-400 font-semibold">{config.extraFrames} extra → {totalFrames} total</span><span>24</span></div>
                    </div>
                  </div>

                  {/* Start / End zoom */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-300">Start zoom</span>
                      <input type="range" min={0.5} max={4} step={0.1} value={config.startZoom} onChange={(e) => handleConfigChange(p => ({ ...p, startZoom: Number(e.target.value) }))} className="w-full" />
                      <div className="flex items-center justify-between"><span className="text-[11px] font-mono text-blue-400 font-bold">{config.startZoom.toFixed(2)}×</span><button onClick={() => handleConfigChange(p => ({ ...p, startZoom: Math.max(0.5, p.startZoom - 0.1) }))} className="p-1 text-slate-400 hover:text-white">−</button><button onClick={() => handleConfigChange(p => ({ ...p, startZoom: Math.min(4, p.startZoom + 0.1) }))} className="p-1 text-slate-400 hover:text-white">+</button></div>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-300">End zoom</span>
                      <input type="range" min={0.5} max={6} step={0.1} value={config.endZoom} onChange={(e) => handleConfigChange(p => ({ ...p, endZoom: Number(e.target.value) }))} className="w-full" />
                      <div className="flex items-center justify-between"><span className="text-[11px] font-mono text-blue-400 font-bold">{config.endZoom.toFixed(2)}×</span><button onClick={() => handleConfigChange(p => ({ ...p, endZoom: Math.max(0.5, p.endZoom - 0.1) }))} className="p-1 text-slate-400 hover:text-white">−</button><button onClick={() => handleConfigChange(p => ({ ...p, endZoom: Math.min(6, p.endZoom + 0.1) }))} className="p-1 text-slate-400 hover:text-white">+</button></div>
                    </label>
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Zoom trajectory</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {([
                        ["zoom_in","Zoom in"],["zoom_out","Zoom out"],["yoyo","Yoyo"],["pulse","Pulse"],["spiral_twist","Spiral"],["dolly_vertigo","Vertigo"],["ken_burns","Ken Burns"]
                      ] as Array<[ZoomMode,string]>).map(([m,l]) => (
                        <button key={m} onClick={() => handleConfigChange(p => ({ ...p, mode: m }))} className={cn("px-2.5 py-1.5 rounded-lg text-xs font-semibold border text-left", config.mode === m ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}>{l}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-300">Easing</span>
                      <select value={config.easing} onChange={(e) => handleConfigChange(p => ({ ...p, easing: e.target.value as ZoomEasing }))} className="w-full h-8 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2">
                        <option value="linear">Linear</option>
                        <option value="ease_in">Ease in</option>
                        <option value="ease_out">Ease out</option>
                        <option value="ease_in_out">Ease in-out</option>
                        <option value="bounce">Bounce</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-300">Speed ramp</span>
                      <select value={config.speedRamp} onChange={(e) => handleConfigChange(p => ({ ...p, speedRamp: e.target.value as ZoomSpeedRamp }))} className="w-full h-8 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2">
                        <option value="none">None</option>
                        <option value="slow_to_fast">Slow → Fast</option>
                        <option value="fast_to_slow">Fast → Slow</option>
                        <option value="bullet_time">Bullet time</option>
                        <option value="hyper_jump">Hyper jump</option>
                      </select>
                    </label>
                  </div>

                  <label className="space-y-1 block">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1"><FastForward className="w-3 h-3" /> Spiral angle</span>
                    <input type="range" min={0} max={45} value={config.spiralAngle} onChange={(e) => handleConfigChange(p => ({ ...p, spiralAngle: Number(e.target.value) }))} className="w-full" />
                    <div className="text-[11px] font-mono text-slate-400">{config.spiralAngle}°</div>
                  </label>

                  {/* Focal */}
                  <div className="space-y-2 p-2.5 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1"><Crosshair className="w-3 h-3" /> Focal anchor</span>
                      <div className="flex gap-1">
                        <button onClick={() => setActiveFocalTarget("start")} className={cn("px-2 py-1 rounded text-[10px] font-semibold border", activeFocalTarget === "start" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-400 border-slate-700")}>Start</button>
                        <button onClick={() => setActiveFocalTarget("end")} className={cn("px-2 py-1 rounded text-[10px] font-semibold border", activeFocalTarget === "end" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-400 border-slate-700")}>End {config.mode === "ken_burns" ? "(Ken Burns)" : ""}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {FOCAL_GRID.map(pt => {
                        const active = activeFocalTarget === "start" ? Math.abs(config.focalX - pt.x) < 0.05 && Math.abs(config.focalY - pt.y) < 0.05 : Math.abs(config.endFocalX - pt.x) < 0.05 && Math.abs(config.endFocalY - pt.y) < 0.05;
                        return (
                          <button key={pt.id} onClick={() => handleConfigChange(p => activeFocalTarget === "start" ? { ...p, focalX: pt.x, focalY: pt.y } : { ...p, endFocalX: pt.x, endFocalY: pt.y })} className={cn("h-10 rounded border text-xs font-bold flex flex-col items-center justify-center", active ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}>
                            <span>{pt.label}</span><span className="text-[9px] opacity-70">{Math.round(pt.x*100)}%,{Math.round(pt.y*100)}%</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {activeFocalTarget === "start" ? `Start: ${config.focalX.toFixed(2)}, ${config.focalY.toFixed(2)}` : `End: ${config.endFocalX.toFixed(2)}, ${config.endFocalY.toFixed(2)}`} • Click image to set focal
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Tap image stage to place focal point precisely</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-300">Aspect</span>
                      <select value={config.aspectRatio} onChange={(e) => handleConfigChange(p => ({ ...p, aspectRatio: e.target.value as ZoomAspectRatio }))} className="w-full h-8 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2">
                        <option value="original">Original</option>
                        <option value="1:1">1:1</option>
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="4:3">4:3</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-300">Format</span>
                      <select value={config.outputFormat} onChange={(e) => handleConfigChange(p => ({ ...p, outputFormat: e.target.value as any }))} className="w-full h-8 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2">
                        <option value="image/png">PNG</option>
                        <option value="image/jpeg">JPEG</option>
                      </select>
                    </label>
                  </div>
                  {config.outputFormat === "image/jpeg" && (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-400">JPEG quality {Math.round((config.outputQuality ?? 0.95)*100)}%</span>
                      <input type="range" min={0.4} max={1} step={0.05} value={config.outputQuality} onChange={(e) => handleConfigChange(p => ({ ...p, outputQuality: Number(e.target.value) }))} className="w-full" />
                    </label>
                  )}
                </div>
              )}

              {activeTab === "effects" && (
                <div className="space-y-4">
                  {[
                    { key: "effectMotionBlur", label: "Motion blur", strengthKey: "motionBlurStrength", desc: "Radial zoom streaks" },
                    { key: "effectRgbSplit", label: "RGB split", strengthKey: "rgbSplitAmount", desc: "Chromatic aberration" },
                    { key: "effectVignette", label: "Vignette", strengthKey: "vignetteStrength", desc: "Edge darkening" },
                    { key: "effectGlow", label: "Glow bloom", strengthKey: "glowStrength", desc: "Highlight bloom" },
                    { key: "effectShake", label: "Camera shake", strengthKey: "shakeStrength", desc: "Tactile vibration" },
                    { key: "effectFilmGrain", label: "Film grain", strengthKey: "grainStrength", desc: "Procedural texture" },
                  ].map((fx) => (
                    <div key={fx.key} className="p-2.5 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{fx.label}</div>
                          <div className="text-[11px] text-slate-500">{fx.desc}</div>
                        </div>
                        <input type="checkbox" checked={(config as any)[fx.key]} onChange={(e) => handleConfigChange(p => ({ ...p, [fx.key]: e.target.checked } as any))} className="w-4 h-4" />
                      </label>
                      {(config as any)[fx.key] && (
                        <div className="mt-2">
                          <input type="range" min={0} max={fx.strengthKey === "rgbSplitAmount" ? 20 : fx.strengthKey === "shakeStrength" ? 15 : 100} value={(config as any)[fx.strengthKey]} onChange={(e) => handleConfigChange(p => ({ ...p, [fx.strengthKey]: Number(e.target.value) } as any))} className="w-full" />
                          <div className="text-[11px] font-mono text-slate-400">{(config as any)[fx.strengthKey]}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Color grade</span>
                    <select value={config.colorGrading} onChange={(e) => handleConfigChange(p => ({ ...p, colorGrading: e.target.value as ZoomColorGrade }))} className="w-full h-8 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2">
                      <option value="none">None</option>
                      <option value="cinematic">Cinematic</option>
                      <option value="cyberpunk">Cyberpunk</option>
                      <option value="golden_hour">Golden hour</option>
                      <option value="noir">Noir</option>
                      <option value="vintage">Vintage</option>
                      <option value="punchy">Punchy</option>
                    </select>
                  </label>

                  <div className="text-[11px] text-slate-500 p-2 bg-blue-950/20 border border-blue-500/10 rounded">
                    Optical FX render live per frame and export baked into the final sequence.
                  </div>
                </div>
              )}
            </div>

            {/* playback fps quick */}
            <div className="p-2.5 border-t border-[#1e293b] bg-[#0f172a] flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">Playback {playbackFps} fps</span>
              <input type="range" min={2} max={24} value={playbackFps} onChange={(e) => setPlaybackFps(Number(e.target.value))} className="flex-1" />
            </div>
          </div>

          {/* Center stage */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#050811]">
            {/* Stage toolbar */}
            {!isControlsVisible && (
              <button onClick={() => setIsControlsVisible(true)} className="absolute left-2 top-2 z-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 flex items-center gap-1"><Sliders className="w-3 h-3" /> Show controls</button>
            )}
            <div className="flex items-center justify-between px-3 py-2 bg-[#020617] border-b border-[#1e293b] gap-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setIsPlaying(v => !v)} disabled={generatedFrames.length <= 1} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 disabled:opacity-40">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
                <button onClick={() => setCurrentFrameIndex(i => Math.max(0, i - 1))} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => setCurrentFrameIndex(i => Math.min(generatedFrames.length - 1, i + 1))} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"><ChevronRight className="w-3.5 h-3.5" /></button>
                <span className="text-xs font-mono text-slate-400 ml-1">{generatedFrames.length ? `${currentFrameIndex + 1}/${generatedFrames.length}` : "0/0"}</span>
                {currentFrame && <span className="hidden sm:inline text-xs font-mono text-blue-300 ml-2">{currentFrame.zoomPercentage} zoom</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onMouseDown={() => setIsHoldingOriginal(true)} onMouseUp={() => setIsHoldingOriginal(false)} onMouseLeave={() => setIsHoldingOriginal(false)}
                  onTouchStart={() => setIsHoldingOriginal(true)} onTouchEnd={() => setIsHoldingOriginal(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> Hold original</button>
                <button onClick={() => setPreviewViewMode("stage")} className={cn("px-2 py-1 rounded text-xs border", previewViewMode === "stage" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}>Stage</button>
                <button onClick={() => setPreviewViewMode("split")} className={cn("px-2 py-1 rounded text-xs border", previewViewMode === "split" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}><SplitSquareVertical className="w-3 h-3 inline mr-1" />Split</button>
                <button onClick={() => setPreviewViewMode("side_by_side")} className={cn("px-2 py-1 rounded text-xs border", previewViewMode === "side_by_side" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700")}><Columns className="w-3 h-3 inline mr-1" />Side</button>
                <div className="h-5 w-px bg-slate-700 mx-1" />
                <button onClick={() => setPreviewZoomLevel(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="p-1 bg-slate-800 text-slate-300 border border-slate-700 rounded"><ZoomOut className="w-3 h-3" /></button>
                <span className="text-[11px] font-mono text-slate-400 w-10 text-center">{Math.round(previewZoomLevel * 100)}%</span>
                <button onClick={() => setPreviewZoomLevel(z => Math.min(3, +(z + 0.25).toFixed(2)))} className="p-1 bg-slate-800 text-slate-300 border border-slate-700 rounded"><ZoomIn className="w-3 h-3" /></button>
                <button onClick={() => setPreviewZoomLevel(1)} className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-white">Fit</button>
              </div>
            </div>

            {/* Main stage */}
            <div className="flex-1 relative flex items-center justify-center p-4 sm:p-6 overflow-auto bg-[#050811]">
              {isGenerating && (
                <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <div className="w-11 h-11 rounded-full border-2 border-blue-500/25 border-t-blue-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-200">Generating zoom sequence… {Math.round(generationProgress)}%</p>
                </div>
              )}

              {isHoldingOriginal && effectiveImageUrl ? (
                <div className="relative max-w-full max-h-full flex flex-col items-center justify-center" style={{ transform: previewZoomLevel !== 1 ? `scale(${previewZoomLevel})` : undefined, transformOrigin: "center center" }}>
                  <div className="absolute top-2 left-2 z-20 bg-amber-950/90 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded text-[11px] font-bold">Raw source (100%)</div>
                  <img src={effectiveImageUrl} alt="Original" className="max-w-full max-h-[56vh] object-contain rounded-lg border border-amber-500/50 shadow-2xl" />
                </div>
              ) : previewViewMode === "split" && effectiveImageUrl && currentFrame ? (
                <div
                  ref={imageStageRef}
                  className="relative max-w-full max-h-full overflow-hidden rounded-lg border border-[#1e293b] shadow-2xl cursor-ew-resize"
                  style={{ transform: previewZoomLevel !== 1 ? `scale(${previewZoomLevel})` : undefined, transformOrigin: "center center" }}
                  onMouseDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); const pos = ((e.clientX - r.left) / r.width) * 100; setSplitPos(Math.max(0, Math.min(100, pos))); setIsDraggingSplit(true); }}
                  onTouchStart={(e) => { const r = e.currentTarget.getBoundingClientRect(); const pos = ((e.touches[0].clientX - r.left) / r.width) * 100; setSplitPos(Math.max(0, Math.min(100, pos))); setIsDraggingSplit(true); }}
                >
                  <img src={currentFrame.url} alt={currentFrame.name} className="max-w-full max-h-[56vh] object-contain block" />
                  <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}>
                    <img src={effectiveImageUrl} alt="Original" className="max-w-full max-h-[56vh] object-contain block" />
                    <div className="absolute top-2 left-2 bg-slate-950/85 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">Raw source</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-blue-950/90 text-blue-300 border border-blue-500/50 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ opacity: splitPos < 80 ? 1 : 0 }}>Zoomed ({currentFrame.zoomPercentage})</div>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400 cursor-ew-resize z-20" style={{ left: `${splitPos}%` }}><div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-500 border-2 border-slate-950 shadow flex items-center justify-center text-slate-950"><SplitSquareVertical className="w-3 h-3" /></div></div>
                </div>
              ) : previewViewMode === "side_by_side" && effectiveImageUrl ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center w-full max-w-5xl" style={{ transform: previewZoomLevel !== 1 ? `scale(${previewZoomLevel})` : undefined, transformOrigin: "center center" }}>
                  <div className="flex flex-col items-center gap-1.5"><span className="text-xs text-slate-400">Original source</span><img src={effectiveImageUrl} alt="Original" className="max-w-full max-h-[48vh] object-contain rounded-lg border border-[#1e293b]" /></div>
                  <div className="flex flex-col items-center gap-1.5"><span className="text-xs text-blue-300">Zoomed preview ({currentFrame?.zoomPercentage ?? "100%"})</span>{currentFrame ? <img src={currentFrame.url} alt={currentFrame.name} className="max-w-full max-h-[48vh] object-contain rounded-lg border border-blue-500/30 shadow" /> : <div className="text-xs text-slate-500">Generating…</div>}</div>
                </div>
              ) : (
                <div
                  ref={imageStageRef}
                  className="relative max-w-full max-h-full flex items-center justify-center"
                  style={{ transform: previewZoomLevel !== 1 ? `scale(${previewZoomLevel})` : undefined, transformOrigin: "center center" }}
                  onClick={(e) => applyPointerFocal(e.clientX, e.clientY)}
                >
                  {currentFrame ? (
                    <img src={currentFrame.url} alt={currentFrame.name} className="max-w-full max-h-[56vh] object-contain rounded-lg border border-[#1e293b] shadow-2xl cursor-crosshair" />
                  ) : effectiveImageUrl ? (
                    <img src={effectiveImageUrl} alt="Source" className="max-w-full max-h-[56vh] object-contain rounded-lg border border-[#1e293b]" />
                  ) : (
                    <div className="text-slate-500 text-sm">No image – select a ReelDeck frame</div>
                  )}
                  {/* focal indicator overlay */}
                  {effectiveImageUrl && (
                    <div className="absolute inset-0 pointer-events-none">
                      {(() => {
                        const fx = activeFocalTarget === "start" ? config.focalX : config.endFocalX;
                        const fy = activeFocalTarget === "start" ? config.focalY : config.endFocalY;
                        return <div className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 border-2 border-white shadow" style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }} />;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {!effectiveImageUrl && <div className="absolute bottom-4 text-xs text-slate-500">Select a frame from ReelDeck to start zooming</div>}
            </div>

            {/* Filmstrip */}
            {isFilmstripVisible && (
              <div className="h-[132px] shrink-0 bg-[#020617] border-t border-[#1e293b] flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] border-b border-[#1e293b]">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><Film className="w-3 h-3" /> Zoom sequence • {generatedFrames.length} frames • {previewZoomLevel !== 1 ? `${Math.round(previewZoomLevel * 100)}% preview ` : ""}{isGenerating ? "Generating…" : ""}</span>
                  <span className="text-[10px] font-mono text-slate-500">{currentFrameIndex + 1}/{generatedFrames.length || totalFrames} • Click to inspect • Click image to set focal</span>
                </div>
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 py-2 flex gap-2 items-center">
                  {generatedFrames.length ? generatedFrames.map((f, idx) => (
                    <button
                      key={f.id}
                      onClick={() => { setCurrentFrameIndex(idx); setIsPlaying(false); }}
                      className={cn("relative shrink-0 w-[92px] rounded-lg overflow-hidden border-2 bg-slate-900", idx === currentFrameIndex ? "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]" : "border-[#1e293b] hover:border-slate-600")}
                    >
                      <img src={f.url} alt={f.name} className="w-full h-[72px] object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] font-mono text-slate-200 px-1 py-0.5 flex justify-between"><span>{f.zoomPercentage}</span><span>{String(idx+1).padStart(2,"0")}</span></div>
                      {idx === currentFrameIndex && <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    </button>
                  )) : (
                    <div className="text-xs text-slate-500 px-2">No sequence yet – adjust params to generate</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions – ReelDeck sync */}
        {isFooterVisible && (
          <div className="shrink-0 bg-[#0f172a] border-t border-[#1e293b] px-3 py-3 flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => handleApplyToReelDeck("append_storyboard")} disabled={!generatedFrames.length} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Append {generatedFrames.length || totalFrames} frames to ReelDeck</button>
              <button onClick={() => handleApplyToReelDeck("replace_frame")} disabled={!generatedFrames.length || activeSliceIdx === null} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Replace frame</button>
              {onOpenInAniPlayer && (
                <button onClick={handleSendToAni} disabled={!generatedFrames.length} className="px-3 py-2 bg-[#020617] hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold border border-[#1e293b] flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" /> Send to AdShop</button>
              )}
              <span className="text-[11px] text-slate-400 hidden lg:inline">Sync: frames land in deck order • Undo with ⌘Z • Live sync with board</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleExportZip} disabled={!generatedFrames.length} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Archive className="w-3.5 h-3.5" /> ZIP</button>
              <button onClick={handleExportGif} disabled={!generatedFrames.length} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> GIF</button>
              <button onClick={() => void handleSaveToLibrary()} disabled={!generatedFrames.length} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Images className="w-3.5 h-3.5" /> To library</button>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <button onClick={() => { handleConfigChange(p => ({ ...p, extraFrames: Math.max(1, p.extraFrames -1) })); }} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">− frame</button>
              <button onClick={() => { handleConfigChange(p => ({ ...p, extraFrames: Math.min(24, p.extraFrames +1) })); }} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">+ frame</button>
              <button onClick={onClose} className="ml-1 px-3 py-1.5 bg-[#020617] hover:bg-slate-800 text-slate-300 border border-[#1e293b] rounded-lg text-xs">Close</button>
            </div>
          </div>
        )}

        {toast && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-xs shadow-xl">{toast}</div>
        )}
      </div>
    </div>
  );
}
