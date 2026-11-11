import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { AdShopWallProvider, type AdShopWallPreview } from "./AdShopWallContext";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { LedStudioApp, type LedStudioAppHandle } from "./LedStudioApp";
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

  useImperativeHandle(ref, () => ({ submit }), [submit]);

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label="Choreograph LED wall"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
      className="led-studio-root led-studio-modal fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-[#0c0e11] p-0 text-[#eef1ed] backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col overflow-hidden">
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
