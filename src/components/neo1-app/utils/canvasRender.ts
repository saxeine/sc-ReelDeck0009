import { CanvasState,ImageLayer,Layer,TextLayer } from '../types';

const imageCache = new Map<string, HTMLImageElement>();
const pendingImages = new Map<string, Promise<HTMLImageElement>>();

export function preloadImage(url: string): Promise<HTMLImageElement> {
  if (!url) return Promise.resolve(new Image());
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);
  const pending = pendingImages.get(url);
  if (pending) return pending;
  const request = new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    if (url.startsWith("http://") || url.startsWith("https://")) img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      pendingImages.delete(url);
      resolve(img);
    };
    img.onerror = () => {
      pendingImages.delete(url);
      console.warn("Failed to load image for Neo1 canvas");
      resolve(img);
    };
    img.src = url;
  });
  pendingImages.set(url, request);
  return request;
}

/** Do not bake an incomplete composition while an image is still loading. */
export async function preloadCanvasAssets(canvasState: CanvasState, layers: Layer[]): Promise<void> {
  const urls = [
    ...(canvasState.background.type === 'image' && canvasState.background.imageUrl
      ? [canvasState.background.imageUrl] : []),
    ...layers.filter((layer): layer is ImageLayer => layer.type === 'image' && layer.visible && !!layer.src).map((layer) => layer.src),
  ];
  const images = await Promise.all(urls.map(preloadImage));
  if (images.some((image) => !image.naturalWidth || !image.naturalHeight)) {
    throw new Error('A composition image could not be loaded.');
  }
}

export function renderCanvasToContext(
  ctx: CanvasRenderingContext2D,
  canvasState: CanvasState,
  layers: Layer[]
): void {
  const { width, height, background } = canvasState;
  ctx.clearRect(0, 0, width, height);

  // Render Background
  if (background.type === 'color') {
    ctx.fillStyle = background.color || '#0f172a';
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'gradient') {
    if (background.gradient.type === 'radial') {
      const radGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) / 2
      );
      radGrad.addColorStop(0, background.gradient.color1 || '#0f172a');
      radGrad.addColorStop(1, background.gradient.color2 || '#3b82f6');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const angleRad = ((background.gradient.angle || 0) * Math.PI) / 180;
      const x2 = width * Math.cos(angleRad);
      const y2 = height * Math.sin(angleRad);
      const grad = ctx.createLinearGradient(0, 0, x2, y2);
      grad.addColorStop(0, background.gradient.color1 || '#0f172a');
      grad.addColorStop(1, background.gradient.color2 || '#3b82f6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (background.type === 'image' && background.imageUrl) {
    ctx.fillStyle = background.color || '#0f172a';
    ctx.fillRect(0, 0, width, height);
    const img = imageCache.get(background.imageUrl);
    if (img && img.width > 0 && img.height > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, background.imageOpacity ?? 0.85));
      const filters: string[] = [];
      if (background.imageBlur && background.imageBlur > 0) {
        filters.push(`blur(${background.imageBlur}px)`);
      }
      if (background.imageBrightness !== undefined && background.imageBrightness !== 100) {
        filters.push(`brightness(${background.imageBrightness}%)`);
      }
      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }

      const fit = background.imageFit || 'cover';
      if (fit === 'contain') {
        const scale = Math.min(width / img.width, height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      } else if (fit === 'cover') {
        const scale = Math.max(width / img.width, height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      } else if (fit === 'tile') {
        const pattern = ctx.createPattern(img, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }
      } else {
        // stretch
        ctx.drawImage(img, 0, 0, width, height);
      }
      ctx.restore();
    }
  }

  // Render Layers in order
  layers.forEach((layer) => {
    if (!layer.visible) return;

    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.globalCompositeOperation = (layer.blendMode as GlobalCompositeOperation) || 'source-over';

    ctx.translate(layer.x, layer.y);
    if (layer.rotation) {
      ctx.rotate((layer.rotation * Math.PI) / 180);
    }
    if (layer.skewX || layer.skewY) {
      const tanX = Math.tan(((layer.skewX || 0) * Math.PI) / 180);
      const tanY = Math.tan(((layer.skewY || 0) * Math.PI) / 180);
      ctx.transform(1, tanY, tanX, 1, 0, 0);
    }
    if (layer.scaleX !== 1 || layer.scaleY !== 1 || layer.flipX || layer.flipY) {
      ctx.scale(
        (layer.scaleX ?? 1) * (layer.flipX ? -1 : 1),
        (layer.scaleY ?? 1) * (layer.flipY ? -1 : 1)
      );
    }

    if (layer.type === 'text') {
      renderWarpedLayer(ctx, layer, (offCtx) => renderTextLayer(offCtx, layer as TextLayer));
    } else if (layer.type === 'image') {
      renderWarpedLayer(ctx, layer, (offCtx) => renderImageLayer(offCtx, layer as ImageLayer));
    }

    ctx.restore();
  });
}

function renderWarpedLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  renderFn: (offCtx: CanvasRenderingContext2D) => void
): void {
  const warp = layer.warp;
  if (
    !warp ||
    warp.style === 'none' ||
    (warp.bend === 0 && !warp.horizontalDistortion && !warp.verticalDistortion)
  ) {
    renderFn(ctx);
    return;
  }

  // Create offscreen canvas for rendering the flat unwarped layer
  const padding = 120; // Extra room for strokes/glows/extrusions
  const offW = Math.ceil(layer.width + padding);
  const offH = Math.ceil(layer.height + padding);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = offW;
  offCanvas.height = offH;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) {
    renderFn(ctx);
    return;
  }

  // Render content at center of offscreen canvas
  offCtx.save();
  offCtx.translate(offW / 2, offH / 2);
  renderFn(offCtx);
  offCtx.restore();

  // Perform slice-based warping across width
  const numSlices = 80;
  const sliceW = offW / numSlices;
  const bendNorm = (warp.bend || 0) / 100; // -1 to 1

  for (let i = 0; i < numSlices; i++) {
    const srcX = i * sliceW;
    // Normalized x from -0.5 to 0.5
    const normX = (i + 0.5) / numSlices - 0.5;

    let yOffset = 0;
    let rotAngle = 0;
    let scaleH = 1;

    if (warp.style === 'arc') {
      // Curved Arc (curve up or down)
      yOffset = -Math.pow(normX * 2, 2) * (bendNorm * layer.height * 0.45);
      rotAngle = normX * (bendNorm * 0.8);
    } else if (warp.style === 'arch') {
      // Arch (high center peak)
      yOffset = -(1 - Math.pow(normX * 2, 2)) * (bendNorm * layer.height * 0.45);
    } else if (warp.style === 'wave') {
      // Wave (S-curve)
      yOffset = Math.sin(normX * Math.PI * 2) * (bendNorm * layer.height * 0.35);
      rotAngle = Math.cos(normX * Math.PI * 2) * (bendNorm * 0.3);
    } else if (warp.style === 'bulge') {
      // Bulge / Fisheye
      const distFromCenter = Math.cos(normX * Math.PI);
      scaleH = Math.max(0.1, 1 + distFromCenter * (bendNorm * 0.65));
    } else if (warp.style === 'flag') {
      // Flag wave
      yOffset = Math.sin((normX + 0.5) * Math.PI * 1.5) * (bendNorm * layer.height * 0.35);
    } else if (warp.style === 'skew') {
      // Linear slant/skew
      yOffset = normX * (bendNorm * layer.height * 0.6);
    }

    // Apply horizontal & vertical distortion
    if (warp.horizontalDistortion) {
      const hDist = (warp.horizontalDistortion / 100) * 0.5;
      scaleH *= 1 + normX * hDist;
    }
    if (warp.verticalDistortion) {
      const vDist = (warp.verticalDistortion / 100) * (layer.height * 0.3);
      yOffset += normX * vDist;
    }

    // Apply perspective X / Y 3D tilt
    const perspX = (layer as any).perspectiveX;
    if (perspX) {
      const pXDist = (perspX / 100) * 0.6;
      scaleH *= Math.max(0.05, 1 + normX * pXDist);
    }
    const perspY = (layer as any).perspectiveY;
    if (perspY) {
      const pYDist = (perspY / 100) * (layer.height * 0.4);
      yOffset += normX * pYDist;
    }

    const drawX = -offW / 2 + srcX + sliceW / 2;

    ctx.save();
    ctx.translate(drawX, yOffset);
    if (rotAngle) {
      ctx.rotate(rotAngle);
    }
    if (scaleH !== 1) {
      ctx.scale(1, scaleH);
    }

    ctx.drawImage(
      offCanvas,
      srcX,
      0,
      sliceW,
      offH,
      -sliceW / 2 - 0.5,
      -offH / 2,
      sliceW + 1,
      offH
    );
    ctx.restore();
  }
}

function renderTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer): void {
  const { text, fontFamily, fontSize, fontWeight, color, textAlign, bgBox, strokes, shadows, glow, extrusion } = layer;

  // Process text transform
  let processedText = text || '';
  if (layer.textTransform === 'uppercase') {
    processedText = processedText.toUpperCase();
  } else if (layer.textTransform === 'lowercase') {
    processedText = processedText.toLowerCase();
  } else if (layer.textTransform === 'capitalize') {
    processedText = processedText.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const lines = processedText.split('\n');

  // Render Background Box
  if (bgBox && bgBox.enabled) {
    ctx.save();
    ctx.fillStyle = bgBox.color || 'rgba(0,0,0,0.8)';
    ctx.globalAlpha = (bgBox.opacity ?? 0.8) * (layer.opacity ?? 1);

    const pX = bgBox.paddingX ?? 20;
    const pY = bgBox.paddingY ?? 10;
    const halfW = layer.width / 2 + pX;
    const halfH = layer.height / 2 + pY;

    ctx.beginPath();
    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, radius);
      } else {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      }
    };

    if (bgBox.shape === 'pill') {
      const r = Math.min(halfW, halfH);
      drawRoundRect(-halfW, -halfH, halfW * 2, halfH * 2, r);
    } else {
      const r = bgBox.borderRadius ?? 8;
      drawRoundRect(-halfW, -halfH, halfW * 2, halfH * 2, r);
    }
    ctx.fill();

    if (bgBox.borderWidth && bgBox.borderWidth > 0) {
      ctx.strokeStyle = bgBox.borderColor || '#ffffff';
      ctx.lineWidth = bgBox.borderWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Set Typography Context
  ctx.font = `${layer.fontStyle || 'normal'} ${fontWeight || 700} ${fontSize || 40}px "${fontFamily || 'Inter'}", sans-serif`;
  ctx.textAlign = (textAlign as CanvasTextAlign) || 'center';
  ctx.textBaseline = 'middle';

  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = `${layer.letterSpacing || 0}px`;
  }

  const fontSz = fontSize || 40;
  const lineH = fontSz * (layer.lineHeight || 1.2);
  const totalH = lines.length * lineH;
  const startY = -(totalH / 2) + lineH / 2;

  lines.forEach((lineText, idx) => {
    const lineY = lines.length === 1 ? 0 : startY + idx * lineH;

    // Render Glow
    if (glow && glow.enabled) {
      ctx.save();
      ctx.shadowColor = glow.color || '#00f0ff';
      ctx.shadowBlur = glow.blur || 20;
      ctx.fillStyle = glow.color || '#00f0ff';
      ctx.fillText(lineText, 0, lineY);
      ctx.restore();
    }

    // Render 3D Extrusion
    if (extrusion && extrusion.enabled && extrusion.depth > 0) {
      ctx.save();
      const angleRad = ((extrusion.angle || 135) * Math.PI) / 180;
      const dx = Math.cos(angleRad);
      const dy = Math.sin(angleRad);
      ctx.fillStyle = extrusion.color || '#0f172a';

      for (let i = extrusion.depth; i > 0; i--) {
        ctx.fillText(lineText, dx * i, lineY + dy * i);
      }
      ctx.restore();
    }

    // Render Shadows
    if (shadows && shadows.length > 0) {
      shadows.forEach((sh: any) => {
        if (sh.enabled) {
          ctx.save();
          ctx.shadowColor = sh.color || 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = sh.blur || 10;
          ctx.shadowOffsetX = sh.offsetX || 4;
          ctx.shadowOffsetY = sh.offsetY || 4;
          ctx.fillStyle = sh.color || 'rgba(0,0,0,0.5)';
          ctx.fillText(lineText, 0, lineY);
          ctx.restore();
        }
      });
    }

    // Render Strokes
    if (strokes && strokes.length > 0) {
      strokes.forEach((st: any) => {
        if (st.enabled) {
          ctx.save();
          ctx.strokeStyle = st.color || '#000000';
          ctx.lineWidth = st.width || 2;
          ctx.strokeText(lineText, 0, lineY);
          ctx.restore();
        }
      });
    }

    // Render Text Fill
    if (layer.fillType === 'gradient' && layer.gradient && layer.gradient.enabled !== false) {
      const angleDeg = layer.gradient.angle ?? 45;
      const angleRad = (angleDeg * Math.PI) / 180;
      const halfW = (layer.width || 400) / 2;
      const halfH = (layer.height || 100) / 2;
      const x1 = -Math.cos(angleRad) * halfW;
      const y1 = -Math.sin(angleRad) * halfH;
      const x2 = Math.cos(angleRad) * halfW;
      const y2 = Math.sin(angleRad) * halfH;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      const stops = (layer.gradient.stops && layer.gradient.stops.length > 0)
        ? layer.gradient.stops
        : [
            { offset: 0, color: layer.color || '#00f0ff' },
            { offset: 1, color: '#ff007f' },
          ];
      stops.forEach((s) => {
        const off = Math.max(0, Math.min(1, typeof s.offset === 'number' ? s.offset : 0));
        grad.addColorStop(off, s.color || '#ffffff');
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = layer.color || color || '#ffffff';
    }

    ctx.fillText(lineText, 0, lineY);
  });
}

export function processChromaKey(
  img: HTMLImageElement,
  chromaKey: { enabled: boolean; keyColor: string; tolerance: number; smoothness: number; spillSuppression: number; invert: boolean },
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement | null {
  if (!img.complete || img.naturalWidth === 0) return null;

  const w = Math.max(1, Math.min(1200, Math.round(targetWidth)));
  const h = Math.max(1, Math.min(1200, Math.round(targetHeight)));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let keyHex = chromaKey.keyColor || '#00ff00';
    if (keyHex.length === 4) {
      keyHex = `#${keyHex[1]}${keyHex[1]}${keyHex[2]}${keyHex[2]}${keyHex[3]}${keyHex[3]}`;
    }
    const keyR = parseInt(keyHex.substring(1, 3), 16) || 0;
    const keyG = parseInt(keyHex.substring(3, 5), 16) || 0;
    const keyB = parseInt(keyHex.substring(5, 7), 16) || 0;

    const tolNorm = (chromaKey.tolerance ?? 30) / 100;
    const smoothNorm = Math.max(0.001, (chromaKey.smoothness ?? 10) / 100);
    const spillNorm = (chromaKey.spillSuppression ?? 50) / 100;
    const isGreenKey = keyG > keyR && keyG > keyB;
    const isBlueKey = keyB > keyR && keyB > keyG;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const dr = r - keyR;
      const dg = g - keyG;
      const db = b - keyB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db) / 441.673;

      let alphaFactor = 1;
      if (dist < tolNorm) {
        alphaFactor = 0;
      } else if (dist < tolNorm + smoothNorm) {
        alphaFactor = (dist - tolNorm) / smoothNorm;
      }

      if (chromaKey.invert) {
        alphaFactor = 1 - alphaFactor;
      }

      let finalG = g;
      let finalB = b;
      if (spillNorm > 0 && alphaFactor > 0) {
        if (isGreenKey) {
          const maxOther = Math.max(r, b);
          if (g > maxOther) {
            finalG = Math.round(g - (g - maxOther) * spillNorm);
          }
        } else if (isBlueKey) {
          const maxOther = Math.max(r, g);
          if (b > maxOther) {
            finalB = Math.round(b - (b - maxOther) * spillNorm);
          }
        }
      }

      data[i + 1] = finalG;
      data[i + 2] = finalB;
      data[i + 3] = Math.round(a * alphaFactor);
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  } catch (err) {
    console.warn("Chroma key processing error:", err);
    return null;
  }
}

function renderImageLayer(ctx: CanvasRenderingContext2D, layer: ImageLayer): void {
  const img = imageCache.get(layer.src);
  if (!img) return;

  ctx.save();
  // Filters
  const filters: string[] = [];
  if (layer.brightness !== undefined && layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`);
  if (layer.contrast !== undefined && layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`);
  if (layer.saturation !== undefined && layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`);
  if (layer.blur && layer.blur > 0) filters.push(`blur(${layer.blur}px)`);
  if (layer.grayscale && layer.grayscale > 0) filters.push(`grayscale(${layer.grayscale}%)`);
  if (layer.sepia && layer.sepia > 0) filters.push(`sepia(${layer.sepia}%)`);
  if (layer.hueRotate && layer.hueRotate > 0) filters.push(`hue-rotate(${layer.hueRotate}deg)`);

  if (filters.length > 0) {
    ctx.filter = filters.join(' ');
  }

  if (layer.chromaKey && layer.chromaKey.enabled) {
    const processedCanvas = processChromaKey(img, layer.chromaKey, layer.width, layer.height);
    if (processedCanvas) {
      ctx.drawImage(processedCanvas, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
      ctx.restore();
      return;
    }
  }

  ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
  ctx.restore();
}
