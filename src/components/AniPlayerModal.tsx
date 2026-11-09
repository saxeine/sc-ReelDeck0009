import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Zap,
  Film,
  Download,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Video,
  Clock,
  FileVideo,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "../utils/cn";
import { HoldButton } from "./HoldButton";
import { exportSequenceMovie, type ExportFormat } from "../utils/sequenceExport";

export type TransitionEffect = "none" | "crossfade" | "slide-left" | "slide-right" | "zoom" | "fade-black" | "pause";
export type LoopMode = "loop" | "ping-pong" | "once";

export interface AniPlayerFrame {
  url: string;
  name: string;
  caption?: string;
}

interface AniPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AniPlayerFrame[];
  initialIndex?: number | null;
  title?: string;
  onSelectFrame?: (idx: number) => void;
}

export const AniPlayerModal: React.FC<AniPlayerModalProps> = ({
  isOpen,
  onClose,
  frames,
  initialIndex,
  title = "AniPlayer",
  onSelectFrame,
}) => {
  const [fps, setFps] = useState<number>(() => {
    try { const v = Number(localStorage.getItem("reeldeck.aniplayer.fps")); return v >= 1 && v <= 60 ? v : 6; } catch { return 6; }
  });
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffect>(() => {
    try { const v = localStorage.getItem("reeldeck.aniplayer.transition") as TransitionEffect | null; return v || "zoom"; } catch { return "zoom"; }
  });
  const [pauseDuration, setPauseDuration] = useState<number>(() => {
    try { const v = Number(localStorage.getItem("reeldeck.aniplayer.pause")); return v ? v : 2; } catch { return 2; }
  });
  const [loopMode, setLoopMode] = useState<LoopMode>(() => {
    try { const v = localStorage.getItem("reeldeck.aniplayer.loop") as LoopMode | null; return v || "loop"; } catch { return "loop"; }
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>("mp4");
  const [exportFilename, setExportFilename] = useState<string>(() => {
    try { return localStorage.getItem("reeldeck.aniplayer.filename") || "reeldeck_sequence"; } catch { return "reeldeck_sequence"; }
  });

  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(initialIndex ?? 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playDirection, setPlayDirection] = useState<"forward" | "reverse">("forward");
  const [hidePanels, setHidePanels] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState("");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const prevFrameIdxRef = useRef(0);
  const animFrameReqRef = useRef<number | null>(null);
  const isPingPongReverseRef = useRef(false);

  // persist
  useEffect(() => { try { localStorage.setItem("reeldeck.aniplayer.fps", String(fps)); } catch {} }, [fps]);
  useEffect(() => { try { localStorage.setItem("reeldeck.aniplayer.transition", transitionEffect); } catch {} }, [transitionEffect]);
  useEffect(() => { try { localStorage.setItem("reeldeck.aniplayer.pause", String(pauseDuration)); } catch {} }, [pauseDuration]);
  useEffect(() => { try { localStorage.setItem("reeldeck.aniplayer.loop", loopMode); } catch {} }, [loopMode]);
  useEffect(() => { try { localStorage.setItem("reeldeck.aniplayer.filename", exportFilename); } catch {} }, [exportFilename]);

  // Sync initial index when modal opens or frames change
  useEffect(() => {
    if (isOpen) {
      setCurrentFrameIdx(initialIndex ?? 0);
      setIsPlaying(true);
      isPingPongReverseRef.current = false;
    } else {
      setIsPlaying(false);
    }
  }, [isOpen, initialIndex]);

  // Keep index valid when frames length changes (ReelDeck sync)
  useEffect(() => {
    if (frames.length === 0) { setCurrentFrameIdx(0); setIsPlaying(false); }
    else if (currentFrameIdx >= frames.length) setCurrentFrameIdx(frames.length - 1);
  }, [frames.length, currentFrameIdx]);

  // Preload
  useEffect(() => {
    frames.forEach((f) => {
      if (!loadedImagesRef.current.has(f.url)) {
        const img = new Image();
        if (f.url.startsWith("http://") || f.url.startsWith("https://")) img.crossOrigin = "anonymous";
        img.onerror = () => console.warn("AniPlayer preload failed", f.name);
        img.src = f.url;
        loadedImagesRef.current.set(f.url, img);
      }
    });
  }, [frames]);

  const activeFrames = useMemo(() => frames, [frames]);
  const currentFrame = activeFrames[currentFrameIdx];

  const handleNextStep = useCallback(() => {
    if (activeFrames.length === 0) return;
    setCurrentFrameIdx((prev) => {
      const maxIdx = activeFrames.length - 1;
      if (loopMode === "ping-pong") {
        if (!isPingPongReverseRef.current) {
          if (prev >= maxIdx) { isPingPongReverseRef.current = true; return Math.max(0, maxIdx - 1); }
          return prev + 1;
        } else {
          if (prev <= 0) { isPingPongReverseRef.current = false; return Math.min(maxIdx, 1); }
          return prev - 1;
        }
      }
      if (playDirection === "forward") {
        if (prev >= maxIdx) {
          if (loopMode === "once") { setIsPlaying(false); return maxIdx; }
          return 0;
        }
        return prev + 1;
      } else {
        if (prev <= 0) {
          if (loopMode === "once") { setIsPlaying(false); return 0; }
          return maxIdx;
        }
        return prev - 1;
      }
    });
  }, [activeFrames.length, loopMode, playDirection]);

  useEffect(() => {
    if (!isPlaying || activeFrames.length <= 1) return;
    const intervalMs = transitionEffect === "pause" ? pauseDuration * 1000 : 1000 / fps;
    const id = setInterval(handleNextStep, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, fps, transitionEffect, pauseDuration, activeFrames.length, handleNextStep]);

  const renderSingleImage = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    img: HTMLImageElement | null,
    offsetX = 0,
    offsetY = 0,
    scale = 1,
    alpha = 1
  ) => {
    if (!img || !img.complete || !img.width || !img.height) return;
    const width = canvas.width || 1280;
    const height = canvas.height || 720;
    const hRatio = width / img.width;
    const vRatio = height / img.height;
    const ratio = Math.min(hRatio, vRatio) * scale;
    const cx = (width - img.width * ratio) / 2 + offsetX;
    const cy = (height - img.height * ratio) / 2 + offsetY;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(img, 0, 0, img.width, img.height, cx, cy, img.width * ratio, img.height * ratio);
    ctx.restore();
  };

  const drawTransition = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    prevImg: HTMLImageElement | null,
    currImg: HTMLImageElement | null,
    progress: number,
    effect: string
  ) => {
    const width = canvas.width || 1280;
    const height = canvas.height || 720;
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);
    if (effect === "none" || effect === "pause" || !prevImg || progress >= 1) {
      if (currImg) renderSingleImage(ctx, canvas, currImg);
      return;
    }
    if (effect === "crossfade") {
      renderSingleImage(ctx, canvas, prevImg, 0, 0, 1, 1 - progress);
      if (currImg) renderSingleImage(ctx, canvas, currImg, 0, 0, 1, progress);
    } else if (effect === "slide-left") {
      renderSingleImage(ctx, canvas, prevImg, -width * progress, 0, 1, 1);
      if (currImg) renderSingleImage(ctx, canvas, currImg, width * (1 - progress), 0, 1, 1);
    } else if (effect === "slide-right") {
      renderSingleImage(ctx, canvas, prevImg, width * progress, 0, 1, 1);
      if (currImg) renderSingleImage(ctx, canvas, currImg, -width * (1 - progress), 0, 1, 1);
    } else if (effect === "zoom") {
      renderSingleImage(ctx, canvas, prevImg, 0, 0, 1 + progress * 0.25, 1 - progress);
      if (currImg) renderSingleImage(ctx, canvas, currImg, 0, 0, 0.8 + progress * 0.2, progress);
    } else if (effect === "fade-black") {
      if (progress < 0.5) renderSingleImage(ctx, canvas, prevImg, 0, 0, 1, 1 - progress * 2);
      else if (currImg) renderSingleImage(ctx, canvas, currImg, 0, 0, 1, (progress - 0.5) * 2);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeFrames.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const curr = activeFrames[currentFrameIdx];
    const prev = activeFrames[prevFrameIdxRef.current] || curr;
    if (!curr) return;
    const currImg = loadedImagesRef.current.get(curr.url) || new Image();
    const prevImg = loadedImagesRef.current.get(prev?.url || "") || null;
    if (!currImg.complete) currImg.src = curr.url;
    if (prevImg && !prevImg.complete && prev?.url) prevImg.src = prev.url;
    if (animFrameReqRef.current) cancelAnimationFrame(animFrameReqRef.current);
    if (transitionEffect === "none" || prevFrameIdxRef.current === currentFrameIdx) {
      drawTransition(ctx, canvas, null, currImg, 1, "none");
      prevFrameIdxRef.current = currentFrameIdx;
      return;
    }
    const durationMs = Math.min(300, Math.max(120, 1000 / fps));
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      drawTransition(ctx, canvas, prevImg, currImg, p, transitionEffect);
      if (p < 1) animFrameReqRef.current = requestAnimationFrame(animate);
      else prevFrameIdxRef.current = currentFrameIdx;
    };
    animFrameReqRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameReqRef.current) cancelAnimationFrame(animFrameReqRef.current); };
  }, [currentFrameIdx, activeFrames, transitionEffect, fps, drawTransition]);

  const stepPrev = () => { setIsPlaying(false); setCurrentFrameIdx((p) => (p <= 0 ? activeFrames.length - 1 : p - 1)); };
  const stepNext = () => { setIsPlaying(false); setCurrentFrameIdx((p) => (p >= activeFrames.length - 1 ? 0 : p + 1)); };
  const togglePlayForward = () => { if (!activeFrames.length) return; setPlayDirection("forward"); setIsPlaying((p) => !p); };
  const togglePlayReverse = () => { if (!activeFrames.length) return; setPlayDirection("reverse"); setIsPlaying((p) => !p); };

  const handleExport = async () => {
    if (activeFrames.length === 0) return;
    setIsExporting(true); setExportProgress(0); setExportStatusText("Preparing…"); setIsPlaying(false);
    try {
      const result = await exportSequenceMovie({
        frames: activeFrames.map(f => ({ url: f.url, name: f.name })),
        fps,
        format: exportFormat,
        filename: exportFilename.trim() || "reeldeck_sequence",
        transitionEffect,
        pauseDuration,
        onProgress: (pct, msg) => { setExportProgress(pct); if (msg) setExportStatusText(msg); }
      });
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a"); a.href = url; a.download = result.filename; a.style.display = "none"; document.body.appendChild(a); a.click();
      setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch {} }, 1500);
      setExportNotice(`Exported "${result.filename}"`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (e: any) {
      setExportNotice(`Export failed: ${e?.message || "error"}`); setTimeout(() => setExportNotice(null), 4000);
    } finally { setIsExporting(false); setExportStatusText(""); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#090f21] border border-[#1e293b] rounded-2xl w-full max-w-[1280px] max-h-[94vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#10b981]/15 text-[#10b981] rounded-xl border border-[#10b981]/30"><Film className="w-5 h-5" /></div>
            <div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-2">{title} <span className="text-[10px] font-semibold tracking-widest text-emerald-400/70 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded">REELDECK SYNC</span></div>
              <div className="text-[11px] text-slate-400">{frames.length} frames • {fps} fps • {transitionEffect} • syncs live with deck</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeFrames.length > 0 && currentFrame && (
              <div className="bg-[#020617] px-3 py-1 rounded-xl border border-[#1e293b] text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                <span className="text-[#10b981]">Frame {currentFrameIdx + 1} / {activeFrames.length}</span>
                <span className="text-slate-500">|</span>
                <span className="truncate max-w-[160px]">{currentFrame.name}</span>
                {transitionEffect === "pause" && <><span className="text-slate-500">|</span><span className="text-amber-400 flex items-center gap-1 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40 text-[10px]"><Clock className="w-3 h-3" /> Pause {pauseDuration}s</span></>}
              </div>
            )}
            <button onClick={() => setHidePanels(v => !v)} className={cn("px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5", hidePanels ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" : "bg-[#020617] text-slate-300 border-[#1e293b]")}>
              {hidePanels ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />} {hidePanels ? "Show panels" : "Hide panels"}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-[#1e293b]"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Body */}
        <div className={cn("flex-1 overflow-y-auto p-2.5 grid gap-2.5 min-h-[380px]", hidePanels ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12")}>
          {/* Stage */}
          <div className={cn("flex flex-col gap-2", hidePanels ? "col-span-1" : "lg:col-span-8")}>
            <div
              onDoubleClick={() => setIsPlaying(v => !v)}
              className={cn("relative w-full bg-[#020617] rounded-xl border border-[#1e293b] overflow-hidden flex items-center justify-center shadow-inner cursor-pointer select-none",
                hidePanels ? "h-[calc(86vh-160px)] min-h-[420px]" : "h-[48vh] lg:h-[56vh] min-h-[300px]")}
              title="Double-click to play/pause"
            >
              <button onClick={(e) => { e.stopPropagation(); setHidePanels(v => !v); }} className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                {hidePanels ? <><PanelRightOpen className="w-3.5 h-3.5 text-emerald-400" /> Show panels</> : <><PanelRightClose className="w-3.5 h-3.5" /> Hide panels</>}
              </button>
              {activeFrames.length === 0 ? (
                <div className="text-center p-6 text-slate-500 space-y-2"><Film className="w-10 h-10 mx-auto opacity-30" /><p className="text-xs">No frames — import or generate zoom sequence first.</p><p className="text-[11px] text-slate-600">Add images to ReelDeck board or generate from Zoom Studio.</p></div>
              ) : (
                <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full object-contain" />
              )}
              {/* film indicator */}
              {currentFrame?.caption && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs text-white/90">{currentFrame.caption}</div>}
            </div>

            {/* Transport */}
            <div className="w-full bg-[#020617] p-2 px-3 rounded-xl border-2 border-[#10b981]/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-full justify-center flex-wrap">
                <button onClick={togglePlayReverse} disabled={!activeFrames.length} className={cn("w-9 h-9 rounded-full bg-[#020617] border-2 border-amber-500 flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30", isPlaying && playDirection === "reverse" && "bg-amber-500/20 ring-2 ring-amber-400/30 animate-pulse")} title="Play reverse"><Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400 -scale-x-100" /></button>
                <button onClick={() => setIsPlaying(v => !v)} disabled={!activeFrames.length} className={cn("w-9 h-9 rounded-full bg-[#020617] border-2 border-emerald-500 flex items-center justify-center hover:scale-105 disabled:opacity-30", isPlaying ? "bg-emerald-500/20 ring-2 ring-emerald-400/30" : "")} title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <Pause className="w-3.5 h-3.5 fill-white text-white" /> : <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />}</button>
                <button onClick={stepNext} disabled={!activeFrames.length} className="p-1.5 hover:bg-emerald-500/15 text-emerald-400 rounded-xl active:scale-95 disabled:opacity-30" title="Next frame"><SkipForward className="w-5 h-5" /></button>
                <button onClick={togglePlayForward} disabled={!activeFrames.length} className={cn("px-4 py-1 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 font-mono font-bold text-xs text-emerald-400 flex items-center gap-1.5 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-30", isPlaying && playDirection === "forward" && "bg-emerald-500/30")} title="Play forward"><Play className="w-3 h-3 fill-emerald-400" /> FWD</button>
                <button onClick={() => setLoopMode(p => p === "loop" ? "ping-pong" : p === "ping-pong" ? "once" : "loop")} className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/25 active:scale-95" title={`Loop: ${loopMode}`}><Repeat className="w-4 h-4" /></button>
                <span className="hidden sm:inline text-[10px] font-mono text-slate-500 ml-1">{loopMode}</span>
                <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block" />
                <button onClick={() => { setIsPlaying(false); setCurrentFrameIdx(0); }} className="p-1 text-slate-400 hover:text-white" title="Jump to start"><SkipBack className="w-4 h-4" /></button>
                <button onClick={stepPrev} className="p-1 text-slate-400 hover:text-white" title="Previous"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={stepNext} className="p-1 text-slate-400 hover:text-white" title="Next"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => { setIsPlaying(false); setCurrentFrameIdx(Math.max(0, activeFrames.length - 1)); }} className="p-1 text-slate-400 hover:text-white" title="Jump to end"><SkipForward className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Filmstrip */}
            <div className="bg-[#020617] rounded-xl border border-[#1e293b] p-2">
              <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-semibold text-slate-300 flex items-center gap-1"><Film className="w-3 h-3" /> Sequence • {activeFrames.length} frames</span><span className="text-[10px] font-mono text-slate-500">click to scrub • syncs with deck</span></div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {activeFrames.map((f, idx) => (
                  <button key={f.url + idx} onClick={() => { setCurrentFrameIdx(idx); setIsPlaying(false); onSelectFrame?.(idx); }} className={cn("relative shrink-0 w-[72px] rounded-lg overflow-hidden border-2", idx === currentFrameIdx ? "border-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.3)]" : "border-[#1e293b] hover:border-slate-600")}>
                    <img src={f.url} alt={f.name} className="w-full h-[48px] object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-mono text-white px-1 py-0.5 truncate">{String(idx + 1).padStart(2, "0")} {f.name.slice(0, 12)}</div>
                    {idx === currentFrameIdx && <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </button>
                ))}
                {!activeFrames.length && <span className="text-xs text-slate-500 p-2">Empty deck — add frames to play</span>}
              </div>
            </div>
          </div>

          {/* Controls column */}
          {!hidePanels && (
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Speed */}
              <div className="bg-[#020617] p-4 rounded-2xl border border-[#1e293b] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5"><Zap className="w-4 h-4 text-emerald-400" /> Frame Rate (Speed)</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">{fps} FPS ({Math.round(1000 / fps)}ms)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={60} value={fps} onChange={(e) => setFps(parseInt(e.target.value))} className="w-full accent-emerald-500" />
                  <div className="flex flex-col gap-0.5">
                    <HoldButton onAction={() => setFps(f => Math.min(60, f + 1))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"><ChevronRight className="w-3.5 h-3.5 -rotate-90" /></HoldButton>
                    <HoldButton onAction={() => setFps(f => Math.max(1, f - 1))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"><ChevronRight className="w-3.5 h-3.5 rotate-90" /></HoldButton>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  {[1, 6, 12, 24].map(v => (
                    <button key={v} onClick={() => setFps(v)} className={cn("py-1 rounded-lg font-mono font-bold border", fps === v ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-slate-900 text-slate-400 border-[#1e293b]")}>{v} FPS</button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500">Live sync: changes apply instantly to playback.</div>
              </div>

              {/* Transitions */}
              <div className="bg-[#020617] p-4 rounded-2xl border border-[#1e293b] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200"><span className="flex items-center gap-1.5"><Sliders className="w-4 h-4 text-emerald-400" /> Transition Effect</span>{transitionEffect === "pause" && <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1"><Clock className="w-3 h-3" /> Pause {pauseDuration}s</span>}</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {([
                    ["none", "None (Cut)"],
                    ["crossfade", "Crossfade"],
                    ["slide-left", "Slide Left"],
                    ["slide-right", "Slide Right"],
                    ["zoom", "Scale Zoom"],
                    ["fade-black", "Fade Black"],
                    ["pause", "Pause Slide"],
                  ] as Array<[TransitionEffect, string]>).map(([id, label]) => (
                    <button key={id} onClick={() => setTransitionEffect(id)} className={cn("py-1.5 px-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between", id === "pause" && "col-span-2", transitionEffect === id ? (id === "pause" ? "bg-amber-500/15 text-amber-300 border-amber-500/50 font-bold" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-bold") : "bg-slate-900 text-slate-400 border-[#1e293b]")}><span>{label}</span>{id === "pause" && <Clock className={cn("w-3.5 h-3.5", transitionEffect === "pause" ? "text-amber-400" : "text-slate-500")} />}</button>
                  ))}
                </div>
                {transitionEffect === "pause" && (
                  <div className="bg-[#090f21] p-3 rounded-xl border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold"><span className="flex items-center gap-1.5 text-amber-400"><Clock className="w-3.5 h-3.5" /> Pause Duration</span><span className="font-mono text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500/40">{pauseDuration}s</span></div>
                    <div className="flex items-center gap-2"><input type="range" min={0.5} max={15} step={0.5} value={pauseDuration} onChange={(e) => setPauseDuration(parseFloat(e.target.value))} className="w-full accent-amber-400" /><div className="flex flex-col gap-0.5"><HoldButton onAction={() => setPauseDuration(p => Math.min(60, Math.round((p + 0.5) * 10) / 10))} className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronRight className="w-3.5 h-3.5 -rotate-90" /></HoldButton><HoldButton onAction={() => setPauseDuration(p => Math.max(0.5, Math.round((p - 0.5) * 10) / 10))} className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronRight className="w-3.5 h-3.5 rotate-90" /></HoldButton></div></div>
                    <div className="grid grid-cols-6 gap-1 text-[10px] font-mono">{[0.5, 1, 2, 3, 5, 10].map(sec => <button key={sec} onClick={() => setPauseDuration(sec)} className={cn("py-1 rounded font-bold border", pauseDuration === sec ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-900 text-slate-400 border-[#1e293b]")}>{sec}s</button>)}</div>
                  </div>
                )}
              </div>

              {/* Export */}
              <div className="bg-[#020617] p-4 rounded-2xl border border-[#1e293b] space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-200 flex items-center gap-1.5"><Video className="w-4 h-4 text-emerald-400" /> Save / Export Sequence</span><span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">Clean Export</span></div>
                  <div className="space-y-1.5"><div className="text-[10.5px] font-semibold text-slate-400">File Format</div><div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => setExportFormat("mp4")} className={cn("py-1.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5", exportFormat === "mp4" ? "bg-emerald-500 text-slate-950 border-emerald-400" : "bg-slate-900 text-slate-300 border-[#1e293b]")}><FileVideo className="w-3.5 h-3.5" /> .MP4</button>
                    <button onClick={() => setExportFormat("gif")} className={cn("py-1.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5", exportFormat === "gif" ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-900 text-slate-300 border-[#1e293b]")}><ImageIcon className="w-3.5 h-3.5" /> .GIF</button>
                    <button onClick={() => setExportFormat("webm")} className={cn("py-1.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5", exportFormat === "webm" ? "bg-cyan-500 text-slate-950 border-cyan-400" : "bg-slate-900 text-slate-300 border-[#1e293b]")}><Video className="w-3.5 h-3.5" /> .WebM</button>
                  </div></div>
                  <div className="space-y-1.5"><div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-400"><span>File Name</span><span className="text-[10px] text-slate-500">User-Defined</span></div><div className="relative flex items-center"><input value={exportFilename} onChange={(e) => setExportFilename(e.target.value)} placeholder="Enter file name…" className="w-full bg-[#090f21] border border-[#1e293b] focus:border-emerald-500/70 rounded-xl px-3 py-1.5 text-xs text-white font-mono pr-14 focus:outline-none" /><span className="absolute right-2 text-[11px] font-mono font-bold text-slate-400 px-1.5 py-0.5 bg-slate-900 border border-slate-700/60 rounded">.{exportFormat}</span></div><div className="flex gap-1.5 flex-wrap text-[9.5px]"><span className="text-slate-500">Presets:</span><button onClick={() => setExportFilename(`storyboard_movie_${fps}fps`)} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">storyboard_movie</button><button onClick={() => setExportFilename(`anim_${fps}fps`)} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">anim_{fps}fps</button><button onClick={() => setExportFilename(`seq_${new Date().toISOString().slice(0, 10)}`)} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">seq_date</button></div></div>
                  <p className="text-[10px] text-slate-400">{exportFormat === "mp4" ? "Renders sequence into standard MP4 playable anywhere." : exportFormat === "gif" ? "Animated GIF with 256-color palette." : "High-efficiency WebM video."}</p>
                </div>
                <div className="space-y-2 pt-2">
                  {isExporting ? (
                    <div className="space-y-2 p-3 bg-slate-900/80 rounded-xl border border-emerald-500/40"><div className="flex justify-between text-xs font-mono text-emerald-400"><span className="font-bold truncate max-w-[200px]">{exportStatusText || `Exporting .${exportFormat.toUpperCase()}…`}</span><span className="font-bold">{exportProgress}%</span></div><div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800"><div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all" style={{ width: `${exportProgress}%` }} /></div></div>
                  ) : (
                    <button onClick={handleExport} disabled={!activeFrames.length} className={cn("w-full py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg disabled:opacity-40", exportFormat === "mp4" ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950" : exportFormat === "gif" ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : "bg-cyan-500 hover:bg-cyan-400 text-slate-950")}><Download className="w-4 h-4" /> Export as {exportFormat.toUpperCase()}</button>
                  )}
                  {exportNotice && <div className="p-2.5 bg-emerald-950/60 border border-emerald-600/60 rounded-xl text-[11px] text-emerald-200 flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />{exportNotice}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
