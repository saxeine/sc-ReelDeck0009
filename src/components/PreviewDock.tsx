import { cn } from "../utils/cn";
import { Icon } from "./Icon";
import { Btn, IconBtn } from "./ui";

/**
 * Always-on live preview of the rendered contact sheet.
 * Collapses to a slim strip but never disappears from the workspace.
 */
export function PreviewDock({
  preview,
  width,
  height,
  frames,
  themeLabel,
  rendering,
  renderMs,
  collapsed,
  locked,
  onToggle,
  onOpenSheet,
  onExport,
  onCopy,
  onHandoff,
}: {
  preview: string | null;
  width: number;
  height: number;
  frames: number;
  themeLabel: string;
  rendering: boolean;
  renderMs: number;
  collapsed: boolean;
  /** the sheet tab already shows the big preview — the dock stays slim there */
  locked: boolean;
  onToggle: () => void;
  onOpenSheet: () => void;
  onExport: () => void;
  onCopy: () => void;
  onHandoff: () => void;
}) {
  const slim = collapsed || locked;

  return (
    <section
      aria-label="Live contact sheet preview"
      className={cn(
        "relative z-20 flex shrink-0 items-stretch gap-3 overflow-hidden border-t border-line bg-ink-900/92 px-3 backdrop-blur transition-[height] duration-300",
        slim ? "h-[52px]" : "h-[188px]"
      )}
    >
      {/* thumbnail */}
      <button
        type="button"
        onClick={onOpenSheet}
        title="Open the contact sheet"
        className={cn(
          "group relative my-auto shrink-0 overflow-hidden rounded-[4px] border border-line bg-ink-950 transition-colors hover:border-amber/70",
          slim ? "h-9 w-[64px]" : "h-[152px] w-auto max-w-[420px] min-w-[120px]"
        )}
      >
        {preview ? (
          <img
            src={preview}
            alt="Live contact sheet"
            className="block h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-2 font-mono text-[9px] text-dim">
            {rendering ? "RENDERING" : "NO SHEET"}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink-950/70 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-full border border-amber/60 bg-ink-900/95 px-2 py-[3px] text-[10px] font-semibold text-amber">
            <Icon name="expand" size={11} /> Open
          </span>
        </span>
      </button>

      {/* meta */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-danger rec" />
            <span className="tk text-bone">Live preview</span>
          </span>
          <span
            className={cn(
              "rounded border px-1.5 py-[1px] font-mono text-[9px]",
              rendering
                ? "border-amber/40 bg-amber/10 text-amber"
                : "border-line bg-ink-850 text-lime"
            )}
          >
            {rendering ? "RENDERING…" : `${renderMs}MS`}
          </span>
          {!slim && (
            <span className="hidden truncate font-mono text-[9px] text-dim sm:inline">
              {themeLabel.toUpperCase()} · {width}×{height}PX · {frames} FR
            </span>
          )}
        </div>

        {!slim && (
          <p className="max-w-[52ch] truncate text-[11px] leading-snug text-mute">
            The sheet re-renders as you edit frames, captions and look controls — this preview always
            tracks the file you would export.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Btn size="xs" icon="sheet" variant={slim ? "ghost" : "outline"} onClick={onOpenSheet}>
            Open sheet
          </Btn>
          <Btn size="xs" icon="download" onClick={onExport}>
            PNG
          </Btn>
          {!slim && (
            <>
              <Btn size="xs" icon="copy" onClick={onCopy}>
                Copy
              </Btn>
              <Btn size="xs" icon="send" variant="cool" onClick={onHandoff}>
                Hand off
              </Btn>
            </>
          )}
          {!slim && (
            <span className="ml-auto font-mono text-[9px] text-dim">
              {frames} FRAME{frames === 1 ? "" : "S"} IN SCOPE
            </span>
          )}
        </div>
      </div>

      {!locked && (
        <IconBtn
          icon={collapsed ? "up" : "down"}
          label={collapsed ? "Expand preview" : "Collapse preview"}
          onClick={onToggle}
          className="my-auto"
        />
      )}
    </section>
  );
}
