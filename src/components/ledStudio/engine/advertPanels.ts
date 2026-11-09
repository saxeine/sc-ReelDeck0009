import type { AdvertAsset, AdvertPanel, SpreadSlice } from '../types';
import {
  framesForSlot,
  imageForSlot,
  PRESET_ASSETS,
} from '../data/advertAssets';
import { computeSpreadSlices } from '../utils/spread';

export function createAdvertPanel(): AdvertPanel {
  return {
    image: '',
    spread: null,
    rotation: [],
    rotationInterval: 2.5,
    rotating: true,
    link: { url: '', target: '_blank', hoverEffect: 'none' },
    style: {
      radius: 10,
      borderColor: '#9cc97d',
      borderWidth: 1,
      tint: '#0f172a',
      tintAmount: 0,
      opacity: 1,
      glow: false,
    },
    parallax: false,
    tilt: 1,
  };
}

/** Every slot starts with a rotating advert set drawn from the pool. */
export function buildAdvertPanels(
  panelCount: number,
  pool: AdvertAsset[] = PRESET_ASSETS
): Record<number, AdvertPanel> {
  const panels: Record<number, AdvertPanel> = {};
  for (let slot = 1; slot <= panelCount; slot++) {
    const panel = createAdvertPanel();
    panel.rotation = framesForSlot(slot, pool);
    panel.image = imageForSlot(slot, pool);
    panels[slot] = panel;
  }
  return panels;
}

/** Frames a slot shows right now (drawn-order flips write into `frames`). */
export function displayFrame(
  panel: AdvertPanel | undefined,
  frames: Record<number, number>,
  slot: number
): string | null {
  if (!panel || panel.rotation.length === 0) return null;
  const len = panel.rotation.length;
  const raw = frames[slot] ?? (slot - 1) % len;
  const idx = ((raw % len) + len) % len;
  return panel.rotation[idx];
}

/** Apply one artwork across a set of panels as sliced poster pieces. */
export function posterPanels(
  panels: Record<number, AdvertPanel>,
  slots: number[],
  cols: number,
  url: string,
  filter?: string,
  stretchX = 1,
  stretchY = 1
): Record<number, AdvertPanel> {
  const slices: Record<number, SpreadSlice> = computeSpreadSlices(
    slots,
    cols,
    url,
    filter,
    stretchX,
    stretchY
  );
  const next = { ...panels };
  for (const slot of slots) {
    const cur = next[slot] ?? createAdvertPanel();
    next[slot] = {
      ...cur,
      spread: slices[slot] ?? null,
      image: '',
      rotation: [],
      rotating: false,
    };
  }
  return next;
}
