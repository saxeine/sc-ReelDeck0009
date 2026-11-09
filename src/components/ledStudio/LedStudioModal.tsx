import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { AdShopWallProvider, type AdShopWallPreview } from "./AdShopWallContext";
import { createPortal } from "react-dom";
import { AlertTriangle, Pause, Play, Send, Square, Waypoints, X } from "lucide-react";
import { LedStudioApp, type LedStudioAppHandle } from "./LedStudioApp";
import { cn } from "./utils/cn";
import {
  describeLedStudioProgram,
  type LedStudioProgram,
  type LedStudioRouteConfig,
  type LedStudioSubmitOptions,
  type LedStudioSubmitScope,
} from "./integration";
import type { AdvertAsset, ControllerMode, ToastKind } from "./types";

/**
 * The LED wall modal.
 *
 * The 4×4 inside is the studio's **preview** only. Submitting transmits the
 * complete program to SeqCarver's main front page 4×4 through one bridge:
 *
 *     LedStudioModal.submit('all', { closeAfter })
 *       → LedStudioApp.buildProgram()
 *       → props.onSubmitToFrontPage(program)      // application apply step
 *       → close only when accepted (SC2F)
 *
 * A rejected submit keeps the wall open and reports the error; the same bridge
 * powers the header's *Submit to front page 4×4* (which stays open).
 */
export interface LedStudioModalHandle {
  submit: (scope?: LedStudioSubmitScope, options?: LedStudioSubmitOptions) => Promise<void>;
}

/** Live transport state of the audition desk, mirrored into the wall chrome. */
export interface LedDeskTransport {
  active: boolean;
  playing: boolean;
  canRun: boolean;
  label: string;
}

export interface LedStudioModalProps {
  isOpen: boolean;
  /** Plain close — returns to the sequencer desk. Nothing is submitted. */
  onClose: () => void;
  /** SC2F target — close the wall and land on the front page. */
  onCloseToFrontPage: () => void;
  /** Application side of the bridge (mutating + persisting the front page state). */
  onSubmitToFrontPage: (program: LedStudioProgram) => Promise<void>;
  /** SeqCarver's live sequencer route — the single source of truth. */
  route?: LedStudioRouteConfig;
  onRouteChange?: (patch: Pick<LedStudioRouteConfig, "path" | "wrapMode" | "turnMode" | "stepIntervalMs" | "behavior">) => void;
  panelCount?: number;
  lastProgram?: LedStudioProgram | null;
  onNotify?: (text: string, kind?: ToastKind) => void;
  /** Panels the front page grid configurator currently exposes. */
  gridRegionCount?: number;
  /**
   * Open the front page's panel grid configurator. The wall previews on the same
   * geometry the front page uses, and SC2F transmits the layout with the program.
   */
  onOpenGridConfigurator?: () => void;
  gridConfigurator?: ReactNode;
  wallPreview: AdShopWallPreview;
  initialAssets?: AdvertAsset[];
  initialDesk?: boolean;
  initialMode?: ControllerMode;
  secondaryImages?: Record<number, string>;
}

export const LedStudioModal = forwardRef<LedStudioModalHandle, LedStudioModalProps>(function LedStudioModal(
  {
    isOpen,
    onClose,
    onCloseToFrontPage,
    onSubmitToFrontPage,
    route,
    onRouteChange,
    panelCount,
    lastProgram,
    onNotify,
    gridRegionCount,
    onOpenGridConfigurator,
    gridConfigurator, wallPreview, initialAssets, initialDesk, initialMode, secondaryImages,
  },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const appRef = useRef<LedStudioAppHandle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [transport, setTransport] = useState<LedDeskTransport>({ active: false, playing: false, canRun: false, label: "standby" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  const submit = useCallback(
    async (scope: LedStudioSubmitScope = "all", options: LedStudioSubmitOptions = {}) => {
      if (scope !== "all") {
        throw new Error("Only the complete studio program can be submitted to the front page 4×4.");
      }
      const app = appRef.current;
      if (!app) throw new Error("The LED studio is still loading — try again in a moment.");
      setSubmitting(true);
      setSubmitError(null);
      try {
        const program = await app.buildProgram();
        await onSubmitToFrontPage(program);
        setAcceptedAt(new Date(program.submittedAt).toLocaleTimeString());
        onNotify?.(`Submitted to the front page 4×4 — ${describeLedStudioProgram(program)}`, "success");
        // SC2F: submit *and* close to the front page. A failure above never closes.
        if (options.closeAfter) onCloseToFrontPage();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "The front page 4×4 did not accept the studio program.";
        setSubmitError(message);
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [onCloseToFrontPage, onSubmitToFrontPage, onNotify],
  );

  /** ▶ Run show / ■ Stop — the studio desk transport, driven from the wall chrome. */
  const handleRunShow = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const state = app.transportState();
    if (state.active && state.playing) app.hold();
    else app.run();
  }, []);

  const handleStopShow = useCallback(() => {
    appRef.current?.stop();
  }, []);

  useImperativeHandle(ref, () => ({ submit }), [submit]);

  const handleSubmitKeepingOpen = useCallback(() => {
    submit("all", { closeAfter: false }).catch(() => {
      /* surfaced by the error strip + toast */
    });
  }, [submit]);

  const handleSubmitAndClose = useCallback(() => {
    submit("all", { closeAfter: true }).catch(() => {
      /* surfaced by the error strip + toast */
    });
  }, [submit]);

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="led-studio-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
      className="led-studio-root led-studio-modal fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-[#0c0e11] p-0 text-[#eef1ed] backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* chrome */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#2c332a] bg-[#0b0e0b]/95 px-4 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-led-lime via-[#9fdc63] to-emerald-600 shadow-[0_0_18px_rgba(203,243,107,0.35)]">
            <Waypoints className="h-3.5 w-3.5 text-[#16210f]" />
          </div>
          <div className="min-w-0 leading-tight">
            <h2 id="led-studio-modal-title" className="font-led-display text-[12.5px] font-bold text-white">
              Choreograph LED wall
            </h2>
            <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#7f8a7c]">
              4×4 preview · submits to AdShop
            </p>
          </div>

          <p role="status" aria-live="polite" className="ml-3 min-w-0 flex-1 truncate text-[9px] font-mono text-[#8d9a86]">
            {submitting
              ? "Baking artwork and submitting the complete studio program…"
              : submitError
                ? "Submit failed — the wall stayed open, fix it and try again."
                : acceptedAt
                  ? `Last accepted by the front page at ${acceptedAt}.`
                  : "Show and panel artwork stay local until submitted; route edits are shared live."}
          </p>

          {/* ▶ Run show · ✕ Close · ➤ SC2F · ■ — the wall's own transport. The
              header of this modal never submits on close unless asked to. */}
          <button
            type="button"
            onClick={handleRunShow}
            disabled={submitting || (!transport.canRun && !transport.active)}
            aria-label={transport.active && transport.playing ? "Hold the show clock" : "Run the show"}
            aria-pressed={transport.active && transport.playing}
            title={
              transport.active && transport.playing
                ? "Hold the show clock (audition only)"
                : "Run show — start the audition clock on the 4×4 preview"
            }
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-[0.08em] transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
              transport.active && transport.playing
                ? "border-led-lime/70 bg-led-lime/20 text-led-lime"
                : "border-led-lime/40 bg-[#242d1f] text-led-lime hover:bg-[#2f3a27]",
            )}
          >
            {transport.active && transport.playing ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {transport.active && transport.playing ? "Hold" : "Run show"}
          </button>

          <button
            type="button"
            onClick={handleSubmitKeepingOpen}
            disabled={submitting}
            title="Submit the complete studio program to the front page 4×4 and keep the wall open"
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-emerald-200 transition-all hover:bg-emerald-500/25 hover:text-emerald-100 active:scale-95 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            <Send className="h-3.5 w-3.5" />
            Submit to front page 4×4
          </button>
          <button
            type="button"
            onClick={handleSubmitAndClose}
            disabled={submitting}
            aria-label="Submit and close to front page"
            title="Submit and close to front page"
            className="flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            <Send className="h-3 w-3" />
            SC2F
          </button>
          <button
            type="button"
            onClick={handleStopShow}
            disabled={submitting || !transport.active}
            aria-label="Stop the show and clear the preview"
            title="Stop — clear the advert layer off the 4×4 preview"
            className="rounded-md border border-[#34393a] p-2 text-[#9aa69c] transition-all hover:border-rose-500/50 hover:text-rose-300 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close the LED wall and return to the sequencer desk"
            title="Close the wall (returns to the sequencer desk — nothing is submitted)"
            className="rounded-md border border-[#34393a] p-2 text-[#9aa69c] transition-all hover:border-[#4b5a43] hover:text-white cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitError ? (
          <div
            role="alert"
            className="flex shrink-0 items-start gap-2 border-b border-rose-500/40 bg-rose-950/60 px-4 py-2 text-[11px] font-semibold text-rose-200"
          >
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            <span className="font-black uppercase tracking-[0.14em]">SC2F failed</span>
            <span className="min-w-0 flex-1 break-words">{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="shrink-0 cursor-pointer rounded border border-rose-400/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-200 hover:bg-rose-500/20"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <AdShopWallProvider value={wallPreview}><LedStudioApp
            ref={appRef}
            onClose={onClose}
            onSubmitToFrontPage={(options) => submit("all", options)}
            route={route}
            onRouteChange={onRouteChange}
            panelCount={panelCount}
            submitting={submitting}
            submitError={null}
            lastProgram={lastProgram}
            onNotify={onNotify}
            gridRegionCount={gridRegionCount}
            onOpenGridConfigurator={onOpenGridConfigurator}
            onTransportChange={setTransport}
            initialAssets={initialAssets}
            initialDesk={initialDesk} initialMode={initialMode} secondaryImages={secondaryImages}
          /></AdShopWallProvider>
        </div>
        {gridConfigurator}
      </div>
    </dialog>,
    document.body,
  );
});

export default LedStudioModal;
