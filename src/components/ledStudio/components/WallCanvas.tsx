import { ContentType, MappingMode } from '../types';
import type { FrontPanelGridRegion } from '../../../types/frontPanelGrid';
import { MainImageLayer } from './MainImageLayer';

export interface WallCanvasProps {
  size: number;
  gap: number;
  mode: MappingMode;
  outlines: boolean;
  playing: boolean;
  contentType: ContentType;
  mediaElement: HTMLImageElement | HTMLVideoElement | null;
  resetSignal: number;
  /**
   * The front page panel grid configurator output. When present the campaign is
   * painted on exactly the panels the front page will show (merged spans
   * included, disabled panels suppressed).
   */
  regions?: FrontPanelGridRegion[] | null;
  /** Uploaded video URL (L1 plays it behind the panel crops). */
  mediaUrl?: string | null;
}

/**
 * The live L1 renderer — the campaign image across the 4×4 wall.
 *
 * It used to be a `<canvas>` that drew a bundled sample campaign. It is now the
 * shared `MainImageLayer`, which paints the Control Deck's **Live preview**
 * (artwork + colour treatment + stretch + pan) on the same panel geometry the
 * front page uses. That makes the choreographer's live image and the Live
 * preview the same image, and it means a submitted show always composites on top
 * of the campaign instead of replacing it.
 *
 * The prop shape is unchanged so every call site (main stage, advert deck,
 * choreographer's stage) keeps working.
 */
export function WallCanvas({
  size,
  gap,
  outlines,
  contentType,
  mediaElement,
  regions = null,
  mediaUrl = null,
}: WallCanvasProps) {
  const ratio = gap / Math.max(1, size);
  // Uploaded content replaces the Live preview artwork; the Sample content type
  // deliberately shows the Live preview itself, so the choreographer's wall and
  // the Control Deck are the same image.
  const mediaSrc = typeof mediaElement?.src === "string" ? mediaElement.src : null;
  const stillUrl = contentType === ContentType.Image ? mediaSrc ?? null : null;
  const videoUrl = contentType === ContentType.Video ? mediaUrl ?? mediaSrc : null;

  return (
    <MainImageLayer
      cols={4}
      gapRatio={ratio}
      regions={regions}
      outlines={outlines}
      artwork={stillUrl ?? undefined}
      videoSrc={videoUrl}
      label="Simulated 4 by 4 LED wall"
    />
  );
}
