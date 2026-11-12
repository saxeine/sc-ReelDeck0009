import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { ExternalLink, Link2 } from 'lucide-react';
import type { AdvertPanel, ChoreoTileState, ChoreoTransition } from '../../types';
import type { FrontPanelGridRegion } from '../../../../types/frontPanelGrid';
import { CHOREO_MAX_TILE_OPACITY, showTileRect } from '../../frontPageShow';
import { MAX_PASSES_PER_PANEL, type AdvertEngine } from '../../engine/useAdvertEngine';
import { AdvertPanelVisual } from './AdvertPanelVisual';
import { darken, lighten } from '../../utils/color';
import { cn } from '../../utils/cn';

export interface AdvertLayerProps {
  engine: AdvertEngine;
  /** panel size + gap in mm — drives the exact geometry of the LED tiles */
  size: number;
  gap: number;
  onInspect: (slot: number) => void;
  onOpenLink: (url: string, target: string) => void;
  interactive?: boolean;
  /** draw the drawn-order route over the wall (off for the front page) */
  showRoute?: boolean;
  /** number the steps on the adverts (off for the front page) */
  showSteps?: boolean;
  /** Audition the selected show cue here without putting it on the main output. */
  previewChoreography?: boolean;
  /**
   * The front page panel grid configurator output. When present the cards and
   * every formation resolve onto the configured panels (merged spans and
   * disabled slots included) instead of a uniform 4×4 grid — the preview is
   * then pixel-for-pixel what the front page will air.
   */
  regions?: FrontPanelGridRegion[] | null;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TileProps {
  slot: number;
  panel: AdvertPanel;
  frame: string | null;
  rect: Rect;
  isLeader: boolean;
  stepIndex: number;
  radius: number;
  inset: number;
  hovered: boolean;
  /** show → hide → next timing for the flash behaviour */
  flash: boolean;
  /** configurable sequence accent */
  accent: string;
  px: MotionValue<number>;
  py: MotionValue<number>;
}

function AdvertTile({
  slot,
  panel,
  frame,
  rect,
  isLeader,
  stepIndex,
  radius,
  inset,
  hovered,
  flash,
  accent,
  px,
  py,
}: TileProps) {
  const depth = panel.tilt || 1;
  const dx = useTransform(px, (v) => (panel.parallax ? v * depth : 0));
  const dy = useTransform(py, (v) => (panel.parallax ? v * depth : 0));
  const st = panel.style;
  const borderColor = isLeader ? '#cbf36b' : st.borderColor ?? '#9cc97d';
  const borderWidth = st.borderWidth ?? 1;

  return (
    <motion.div
      key={`tile-${slot}`}
      initial={{ opacity: 0, scale: 0.86, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{
        opacity: 0,
        scale: 0.92,
        filter: 'blur(5px)',
        transition: { duration: flash ? 0.14 : 0.28, ease: 'easeIn' },
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 26,
        delay: flash ? 0.14 : 0,
      }}
      className="absolute pointer-events-none"
      style={{
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
        x: dx,
        y: dy,
      }}
    >
      <div
        className="absolute overflow-hidden"
        style={{
          inset: `${inset}%`,
          opacity: st.opacity ?? 1,
          borderRadius: radius,
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: [
            st.glow ? `0 0 18px ${borderColor}88` : '',
            isLeader ? '0 0 14px rgba(203,243,107,0.35)' : '',
            '0 10px 24px rgba(0,0,0,0.35)',
          ]
            .filter(Boolean)
            .join(', '),
        }}
      >
        <AdvertPanelVisual panel={panel} frame={frame} slot={slot} hovered={hovered} />

        {/* compact leader marker — much smaller than the panel it marks */}
        {isLeader && (
          <div className="absolute top-[8%] right-[8%] z-20 pointer-events-none" title="Sequence leader">
            <span className="relative flex w-[13%] pt-[13%] min-w-[7px] min-h-[7px]">
              <span
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
              />
              <span
                className="seq-leader-ping absolute inset-0 rounded-full border"
                style={{ borderColor: accent }}
              />
            </span>
          </div>
        )}

        {/* step badge */}
        {stepIndex >= 0 && (
          <div
            className={cn(
              'absolute bottom-[7%] left-[7%] z-20 min-w-[13px] h-[12px] px-[3px] rounded-[3px] flex items-center justify-center font-mono text-[7px] font-black leading-none',
              !isLeader && 'bg-black/70 border backdrop-blur-sm'
            )}
            style={
              isLeader
                ? { backgroundColor: accent, color: '#141008' }
                : { color: accent, borderColor: `${accent}66` }
            }
            title={`Step ${stepIndex + 1} in drawn order`}
          >
            {stepIndex + 1}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChoreographyTile({
  tile,
  rect,
  accent,
  radius,
  inset,
  preview,
  transition,
  transitionMs,
}: {
  tile: ChoreoTileState;
  rect: Rect;
  accent: string;
  radius: number;
  inset: number;
  preview: boolean;
  transition: ChoreoTransition;
  transitionMs: number;
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
        // The campaign (L1) is never painted over completely: choreography
        // composites on top of it at a capped opacity, exactly like the front page.
        opacity: Math.min(tile.opacity * (preview ? 0.88 : 1), CHOREO_MAX_TILE_OPACITY),
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.72 }}
      transition={{
        duration: Math.max(0.08, transitionMs / 1000),
        ease: transition === 'glide' ? [0.2, 0.8, 0.2, 1] : transition === 'flip' ? [0.3, 0, 0.15, 1] : 'easeOut',
      }}
      className="absolute pointer-events-none will-change-[left,top,opacity]"
      style={{ zIndex: Math.round(tile.glow * 10) + 1 }}
    >
      <div
        className="absolute overflow-hidden choreo-tile"
        style={{
          inset: `${inset}%`,
          borderRadius: radius,
          border: `1px solid ${accent}${preview ? '88' : 'cc'}`,
          boxShadow: `0 0 ${8 + tile.glow * 22}px ${accent}${preview ? '28' : '55'}, 0 10px 26px rgba(0,0,0,.42)`,
          filter: `blur(${tile.blur}px)`,
          transform: `perspective(700px) translate(${tile.translateX}%, ${tile.translateY}%) scale(${tile.scale}) rotate(${tile.rotate}deg) rotateX(${tile.rotateX}deg)`,
          transformOrigin: transition === 'flip' ? 'center top' : 'center',
          backfaceVisibility: 'hidden',
          transitionDuration: `${transitionMs}ms`,
        }}
      >
        {tile.cropIndex === undefined ? (
          <img src={tile.url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${JSON.stringify(tile.url)})`,
              backgroundSize: `${cropCols * 100}% ${cropCols * 100}%`,
              backgroundPosition: `${backgroundPositionX}% ${backgroundPositionY}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${accent}${Math.round(tile.glow * 36)
              .toString(16)
              .padStart(2, '0')}, transparent 72%)`,
          }}
        />
        {transition === 'flip' && (
          <>
            <div className="absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-black shadow-[0_-1px_rgba(255,255,255,.22),0_2px_4px_rgba(0,0,0,.85)]" />
            <span className="absolute bottom-[4%] right-[5%] z-20 rounded-[2px] bg-black/75 px-1 font-mono text-[5px] font-black tracking-[0.12em] text-amber-200">
              {String(tile.slot).padStart(2, '0')}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}

/**
 * The second layer: advert cards stacked exactly over the physical LED panels,
 * revealed in the drawn sequence order. Everything here is pure presentation —
 * the sequencer engine decides what is live.
 */
export function AdvertLayer({
  engine,
  size,
  gap,
  onInspect,
  onOpenLink,
  interactive = true,
  showRoute = true,
  showSteps = true,
  previewChoreography = false,
  regions = null,
}: AdvertLayerProps) {
  const { cols, layer, panels, active, playing, behavior, path, leaderSlot, stepIndexOf } = engine;
  const showMode = engine.controllerMode === 'show';
  const showFrame = showMode
    ? active
      ? engine.choreography.frame
      : previewChoreography
        ? engine.choreography.previewFrame
        : null
    : null;
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const paintingRef = useRef(false);
  const lastPaintedSlot = useRef<number | null>(null);
  const hitGridRef = useRef<HTMLDivElement>(null);
  const [painting, setPainting] = useState(false);

  /* the auditioned scene's cast can be dragged from panel to panel */
  const auditionCue = showMode && previewChoreography ? engine.choreography.selectedCue : null;
  const castEditor = Boolean(auditionCue) && !active && !engine.boardPaintArmed;
  const [castDrag, setCastDrag] = useState<{ index: number; from: number; to: number | null } | null>(null);
  const castDragRef = useRef(castDrag);
  castDragRef.current = castDrag;
  const auditionCueRef = useRef(auditionCue);
  auditionCueRef.current = auditionCue;
  const updateCue = engine.choreography.updateCue;
  const notify = engine.notify;

  /* a stroke ends wherever the pointer is released */
  useEffect(() => {
    const end = () => {
      paintingRef.current = false;
      lastPaintedSlot.current = null;
      setPainting(false);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  /* drag a cast member between panels: drop commits its new start slot */
  const castDragging = castDrag !== null;
  useEffect(() => {
    if (!castDragging) return;
    const slotAt = (x: number, y: number) => {
      const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]');
      if (!hit || !hitGridRef.current?.contains(hit)) return null;
      const slot = Number(hit.dataset.slot);
      return Number.isInteger(slot) && slot > 0 ? slot : null;
    };
    const onMove = (event: PointerEvent) => {
      const slot = slotAt(event.clientX, event.clientY);
      setCastDrag((prev) => {
        if (!prev) return prev;
        const to = slot && slot !== prev.from ? slot : null;
        return prev.to === to ? prev : { ...prev, to };
      });
    };
    const onUp = (event: PointerEvent) => {
      const drag = castDragRef.current;
      const slot = slotAt(event.clientX, event.clientY);
      setCastDrag(null);
      if (!drag || !slot || slot === drag.from) return;
      const cue = auditionCueRef.current;
      if (!cue || drag.index >= cue.castSlots.length) return;
      const castSlots = [...cue.castSlots];
      castSlots[drag.index] = slot;
      updateCue(cue.id, { castSlots });
      notify(`Cast moved to panel ${String(slot).padStart(2, '0')}`, 'success');
    };
    const onCancel = () => setCastDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [castDragging, updateCue, notify]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 170, damping: 20 });
  const sy = useSpring(my, { stiffness: 170, damping: 20 });

  const ratio = gap / Math.max(1, size);
  const tilePct = 100 / (cols + (cols - 1) * ratio);
  const gapPct = tilePct * ratio;
  const unit = tilePct + gapPct;

  const rectFor = (slot: number): Rect | null => {
    // The configured panel grid wins: merged panels paint once from their anchor
    // and disabled panels never paint (identical maths to the front page).
    if (regions && regions.length > 0) return showTileRect(slot, cols, ratio, regions);
    const c = (slot - 1) % cols;
    const r = Math.floor((slot - 1) / cols);
    return { left: c * unit, top: r * unit, width: tilePct, height: tilePct };
  };

  const points = path.flatMap((slot) => {
    const rect = rectFor(slot);
    return rect ? [{ slot, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, hidden: false }] : [];
  });
  const pointStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const progressCount = !active
    ? 0
    : behavior === 'reveal'
      ? Math.min(engine.revealCount, path.length)
      : Math.min(engine.cursor + 1, path.length);
  const progressStr = points
    .slice(0, Math.max(1, progressCount))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
  const leaderPoint = active && leaderSlot ? points.find((p) => p.slot === leaderSlot) : null;

  const visibleSlots = showMode
    ? []
    : Array.from(new Set(engine.revealed)).filter((slot) =>
        layer.mode === 'spotlight' ? slot === leaderSlot : true
      );

  const parallaxOn = Object.values(panels).some((p) => p.parallax);

  /* configurable sequence accent (orange by default) */
  const accent = layer.seqColor || '#ff8a1f';
  const accentLight = lighten(accent, 0.62);
  const accentDeep = darken(accent, 0.18);
  const flash = layer.seqFlash !== false;

  return (
    <div
      className={cn(
        'absolute inset-0 z-[2]',
        engine.boardPaintArmed ? 'cursor-paint' : ''
      )}
      onPointerMove={(e) => {
        if (!parallaxOn) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * -18);
        my.set(((e.clientY - r.top) / r.height - 0.5) * -18);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
        setHoveredSlot(null);
      }}
    >
      {/* The main campaign image (L1) is never dimmed or blurred away: the
          choreography is composited on top of it with soft drop shadows, so the
          wall always shows the campaign underneath the performance. */}

      {/* the advert layer itself */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: layer.opacity,
          mixBlendMode: layer.blend === 'normal' ? undefined : layer.blend,
        }}
      >
        <AnimatePresence initial={false}>
          {visibleSlots.map((slot) => {
            const panel = panels[slot];
            if (!panel) return null;
            const rect = rectFor(slot);
            if (!rect) return null;
            return (
              <AdvertTile
                key={`${slot}`}
                slot={slot}
                panel={panel}
                frame={engine.displayFrame(slot)}
                rect={rect}
                isLeader={active && leaderSlot === slot}
                stepIndex={showSteps ? stepIndexOf(slot) : -1}
                radius={layer.radius}
                inset={layer.inset}
                hovered={hoveredSlot === slot}
                flash={behavior === 'flash'}
                accent={accent}
                px={sx}
                py={sy}
              />
            );
          })}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showFrame?.tiles.map((tile) => {
            const rect = rectFor(tile.slot);
            if (!rect) return null;
            return (
            <ChoreographyTile
              key={tile.id}
              tile={tile}
              rect={rect}
              accent={showFrame.accent}
              radius={layer.radius}
              inset={layer.inset}
              preview={!active}
              transition={showFrame.transition}
              transitionMs={showFrame.transitionMs}
            />
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* drawn-order route */}
      {!showMode && showRoute && layer.showRoute && points.length > 0 && (active || engine.boardPaintArmed) && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wallseqgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accentLight} />
              <stop offset="55%" stopColor={accent} />
              <stop offset="100%" stopColor={accentDeep} />
            </linearGradient>
            <filter id="wallseqglow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={accent} floodOpacity="0.7" />
            </filter>
            <marker
              id="wallseqarrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={accent} stroke="#04120a" strokeWidth="0.9" />
            </marker>
          </defs>

          {points.length > 1 && (
            <>
              {/* dark casing keeps the route readable over any artwork */}
              <polyline
                points={pointStr}
                fill="none"
                stroke="#04120a"
                strokeWidth={2.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeOpacity={0.72}
              />
              <polyline
                points={pointStr}
                fill="none"
                stroke="url(#wallseqgrad)"
                strokeWidth={1.15}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="2 2.2"
                strokeOpacity={active ? 0.9 : 0.7}
                className={flash ? 'seq-flash-soft' : undefined}
              />
              {progressCount > 1 && (
                <>
                  <polyline
                    points={progressStr}
                    fill="none"
                    stroke="#04120a"
                    strokeWidth={3.2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeOpacity={0.82}
                  />
                  <polyline
                    points={progressStr}
                    fill="none"
                    stroke="url(#wallseqgrad)"
                    strokeWidth={1.7}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeOpacity={1}
                    filter="url(#wallseqglow)"
                    markerEnd="url(#wallseqarrow)"
                    className={flash ? 'seq-flash' : undefined}
                  />
                </>
              )}
              {playing && (
                <polyline
                  points={pointStr}
                  fill="none"
                  stroke={accentLight}
                  strokeWidth={0.95}
                  strokeLinecap="round"
                  strokeDasharray="0.5 2.4"
                  className={cn('seq-march-slow', flash && 'seq-flash-soft')}
                  strokeOpacity={0.95}
                />
              )}
            </>
          )}

          {points.map((p, i) => (
            <g
              key={`${p.slot}-${i}`}
              opacity={active ? 1 : 0.8}
              className={flash && i === 0 ? 'seq-flash' : undefined}
            >
              <circle cx={p.x} cy={p.y} r={i === 0 ? 1.6 : 1.2} fill="#04120a" fillOpacity={0.75} />
              <circle
                cx={p.x}
                cy={p.y}
                r={i === 0 ? 1.05 : 0.85}
                fill={i === 0 ? accent : '#0d1a0f'}
                stroke={i === 0 ? accentLight : accent}
                strokeWidth={0.5}
              />
            </g>
          ))}

          {leaderPoint && (
            <>
              <circle cx={leaderPoint.x} cy={leaderPoint.y} r={2.2} fill="#04120a" fillOpacity={0.8} />
              <circle
                cx={leaderPoint.x}
                cy={leaderPoint.y}
                r={1.2}
                fill={accent}
                stroke={accentLight}
                strokeWidth={0.55}
                filter="url(#wallseqglow)"
                className={flash ? 'seq-flash' : undefined}
              />
              <circle
                cx={leaderPoint.x}
                cy={leaderPoint.y}
                r={2.4}
                fill="none"
                stroke={accent}
                strokeWidth={0.6}
                className="seq-leader-ping"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            </>
          )}
        </svg>
      )}

      {/* invisible hit grid — selects, inspects and paints the physical panels */}
      {interactive && (
        <div ref={hitGridRef} className="absolute inset-0 z-[4]" onPointerMove={(event) => {
          // Touch screens implicitly capture the pointer on the first cell, so
          // resolve the cell under the finger instead of relying on pointerenter.
          if (!paintingRef.current || !engine.boardPaintArmed) return;
          const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-slot]');
          if (!hit || !hitGridRef.current?.contains(hit)) return;
          const next = Number(hit.dataset.slot);
          if (next && next !== lastPaintedSlot.current) {
            lastPaintedSlot.current = next;
            setHoveredSlot(next);
            engine.paintSlot(next);
          }
        }}>
          {Array.from({ length: cols * cols }, (_, i) => i + 1).map((slot) => {
            const rect = rectFor(slot);
            if (!rect) return null;
            const castIndex = auditionCue ? auditionCue.castSlots.indexOf(slot) : -1;
            const draggableCast = castEditor && castIndex >= 0;
            const dropTarget = castDrag?.to === slot;
            return (
              <div
                key={`hit-${slot}`}
                data-slot={slot}
                title={
                  draggableCast
                    ? `Panel ${slot} · drag to move cast ${castIndex + 1}`
                    : castEditor
                      ? `Panel ${slot} · drop a cast tile here`
                      : `Panel ${slot}`
                }
                className={cn(
                  'absolute transition-colors select-none',
                  engine.boardPaintArmed
                    ? 'cursor-crosshair touch-none'
                    : draggableCast
                      ? 'cursor-grab active:cursor-grabbing touch-none'
                      : 'cursor-pointer',
                  engine.boardPaintArmed && painting && hoveredSlot === slot && 'bg-cyan-300/10',
                  castDrag?.from === slot && 'ring-2 ring-inset ring-led-lime/70',
                  dropTarget && 'bg-led-lime/20 ring-2 ring-inset ring-led-lime'
                )}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                }}
                onPointerDown={(e) => {
                  if (!engine.boardPaintArmed) {
                    engine.setSelectedSlot(slot);
                    if (draggableCast) {
                      e.preventDefault();
                      setCastDrag({ index: castIndex, from: slot, to: null });
                    }
                    return;
                  }
                  e.preventDefault();
                  paintingRef.current = true;
                  lastPaintedSlot.current = slot;
                  setPainting(true);
                  engine.paintSlot(slot);
                }}
                onPointerEnter={() => {
                  setHoveredSlot(slot);
                  /* paint only while a stroke is held — a plain hover must not draw */
                  if (engine.boardPaintArmed && paintingRef.current && lastPaintedSlot.current !== slot) {
                    lastPaintedSlot.current = slot;
                    engine.paintSlot(slot);
                  }
                }}
                onDoubleClick={() => {
                  if (!engine.boardPaintArmed) onInspect(slot);
                }}
              >
                {engine.boardPaintArmed && (() => {
                  const passes = path.reduce((n, s2) => (s2 === slot ? n + 1 : n), 0);
                  const maxed = passes >= MAX_PASSES_PER_PANEL;
                  return (
                    <span
                      title={
                        passes
                          ? `Panel ${slot} · ${passes}/${MAX_PASSES_PER_PANEL} passes`
                          : `Panel ${slot} · drag to paint`
                      }
                      className={cn(
                        'absolute top-[7%] left-[7%] w-[24%] max-w-[24px] aspect-square grid place-items-center rounded-[3px] bg-black/55 border font-mono text-[7px] leading-none',
                        maxed
                          ? 'border-amber-400/70 text-amber-200'
                          : passes
                            ? 'border-cyan-300/60 text-cyan-100'
                            : 'border-cyan-300/25 text-cyan-100/70'
                      )}
                    >
                      {String(slot).padStart(2, '0')}
                      {passes > 0 && (
                        <span className="absolute -top-[3px] -right-[3px] min-w-[7px] h-[7px] px-[1px] rounded-full bg-cyan-400 text-[5.5px] font-black text-[#04140f] grid place-items-center">
                          {passes}
                        </span>
                      )}
                    </span>
                  );
                })()}
                {engine.selectedSlot === slot && (
                  <span
                    title={`Panel ${slot} selected`}
                    className="absolute bottom-[6%] right-[6%] w-[9px] h-[9px] rounded-full border-2 border-led-lime bg-[#10160f]/80 shadow-[0_0_8px_rgba(203,243,107,0.5)] pointer-events-none"
                  />
                )}
                {!showMode &&
                  !engine.boardPaintArmed &&
                  engine.revealedSet.has(slot) &&
                  panels[slot]?.link.url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLink(panels[slot]!.link.url!, panels[slot]!.link.target);
                      }}
                      title={panels[slot]!.link.url}
                      className="absolute bottom-[6%] right-[6%] p-1 rounded bg-black/75 border border-cyan-400/60 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer"
                    >
                      {panels[slot]!.link.hoverEffect !== 'none' ? (
                        <ExternalLink className="w-2.5 h-2.5" />
                      ) : (
                        <Link2 className="w-2.5 h-2.5" />
                      )}
                    </button>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* layer badge */}
      <div className="absolute top-1.5 right-1.5 z-[5] pointer-events-none flex items-center gap-1">
        <span
          className={cn(
            'flex items-center gap-1 px-1.5 py-[3px] rounded text-[7px] font-mono font-bold uppercase tracking-[0.16em] border backdrop-blur-sm',
            active
              ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
              : 'border-[#3a4436] bg-black/45 text-[#8d9a86]'
          )}
        >
          <span className={cn('w-1 h-1 rounded-full', active ? 'bg-led-lime animate-pulse' : 'bg-[#6f7a69]')} />
          L2 · {showMode ? 'show' : 'route'} {active ? (playing ? 'live' : 'held') : previewChoreography && showMode ? 'audition' : 'standby'}
        </span>
      </div>

      {/* paint banner */}
      {engine.boardPaintArmed && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-[6] pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-300 text-[#06282b] text-[9px] font-black font-mono uppercase tracking-[0.16em] shadow-[0_0_22px_rgba(34,211,238,0.55)] animate-pulse">
            paint mode · drag across panels
          </div>
        </div>
      )}

      {/* audition move banner */}
      {castEditor && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-[6] pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-full border border-led-lime/60 bg-[#0b120a]/95 px-2.5 py-1 font-mono text-[8.5px] font-black uppercase tracking-[0.16em] text-led-lime shadow-[0_0_18px_rgba(203,243,107,0.25)]">
            {castDrag
              ? castDrag.to
                ? `move cast → panel ${String(castDrag.to).padStart(2, '0')}`
                : 'move cast · choose a panel'
              : auditionCue && auditionCue.castSlots.length
                ? 'drag a cast tile to another panel'
                : 'no cast in this scene yet'}
          </div>
        </div>
      )}
    </div>
  );
}
