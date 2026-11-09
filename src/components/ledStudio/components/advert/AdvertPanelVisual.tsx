import { ImageOff } from 'lucide-react';
import type { AdvertPanel } from '../../types';
import { spreadBackground } from '../../utils/spread';
import { cn } from '../../utils/cn';

/**
 * Pure renderer for one advert panel's visual content:
 * stepped frame > spread slice > still image > slot placeholder.
 */
export function AdvertPanelVisual({
  panel,
  frame,
  slot,
  className,
  hovered = false,
}: {
  panel: AdvertPanel;
  /** frame handed over by the sequencer, overrides the panel's own content */
  frame?: string | null;
  slot?: number;
  className?: string;
  hovered?: boolean;
}) {
  const hoverImage =
    hovered && panel.link.hoverEffect === 'change-image' && panel.link.hoverImage
      ? panel.link.hoverImage
      : null;
  const zoom = hovered && panel.link.hoverEffect === 'zoom';
  const tintOpacity = Math.min(0.75, Math.max(0, panel.style.tintAmount ?? 0));

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {frame ? (
        <img
          src={hoverImage ?? frame}
          alt=""
          draggable={false}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-transform duration-500',
            zoom && 'scale-110'
          )}
        />
      ) : panel.spread ? (
        <div
          className={cn('absolute inset-0 transition-transform duration-500', zoom && 'scale-110')}
          style={spreadBackground(panel.spread)}
        />
      ) : panel.image ? (
        <img
          src={hoverImage ?? panel.image}
          alt=""
          draggable={false}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-transform duration-500',
            zoom && 'scale-110'
          )}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#171d16] via-[#0e1310] to-[#171d16]">
          <div className="absolute inset-1.5 rounded-md border border-dashed border-[#39432f] flex flex-col items-center justify-center gap-0.5">
            {slot !== undefined && (
              <span className="font-led-display font-bold text-[15px] text-[#4c5a3e] select-none">
                {String(slot).padStart(2, '0')}
              </span>
            )}
            <span className="flex items-center gap-1 text-[7px] font-mono uppercase tracking-[0.18em] text-[#4b5745]">
              <ImageOff className="w-2 h-2" /> empty
            </span>
          </div>
        </div>
      )}

      {tintOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: panel.style.tint ?? '#0f172a', opacity: tintOpacity }}
        />
      )}
    </div>
  );
}
