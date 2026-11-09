// UTF-8: Zoom Image Studio Engine for SeqCarver
// Handles multi-frame zoom sequence generation, focal point calculations, and optical FX.

// @ts-ignore – gifenc has no bundled types but ships valid ESM
import JSZip from "jszip";
import { saveAs } from "file-saver";
// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from "gifenc";

export type ZoomMode =
  | "zoom_in"
  | "zoom_out"
  | "yoyo"
  | "pulse"
  | "spiral_twist"
  | "dolly_vertigo"
  | "ken_burns";

export type ZoomEasing =
  | "linear"
  | "ease_in"
  | "ease_out"
  | "ease_in_out"
  | "bounce";

export type ZoomColorGrade =
  | "none"
  | "cinematic"
  | "cyberpunk"
  | "golden_hour"
  | "noir"
  | "vintage"
  | "punchy";

export type ZoomAspectRatio =
  | "original"
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3";

export type ZoomSpeedRamp =
  | "none"
  | "slow_to_fast"
  | "fast_to_slow"
  | "bullet_time"
  | "hyper_jump";

export interface ZoomStudioConfig {
  /** Number of additional/extra variations to generate (total frames = 1 + extraFrames) */
  extraFrames: number;
  /** Starting zoom factor (e.g. 1.0 = 100%, 2.0 = 200%) */
  startZoom: number;
  /** Ending zoom factor (e.g. 2.5 = 250%) */
  endZoom: number;
  /** Zoom trajectory mode */
  mode: ZoomMode;
  /** Interpolation curve */
  easing: ZoomEasing;
  /** Velocity curve / Speed Ramp effect */
  speedRamp: ZoomSpeedRamp;
  /** Focal anchor normalized X (0 to 1, default 0.5 center) */
  focalX: number;
  /** Focal anchor normalized Y (0 to 1, default 0.5 center) */
  focalY: number;
  /** Secondary target focal X for Ken Burns / drift panning */
  endFocalX: number;
  /** Secondary target focal Y for Ken Burns / drift panning */
  endFocalY: number;
  /** Maximum rotational spiral angle in degrees */
  spiralAngle: number;

  // Optical & Cinematic Effects
  effectMotionBlur: boolean;
  motionBlurStrength: number; // 0 to 100
  effectRgbSplit: boolean;
  rgbSplitAmount: number; // 0 to 20 px
  effectVignette: boolean;
  vignetteStrength: number; // 0 to 100
  effectGlow: boolean;
  glowStrength: number; // 0 to 100
  effectShake: boolean;
  shakeStrength: number; // 0 to 15
  effectFilmGrain: boolean;
  grainStrength: number; // 0 to 100
  colorGrading: ZoomColorGrade;
  aspectRatio: ZoomAspectRatio;
  outputFormat: "image/png" | "image/jpeg";
  outputQuality: number; // 0.1 to 1.0
}

export interface GeneratedZoomFrame {
  id: string;
  name: string;
  url: string;
  zoomLevel: number; // e.g. 1.75
  zoomPercentage: string; // e.g. "175%"
  frameIndex: number;
  totalFrames: number;
  focalPoint: { x: number; y: number };
  width: number;
  height: number;
}

export interface ZoomPreset {
  id: string;
  buttonId: string;
  quickButtonId: string;
  shortLabel: string;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  config: Partial<ZoomStudioConfig>;
}

export const DEFAULT_ZOOM_CONFIG: ZoomStudioConfig = {
  extraFrames: 5, // 5 extra frames -> 6 total frames in sequence
  startZoom: 1.0,
  endZoom: 2.2,
  mode: "zoom_in",
  easing: "ease_in_out",
  speedRamp: "none",
  focalX: 0.5,
  focalY: 0.5,
  endFocalX: 0.65,
  endFocalY: 0.55,
  spiralAngle: 0,
  effectMotionBlur: true,
  motionBlurStrength: 35,
  effectRgbSplit: true,
  rgbSplitAmount: 4,
  effectVignette: true,
  vignetteStrength: 45,
  effectGlow: false,
  glowStrength: 30,
  effectShake: false,
  shakeStrength: 4,
  effectFilmGrain: true,
  grainStrength: 20,
  colorGrading: "cinematic",
  aspectRatio: "original",
  outputFormat: "image/png",
  outputQuality: 0.95,
};

export const ZOOM_PRESETS: ZoomPreset[] = [
  {
    id: "scifi_warp",
    buttonId: "zoom_studio_preset_scifi_warp",
    quickButtonId: "zoom_studio_quick_preset_scifi_warp",
    shortLabel: "Sci-fi warp",
    name: "Sci-fi warp jump",
    description:
      "Interstellar hyper-speed plunge with cyan and violet chromatic dispersion, quantum speed-ramp acceleration, radial blur, and highlight bloom.",
    badge: "Sci-fi fx",
    badgeColor: "text-cyan-300",
    config: {
      extraFrames: 7,
      startZoom: 1.0,
      endZoom: 3.4,
      mode: "zoom_in",
      easing: "ease_in",
      speedRamp: "hyper_jump",
      spiralAngle: 14,
      effectMotionBlur: true,
      motionBlurStrength: 65,
      effectRgbSplit: true,
      rgbSplitAmount: 10,
      effectVignette: true,
      vignetteStrength: 55,
      effectGlow: true,
      glowStrength: 50,
      effectShake: true,
      shakeStrength: 3,
      effectFilmGrain: true,
      grainStrength: 18,
      colorGrading: "cyberpunk",
    },
  },
  {
    id: "cinematic_crash",
    buttonId: "zoom_studio_preset_cinematic_crash",
    quickButtonId: "zoom_studio_quick_preset_cinematic_crash",
    shortLabel: "Crash zoom",
    name: "Cinematic crash zoom",
    description:
      "High-impact dramatic push-in with radial motion blur, chromatic rgb split, and subtle edge vignette.",
    badge: "Cinema fx",
    badgeColor: "text-blue-300",
    config: {
      extraFrames: 5,
      startZoom: 1.0,
      endZoom: 2.5,
      mode: "zoom_in",
      easing: "ease_in",
      speedRamp: "slow_to_fast",
      spiralAngle: 0,
      effectMotionBlur: true,
      motionBlurStrength: 45,
      effectRgbSplit: true,
      rgbSplitAmount: 6,
      effectVignette: true,
      vignetteStrength: 50,
      effectGlow: false,
      effectShake: false,
      colorGrading: "cinematic",
    },
  },
  {
    id: "smooth_ken_burns",
    buttonId: "zoom_studio_preset_smooth_ken_burns",
    quickButtonId: "zoom_studio_quick_preset_smooth_ken_burns",
    shortLabel: "Ken burns",
    name: "Golden ken burns pan and zoom",
    description:
      "Gentle documentary drift moving focus smoothly across the frame while zooming in with warm golden light.",
    badge: "Documentary",
    badgeColor: "text-amber-300",
    config: {
      extraFrames: 6,
      startZoom: 1.0,
      endZoom: 1.6,
      mode: "ken_burns",
      easing: "ease_in_out",
      speedRamp: "none",
      focalX: 0.35,
      focalY: 0.35,
      endFocalX: 0.65,
      endFocalY: 0.65,
      spiralAngle: 0,
      effectMotionBlur: false,
      effectRgbSplit: false,
      effectGlow: false,
      effectShake: false,
      effectVignette: true,
      vignetteStrength: 30,
      colorGrading: "golden_hour",
      effectFilmGrain: true,
      grainStrength: 15,
    },
  },
  {
    id: "hitchcock_vertigo",
    buttonId: "zoom_studio_preset_hitchcock_vertigo",
    quickButtonId: "zoom_studio_quick_preset_hitchcock_vertigo",
    shortLabel: "Vertigo",
    name: "Hitchcock vertigo zoom",
    description:
      "Disorienting optical push-pull dolly effect with counter-perspective depth haze and lens dispersion.",
    badge: "Suspense",
    badgeColor: "text-purple-300",
    config: {
      extraFrames: 7,
      startZoom: 1.0,
      endZoom: 2.8,
      mode: "dolly_vertigo",
      easing: "ease_in_out",
      speedRamp: "none",
      spiralAngle: 0,
      effectMotionBlur: true,
      motionBlurStrength: 30,
      effectRgbSplit: true,
      rgbSplitAmount: 8,
      effectVignette: true,
      vignetteStrength: 60,
      effectGlow: false,
      effectShake: false,
      colorGrading: "noir",
    },
  },
  {
    id: "cyberpunk_spiral",
    buttonId: "zoom_studio_preset_cyberpunk_spiral",
    quickButtonId: "zoom_studio_quick_preset_cyberpunk_spiral",
    shortLabel: "Spiral dive",
    name: "Cyberpunk spiral dive",
    description:
      "Dynamic corkscrew rotational zoom with neon contrast enhancement and high-speed radial blur.",
    badge: "Sci-fi",
    badgeColor: "text-cyan-300",
    config: {
      extraFrames: 6,
      startZoom: 1.0,
      endZoom: 2.4,
      mode: "spiral_twist",
      easing: "ease_in_out",
      speedRamp: "slow_to_fast",
      spiralAngle: 18,
      effectMotionBlur: true,
      motionBlurStrength: 40,
      effectRgbSplit: true,
      rgbSplitAmount: 7,
      effectVignette: true,
      vignetteStrength: 40,
      effectGlow: true,
      glowStrength: 35,
      effectShake: false,
      colorGrading: "cyberpunk",
    },
  },
  {
    id: "pulse_breathing",
    buttonId: "zoom_studio_preset_pulse_breathing",
    quickButtonId: "zoom_studio_quick_preset_pulse_breathing",
    shortLabel: "Yo-yo loop",
    name: "Yo-yo pulse breathe",
    description:
      "Rhythmic organic expansion and retraction tailored for breathing loops and seamless storyboard cycles.",
    badge: "Loop",
    badgeColor: "text-emerald-300",
    config: {
      extraFrames: 8,
      startZoom: 1.0,
      endZoom: 1.8,
      mode: "yoyo",
      easing: "ease_in_out",
      speedRamp: "none",
      spiralAngle: 0,
      effectMotionBlur: false,
      effectRgbSplit: false,
      effectGlow: false,
      effectShake: false,
      effectVignette: true,
      vignetteStrength: 25,
      colorGrading: "none",
      effectFilmGrain: false,
    },
  },
  {
    id: "action_impact",
    buttonId: "zoom_studio_preset_action_impact",
    quickButtonId: "zoom_studio_quick_preset_action_impact",
    shortLabel: "Action punch",
    name: "Action movie punch zoom",
    description:
      "Aggressive rapid zoom with tactile camera vibration, contrast punch, and kinetic visual tension.",
    badge: "Action",
    badgeColor: "text-rose-300",
    config: {
      extraFrames: 4,
      startZoom: 1.0,
      endZoom: 2.3,
      mode: "zoom_in",
      easing: "ease_out",
      speedRamp: "fast_to_slow",
      spiralAngle: 0,
      effectMotionBlur: true,
      motionBlurStrength: 50,
      effectRgbSplit: true,
      rgbSplitAmount: 9,
      effectShake: true,
      shakeStrength: 6,
      effectGlow: false,
      effectVignette: true,
      vignetteStrength: 55,
      colorGrading: "punchy",
    },
  },
  {
    id: "subtle_face_focus",
    buttonId: "zoom_studio_preset_subtle_face_focus",
    quickButtonId: "zoom_studio_quick_preset_subtle_face_focus",
    shortLabel: "Subject focus",
    name: "Subtle subject focus",
    description:
      "Gentle 1.0x to 1.45x push-in toward eyes or hero details with soft highlight bloom and crisp clarity.",
    badge: "Portrait",
    badgeColor: "text-indigo-300",
    config: {
      extraFrames: 4,
      startZoom: 1.0,
      endZoom: 1.45,
      mode: "zoom_in",
      easing: "ease_in_out",
      speedRamp: "none",
      spiralAngle: 0,
      effectMotionBlur: false,
      effectRgbSplit: false,
      effectShake: false,
      effectGlow: true,
      glowStrength: 25,
      effectVignette: true,
      vignetteStrength: 30,
      colorGrading: "none",
    },
  },
];

/**
 * Loads an image from URL, blob URL, or dataURL into an HTMLImageElement asynchronously
 * with resilient CORS fallback so neither data URLs nor cross-origin assets stall rendering.
 */
export function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== "string") {
      reject(new Error("Empty image source URL provided to Zoom Studio"));
      return;
    }

    const isRemoteHttp = /^https?:\/\//i.test(url);
    const img = new Image();
    if (isRemoteHttp) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => resolve(img);
    img.onerror = () => {
      if (isRemoteHttp && img.crossOrigin) {
        const retryImg = new Image();
        retryImg.onload = () => resolve(retryImg);
        retryImg.onerror = (err) =>
          reject(new Error("Failed to load image for Zoom Studio: " + String(err)));
        retryImg.src = url;
        return;
      }
      reject(new Error("Failed to load image for Zoom Studio"));
    };
    img.src = url;
  });
}

/**
 * Evaluates easing curve for normalized progress t (0 to 1)
 */
function evaluateEasing(t: number, easing: ZoomEasing): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "linear":
      return clamped;
    case "ease_in":
      return clamped * clamped;
    case "ease_out":
      return clamped * (2 - clamped);
    case "ease_in_out":
      return clamped < 0.5
        ? 2 * clamped * clamped
        : -1 + (4 - 2 * clamped) * clamped;
    case "bounce": {
      const n1 = 7.5625;
      const d1 = 2.75;
      let x = clamped;
      if (x < 1 / d1) {
        return n1 * x * x;
      } else if (x < 2 / d1) {
        x -= 1.5 / d1;
        return n1 * x * x + 0.75;
      } else if (x < 2.5 / d1) {
        x -= 2.25 / d1;
        return n1 * x * x + 0.9375;
      } else {
        x -= 2.625 / d1;
        return n1 * x * x + 0.984375;
      }
    }
    default:
      return clamped;
  }
}

/**
 * Evaluates speed ramp velocity curve for normalized progression t (0 to 1)
 */
export function evaluateSpeedRamp(t: number, ramp?: ZoomSpeedRamp): number {
  if (!ramp || ramp === "none") return t;
  const clamped = Math.max(0, Math.min(1, t));
  switch (ramp) {
    case "slow_to_fast":
      return Math.pow(clamped, 2.5);
    case "fast_to_slow":
      return 1 - Math.pow(1 - clamped, 2.5);
    case "bullet_time":
      if (clamped < 0.3) {
        return (clamped / 0.3) * 0.4;
      } else if (clamped < 0.7) {
        return 0.4 + ((clamped - 0.3) / 0.4) * 0.2;
      } else {
        return 0.6 + ((clamped - 0.7) / 0.3) * 0.4;
      }
    case "hyper_jump":
      return clamped < 0.25
        ? clamped * 0.2
        : Math.min(1, 0.05 + Math.pow((clamped - 0.25) / 0.75, 3.2) * 0.95);
    default:
      return clamped;
  }
}

const MAX_RENDER_DIMENSION = 1440;

/**
 * Generates all user-defined zoom variation frames with cinematic effects.
 * Yields to the browser event loop between frames and honors cancellation tokens.
 */
export async function generateZoomVariationFrames(
  sourceImage: string | HTMLImageElement,
  config: ZoomStudioConfig,
  baseName: string = "Frame",
  onProgress?: (progress: number, currentStep: number, totalSteps: number) => void,
  shouldCancel?: () => boolean
): Promise<GeneratedZoomFrame[]> {
  const img = typeof sourceImage === "string" ? await loadHtmlImage(sourceImage) : sourceImage;
  if (shouldCancel?.()) return [];

  const rawWidth = img.naturalWidth || img.width;
  const rawHeight = img.naturalHeight || img.height;

  if (rawWidth <= 0 || rawHeight <= 0) {
    throw new Error("Invalid image dimensions for Zoom Studio");
  }

  // Cap base dimensions proportionally so pixel-level optical FX remain fast and responsive
  const downscale =
    Math.max(rawWidth, rawHeight) > MAX_RENDER_DIMENSION
      ? MAX_RENDER_DIMENSION / Math.max(rawWidth, rawHeight)
      : 1;
  const baseWidth = Math.max(1, Math.round(rawWidth * downscale));
  const baseHeight = Math.max(1, Math.round(rawHeight * downscale));

  // Calculate canvas dimensions based on chosen aspect ratio
  let targetWidth = baseWidth;
  let targetHeight = baseHeight;

  if (config.aspectRatio === "1:1") {
    const minSide = Math.min(baseWidth, baseHeight);
    targetWidth = minSide;
    targetHeight = minSide;
  } else if (config.aspectRatio === "16:9") {
    targetWidth = baseWidth;
    targetHeight = Math.max(1, Math.round((baseWidth * 9) / 16));
  } else if (config.aspectRatio === "9:16") {
    targetWidth = Math.max(1, Math.round((baseHeight * 9) / 16));
    targetHeight = baseHeight;
  } else if (config.aspectRatio === "4:3") {
    targetWidth = baseWidth;
    targetHeight = Math.max(1, Math.round((baseWidth * 3) / 4));
  }

  // Scale source artwork to cover the target aspect canvas cleanly at 1.0x zoom
  const coverScale = Math.max(targetWidth / rawWidth, targetHeight / rawHeight);
  const drawWidth = rawWidth * coverScale;
  const drawHeight = rawHeight * coverScale;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create 2D canvas context for Zoom Studio");

  // Total frames in sequence: 1 original + extraFrames
  const extraCount = Number.isFinite(config.extraFrames) ? Math.max(1, Math.round(config.extraFrames)) : 5;
  const totalFrames = Math.max(2, Math.min(32, extraCount + 1));
  const frames: GeneratedZoomFrame[] = [];

  for (let i = 0; i < totalFrames; i++) {
    if (shouldCancel?.()) return [];

    // Yield periodically so progress UI paints smoothly without blocking pointer input
    if (i > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (shouldCancel?.()) return [];
    }

    const rawT = i / (totalFrames - 1); // 0.0 to 1.0

    // Compute progress value with speed ramp velocity curve
    const rampedT = evaluateSpeedRamp(rawT, config.speedRamp);
    let t = rampedT;
    if (config.mode === "zoom_out") {
      t = 1.0 - rampedT;
    } else if (config.mode === "yoyo") {
      t = Math.sin(rampedT * Math.PI);
    } else if (config.mode === "pulse") {
      t = 0.5 + 0.5 * Math.sin(rampedT * Math.PI * 2.5 - Math.PI / 2);
    }

    const easedT = evaluateEasing(t, config.easing);

    // Zoom level calculation
    const startZ = Math.max(0.5, config.startZoom);
    const endZ = Math.max(0.5, config.endZoom);
    const currentZoom = startZ + (endZ - startZ) * easedT;

    // Focal point calculation (interpolate if Ken Burns, otherwise fixed focal point)
    let curFocalX = Math.max(0, Math.min(1, config.focalX));
    let curFocalY = Math.max(0, Math.min(1, config.focalY));
    if (config.mode === "ken_burns") {
      const targetEndX = Math.max(0, Math.min(1, config.endFocalX));
      const targetEndY = Math.max(0, Math.min(1, config.endFocalY));
      curFocalX = curFocalX + (targetEndX - curFocalX) * easedT;
      curFocalY = curFocalY + (targetEndY - curFocalY) * easedT;
    }

    // Rotational spiral angle calculation
    const currentRotation =
      config.mode === "spiral_twist" || config.spiralAngle !== 0
        ? config.spiralAngle * (Math.PI / 180) * easedT
        : 0;

    // Shake offset calculation
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (config.effectShake && config.shakeStrength > 0 && i > 0) {
      const shakeMag = config.shakeStrength * Math.max(0.65, currentZoom / 1.5);
      shakeOffsetX = Math.sin(i * 12.3) * shakeMag;
      shakeOffsetY = Math.cos(i * 9.7) * shakeMag;
    }

    // Clear canvas
    ctx.save();
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Background fill to prevent any transparent gaps during pull-back (<1.0x) or spiral rotation
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // --- Main Image Rendering with Zoom Transform ---
    const focalPxX = targetWidth * curFocalX;
    const focalPxY = targetHeight * curFocalY;

    ctx.translate(focalPxX + shakeOffsetX, focalPxY + shakeOffsetY);
    if (currentRotation !== 0) {
      ctx.rotate(currentRotation);
    }
    ctx.scale(currentZoom, currentZoom);

    const drawX = -drawWidth * curFocalX;
    const drawY = -drawHeight * curFocalY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    ctx.restore();

    // --- Optical Effects Layering ---

    // 1. Radial Zoom Blur / Motion Blur
    if (config.effectMotionBlur && config.motionBlurStrength > 0 && i > 0) {
      const zoomDelta = Math.abs(currentZoom - startZ);
      const blurStrength =
        (config.motionBlurStrength / 100) * Math.min(1.0, zoomDelta * 0.8 + 0.25);
      if (blurStrength > 0.05) {
        const blurPasses = 4;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = blurStrength * 0.35;
        for (let pass = 1; pass <= blurPasses; pass++) {
          const passZoom = 1.0 + pass * 0.04 * blurStrength;
          ctx.save();
          ctx.translate(focalPxX, focalPxY);
          ctx.scale(passZoom, passZoom);
          ctx.drawImage(canvas, -focalPxX, -focalPxY);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    // 2. Chromatic Aberration / RGB Split
    if (config.effectRgbSplit && config.rgbSplitAmount > 0) {
      const splitPx = Math.max(1, Math.round(config.rgbSplitAmount * Math.max(0.5, currentZoom / 2.0)));
      if (splitPx > 0) {
        applyRgbSplit(ctx, targetWidth, targetHeight, splitPx);
      }
    }

    // 3. Highlight Bloom / Glow
    if (config.effectGlow && config.glowStrength > 0) {
      applyGlow(ctx, targetWidth, targetHeight, config.glowStrength / 100);
    }

    // 4. Color Grading
    if (config.colorGrading && config.colorGrading !== "none") {
      applyColorGrading(ctx, targetWidth, targetHeight, config.colorGrading);
    }

    // 5. Cinematic Vignette
    if (config.effectVignette && config.vignetteStrength > 0) {
      applyVignette(
        ctx,
        targetWidth,
        targetHeight,
        config.vignetteStrength / 100,
        curFocalX,
        curFocalY
      );
    }

    // 6. Film Grain Texture
    if (config.effectFilmGrain && config.grainStrength > 0) {
      applyFilmGrain(ctx, targetWidth, targetHeight, config.grainStrength / 100, i);
    }

    // 7. Vertigo Depth Warp (if dolly_vertigo)
    if (config.mode === "dolly_vertigo" && easedT > 0.05) {
      applyVertigoDepthOverlay(ctx, targetWidth, targetHeight, easedT, curFocalX, curFocalY);
    }

    // Export frame as data URL
    const format = config.outputFormat || "image/png";
    const quality = Math.max(0.1, Math.min(1.0, config.outputQuality ?? 0.95));
    const url = canvas.toDataURL(format, quality);

    const zoomPercentage = `${Math.round(currentZoom * 100)}%`;
    const safeBase = (baseName || "Frame").replace(/[^\w\-]+/g, "_");
    const frameName = `${safeBase}_zoom_${String(i + 1).padStart(2, "0")}_${zoomPercentage}`;

    frames.push({
      id: `zoom-frame-${i}-${Date.now()}`,
      name: frameName,
      url,
      zoomLevel: Number(currentZoom.toFixed(2)),
      zoomPercentage,
      frameIndex: i,
      totalFrames,
      focalPoint: { x: curFocalX, y: curFocalY },
      width: targetWidth,
      height: targetHeight,
    });

    if (onProgress) {
      onProgress(((i + 1) / totalFrames) * 100, i + 1, totalFrames);
    }
  }

  return frames;
}

/**
 * Applies RGB channel displacement for high-velocity chromatic aberration
 */
function applyRgbSplit(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetPx: number
) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    const shift = offsetPx;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = (rowOffset + x) * 4;
        const redX = Math.max(0, x - shift);
        const redIdx = (rowOffset + redX) * 4;
        data[idx] = copy[redIdx];

        const blueX = Math.min(width - 1, x + shift);
        const blueIdx = (rowOffset + blueX) * 4;
        data[idx + 2] = copy[blueIdx + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Graceful fallback if canvas security restricts pixel readback
  }
}

/**
 * Highlights glow / bloom effect
 */
function applyGlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.45;
  ctx.filter = `blur(${Math.max(4, Math.round(width * 0.02))}px) brightness(1.25)`;
  ctx.drawImage(ctx.canvas, 0, 0, width, height);
  ctx.restore();
}

/**
 * Radial optical vignette darkening toward the outer frame perimeter
 */
function applyVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
  focalNormX: number,
  focalNormY: number
) {
  ctx.save();
  const centerX = width * focalNormX;
  const centerY = height * focalNormY;
  const maxRadius = Math.max(width, height) * 0.75;
  const innerRadius = maxRadius * 0.25;

  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    innerRadius,
    centerX,
    centerY,
    maxRadius
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.6, `rgba(0, 0, 0, ${strength * 0.3})`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${strength * 0.85})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Deterministic procedural optical film grain per frame index
 */
function applyFilmGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
  seedOffset: number = 0
) {
  const grainCanvas = document.createElement("canvas");
  grainCanvas.width = 128;
  grainCanvas.height = 128;
  const gCtx = grainCanvas.getContext("2d");
  if (!gCtx) return;

  const gData = gCtx.createImageData(128, 128);
  const data = gData.data;
  const alpha = Math.round(strength * 55);
  let seed = (seedOffset + 1) * 16807;

  for (let i = 0; i < data.length; i += 4) {
    seed = (seed * 48271) % 2147483647;
    const val = seed & 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = alpha;
  }
  gCtx.putImageData(gData, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grainCanvas, "repeat") || "transparent";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Optical depth haze & counter-perspective ring for Hitchcock vertigo effect
 */
function applyVertigoDepthOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  focalNormX: number,
  focalNormY: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  const cx = width * focalNormX;
  const cy = height * focalNormY;
  const grad = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    Math.max(width, height) * 0.65
  );
  grad.addColorStop(0, `rgba(255, 255, 255, ${progress * 0.22})`);
  grad.addColorStop(1, `rgba(10, 15, 60, ${progress * 0.45})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Stylistic color grading profiles
 */
function applyColorGrading(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grade: ZoomColorGrade
) {
  ctx.save();
  if (grade === "cinematic") {
    ctx.globalCompositeOperation = "color";
    ctx.globalAlpha = 0.2;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#06b6d4");
    grad.addColorStop(1, "#f97316");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (grade === "cyberpunk") {
    ctx.globalCompositeOperation = "color";
    ctx.globalAlpha = 0.25;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#00f2fe");
    grad.addColorStop(1, "#f72585");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (grade === "golden_hour") {
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, 0, width, height);
  } else if (grade === "noir") {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  } else if (grade === "vintage") {
    ctx.globalCompositeOperation = "color";
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#b45309";
    ctx.fillRect(0, 0, width, height);
  } else if (grade === "punchy") {
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

/**
 * Packages all generated zoom variation frames into a downloadable ZIP
 */
export async function exportZoomSeriesAsZip(
  frames: GeneratedZoomFrame[],
  baseZipName: string = "zoom_variations"
): Promise<void> {
  if (!frames.length) throw new Error("No frames available to export");
  const zip = new JSZip();
  const folder = zip.folder("zoom_frames") || zip;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const base64Data = frame.url.split(",")[1];
    if (!base64Data) continue;
    const extension = frame.url.includes("image/jpeg") ? "jpg" : "png";
    const filename = `${String(i + 1).padStart(2, "0")}_${frame.name}.${extension}`;
    folder.file(filename, base64Data, { base64: true });
  }

  const metadata = {
    exportedAt: new Date().toISOString(),
    totalFrames: frames.length,
    frames: frames.map((f, idx) => ({
      index: idx + 1,
      name: f.name,
      zoomLevel: f.zoomLevel,
      zoomPercentage: f.zoomPercentage,
      resolution: `${f.width}x${f.height}`,
      focalPoint: f.focalPoint,
    })),
  };
  folder.file("zoom_metadata.json", JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${baseZipName}_${Date.now()}.zip`);
}

/**
 * Exports all zoom variation frames as an animated looping GIF using gifenc
 */
export async function exportZoomSeriesAsGif(
  frames: GeneratedZoomFrame[],
  fps: number = 10,
  onProgress?: (pct: number) => void,
  speedRamp?: ZoomSpeedRamp
): Promise<Blob> {
  if (frames.length === 0) throw new Error("No frames provided for GIF export");

  const firstImg = await loadHtmlImage(frames[0].url);
  const maxDim = 600;
  let w = firstImg.naturalWidth || firstImg.width;
  let h = firstImg.naturalHeight || firstImg.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.max(1, Math.round((h * maxDim) / w));
      w = maxDim;
    } else {
      w = Math.max(1, Math.round((w * maxDim) / h));
      h = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context failed for GIF export");

  const baseDelayMs = Math.round(1000 / Math.max(1, fps));
  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const frameImg = await loadHtmlImage(frames[i].url);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(frameImg, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const palette = quantize(imgData.data, 256);
    const index = applyPalette(imgData.data, palette);

    let frameDelay = baseDelayMs;
    if (speedRamp === "bullet_time") {
      const mid = (frames.length - 1) / 2;
      const distFromMid = Math.abs(i - mid) / Math.max(1, mid);
      frameDelay = Math.round(baseDelayMs * (distFromMid < 0.35 ? 2.2 : 0.8));
    } else if (speedRamp === "slow_to_fast") {
      const progress = i / Math.max(1, frames.length - 1);
      frameDelay = Math.round(baseDelayMs * (progress < 0.5 ? 1.6 : 0.6));
    } else if (speedRamp === "fast_to_slow") {
      const progress = i / Math.max(1, frames.length - 1);
      frameDelay = Math.round(baseDelayMs * (progress < 0.5 ? 0.6 : 1.6));
    } else if (speedRamp === "hyper_jump") {
      const progress = i / Math.max(1, frames.length - 1);
      frameDelay = Math.round(baseDelayMs * (progress < 0.3 ? 1.8 : 0.5));
    }

    gif.writeFrame(index, w, h, {
      palette,
      delay: Math.max(30, frameDelay),
      repeat: 0,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / frames.length) * 100));
    }
  }

  gif.finish();
  const buffer = gif.bytes();
  return new Blob([buffer], { type: "image/gif" });
}
