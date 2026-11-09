import type { Layer, TextLayer } from '../types';

// A stylesheet may take time to arrive. Cache its request, not an early
// document.fonts.load() call made before the @font-face rules exist.
const stylesheets = new Map<string, Promise<boolean>>();
const announcedFaces = new WeakSet<FontFace>();
const systemFonts = new Set([
  'arial', 'helvetica', 'times new roman', 'courier new', 'georgia',
  'verdana', 'impact', 'trebuchet ms', 'comic sans ms', 'sans-serif',
  'serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
]);

function stylesheetFor(fontName: string): Promise<boolean> {
  const existing = stylesheets.get(fontName);
  if (existing) return existing;

  const request = new Promise<boolean>((resolve) => {
    const link = document.createElement('link');
    const params = new URLSearchParams({
      family: `${fontName}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,700;1,900`,
      display: 'swap',
    });
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${params}`;
    link.onload = () => resolve(true);
    link.onerror = () => resolve(false);
    document.head.appendChild(link);
  });
  stylesheets.set(fontName, request);
  return request;
}

type FontVariant = { weight?: number | string; style?: string; text?: string };

/** Load the face actually used by a canvas layer; never block forever offline. */
export function loadGoogleFont(fontName: string, variant: FontVariant = {}): Promise<boolean> {
  const name = fontName?.trim();
  if (!name) return Promise.resolve(false);
  if (systemFonts.has(name.toLowerCase())) return Promise.resolve(true);

  const work = stylesheetFor(name).then(async (available) => {
    if (!available || !('fonts' in document)) return available;
    const style = variant.style === 'italic' || variant.style === 'oblique' ? variant.style : 'normal';
    const rawWeight = variant.weight === 'bold' ? 700 : Number(variant.weight || 400);
    const weight = Number.isFinite(rawWeight) ? Math.max(1, Math.min(1000, rawWeight)) : 400;
    const escaped = name.replace(/["\\]/g, '\\$&');
    try {
      const faces = await document.fonts.load(`${style} ${weight} 16px "${escaped}"`, variant.text || 'BESbswy');
      const newlyLoaded = faces.some((face) => !announcedFaces.has(face));
      faces.forEach((face) => announcedFaces.add(face));
      if (newlyLoaded) window.dispatchEvent(new CustomEvent('neo1-font-loaded', { detail: name }));
      return faces.length > 0;
    } catch {
      return false;
    }
  });

  // The editor remains usable with local fallbacks when external fonts are
  // blocked. If the request eventually completes, the event above redraws it.
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    work,
    new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 5000); }),
  ]).finally(() => clearTimeout(timer));
}

/** Prepare all visible text faces before rasterizing a composition. */
export async function preloadTextFonts(layers: Layer[]): Promise<void> {
  await Promise.all(layers
    .filter((layer): layer is TextLayer => layer.visible && layer.type === 'text' && !!layer.fontFamily)
    .map((layer) => loadGoogleFont(layer.fontFamily, {
      weight: layer.fontWeight,
      style: layer.fontStyle,
      text: layer.text,
    })));
}
