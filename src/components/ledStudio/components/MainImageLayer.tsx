/**
 * `MainImageLayer` — the campaign image on the wall (L1)
 * =====================================================
 *
 * Paints the Control Deck's **Live preview** (artwork + colour treatment +
 * stretch + pan) across the panel grid as cropped tiles — see
 * `MainImagePreview.tsx` for the geometry. Because it is ordinary DOM, the same
 * component works in three places and they cannot drift apart:
 *
 *   • the LED studio's stage and the choreographer's stage (L1 under L2)
 *   • the front page, behind its panel grid
 *
 * Consequently the Perimeter choreographer's live image **is** the Live preview
 * in spread, and a submitted choreography composites on top of the campaign
 * instead of replacing it.
 *
 * Gap handling
 * ------------
 * Inside a CSS grid the layer is a grid item, and grid items are aligned inside
 * their cell *after* the gap — which would shift the panels. So the layer
 * renders an absolutely positioned overlay (`inset: 0`, `margin: 0`) that spans
 * the whole grid box, and measures the grid's real `gap` with
 * `useGridGapRatio`. That keeps the campaign panels registered exactly with the
 * panels the choreography lands on.
 */

import { useEffect, useRef, useState } from "react";
import { mainImageTiles } from "./MainImagePreview";
import { useAdShopWall } from "../AdShopWallContext";
import { displayImageStyle } from "../../AdShopGrid";
import { useLivePreviewTransform } from "../hooks/useLivePreviewTransform";
import { useGridGapRatio } from "../frontPageShow";
import type { FrontPanelGridRegion } from "../../../types/frontPanelGrid";
import { DEFAULT_LIVE_PREVIEW_TRANSFORM, type LivePreviewTransform } from "../../../utils/livePreview";

/** Id of the L1 DOM node — the front page mounts the same layer behind its grid. */
export const MAIN_IMAGE_LAYER_ID = "seqcarver-main-image-layer";

export interface MainImageLayerProps {
  /** Panels per side (4 on the wall, 3 or 4 on the front page). */
  cols: number;
  /** Gap between panels as a fraction of one panel (`gap / size`). */
  gapRatio: number;
  /**
   * When true `gapRatio` is only a first guess: the real gap is measured from
   * the parent grid (the front page case).
   */
  measureGap?: boolean;
  /** The panel grid configurator output (merged spans + disabled panels). */
  regions?: FrontPanelGridRegion[] | null;
  /** Override the artwork (defaults to the Live preview's own artwork). */
  artwork?: string;
  /** Override the colour treatment / stretch / pan of the Live preview. */
  transform?: Partial<LivePreviewTransform>;
  /** Uploaded video content — played under the panel crops. */
  videoSrc?: string | null;
  /** Bumped whenever a new video source is loaded. */
  videoRevision?: number;
  /** Draw the thin panel outlines the wall has always shown. */
  outlines?: boolean;
  /** Extra class names for the layer root. */
  className?: string;
  /** Accessible label for the layer. */
  label?: string;
  /** DOM id (the front page uses it to put the campaign behind the panel grid). */
  id?: string;
  /** Extra inline style for the layer root (e.g. an opacity for the on-air copy). */
  style?: React.CSSProperties;
  /** A decorative duplicate (the on-air copy) is hidden from assistive tech. */
  ariaHidden?: boolean;
}

export function MainImageLayer({
  cols,
  gapRatio,
  measureGap = false,
  regions = null,
  artwork,
  transform,
  videoSrc = null,
  videoRevision = 0,
  outlines = false,
  className = "",
  label = "Main campaign image across the LED panels",
  id,
  style,
  ariaHidden = false,
}: MainImageLayerProps) {
  const live = useLivePreviewTransform();
  // An explicit studio upload still overrides AdShop for this local audition.
  const adShop = useAdShopWall();
  const adShopBase = artwork ? null : adShop;
  const effective: LivePreviewTransform = {
    ...live,
    ...transform,
    ...(adShopBase ? { ...DEFAULT_LIVE_PREVIEW_TRANSFORM, artwork: adShopBase.artwork } : {}),
    ...(artwork ? { artwork } : {}),
  };
  const [gapRef, measuredRatio] = useGridGapRatio(cols, measureGap);
  const ratio = measureGap && measuredRatio > 0 ? measuredRatio : gapRatio;
  const tiles = mainImageTiles({ cols, gapRatio: ratio, regions });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setVideoReady(false);
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    video.load();
    video.play().catch(() => {
      /* autoplay may be rejected; the campaign artwork stays visible */
    });
  }, [videoSrc, videoRevision]);

  const showVideo = Boolean(videoSrc && videoReady);

  return (
    <div
      ref={measureGap ? gapRef : undefined}
      id={id}
      // `m-0` neutralises the grid's own item margins; `inset-0` spans the whole
      // grid box (tracks *and* gaps) so tile percentages line up with panels.
      className={`pointer-events-none absolute inset-0 z-0 m-0 overflow-hidden ${className}`}
      style={style}
      role={ariaHidden ? undefined : "img"}
      aria-label={ariaHidden ? undefined : label}
      aria-hidden={ariaHidden || undefined}
      data-main-image-layer="true"
      data-main-image-artwork={effective.artwork}
      data-main-image-treatment={effective.treatment}
      data-main-image-stretch={`${effective.stretchX}x${effective.stretchY}`}
      data-main-image-pan={`${effective.panX},${effective.panY}`}
      data-main-image-gap={ratio}
    >
      {tiles.map((tile) => (
        <div
          key={`l1-${tile.slot}`}
          data-main-image-tile={tile.slot}
          style={{
            position: "absolute",
            left: `${tile.left}%`,
            top: `${tile.top}%`,
            width: `${tile.width}%`,
            height: `${tile.height}%`,
            overflow: "hidden",
            backgroundColor: showVideo ? "#040704" : undefined,
            // Colour treatment, stretch and pan of the Live preview — applied to
            // the panel box exactly as the Control Deck applies it to its image.
            filter: effective.filter === "none" ? undefined : effective.filter,
            transform: `translate(${effective.panX * 100}%, ${effective.panY * 100}%) scale(${effective.stretchX}, ${effective.stretchY})`,
            transformOrigin: "center",
            willChange: "transform",
            outline: outlines ? "1px solid rgba(14, 25, 17, 0.55)" : undefined,
            outlineOffset: outlines ? "-1px" : undefined,
          }}
        >
          {showVideo ? (
            <video
              ref={videoRef}
              src={videoSrc ?? undefined}
              muted
              loop
              playsInline
              autoPlay
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              onLoadedData={() => setVideoReady(true)}
            />
          ) : adShopBase ? (() => {
            const region = regions?.find((item) => item.row * cols + item.col + 1 === tile.slot) ?? {
              row: Math.floor((tile.slot - 1) / cols), col: (tile.slot - 1) % cols, rowSpan: 1, colSpan: 1,
            };
            const individual = adShopBase.panelArtworks?.[tile.slot] || adShopBase.tileArtworks?.[tile.slot - 1];
            const useTile = Boolean(adShopBase.panelArtworks?.[tile.slot]) || Boolean(adShopBase.tileArtworks);
            // The original LED wall is square. Render the same virtual image
            // plane as the potentially wide/tall AdShop panel, then scale it to
            // the audition wall. That preserves fit, rotation and crop.
            const { width, height } = adShopBase.cellSize;
            const gap = adShopBase.transform.gap;
            const frontRatio = (width * region.colSpan + gap * (region.colSpan - 1)) /
              (height * region.rowSpan + gap * (region.rowSpan - 1));
            const localRatio = tile.width / tile.height;
            const planeRatio = useTile ? frontRatio : frontRatio * region.rowSpan / region.colSpan;
            const localPlaneRatio = useTile ? localRatio : localRatio * region.rowSpan / region.colSpan;
            const scale = planeRatio / localPlaneRatio;
            const source = useTile ? individual : effective.artwork;
            if (!source) return null;
            return <div className="absolute" style={useTile ? { inset: 0 } : {
              width: `${cols * 100 / region.colSpan}%`, height: `${cols * 100 / region.rowSpan}%`,
              left: `-${region.col * 100 / region.colSpan}%`, top: `-${region.row * 100 / region.rowSpan}%`,
            }}>
              <div className="absolute left-0 top-0 h-full" style={{ width: `${scale * 100}%`,
                transform: `scaleX(${1 / scale})`, transformOrigin: "top left" }}>
                <img src={source} alt="" draggable={false} style={displayImageStyle(adShopBase.transform, planeRatio)} />
              </div>
            </div>;
          })() : (
            <div className="absolute inset-0" style={{ backgroundImage: `url(${JSON.stringify(effective.artwork)})`,
              backgroundSize: tile.backgroundSize, backgroundPosition: tile.backgroundPosition, backgroundRepeat: "no-repeat" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export { DEFAULT_LIVE_PREVIEW_TRANSFORM };
