import type {
  AdvertAsset,
  AdvertMeta,
  AssetGroup,
  GroupMode,
  SortMode,
} from '../types';

/* ------------------------------------------------------------------ */
/* Image analysis — dominant colour, luminance, hue, geometry          */
/* ------------------------------------------------------------------ */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function fallbackMeta(url: string): AdvertMeta {
  const h = hashString(url);
  const hue = h % 360;
  const brightness = 0.35 + ((h >> 7) % 45) / 100;
  const sat = 0.3 + ((h >> 13) % 30) / 100;
  return {
    url,
    width: 800,
    height: 800,
    aspect: 1,
    brightness,
    hue,
    sat,
    color: hslToHex(hue, sat, 0.45),
    failed: true,
  };
}

export function analyzeImage(url: string): Promise<AdvertMeta> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;
    const finish = (m: AdvertMeta) => {
      if (!settled) {
        settled = true;
        resolve(m);
      }
    };
    const timer = window.setTimeout(() => finish(fallbackMeta(url)), 6000);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const S = 48;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const cx = canvas.getContext('2d', { willReadFrequently: true });
        if (!cx) throw new Error('no ctx');
        cx.drawImage(img, 0, 0, S, S);
        const { data } = cx.getImageData(0, 0, S, S);

        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] / 255;
          r += data[i] * a;
          g += data[i + 1] * a;
          b += data[i + 2] * a;
          n += a;
        }
        r /= n;
        g /= n;
        b /= n;

        const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const rn = r / 255,
          gn = g / 255,
          bn = b / 255;
        const max = Math.max(rn, gn, bn),
          min = Math.min(rn, gn, bn);
        const d = max - min;
        let hue = 0;
        if (d > 0) {
          if (max === rn) hue = 60 * (((gn - bn) / d) % 6);
          else if (max === gn) hue = 60 * ((bn - rn) / d + 2);
          else hue = 60 * ((rn - gn) / d + 4);
        }
        if (hue < 0) hue += 360;
        const light = (max + min) / 2;
        const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1) || 1);

        const hex = `#${[r, g, b]
          .map((v) => Math.round(v).toString(16).padStart(2, '0'))
          .join('')}`;

        finish({
          url,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 800,
          aspect: (img.naturalWidth || 800) / (img.naturalHeight || 800),
          brightness,
          hue,
          sat: Number.isFinite(sat) ? sat : 0,
          color: hex,
        });
      } catch {
        finish(fallbackMeta(url));
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(fallbackMeta(url));
    };
    img.src = url;
  });
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

export function sortAssets(
  assets: AdvertAsset[],
  metas: Record<string, AdvertMeta>,
  mode: SortMode
): AdvertAsset[] {
  const arr = [...assets];
  switch (mode) {
    case 'name-asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    case 'brightness':
      return arr.sort(
        (a, b) => (metas[a.url]?.brightness ?? 0.5) - (metas[b.url]?.brightness ?? 0.5)
      );
    case 'hue':
      return arr.sort((a, b) => (metas[a.url]?.hue ?? 0) - (metas[b.url]?.hue ?? 0));
    case 'size':
      return arr.sort((a, b) => {
        const am = metas[a.url];
        const bm = metas[b.url];
        return (bm ? bm.width * bm.height : 0) - (am ? am.width * am.height : 0);
      });
    default:
      return arr;
  }
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

const HUE_BUCKETS: Array<{ id: string; label: string; lo: number; hi: number }> = [
  { id: 'red', label: 'Red', lo: 345, hi: 15 },
  { id: 'orange', label: 'Orange', lo: 15, hi: 45 },
  { id: 'amber', label: 'Amber', lo: 45, hi: 70 },
  { id: 'green', label: 'Green', lo: 70, hi: 165 },
  { id: 'cyan', label: 'Cyan', lo: 165, hi: 200 },
  { id: 'blue', label: 'Blue', lo: 200, hi: 255 },
  { id: 'violet', label: 'Violet', lo: 255, hi: 290 },
  { id: 'magenta', label: 'Magenta', lo: 290, hi: 345 },
];

export function buildGroups(
  assets: AdvertAsset[],
  metas: Record<string, AdvertMeta>,
  mode: GroupMode
): AssetGroup[] {
  const urls = assets.map((s) => s.url);
  if (mode === 'none') return [{ id: 'all', label: 'All artwork', urls }];

  const push = (map: Map<string, string[]>, id: string, url: string) => {
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(url);
  };

  if (mode === 'tone') {
    const map = new Map<string, string[]>();
    for (const u of urls) {
      const b = metas[u]?.brightness ?? 0.5;
      push(map, b < 0.35 ? 'shadow' : b > 0.62 ? 'highlight' : 'midtone', u);
    }
    const labels: Record<string, string> = {
      shadow: 'Shadow',
      midtone: 'Midtone',
      highlight: 'Highlight',
    };
    return ['shadow', 'midtone', 'highlight']
      .filter((id) => map.has(id))
      .map((id) => ({ id, label: labels[id], urls: map.get(id)! }));
  }

  if (mode === 'color') {
    const map = new Map<string, string[]>();
    for (const u of urls) {
      const m = metas[u];
      if (!m || m.sat < 0.14) {
        push(map, 'mono', u);
        continue;
      }
      const bucket =
        HUE_BUCKETS.find((bk) =>
          bk.lo < bk.hi ? m.hue >= bk.lo && m.hue < bk.hi : m.hue >= bk.lo || m.hue < bk.hi
        ) ?? HUE_BUCKETS[0];
      push(map, bucket.id, u);
    }
    const out = HUE_BUCKETS.filter((bk) => map.has(bk.id)).map((bk) => ({
      id: bk.id,
      label: bk.label,
      urls: map.get(bk.id)!,
    }));
    if (map.has('mono')) out.push({ id: 'mono', label: 'Monochrome', urls: map.get('mono')! });
    return out.length ? out : [{ id: 'all', label: 'All artwork', urls }];
  }

  // aspect
  const map = new Map<string, string[]>();
  for (const u of urls) {
    const a = metas[u]?.aspect ?? 1;
    push(map, a > 1.15 ? 'landscape' : a < 0.87 ? 'portrait' : 'square', u);
  }
  const labels: Record<string, string> = {
    landscape: 'Landscape',
    square: 'Square',
    portrait: 'Portrait',
  };
  return ['landscape', 'square', 'portrait']
    .filter((id) => map.has(id))
    .map((id) => ({ id, label: labels[id], urls: map.get(id)! }));
}
