/**
 * The main campaign image (L1) as ordinary, cropped `<img>` tiles
 * ==============================================================
 *
 * The Choreograph wall draws two layers:
 *
 *   L1  the **main campaign image** — what the Control Deck's "Live preview"
 *       shows (artwork + colour treatment + stretch + pan)
 *   L2  the advert / choreography tiles that perform on top of it
 *
 * L2 is allowed to move, blink and fly around. L1 must never disappear: the
 * campaign is always on the wall, and the show is composited over it.
 *
 * Historically L1 was a `<canvas>` running `drawSampleCampaign` →
 * `drawWallPanels`, which meant (a) the front page could never reproduce it and
 * (b) a submitted show replaced it. This module renders L1 as a small set of
 * absolutely-positioned tiles instead, using the *same* panel geometry
 * (`showTileRect`) the choreography and the front page grid use, and the *same*
 * artwork/filter/stretch/pan as the Control Deck's Live preview. One definition
 * shared by the desk's stage, the choreographer's stage and the front page.
 *
 * Geometry
 * --------
 * Every tile simply covers its panel(s) and shows the part of the campaign that
 * falls under it:
 *
 *   background-size     = 10000 / widthPercent  %    (both axes)
 *   background-position = (left / (100 - width))  * 100 %   (both axes)
 *
 * so a plain 4×4 panel is `400% 400%` at `0/33.3/66.6/100 %`, a 2×2 merged panel
 * is `200% 200%`, and where panels are merged or disabled the image still lines
 * up with its neighbours — the campaign is never re-cut.
 */

import type { FrontPanelGridRegion } from "../../../types/frontPanelGrid";
import type { LivePreviewInput, LivePreviewTransform } from "../../../utils/livePreview";
import { normalizeLivePreviewTransform } from "../../../utils/livePreview";
import { showTileRect } from "../frontPageShow";

export interface MainImageTile {
  /** Anchor slot (1-based) of the panel this tile paints. */
  slot: number;
  /** Position and size as percentages of the wall. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** CSS background values that crop the campaign into this tile. */
  backgroundSize: string;
  backgroundPosition: string;
}

export interface MainImageTilesOptions {
  /** Panels per side (4 for the LED wall, 3 or 4 on the front page). */
  cols?: number;
  /** Gap between panels, as a fraction of one panel (`gap / size`). */
  gapRatio?: number;
  /** The panel grid configurator output (merged spans + disabled panels). */
  regions?: FrontPanelGridRegion[] | null;
}

function cropFor(left: number, top: number, width: number, height: number) {
  const spanX = 100 - width;
  const spanY = 100 - height;
  return {
    backgroundSize: `${(10000 / Math.max(1e-6, width)).toFixed(4)}% ${(10000 / Math.max(1e-6, height)).toFixed(4)}%`,
    // A tile that spans the whole wall shows the whole image — position is moot.
    backgroundPosition: `${spanX <= 1e-6 ? 0 : (left / spanX) * 100}% ${spanY <= 1e-6 ? 0 : (top / spanY) * 100}%`,
  };
}

/**
 * Resolve the campaign into one tile per visible panel.
 *
 * Disabled panels emit no tile (the configurator hides them), merged panels emit
 * one tile from their anchor, and the gaps between panels stay empty — exactly
 * like the physical wall.
 */
export function mainImageTiles({
  cols = 4,
  gapRatio = 0,
  regions = null,
}: MainImageTilesOptions = {}): MainImageTile[] {
  const side = Math.max(1, Math.round(cols));
  const ratio = Number.isFinite(gapRatio) && gapRatio > 0 ? gapRatio : 0;

  const gridRegions = regions && regions.length > 0 ? regions : null;
  const slots: number[] = gridRegions
    ? gridRegions
        .filter((region) => region.active !== false)
        .map((region) => region.row * side + region.col + 1)
        .sort((a, b) => a - b)
    : Array.from({ length: side * side }, (_, index) => index + 1);

  const tiles: MainImageTile[] = [];
  for (const slot of slots) {
    const rect = showTileRect(slot, side, ratio, gridRegions);
    if (!rect) continue;
    tiles.push({ slot, ...rect, ...cropFor(rect.left, rect.top, rect.width, rect.height) });
  }
  return tiles;
}

export interface MainImageTileStyle {
  left: string;
  top: string;
  width: string;
  height: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: "no-repeat";
  filter: string;
  transform: string;
  transformOrigin: "center";
  willChange: string;
}

/**
 * CSS for one tile. The artwork fills the tile (`background-size` from
 * `mainImageTiles`), while the Live preview's colour treatment, stretch and pan
 * are applied to the tile box itself — the same `filter` / `transform` the
 * Control Deck renders on its `<img>`.
 */
export function mainImageTileStyle(
  tile: MainImageTile,
  transform: LivePreviewInput | LivePreviewTransform | Partial<LivePreviewTransform> = {},
): MainImageTileStyle {
  const live = normalizeLivePreviewTransform(transform);
  return {
    left: `${tile.left}%`,
    top: `${tile.top}%`,
    width: `${tile.width}%`,
    height: `${tile.height}%`,
    backgroundImage: `url(${JSON.stringify(live.artwork)})`,
    backgroundSize: tile.backgroundSize,
    backgroundPosition: tile.backgroundPosition,
    backgroundRepeat: "no-repeat",
    filter: live.filter,
    transform: `translate(${live.panX * 100}%, ${live.panY * 100}%) scale(${live.stretchX}, ${live.stretchY})`,
    transformOrigin: "center",
    willChange: "transform",
  };
}

/** The whole-wall background (behind the tiles, so gaps read as the wall, not as holes). */
export function wallBackdropStyle(): Record<string, string> {
  return { backgroundColor: "#070b07" };
}
