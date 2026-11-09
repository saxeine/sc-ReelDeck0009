export type FrontPanelGridRegion = {
  /** Zero-based coordinates within the selected square grid. */
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  active: boolean;
};

export type FrontPanelViewportSettings = {
  widthLimitVw: number;
  fourByFourCapPx: number;
  threeByThreeCapPx: number;
};

export const DEFAULT_FRONT_PANEL_VIEWPORT_SETTINGS: FrontPanelViewportSettings = {
  widthLimitVw: 98,
  fourByFourCapPx: 690,
  threeByThreeCapPx: 552,
};

export function normalizeFrontPanelViewportSettings(value: unknown): FrontPanelViewportSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_FRONT_PANEL_VIEWPORT_SETTINGS };
  const settings = value as Partial<FrontPanelViewportSettings>;
  const clamp = (candidate: unknown, fallback: number, min: number, max: number) =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.max(min, Math.min(max, Math.round(candidate)))
      : fallback;
  return {
    widthLimitVw: clamp(settings.widthLimitVw, DEFAULT_FRONT_PANEL_VIEWPORT_SETTINGS.widthLimitVw, 50, 100),
    fourByFourCapPx: clamp(settings.fourByFourCapPx, DEFAULT_FRONT_PANEL_VIEWPORT_SETTINGS.fourByFourCapPx, 240, 1200),
    threeByThreeCapPx: clamp(settings.threeByThreeCapPx, DEFAULT_FRONT_PANEL_VIEWPORT_SETTINGS.threeByThreeCapPx, 240, 1200),
  };
}

export function defaultFrontPanelGridRegions(side: number, activeSlots?: number[]): FrontPanelGridRegion[] {
  const active = new Set(activeSlots ?? Array.from({ length: side * side }, (_, index) => index + 1));
  return Array.from({ length: side * side }, (_, index) => ({
    row: Math.floor(index / side),
    col: index % side,
    rowSpan: 1,
    colSpan: 1,
    active: active.has(index + 1),
  }));
}

export function normalizeFrontPanelGridRegions(value: unknown, side: number): FrontPanelGridRegion[] {
  if (!Array.isArray(value)) return defaultFrontPanelGridRegions(side);
  const regions = value.filter((region): region is FrontPanelGridRegion => {
    if (!region || typeof region !== "object") return false;
    const item = region as Partial<FrontPanelGridRegion>;
    return Number.isInteger(item.row) && Number.isInteger(item.col) &&
      Number.isInteger(item.rowSpan) && Number.isInteger(item.colSpan) &&
      typeof item.active === "boolean" && item.row! >= 0 && item.col! >= 0 &&
      item.rowSpan! > 0 && item.colSpan! > 0 &&
      item.row! + item.rowSpan! <= side && item.col! + item.colSpan! <= side;
  });
  if (!regions.length) return defaultFrontPanelGridRegions(side);

  // Accept stored geometry only if it tiles the grid without overlap or holes.
  const coverage = new Array(side * side).fill(0);
  for (const region of regions) {
    for (let row = region.row; row < region.row + region.rowSpan; row++) {
      for (let col = region.col; col < region.col + region.colSpan; col++) {
        coverage[row * side + col]++;
      }
    }
  }
  return coverage.every((count) => count === 1) && regions.length === value.length
    ? regions
    : defaultFrontPanelGridRegions(side);
}

export function frontPanelRegionAnchor(region: FrontPanelGridRegion, side: number): number {
  return region.row * side + region.col + 1;
}
