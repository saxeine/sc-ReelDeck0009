import { ContentType } from '../types';

export const CANVAS_SIZE = 1000;
const GRID_COUNT = 4;

export function calculateOverallDimensionMm(size: number, gap: number): number {
  return GRID_COUNT * size + (GRID_COUNT - 1) * gap;
}

export function formatDimensionMm(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function calculateActiveAreaSqm(size: number): string {
  const totalPanels = GRID_COUNT * GRID_COUNT;
  return ((totalPanels * size * size) / 1_000_000).toFixed(2);
}

export function drawUploadedMedia(
  ctx: CanvasRenderingContext2D,
  media: HTMLImageElement | HTMLVideoElement | null,
  contentType: ContentType
): void {
  if (!media) {
    return;
  }

  if (contentType === ContentType.Video) {
    const video = media as HTMLVideoElement;
    if (video.readyState < 2) {
      return;
    }
  }

  const mediaWidth =
    contentType === ContentType.Video
      ? (media as HTMLVideoElement).videoWidth
      : (media as HTMLImageElement).naturalWidth;
  const mediaHeight =
    contentType === ContentType.Video
      ? (media as HTMLVideoElement).videoHeight
      : (media as HTMLImageElement).naturalHeight;

  if (!mediaWidth || !mediaHeight) {
    return;
  }

  ctx.fillStyle = '#101310';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const scale = Math.max(CANVAS_SIZE / mediaWidth, CANVAS_SIZE / mediaHeight);
  const drawWidth = mediaWidth * scale;
  const drawHeight = mediaHeight * scale;

  ctx.drawImage(
    media,
    (CANVAS_SIZE - drawWidth) / 2,
    (CANVAS_SIZE - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}
