import type { SpreadSlice } from '../types';

export const SPREAD_FILTERS: Record<string, string> = {
  none: '',
  grayscale: 'grayscale(1)',
  sepia: 'sepia(0.85)',
  invert: 'invert(1)',
  contrast: 'contrast(1.35)',
  saturate: 'saturate(1.9)',
  cool: 'hue-rotate(155deg) saturate(1.3)',
  warm: 'hue-rotate(-28deg) saturate(1.45)',
  duotone: 'grayscale(1) sepia(0.55) hue-rotate(55deg) saturate(1.9)',
};

export function spreadFilterCss(filter?: string): string {
  if (!filter || filter === 'none') return '';
  return SPREAD_FILTERS[filter] ?? filter;
}

/**
 * Map one artwork across a set of grid slots. The image is divided across the
 * bounding box of the selected slots — each slot receives the background
 * geometry required to render "its slice" of the whole.
 */
export function computeSpreadSlices(
  slots: number[],
  cols: number,
  url: string,
  filter?: string,
  stretchX = 1,
  stretchY = 1
): Record<number, SpreadSlice> {
  if (!slots.length || !url) return {};
  const coords = slots
    .filter((s) => s >= 1 && s <= cols * cols)
    .map((s) => ({ s, c: (s - 1) % cols, r: Math.floor((s - 1) / cols) }));
  if (!coords.length) return {};

  const minC = Math.min(...coords.map((x) => x.c));
  const maxC = Math.max(...coords.map((x) => x.c));
  const minR = Math.min(...coords.map((x) => x.r));
  const maxR = Math.max(...coords.map((x) => x.r));
  const bc = maxC - minC + 1;
  const br = maxR - minR + 1;

  const out: Record<number, SpreadSlice> = {};
  for (const { s, c, r } of coords) {
    out[s] = {
      url,
      col: c - minC,
      row: r - minR,
      cols: bc,
      rows: br,
      filter,
      stretchX,
      stretchY,
    };
  }
  return out;
}

/** Style object that renders one slice of a spread artwork as a background. */
export function spreadBackground(slice: SpreadSlice): {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  filter?: string;
} {
  return {
    backgroundImage: `url(${slice.url})`,
    backgroundSize: `${slice.cols * 100 * slice.stretchX}% ${slice.rows * 100 * slice.stretchY}%`,
    backgroundPosition: `${
      slice.cols > 1 ? (slice.col / (slice.cols - 1)) * 100 : 50
    }% ${slice.rows > 1 ? (slice.row / (slice.rows - 1)) * 100 : 50}%`,
    filter: spreadFilterCss(slice.filter),
  };
}
