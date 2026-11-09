import type { SeqPattern } from '../types';

export function slotRowCol(slot: number, cols: number): { r: number; c: number } {
  return { r: Math.floor((slot - 1) / cols), c: (slot - 1) % cols };
}

/** Generate ready-made rotation paths so users can start from a shape. */
export function buildPattern(kind: SeqPattern, cols: number): number[] {
  const n = cols * cols;
  const at = (r: number, c: number) => r * cols + c + 1;

  if (kind === 'all') return Array.from({ length: n }, (_, i) => i + 1);

  if (kind === 'snake') {
    const out: number[] = [];
    for (let r = 0; r < cols; r++) {
      if (r % 2 === 0) for (let c = 0; c < cols; c++) out.push(at(r, c));
      else for (let c = cols - 1; c >= 0; c--) out.push(at(r, c));
    }
    return out;
  }

  if (kind === 'columns') {
    const out: number[] = [];
    for (let c = 0; c < cols; c++) {
      if (c % 2 === 0) for (let r = 0; r < cols; r++) out.push(at(r, c));
      else for (let r = cols - 1; r >= 0; r--) out.push(at(r, c));
    }
    return out;
  }

  if (kind === 'ring') {
    const out: number[] = [];
    for (let c = 0; c < cols; c++) out.push(at(0, c));
    for (let r = 1; r < cols; r++) out.push(at(r, cols - 1));
    for (let c = cols - 2; c >= 0; c--) out.push(at(cols - 1, c));
    for (let r = cols - 2; r >= 1; r--) out.push(at(r, 0));
    return out;
  }

  // spiral (top-left inward, clockwise)
  const out: number[] = [];
  let r0 = 0,
    r1 = cols - 1,
    c0 = 0,
    c1 = cols - 1;
  while (r0 <= r1 && c0 <= c1) {
    for (let c = c0; c <= c1; c++) out.push(at(r0, c));
    for (let r = r0 + 1; r <= r1; r++) out.push(at(r, c1));
    if (r0 < r1) for (let c = c1 - 1; c >= c0; c--) out.push(at(r1, c));
    if (c0 < c1) for (let r = r1 - 1; r > r0; r--) out.push(at(r, c0));
    r0++;
    r1--;
    c0++;
    c1--;
  }
  return out;
}

export const PATTERN_LABELS: Record<SeqPattern, string> = {
  all: 'All',
  snake: 'Snake',
  columns: 'Columns',
  spiral: 'Spiral',
  ring: 'Ring',
};
