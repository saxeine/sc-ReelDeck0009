// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export type ExportFormat = "mp4" | "gif" | "webm";

export interface SequenceExportOptions {
  frames: Array<{ url: string; name: string }>;
  fps: number;
  format: ExportFormat;
  filename: string;
  transitionEffect: string;
  pauseDuration: number;
  onProgress: (percent: number, statusMessage?: string) => void;
}

/**
 * Sanitize filename and ensure it has the correct file extension
 */
export function sanitizeExportFilename(
  rawName: string,
  format: ExportFormat,
  fallbackBase = "sequence_animation"
): string {
  let cleaned = (rawName || "").trim();

  // Strip invalid characters: /\?%*:|"<>
  cleaned = cleaned.replace(/[\\/?:*"<>|]/g, "_").trim();

  // Remove existing extension if user typed it
  cleaned = cleaned.replace(/\.(mp4|gif|webm|mov|avi)$/i, "").trim();

  if (!cleaned) {
    cleaned = fallbackBase;
  }

  return `${cleaned}.${format}`;
}

/**
 * Helper to load an HTMLImageElement safely from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, _reject) => {
    const img = new Image();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Image load failed for export frame:", url);
      resolve(img); // Resolve anyway to prevent blocking the sequence
    };
    img.src = url;
  });
}

/**
 * Render single image onto canvas centered and aspect-scaled without borders or watermarks
 */
function renderFrameImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  img: HTMLImageElement | null,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  alpha = 1
) {
  if (!img || !img.complete || !img.width || !img.height) return;

  const hRatio = width / img.width;
  const vRatio = height / img.height;
  const ratio = Math.min(hRatio, vRatio) * scale;
  const cx = (width - img.width * ratio) / 2 + offsetX;
  const cy = (height - img.height * ratio) / 2 + offsetY;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    cx,
    cy,
    img.width * ratio,
    img.height * ratio
  );
  ctx.restore();
}

/**
 * Render frame with optional transition effect onto canvas (NO BURNT-IN TEXT)
 */
function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prevImg: HTMLImageElement | null,
  currImg: HTMLImageElement | null,
  progress: number,
  effect: string
) {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, width, height);

  if (effect === "none" || effect === "pause" || !prevImg || progress >= 1) {
    if (currImg) renderFrameImage(ctx, width, height, currImg);
    return;
  }

  if (effect === "crossfade") {
    renderFrameImage(ctx, width, height, prevImg, 0, 0, 1, 1 - progress);
    if (currImg) renderFrameImage(ctx, width, height, currImg, 0, 0, 1, progress);
  } else if (effect === "slide-left") {
    renderFrameImage(ctx, width, height, prevImg, -width * progress, 0, 1, 1);
    if (currImg) renderFrameImage(ctx, width, height, currImg, width * (1 - progress), 0, 1, 1);
  } else if (effect === "slide-right") {
    renderFrameImage(ctx, width, height, prevImg, width * progress, 0, 1, 1);
    if (currImg) renderFrameImage(ctx, width, height, currImg, -width * (1 - progress), 0, 1, 1);
  } else if (effect === "zoom") {
    renderFrameImage(ctx, width, height, prevImg, 0, 0, 1 + progress * 0.25, 1 - progress);
    if (currImg) renderFrameImage(ctx, width, height, currImg, 0, 0, 0.8 + progress * 0.2, progress);
  } else if (effect === "fade-black") {
    if (progress < 0.5) {
      renderFrameImage(ctx, width, height, prevImg, 0, 0, 1, 1 - progress * 2);
    } else {
      if (currImg) renderFrameImage(ctx, width, height, currImg, 0, 0, 1, (progress - 0.5) * 2);
    }
  } else {
    if (currImg) renderFrameImage(ctx, width, height, currImg);
  }
}

/**
 * Export sequence as MP4 video (H.264 / AVC)
 */
async function exportAsMP4(
  options: SequenceExportOptions,
  images: HTMLImageElement[]
): Promise<Blob> {
  const { fps, transitionEffect, pauseDuration, onProgress } = options;
  const width = 1280;
  const height = 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const frameDurationMs = transitionEffect === "pause" ? pauseDuration * 1000 : 1000 / fps;
  const totalScenes = images.length;

  // Try WebCodecs VideoEncoder + mp4-muxer
  if (typeof window !== "undefined" && "VideoEncoder" in window) {
    try {
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: {
          codec: "avc",
          width,
          height,
        },
        fastStart: "in-memory",
      });

      let encodeError: any = null;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          console.error("VideoEncoder error", e);
          encodeError = e;
        },
      });

      // Try widely compatible H.264 profiles
      const codecsToTry = ["avc1.42001f", "avc1.4d002a", "avc1.640028", "avc1.42E01E"];
      let configured = false;

      for (const codec of codecsToTry) {
        try {
          const support = await VideoEncoder.isConfigSupported({
            codec,
            width,
            height,
            bitrate: 4_000_000,
            framerate: Math.max(1, Math.min(60, fps)),
          });
          if (support.supported) {
            videoEncoder.configure({
              codec,
              width,
              height,
              bitrate: 4_000_000,
              framerate: Math.max(1, Math.min(60, fps)),
            });
            configured = true;
            break;
          }
        } catch {
          // try next
        }
      }

      if (configured) {
        let currentTimestampUs = 0;
        const frameDurationUs = Math.round(frameDurationMs * 1000);

        for (let i = 0; i < totalScenes; i++) {
          const currImg = images[i];
          const prevImg = i > 0 ? images[i - 1] : currImg;

          // Render clean scene (WITHOUT watermark / filename text)
          renderScene(ctx, width, height, prevImg, currImg, 1, transitionEffect);

          const videoFrame = new VideoFrame(canvas, {
            timestamp: currentTimestampUs,
            duration: frameDurationUs,
          });

          videoEncoder.encode(videoFrame, { keyFrame: i % 10 === 0 });
          videoFrame.close();

          currentTimestampUs += frameDurationUs;

          const percent = Math.round(((i + 1) / totalScenes) * 85);
          onProgress(percent, `Encoding MP4 frame ${i + 1} of ${totalScenes}...`);
          await new Promise((r) => setTimeout(r, 8));
        }

        onProgress(90, "Finalizing MP4 video container...");
        await videoEncoder.flush();
        muxer.finalize();

        if (encodeError) {
          throw encodeError;
        }

        onProgress(100, "MP4 export complete!");
        return new Blob([target.buffer], { type: "video/mp4" });
      }
    } catch (err) {
      console.warn("WebCodecs MP4 encoding fallback:", err);
    }
  }

  // Fallback: Canvas captureStream + MediaRecorder
  return exportUsingMediaRecorder(options, images, "video/mp4");
}

/**
 * Export sequence as animated GIF
 */
async function exportAsGIF(
  options: SequenceExportOptions,
  images: HTMLImageElement[]
): Promise<Blob> {
  const { fps, transitionEffect, pauseDuration, onProgress } = options;
  // Use crisp 800x450 for smooth GIF playback and optimal file size
  const width = 800;
  const height = 450;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const frameDelayMs = Math.max(20, Math.round(transitionEffect === "pause" ? pauseDuration * 1000 : 1000 / fps));
  const totalFrames = images.length;

  const gif = GIFEncoder();

  for (let i = 0; i < totalFrames; i++) {
    const currImg = images[i];
    const prevImg = i > 0 ? images[i - 1] : currImg;

    // Render clean frame without any burnt-in filename overlay
    renderScene(ctx, width, height, prevImg, currImg, 1, transitionEffect);

    const imgData = ctx.getImageData(0, 0, width, height);
    const rgba = imgData.data;

    // Quantize palette to 256 colors
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);

    gif.writeFrame(index, width, height, {
      palette,
      delay: frameDelayMs,
    });

    const percent = Math.round(((i + 1) / totalFrames) * 90);
    onProgress(percent, `Quantizing GIF frame ${i + 1} of ${totalFrames}...`);
    await new Promise((r) => setTimeout(r, 10));
  }

  onProgress(95, "Compiling animated GIF...");
  gif.finish();
  const bytes = gif.bytes();

  onProgress(100, "GIF animation ready!");
  return new Blob([bytes], { type: "image/gif" });
}

/**
 * Fallback / WebM export using MediaRecorder
 */
async function exportUsingMediaRecorder(
  options: SequenceExportOptions,
  images: HTMLImageElement[],
  preferredMime = "video/webm"
): Promise<Blob> {
  const { fps, transitionEffect, pauseDuration, onProgress } = options;
  const width = 1280;
  const height = 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(Math.max(1, Math.min(60, fps)));
  let mimeType = preferredMime;

  if (!MediaRecorder.isTypeSupported(mimeType)) {
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      mimeType = "video/webm";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    } else {
      mimeType = "";
    }
  }

  const mediaRecorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, videoBitsPerSecond: 6000000 } : undefined
  );

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      resolve(blob);
    };
  });

  mediaRecorder.start();

  const frameDurationMs = transitionEffect === "pause" ? pauseDuration * 1000 : 1000 / fps;
  const totalFrames = images.length;

  for (let i = 0; i < totalFrames; i++) {
    const currImg = images[i];
    const prevImg = i > 0 ? images[i - 1] : currImg;

    // Draw clean scene WITHOUT watermark
    renderScene(ctx, width, height, prevImg, currImg, 1, transitionEffect);

    const percent = Math.round(((i + 1) / totalFrames) * 85);
    onProgress(percent, `Recording video frame ${i + 1} of ${totalFrames}...`);

    await new Promise((r) => setTimeout(r, frameDurationMs));
  }

  // Small tail delay
  await new Promise((r) => setTimeout(r, 200));

  mediaRecorder.stop();
  const resultBlob = await recordPromise;

  onProgress(100, "Movie rendering complete!");
  return resultBlob;
}

/**
 * Main export sequence dispatcher
 */
export async function exportSequenceMovie(
  options: SequenceExportOptions
): Promise<{ blob: Blob; filename: string }> {
  const { frames, format, filename, onProgress } = options;

  if (frames.length === 0) {
    throw new Error("No frames to export.");
  }

  onProgress(5, "Loading frame images...");

  // Load all images
  const images = await Promise.all(frames.map((f) => loadImage(f.url)));

  let blob: Blob;
  if (format === "gif") {
    blob = await exportAsGIF(options, images);
  } else if (format === "mp4") {
    blob = await exportAsMP4(options, images);
  } else {
    // webm
    blob = await exportUsingMediaRecorder(options, images, "video/webm");
  }

  const finalFilename = sanitizeExportFilename(filename, format);
  return { blob, filename: finalFilename };
}
