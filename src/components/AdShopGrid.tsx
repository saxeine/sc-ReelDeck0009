import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { AdShopImage } from "../types";
import { defaultFrontPanelGridRegions, type FrontPanelGridRegion } from "../types/frontPanelGrid";
import { safePanelLink } from "../lib/adshopAnimation";
import { effectiveSequencerInterval, sequencerImageStretch } from "../utils/sequencerPresets";
import { getSequencerRuntimeStyle, type SequencerPanelState } from "./SequencerPanel";
import { LedShowOverlay } from "./ledStudio/frontPageShow";
import type { LedStudioPanelProgram } from "./ledStudio/integration";
import type { LedShowTransportState } from "./ledStudio/frontPageTransport";

export type DisplayShape = "square" | "landscape" | "portrait";
export type ImageFit = "cover" | "contain";
export interface DisplayTransform {
  shape: DisplayShape; gap: number; radius: number; rotation: number; fit: ImageFit; showNumbers: boolean;
}
export const DISPLAY_SHAPES: Record<DisplayShape, { label: string; ratio: number }> = {
  square: { label: "Square", ratio: 1 }, landscape: { label: "Wide", ratio: 16 / 9 }, portrait: { label: "Tall", ratio: 9 / 16 },
};
export const DEFAULT_DISPLAY_TRANSFORM: DisplayTransform = {
  shape: "square", gap: 12, radius: 17, rotation: 0, fit: "cover", showNumbers: false,
};

/** Size an image box so a quarter-turn still fills (or fits) its display plane. */
export function displayImageStyle(transform: DisplayTransform, planeRatio: number): CSSProperties {
  const sideways = transform.rotation % 180 !== 0;
  return {
    position: "absolute", left: "50%", top: "50%", maxWidth: "none",
    width: sideways ? `${100 / planeRatio}%` : "100%",
    height: sideways ? `${100 * planeRatio}%` : "100%",
    objectFit: transform.fit,
    transform: `translate(-50%, -50%) rotate(${transform.rotation}deg)`,
  };
}

/** AdShop's base imagery, shared panel geometry, route and submitted show. */
export function AdShopGrid({ src, sourceName, tileImages, transform, regions, sequence, panelPrograms,
  rotationIndices, show, onSceneChange, onShowComplete }: {
  src: string;
  sourceName: string;
  tileImages?: readonly AdShopImage[];
  transform: DisplayTransform;
  regions?: FrontPanelGridRegion[];
  sequence?: SequencerPanelState;
  panelPrograms?: Record<number, LedStudioPanelProgram> | null;
  rotationIndices?: Record<number, number>;
  show?: LedShowTransportState;
  onSceneChange?: (index: number) => void;
  onShowComplete?: () => void;
}) {
  const ratio = DISPLAY_SHAPES[transform.shape].ratio;
  const gridRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState({ width: ratio, height: 1 });
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const rect = grid.getBoundingClientRect();
      const width = (rect.width - transform.gap * 3) / 4;
      const height = (rect.height - transform.gap * 3) / 4;
      if (width > 0 && height > 0) {
        setCell((current) => Math.abs(current.width - width) < 0.0001 && Math.abs(current.height - height) < 0.0001
          ? current : { width, height });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [transform.shape, transform.gap]);

  const layout = regions ?? defaultFrontPanelGridRegions(4);
  const path = sequence?.path.filter((slot) => sequence.activeSlots.includes(slot) && slot >= 1 && slot <= 16) ?? [];
  const visiblePath = sequence && !sequence.bypassed && (sequence.playing || sequence.manualStep) ? path : [];
  const behavior = sequence?.routeBehavior ?? (sequence?.turnMode === "step" ? "flash" : sequence?.turnMode);
  const activeSlots = behavior === "reveal" ? visiblePath.slice(0, sequence?.currentStep ?? 0)
    : behavior === "flash" ? [visiblePath[(sequence?.currentStep ?? 1) - 1]].filter(Boolean) : visiblePath;

  return (
    <div ref={gridRef} className="as-grid" role="group"
      aria-label={`Four by four display preview: ${sourceName}`} style={{ gap: `${transform.gap}px` }}>
      {layout.map((region) => {
        const index = region.row * 4 + region.col;
        const slot = index + 1;
        const tileImage = tileImages?.[index];
        const panelWidth = cell.width * region.colSpan + transform.gap * (region.colSpan - 1);
        const panelHeight = cell.height * region.rowSpan + transform.gap * (region.rowSpan - 1);
        const panelRatio = panelWidth / panelHeight;
        const individualStyle = displayImageStyle(transform, panelRatio);
        const spreadStyle = displayImageStyle(transform, panelRatio * region.rowSpan / region.colSpan);
        const panel = panelPrograms?.[slot];
        const frame = panel?.rotating && panel.rotation.length > 1
          ? panel.rotation[(rotationIndices?.[slot] ?? 0) % panel.rotation.length] : panel?.artwork || panel?.source;
        const active = activeSlots.includes(slot) && region.active;
        const flip = sequence?.flipFrames?.[slot];
        const sequenceImage = active ? (flip?.length ? flip[(sequence?.flipFrameIndices?.[slot] ?? 0) % flip.length] : sequence?.secondaryImages[slot]) : undefined;
        const panelImage = sequenceImage || frame;
        const empty = region.active && !panelImage && !!tileImages && !tileImage;
        const link = region.active && panel?.link?.url ? safePanelLink(panel.link.url) : undefined;
        const motionStyle = sequence ? getSequencerRuntimeStyle(sequence.warp, sequence.turnMode, active,
          effectiveSequencerInterval(sequence.stepIntervalMs, sequence.timingScale)) : {};
        if (sequence && !sequence.playing) motionStyle.animationPlayState = "paused";
        return (
          <div className={`as-tile${empty ? " is-empty" : ""}${!region.active ? " is-disabled" : ""}${active ? " is-sequence-active" : ""}${panel?.link?.hoverEffect === "zoom" ? " has-hover-zoom" : ""}`}
            key={slot} data-panel-slot={slot} data-panel-active={region.active} aria-hidden={link ? undefined : true}
            style={{ borderRadius: `${transform.radius}px`, gridColumn: `${region.col + 1} / span ${region.colSpan}`,
              gridRow: `${region.row + 1} / span ${region.rowSpan}` }}
            title={!region.active ? "Inactive panel" : tileImages && !panelImage ? tileImage?.name ?? "Empty tile" : undefined}>
            {region.active && <div className="as-panel-motion" style={motionStyle}>
              {panelImage || tileImages ? (
                panelImage || tileImage ? <div className="as-image-plane as-image-plane--tile" style={active && sequence ? sequencerImageStretch(sequence.stretchX, sequence.stretchY, true) : undefined}>
                  <img src={panelImage || tileImage?.src} alt="" draggable={false} style={individualStyle} />
                </div> : <span className="as-empty-tile-mark" />
              ) : <div className="as-image-plane" style={{
                width: `${400 / region.colSpan}%`, height: `${400 / region.rowSpan}%`,
                left: `-${region.col * 100 / region.colSpan}%`, top: `-${region.row * 100 / region.rowSpan}%`,
              }}>
                <img src={src} alt="" draggable={false} style={spreadStyle} />
              </div>}
            </div>}
            {region.active && panel?.link?.hoverEffect === "change-image" && panel.link.hoverImage &&
              <img className="as-panel-hover" src={panel.link.hoverImage} alt="" draggable={false} />}
            {region.active && link && <a className="as-panel-link" href={link} target={panel?.link.target}
              rel={panel?.link.target === "_blank" ? "noopener noreferrer" : undefined} aria-label={`Open link for panel ${slot}`} />}
            {transform.showNumbers && <span className="as-tile-number">{String(slot).padStart(2, "0")}</span>}
          </div>
        );
      })}
      {show?.program && show.visible && <LedShowOverlay show={show.program} playing={show.playing} cols={4}
        runId={show.runId} regions={layout} gapRevision={transform.gap} onSceneChange={onSceneChange} onComplete={onShowComplete} />}
    </div>
  );
}
