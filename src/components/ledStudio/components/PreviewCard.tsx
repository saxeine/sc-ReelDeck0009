import { ReactNode, useRef } from 'react';
import { ContentType, MappingMode } from '../types';
import { calculateOverallDimensionMm, formatDimensionMm } from '../utils/canvasRenderer';
import { WallCanvas } from './WallCanvas';
import type { FrontPanelGridRegion } from '../../../types/frontPanelGrid';

interface PreviewCardProps {
  size: number;
  /** configure the live front page 4×4 geometry (same dialog as the Control Deck) */
  onConfigureGrid?: () => void;
  /** how many panels the front page grid configurator exposes */
  gridPanelCount?: number;
  gap: number;
  mode: MappingMode;
  outlines: boolean;
  playing: boolean;
  contentType: ContentType;
  mediaElement: HTMLImageElement | HTMLVideoElement | null;
  resetSignal: number;
  isControlCenterOpen: boolean;
  onToggleControlCenter: () => void;
  onShowToast: (message: string) => void;
  /** the second layer — advert cards sequenced over the physical panels */
  advertLayer?: ReactNode;
  /** the front page panel grid configurator output (L1 and L2 share the geometry) */
  regions?: FrontPanelGridRegion[] | null;
  /** uploaded video URL for L1 (null keeps the Live preview artwork) */
  mediaUrl?: string | null;
  /** transport strip that commands the advert layer */
  layerBar?: ReactNode;
}

export function PreviewCard({
  size,
  onConfigureGrid,
  gridPanelCount,
  gap,
  mode,
  outlines,
  playing,
  contentType,
  mediaElement,
  resetSignal,
  isControlCenterOpen,
  onToggleControlCenter,
  onShowToast,
  advertLayer,
  layerBar,
  regions = null,
  mediaUrl = null,
}: PreviewCardProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      const stageEl = stageRef.current;
      if (stageEl && stageEl.requestFullscreen) {
        stageEl.requestFullscreen().catch(() => {
          onShowToast('Fullscreen is not available here');
        });
      } else {
        onShowToast('Fullscreen is not available here');
      }
    } else {
      document.exitFullscreen().catch(() => {
        onShowToast('Fullscreen is not available here');
      });
    }
  };

  const handleControlToggleClick = () => {
    if (!isControlCenterOpen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onToggleControlCenter();
  };

  const fullDimension = formatDimensionMm(calculateOverallDimensionMm(size, gap));

  return (
    <section className="min-w-0 flex flex-col border border-led-border bg-led-card rounded-[8px] shadow-[0_16px_50px_#0006]">
      <div className="flex items-center justify-between py-[16px] px-[19px]">
        <div>
          <div className="flex items-center gap-[9px]">
            <div
              className="text-[8px] tracking-[1px] border border-[#3b4c32] text-[#b8de93] rounded-[3px] py-[4px] px-[6px]"
              title="Local show preview — submit (SC2F) to put it on AdShop; route edits are shared live"
            >
              <i className="status-dot w-[5px] h-[5px] mr-[3px] align-middle" />
              PREVIEW
            </div>
            <button
              type="button"
              onClick={handleControlToggleClick}
              aria-expanded={isControlCenterOpen}
              aria-label="Toggle control center"
              className={`border rounded-[4px] py-[5px] px-[8px] tracking-[1px] text-[9px] font-bold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2 ${
                isControlCenterOpen
                  ? 'bg-[#252d22] border-[#9cc97d] text-[#d3edae]'
                  : 'bg-[#161b18] border-[#2d3630] text-[#9aa69c] hover:border-[#9aac80] hover:text-[#d9e4c8]'
              }`}
            >
              ▦ &nbsp;4 × 4 PANELS
            </button>
            <span className="hidden sm:flex items-center gap-1 text-[8px] font-mono uppercase tracking-[0.16em] text-[#93a08c]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9cc97d]" />
              L1 main
            </span>
            {onConfigureGrid ? (
              <button
                type="button"
                onClick={onConfigureGrid}
                title="Open the front page panel grid configurator — the choreography resolves onto your configured panels"
                aria-label="Configure the front page panel grid"
                className="inline-flex items-center gap-1 rounded-[4px] border border-[#2d3630] bg-[#161b18] px-[8px] py-[5px] text-[8px] font-mono font-bold uppercase tracking-[0.14em] text-[#9aa69c] transition-colors hover:border-[#9aac80] hover:text-[#d9e4c8] cursor-pointer"
              >
                grid{typeof gridPanelCount === 'number' ? ` · ${gridPanelCount}` : ''}
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleFullscreen}
          title="Fullscreen"
          aria-label="Fullscreen preview"
          className="bg-[#1a1e1f] text-[#cbd1cb] border border-[#34393a] hover:border-[#9aac80] rounded-[6px] py-[3px] px-[8px] text-[19px] leading-[26px] cursor-pointer focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2"
        >
          ⛶
        </button>
      </div>

      {layerBar}

      <div
        ref={stageRef}
        id="stage"
        className="stage-backdrop mx-[15px] mb-[15px] border border-[#252b27] min-h-[480px] max-[1050px]:min-h-[420px] max-[760px]:min-h-[380px] max-[400px]:min-h-[320px] flex-1 relative flex items-center justify-center overflow-hidden"
      >
        <div className="w-[min(75%,470px)] max-[760px]:w-[min(75%,430px)] max-[400px]:w-[80%] aspect-square relative drop-shadow-[0_18px_20px_#0009]">
          <WallCanvas
            size={size}
            gap={gap}
            mode={mode}
            outlines={outlines}
            playing={playing}
            contentType={contentType}
            mediaElement={mediaElement}
            resetSignal={resetSignal}
            regions={regions}
            mediaUrl={mediaUrl}
          />
          {advertLayer}
        </div>

        <div className="absolute bottom-[15px] left-[17px] right-[17px] flex justify-between items-center text-[#757f77] tracking-[1px] text-[9px] font-bold z-[1] pointer-events-none">
          <span className="uppercase">L1 Live preview · L2 choreography · preview only</span>
          <span>
            {fullDimension} × {fullDimension} MM
          </span>
        </div>
      </div>
    </section>
  );
}
