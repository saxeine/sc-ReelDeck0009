import { Psd,BlendMode as PsdBlendMode,Layer as PsdLayer,readPsd,writePsd } from 'ag-psd';
import { saveAs } from 'file-saver';
import { CanvasState,ImageLayer,Layer,TextLayer } from '../components/neo1-app/types';
import { preloadCanvasAssets,renderCanvasToContext } from '../components/neo1-app/utils/canvasRender';
import { preloadTextFonts } from '../components/neo1-app/utils/googleFonts';

// Helper to safely load an image from URL/dataURL
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Image source is empty'));
      return;
    }
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from source: ${src.slice(0, 60)}...`));
    img.src = src;
  });
}

// Convert a PsdLayer to an HTMLCanvasElement
function extractCanvasFromPsdLayer(layer: PsdLayer): HTMLCanvasElement | null {
  if (layer.canvas && layer.canvas.width > 0 && layer.canvas.height > 0) {
    return layer.canvas;
  }
  if (layer.imageData && layer.imageData.width > 0 && layer.imageData.height > 0) {
    const canvas = document.createElement('canvas');
    canvas.width = layer.imageData.width;
    canvas.height = layer.imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(layer.imageData.width, layer.imageData.height);
      imgData.data.set(layer.imageData.data);
      ctx.putImageData(imgData, 0, 0);
      return canvas;
    }
  }
  return null;
}

// Map Neo1 blend modes to PSD blend modes
function mapToPsdBlendMode(mode?: string): PsdBlendMode {
  switch (mode) {
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'difference':
      return 'difference';
    case 'color-dodge':
      return 'color dodge';
    default:
      return 'normal';
  }
}

// Map PSD blend modes to Neo1 blend modes
function mapFromPsdBlendMode(mode?: PsdBlendMode): ImageLayer['blendMode'] {
  switch (mode) {
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'difference':
      return 'difference';
    case 'color dodge':
      return 'color-dodge';
    default:
      return 'normal';
  }
}

/**
 * Interface representing a slice or storyboard item to be exported to PSD.
 */
export interface PsdExportSliceItem {
  id?: string;
  name: string;
  url: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
}

/**
 * Export storyboard slices or general image slices to a multi-layer PSD.
 * Maintains exact layer order, positions, and names.
 */
export async function exportStoryboardSlicesToPsd(
  slices: PsdExportSliceItem[],
  options: {
    projectName?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    backgroundColor?: string;
  } = {}
): Promise<void> {
  if (!slices || slices.length === 0) {
    throw new Error('No slices provided for PSD export.');
  }

  const { projectName = 'storyboard-composition', backgroundColor = '#0f172a' } = options;

  // Load all images in parallel
  const loadedItems = await Promise.all(
    slices.map(async (slice, index) => {
      try {
        const img = await loadImageElement(slice.url);
        const w = slice.width || img.naturalWidth || img.width || 400;
        const h = slice.height || img.naturalHeight || img.height || 400;
        return {
          slice,
          img,
          w,
          h,
          name: slice.name || `Slice ${index + 1}`,
          x: slice.x ?? 0,
          y: slice.y ?? 0,
          opacity: slice.opacity ?? 1,
        };
      } catch (err) {
        console.warn(`Could not load slice image for "${slice.name}":`, err);
        return null;
      }
    })
  );

  const validItems = loadedItems.filter(Boolean) as NonNullable<(typeof loadedItems)[0]>[];
  if (validItems.length === 0) {
    throw new Error('Failed to load images for any of the selected slices.');
  }

  // Determine overall document dimensions
  let docWidth = options.canvasWidth || 0;
  let docHeight = options.canvasHeight || 0;

  if (!docWidth || !docHeight) {
    // If explicit coordinates are provided, compute bounding box
    const hasPositions = validItems.some((item) => item.x > 0 || item.y > 0);
    if (hasPositions) {
      docWidth = Math.max(...validItems.map((item) => item.x + item.w));
      docHeight = Math.max(...validItems.map((item) => item.y + item.h));
    } else {
      // Stack centered or uniform size
      docWidth = Math.max(...validItems.map((item) => item.w));
      docHeight = Math.max(...validItems.map((item) => item.h));
    }
  }

  docWidth = Math.max(10, Math.round(docWidth));
  docHeight = Math.max(10, Math.round(docHeight));

  // Build composite canvas for document thumbnail/composite
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = docWidth;
  compositeCanvas.height = docHeight;
  const compositeCtx = compositeCanvas.getContext('2d')!;

  // Fill background
  if (backgroundColor) {
    compositeCtx.fillStyle = backgroundColor;
    compositeCtx.fillRect(0, 0, docWidth, docHeight);
  }

  // Create PSD layers list
  const psdLayers: PsdLayer[] = [];

  // Optional background layer
  if (backgroundColor) {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = docWidth;
    bgCanvas.height = docHeight;
    const bgCtx = bgCanvas.getContext('2d')!;
    bgCtx.fillStyle = backgroundColor;
    bgCtx.fillRect(0, 0, docWidth, docHeight);

    psdLayers.push({
      name: 'Background',
      top: 0,
      left: 0,
      canvas: bgCanvas,
      opacity: 1,
      blendMode: 'normal',
    });
  }

  // For each slice, create individual layer canvas
  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = item.w;
    layerCanvas.height = item.h;
    const layerCtx = layerCanvas.getContext('2d')!;
    layerCtx.drawImage(item.img, 0, 0, item.w, item.h);

    // Draw to composite
    compositeCtx.save();
    compositeCtx.globalAlpha = item.opacity;
    compositeCtx.drawImage(item.img, item.x, item.y, item.w, item.h);
    compositeCtx.restore();

    psdLayers.push({
      name: item.name,
      top: Math.round(item.y),
      left: Math.round(item.x),
      canvas: layerCanvas,
      opacity: item.opacity,
      blendMode: 'normal',
      hidden: false,
    });
  }

  const psd: Psd = {
    width: docWidth,
    height: docHeight,
    // Photoshop expects top-to-bottom; the composite above paints bottom-to-top.
    children: psdLayers.reverse(),
    canvas: compositeCanvas,
  };

  const buffer = writePsd(psd);
  const blob = new Blob([buffer], { type: 'image/vnd.adobe.photoshop' });
  const filename = projectName.toLowerCase().endsWith('.psd') ? projectName : `${projectName}.psd`;
  saveAs(blob, filename);
}

/**
 * Export complete Neo1 composition to multi-layer PSD.
 * Preserves each layer (text & image), positions, opacity, blend modes, and layer order.
 */
export async function exportNeo1ToPsd(
  canvasState: CanvasState,
  layers: Layer[],
  projectName: string = 'neo1-design'
): Promise<void> {
  const { width, height } = canvasState;

  // Hidden PSD layers must retain their pixels so they can be enabled later.
  const allLayers = layers.map((layer) => ({ ...layer, visible: true }));
  await Promise.all([preloadCanvasAssets(canvasState, allLayers), preloadTextFonts(allLayers)]);

  // Composite canvas for document preview
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const compositeCtx = compositeCanvas.getContext('2d')!;
  renderCanvasToContext(compositeCtx, canvasState, layers);

  const psdLayers: PsdLayer[] = [];

  // 1. Background layer
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext('2d')!;
  renderCanvasToContext(bgCtx, { ...canvasState }, []);

  psdLayers.push({
    name: 'Background',
    top: 0,
    left: 0,
    canvas: bgCanvas,
    opacity: 1,
    blendMode: 'normal',
  });

  // 2. Individual layers (preserving order from bottom to top)
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = width;
    layerCanvas.height = height;
    const layerCtx = layerCanvas.getContext('2d')!;

    // Render single layer onto full-size layer canvas
    layerCtx.save();
    renderCanvasToContext(
      layerCtx,
      {
        ...canvasState,
        background: { type: 'color', color: 'transparent', gradient: { type: 'linear', angle: 0, color1: '', color2: '' }, imageUrl: '', imageFit: 'cover', imageOpacity: 0, imageBlur: 0 },
      },
      [{ ...layer, visible: true, opacity: 1, blendMode: 'normal' }]
    );
    layerCtx.restore();

    let layerName = layer.name;
    if (!layerName) {
      if (layer.type === 'text') {
        const textStr = (layer as TextLayer).text.trim();
        layerName = textStr.length > 20 ? `${textStr.slice(0, 20)}...` : textStr || 'Text Layer';
      } else {
        layerName = `Image Layer ${i + 1}`;
      }
    }

    psdLayers.push({
      name: layerName,
      top: 0,
      left: 0,
      canvas: layerCanvas,
      opacity: layer.opacity ?? 1,
      blendMode: mapToPsdBlendMode(layer.blendMode),
      hidden: !layer.visible,
    });
  }

  const psd: Psd = {
    width,
    height,
    // Photoshop expects top-to-bottom; Neo1 paints bottom-to-top.
    children: psdLayers.reverse(),
    canvas: compositeCanvas,
  };

  const buffer = writePsd(psd);
  const blob = new Blob([buffer], { type: 'image/vnd.adobe.photoshop' });
  const filename = projectName.toLowerCase().endsWith('.psd') ? projectName : `${projectName}.psd`;
  saveAs(blob, filename);
}

/**
 * Result of importing a PSD file.
 */
export interface ImportedPsdResult {
  width: number;
  height: number;
  layers: ImageLayer[];
  compositeUrl?: string;
}

/**
 * Import and parse a .psd file into layered components for Neo1.
 * Preserves layers, names, dimensions, opacity, blend modes, and order.
 */
export async function importPsdFile(file: File): Promise<ImportedPsdResult> {
  const buffer = await file.arrayBuffer();
  const psd = readPsd(buffer, {
    skipLayerImageData: false,
    skipCompositeImageData: false,
  });

  const width = Math.max(10, Math.round(psd.width || 1080));
  const height = Math.max(10, Math.round(psd.height || 1080));

  // Extract composite image if present
  let compositeUrl: string | undefined;
  if (psd.canvas) {
    try {
      compositeUrl = psd.canvas.toDataURL('image/png');
    } catch {}
  }

  // Flatten and collect all layers
  const rawLayers: PsdLayer[] = [];
  function collectLayers(children?: PsdLayer[]) {
    if (!children) return;
    for (const child of children) {
      if (child.children && child.children.length > 0) {
        collectLayers(child.children);
      }
      if (child.canvas || child.imageData) {
        rawLayers.push(child);
      }
    }
  }

  collectLayers(psd.children);
  // Photoshop lists top-to-bottom; Neo1 paints bottom-to-top.
  rawLayers.reverse();

  // If no individual layers found, use the composite canvas as a single layer
  if (rawLayers.length === 0 && psd.canvas) {
    rawLayers.push({
      name: file.name.replace(/\.[^/.]+$/, '') || 'Background',
      top: 0,
      left: 0,
      canvas: psd.canvas,
      opacity: 1,
      hidden: false,
    });
  }

  const convertedLayers: ImageLayer[] = [];

  for (let i = 0; i < rawLayers.length; i++) {
    const rawLayer = rawLayers[i];
    const canvas = extractCanvasFromPsdLayer(rawLayer);
    if (!canvas || canvas.width === 0 || canvas.height === 0) continue;

    const dataUrl = canvas.toDataURL('image/png');
    const layerName = rawLayer.name || `Layer ${i + 1}`;
    const left = rawLayer.left ?? 0;
    const top = rawLayer.top ?? 0;
    const w = canvas.width;
    const h = canvas.height;
    // Preserve half-pixel centers for odd-sized layers. Rounding shifts the
    // entire bitmap by half a pixel and blurs a PSD round trip.
    const centerX = left + w / 2;
    const centerY = top + h / 2;

    const newLayer: ImageLayer = {
      id: `psd-layer-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      name: layerName,
      type: 'image',
      src: dataUrl,
      x: centerX,
      y: centerY,
      width: w,
      height: h,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      opacity: typeof rawLayer.opacity === 'number' ? Math.max(0, Math.min(1, rawLayer.opacity)) : 1,
      blendMode: mapFromPsdBlendMode(rawLayer.blendMode),
      visible: !rawLayer.hidden,
      locked: false,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sepia: 0,
      grayscale: 0,
      hueRotate: 0,
      vignette: 0,
      keepAspectRatio: true,
      warp: { style: 'none', bend: 0, horizontalDistortion: 0, verticalDistortion: 0 },
    };

    convertedLayers.push(newLayer);
  }

  return {
    width,
    height,
    layers: convertedLayers,
    compositeUrl,
  };
}
