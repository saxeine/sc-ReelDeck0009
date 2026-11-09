import type { AdvertAsset } from '../types';
import master from '../../../assets/led-adverts/master.jpg?inline';
import advert1 from '../../../assets/led-adverts/ad-01.jpg?inline';
import advert2 from '../../../assets/led-adverts/ad-02.jpg?inline';
import advert3 from '../../../assets/led-adverts/ad-03.jpg?inline';
import advert4 from '../../../assets/led-adverts/ad-04.jpg?inline';

/**
 * The second set of artwork — the advert layer. Everything ships locally in
 * /public/adverts so the studio works with no network at all. Users can upload
 * their own campaign images on top of these.
 */
export const MASTER_ARTWORK = master;

export const TILE_ARTWORK: string[] = [advert1, advert2, advert3, advert4];

const PRESET_NAMES = ['Frosted Glass', 'Silk Study', 'Liquid Chrome', 'Dew Point'];

export const PRESET_ASSETS: AdvertAsset[] = TILE_ARTWORK.map((url, i) => ({
  id: `preset-${i + 1}`,
  name: PRESET_NAMES[i],
  url,
  source: 'preset' as const,
}));

export const MASTER_ASSET: AdvertAsset = {
  id: 'preset-master',
  name: 'Master poster',
  url: MASTER_ARTWORK,
  source: 'preset',
};

/** Rotating frame set for a slot, drawn from the preset campaign. */
export function framesForSlot(slot: number, pool: AdvertAsset[] = PRESET_ASSETS): string[] {
  const urls = pool.map((a) => a.url);
  if (urls.length === 0) return [];
  const start = (slot - 1) % urls.length;
  const picks = [urls[start], urls[(start + 1) % urls.length], urls[(start + 2) % urls.length]];
  return picks.filter((u, i, arr) => arr.indexOf(u) === i);
}

/** Image assigned to a slot when the layer is filled with the pool. */
export function imageForSlot(slot: number, pool: AdvertAsset[] = PRESET_ASSETS): string {
  return pool[(slot - 1) % Math.max(1, pool.length)]?.url ?? '';
}
