/**
 * Front-page LED show renderer
 * ============================
 *
 * Renders a **submitted** Choreograph LED program over SeqCarver's real 4×4
 * front page grid. It uses the same deterministic resolver (`buildChoreoFrame`)
 * and the same beat-locked clock maths as the studio desk, so the formation that
 * was auditioned is exactly the one that airs.
 *
 *   advanceShowClock()  – pure show clock step (hold / loop / one-shot)
 *   showFrameAt()       – pure cue → ChoreoFrame lookup for any clock value
 *   <LedShowOverlay />  – paints the frame over the live grid (gap included)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { ChoreoCue, ChoreoFrame, ChoreoTileState } from "./types";
import type { FrontPanelGridRegion } from "../../types/frontPanelGrid";
import { buildChoreoFrame, cueDurationMs } from "./engine/choreography";
import type { LedStudioShowProgram } from "./integration";

export interface LedShowClock {
  cueIndex: number;
  elapsedMs: number;
  playing: boolean;
  complete: boolean;
}

/**
 * A choreography tile never paints at full opacity: the main campaign image it
 * performs over must stay readable underneath it. Shared by the front page and
 * the studio desk so both walls composite identically.
 */
export const CHOREO_MAX_TILE_OPACITY = 0.88;

export const LED_SHOW_CLOCK_START: LedShowClock = {
  cueIndex: 0,
  elapsedMs: 0,
  playing: true,
  complete: false,
};

export interface AdvanceShowClockOptions {
  bpm: number;
  /** Master slowdown of the monotonic show clock (0.10× – 1.50×). */
  timeScale: number;
  loop: boolean;
  /** Milliseconds of real time since the previous tick. */
  deltaMs: number;
}

/**
 * Advance the show clock by one frame. Beat-locked, deterministic and shared by
 * the studio desk and the front page so the two clocks can never disagree.
 */
export function advanceShowClock(
  clock: LedShowClock,
  cues: ChoreoCue[],
  { bpm, timeScale, loop, deltaMs }: AdvanceShowClockOptions,
): LedShowClock {
  if (!clock.playing || cues.length === 0) return clock;
  const scale = Math.min(1.5, Math.max(0.1, timeScale));
  let index = Math.min(Math.max(0, clock.cueIndex), cues.length - 1);
  let elapsed = clock.elapsedMs + Math.min(100, Math.max(0, deltaMs)) * scale;
  let playing = true;
  let complete = false;
  let duration = cueDurationMs(cues[index], bpm);

  while (elapsed >= duration) {
    elapsed -= duration;
    if (index < cues.length - 1) {
      index += 1;
    } else if (loop) {
      index = 0;
    } else {
      // A one-shot program completes on its final beat and holds the formation.
      elapsed = duration;
      playing = false;
      complete = true;
      break;
    }
    duration = cueDurationMs(cues[index], bpm);
  }

  return { cueIndex: index, elapsedMs: elapsed, playing, complete };
}

export interface ShowFrameResolution {
  frame: ChoreoFrame | null;
  cue: ChoreoCue | null;
  index: number;
  total: number;
}

/** Resolve the formation that airs for a given clock value. */
export function showFrameAt(
  cues: ChoreoCue[],
  clock: LedShowClock,
  bpm: number,
  cols = 4,
): ShowFrameResolution {
  if (cues.length === 0) return { frame: null, cue: null, index: 0, total: 0 };
  const index = Math.min(Math.max(0, clock.cueIndex), cues.length - 1);
  const cue = cues[index];
  return {
    frame: cue ? buildChoreoFrame(cue, clock.elapsedMs, bpm, cols) : null,
    cue,
    index,
    total: cues.length,
  };
}

/** Milliseconds until the current cue ends (used by the timeline chip). */
export function showCueRemainingMs(cue: ChoreoCue, elapsedMs: number, bpm: number): number {
  return Math.max(0, cueDurationMs(cue, bpm) - elapsedMs);
}

/* -------------------------------------------------------------------------- */
/*                                  geometry                                  */
/* -------------------------------------------------------------------------- */

export interface ShowTileRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Geometry (in % of the grid container) for one panel of an airing formation.
 *
 * * No `regions` → a uniform grid using the measured gap ratio.
 * * With `regions` (the panel grid configurator) → the configured panel wins:
 *   merged spans widen the box, disabled panels return `null`, and the cells
 *   covered by a merged span collapse into their anchor so a 2×2 panel paints
 *   once instead of four times.
 */
export function showTileRect(
  slot: number,
  cols: number,
  ratio: number | { x: number; y: number },
  regions?: FrontPanelGridRegion[] | null,
): ShowTileRect | null {
  // AdShop can be wide or tall: the same pixel gap is a different fraction of
  // a column and a row. The square studio still passes a single ratio.
  const xRatio = typeof ratio === "number" ? ratio : ratio.x;
  const yRatio = typeof ratio === "number" ? ratio : ratio.y;
  const tileX = 100 / (cols + (cols - 1) * xRatio);
  const tileY = 100 / (cols + (cols - 1) * yRatio);
  const gapX = tileX * xRatio;
  const gapY = tileY * yRatio;
  const strideX = tileX + gapX;
  const strideY = tileY + gapY;

  const gridRegions = regions && regions.length > 0 ? regions : null;
  if (!gridRegions) {
    const c = (slot - 1) % cols;
    const r = Math.floor((slot - 1) / cols);
    return { left: c * strideX, top: r * strideY, width: tileX, height: tileY };
  }

  const r0 = Math.floor((slot - 1) / cols);
  const c0 = (slot - 1) % cols;
  const region =
    gridRegions.find((candidate) => candidate.row * cols + candidate.col + 1 === slot) ??
    gridRegions.find(
      (candidate) =>
        r0 >= candidate.row &&
        r0 < candidate.row + candidate.rowSpan &&
        c0 >= candidate.col &&
        c0 < candidate.col + candidate.colSpan,
    );
  if (!region || region.active === false) return null;
  // A merged panel paints once, from its anchor slot.
  if (region.row * cols + region.col + 1 !== slot) return null;

  return {
    left: region.col * strideX,
    top: region.row * strideY,
    width: region.colSpan * tileX + (region.colSpan - 1) * gapX,
    height: region.rowSpan * tileY + (region.rowSpan - 1) * gapY,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  overlay                                   */
/* -------------------------------------------------------------------------- */

/**
 * Measure the CSS gap of the grid a layer sits inside, as a fraction of one
 * panel (`gap / cell`) — the same ratio `gap / size` the studio uses.
 *
 * The returned ref must be attached to an element whose **parent** is the grid.
 * Shared by the show overlay and the main image layer so the campaign crops, the
 * panel boxes and every airing tile use one geometry.
 */
export function useGridGapRatio(
  cols: number,
  enabled = true,
): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const grid = ref.current?.parentElement;
    if (!grid) return;
    const measure = () => {
      const rect = grid.getBoundingClientRect();
      if (rect.width <= 0) return;
      const styles = window.getComputedStyle(grid);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const cell = (rect.width - gap * (cols - 1)) / cols;
      if (cell <= 0) return;
      setRatio(gap / cell);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [cols, enabled]);

  return [ref, ratio];
}

/** Measure horizontal and vertical gap independently on non-square displays. */
function useGridRatios(cols: number, gapRevision?: number): [React.RefObject<HTMLDivElement | null>, { x: number; y: number }] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ratios, setRatios] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const grid = ref.current?.parentElement;
    if (!grid) return;
    const measure = () => {
      const rect = grid.getBoundingClientRect();
      const style = window.getComputedStyle(grid);
      const gapX = Number.parseFloat(style.columnGap || style.gap || "0") || 0;
      const gapY = Number.parseFloat(style.rowGap || style.gap || "0") || 0;
      const cellX = (rect.width - gapX * (cols - 1)) / cols;
      const cellY = (rect.height - gapY * (cols - 1)) / cols;
      if (cellX <= 0 || cellY <= 0) return;
      const next = { x: gapX / cellX, y: gapY / cellY };
      setRatios((old) => old.x === next.x && old.y === next.y ? old : next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [cols, gapRevision]);
  return [ref, ratios];
}

function ShowTile({
  tile,
  rect,
  accent,
  radius,
  inset,
  transitionMs,
  flip,
}: {
  tile: ChoreoTileState;
  rect: { left: number; top: number; width: number; height: number };
  accent: string;
  radius: number;
  inset: number;
  transitionMs: number;
  flip: boolean;
}) {
  const cropCols = tile.cropCols ?? 4;
  const cropCol = tile.cropIndex === undefined ? 0 : tile.cropIndex % cropCols;
  const cropRow = tile.cropIndex === undefined ? 0 : Math.floor(tile.cropIndex / cropCols);
  const backgroundPositionX = cropCols <= 1 ? 0 : (cropCol / (cropCols - 1)) * 100;
  const backgroundPositionY = cropCols <= 1 ? 0 : (cropRow / (cropCols - 1)) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.72 }}
      animate={{
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
        opacity: Math.min(tile.opacity, CHOREO_MAX_TILE_OPACITY),
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.72 }}
      transition={{
        duration: Math.max(0.08, transitionMs / 1000),
        ease: flip ? [0.3, 0, 0.15, 1] : [0.2, 0.8, 0.2, 1],
      }}
      className="absolute pointer-events-none will-change-[left,top,opacity]"
      style={{ zIndex: Math.round(tile.glow * 10) + 1 }}
    >
      <div
        className="choreo-tile absolute overflow-hidden"
        data-choreo-tile={tile.slot}
        style={{
          inset: `${inset}%`,
          borderRadius: radius,
          border: `1px solid ${accent}cc`,
          boxShadow: `0 0 ${8 + tile.glow * 22}px ${accent}55, 0 10px 26px rgba(0,0,0,.42)`,
          filter: `blur(${tile.blur}px)`,
          transform: `perspective(700px) translate(${tile.translateX}%, ${tile.translateY}%) scale(${tile.scale}) rotate(${tile.rotate}deg) rotateX(${tile.rotateX}deg)`,
          transformOrigin: flip ? "center top" : "center",
          backfaceVisibility: "hidden",
          transitionDuration: `${transitionMs}ms`,
        }}
      >
        {/* The cast artwork is the topmost layer, and it is never fully opaque:
            the main campaign image behind it keeps reading through. */}
        {tile.cropIndex === undefined ? (
          <img
            src={tile.url}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ mixBlendMode: "normal", opacity: 1 }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${JSON.stringify(tile.url)})`,
              backgroundSize: `${cropCols * 100}% ${cropCols * 100}%`,
              backgroundPosition: `${backgroundPositionX}% ${backgroundPositionY}%`,
              backgroundRepeat: "no-repeat",
            }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${accent}${Math.round(tile.glow * 36)
              .toString(16)
              .padStart(2, "0")}, transparent 72%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

export interface LedShowOverlayProps {
  show: LedStudioShowProgram;
  /** The front page header transport owns start/stop; this just mirrors it. */
  playing: boolean;
  cols: number;
  /**
   * Bumped every time the header transport (re)starts the program. A new value
   * remounts the clock on beat one, so a restart always airs from the top.
   */
  runId?: number;
  /** Scene index currently airing (reported back for the wall chip). */
  onSceneChange?: (index: number) => void;
  /** Fired when a one-shot program completes on its final beat. */
  onComplete?: () => void;
  radius?: number;
  inset?: number;
  /** Re-measure when the CSS gap changes without resizing the grid itself. */
  gapRevision?: number;
  /**
   * The live panel-grid configurator output. When present, formations land on
   * the configured panels (merged spans, gaps and disabled slots included).
   */
  regions?: FrontPanelGridRegion[];
}

export function LedShowOverlay({
  show,
  playing,
  cols,
  runId = 0,
  onSceneChange,
  onComplete,
  radius = 10,
  inset = 3,
  gapRevision,
  regions,
}: LedShowOverlayProps) {
  const [gridRef, ratio] = useGridRatios(cols, gapRevision);
  const cues = show.cues;
  const [clock, setClock] = useState<LedShowClock>({ ...LED_SHOW_CLOCK_START, playing });

  // A freshly submitted program (or a restart from the header transport) starts
  // on its first beat.
  useEffect(() => {
    setClock({ cueIndex: 0, elapsedMs: 0, playing, complete: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, runId]);

  useEffect(() => {
    setClock((prev) => (prev.playing === playing ? prev : { ...prev, playing, complete: playing ? false : prev.complete }));
  }, [playing]);

  const clockRef = useRef(clock);
  clockRef.current = clock;

  // Keep the completion callback out of the animation-effect deps so a parent
  // re-render never restarts the clock mid-show.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!playing || cues.length === 0) return;
    let raf = 0;
    let last = performance.now();
    let lastPaint = last;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const next = advanceShowClock(clockRef.current, cues, {
        bpm: show.bpm,
        timeScale: show.timeScale,
        loop: show.loop,
        deltaMs: delta,
      });
      clockRef.current = next;
      // Same 30 ms paint cadence as the studio desk's show clock.
      if (now - lastPaint >= 30 || next.complete) {
        setClock(next);
        lastPaint = now;
      }
      if (next.complete) {
        onCompleteRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, cues, show.bpm, show.timeScale, show.loop]);

  const { frame, index } = useMemo(
    () => showFrameAt(cues, clock, show.bpm, cols),
    [cues, clock, show.bpm, cols],
  );

  // Report the airing scene so the front page can label the wall chip.
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  const reportedIndex = useRef(-1);
  useEffect(() => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    onSceneChangeRef.current?.(index);
  }, [index]);

  const rectFor = (slot: number) => showTileRect(slot, cols, ratio, regions);

  return (
    <>
      <div ref={gridRef} className="pointer-events-none absolute inset-0 z-[32]" data-led-show-overlay="true">
        {frame ? (
          frame.tiles.map((tile) => {
            const rect = rectFor(tile.slot);
            // A disabled region hides its tile until the configurator re-enables it.
            if (!rect) return null;
            return (
              <ShowTile
                key={tile.id}
                tile={tile}
                rect={rect}
                accent={frame.accent}
                radius={radius}
                inset={inset}
                transitionMs={frame.transitionMs}
                flip={frame.transition === "flip"}
              />
            );
          })
        ) : null}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                       non-interactive frame renderer                       */
/* -------------------------------------------------------------------------- */

/**
 * A tiny, non-interactive 4×4 preview of one show frame — used by the studio's
 * audition strip and by status chips so the front page and the desk never drift.
 */
export function ShowFramePreview({
  frame,
  cols = 4,
  className = "",
}: {
  frame: ChoreoFrame | null;
  cols?: number;
  className?: string;
}) {
  if (!frame) return null;
  const radius = 4;
  const unit = 100 / cols;
  return (
    <div className={`relative overflow-hidden rounded-md bg-black/40 ${className}`}>
      {frame.tiles.map((tile) => {
        const c = (tile.slot - 1) % cols;
        const r = Math.floor((tile.slot - 1) / cols);
        return (
          <div
            key={tile.id}
            className="absolute overflow-hidden"
            style={{
              left: `${c * unit}%`,
              top: `${r * unit}%`,
              width: `${unit}%`,
              height: `${unit}%`,
              borderRadius: radius,
              border: `1px solid ${frame.accent}aa`,
              opacity: tile.opacity,
              transform: `scale(${tile.scale})`,
            }}
          >
            <img src={tile.url} alt="" className="h-full w-full object-cover" />
          </div>
        );
      })}
    </div>
  );
}
