import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Clapperboard, Pause, PencilRuler, Play, RotateCcw, Route, Send, Square, Waypoints, X } from 'lucide-react';
import type { AdvertEngine } from '../../engine/useAdvertEngine';
import { AdvertLayer } from './AdvertLayer';
import { SequenceControls, SeqSwitch } from './SequenceControls';
import { ChoreographyControls } from './ChoreographyControls';
import { ChoreographyTimeline } from './ChoreographyTimeline';
import { WallCanvas, type WallCanvasProps } from '../WallCanvas';
import { cn } from '../../utils/cn';
import type { FrontPanelGridRegion } from '../../../../types/frontPanelGrid';

export interface SequencerModalProps {
  engine: AdvertEngine;
  wall: WallCanvasProps;
  /** ✕ Close — plain close, returns to the sequencer desk (nothing submitted). */
  onClose: () => void;
  /**
   * The single submit bridge: LedStudioApp → SequencerModal → LedStudioModal.submit('all', …).
   * `closeAfter: true` is SC2F — submit *and* close to the front page.
   */
  onSubmitToFrontPage?: (options: { closeAfter: boolean }) => Promise<void>;
  submitting?: boolean;
  /** SC2F also dismisses the desk itself before the wall closes onto the front page. */
  onDeskClosed?: () => void;
  /**
   * The front page panel grid configurator output. The desk paints and auditions
   * on exactly the panels the front page will air (merged spans, disabled slots).
   */
  regions?: FrontPanelGridRegion[] | null;
  onConfigureGrid?: () => void;
}

/**
 * The sequencer gets its own desk: a live wall you draw straight onto, the
 * transport that runs the advert layer on command, and the full engine panel.
 */
export function SequencerModal({
  engine,
  wall,
  onClose,
  onSubmitToFrontPage,
  submitting = false,
  onDeskClosed = () => {},
  regions = null,
  onConfigureGrid,
}: SequencerModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (closeAfter: boolean) => {
      if (!onSubmitToFrontPage || submitting) return;
      setSubmitError(null);
      onSubmitToFrontPage({ closeAfter })
        .then(() => {
          // SC2F from the choreographer: the program now runs on the front page,
          // so this desk steps aside and the wall modal closes onto it (the app
          // closes the wall through `closeAfter`, this only drops the desk so the
          // two overlays never stack).
          if (closeAfter) onDeskClosed();
        })
        .catch((error: unknown) => {
          // The wall stays open and the failure is reported instead of closing.
          setSubmitError(error instanceof Error ? error.message : 'The front page 4×4 could not accept this program.');
        });
    },
    [onSubmitToFrontPage, onDeskClosed, submitting],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Route mode paints directly; show mode reserves pointer input for auditioning. */
  useEffect(() => {
    engine.setBoardPaintArmed(engine.controllerMode === 'route');
    return () => engine.setBoardPaintArmed(false);
  }, [engine.controllerMode, engine.setBoardPaintArmed]);

  const progress = engine.path.length
    ? (Math.min(engine.cursor + 1, engine.path.length) / engine.path.length) * 100
    : 0;
  const showMode = engine.controllerMode === 'show';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="led-desk-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-[#050805]/82 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="led-desk relative glass border border-[#333c30] rounded-xl w-[min(1280px,97vw)] h-[min(820px,94vh)] flex flex-col overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
      >
        {/* header */}
        <div className="led-desk-header h-14 shrink-0 flex items-center gap-3 px-4 border-b border-[#2c332a]">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-400 to-fuchsia-600 flex items-center justify-center shadow-[0_0_18px_rgba(139,92,246,0.4)]">
            {showMode ? (
              <Clapperboard className="w-3.5 h-3.5 text-[#140f22]" />
            ) : (
              <Waypoints className="w-3.5 h-3.5 text-[#140f22]" />
            )}
          </div>
          <div className="led-desk-title leading-tight">
            <h2 className="font-led-display font-bold text-[12.5px] text-white">
              {showMode ? 'Perimeter choreographer' : 'Route sequencer'}
            </h2>
            <p className="text-[8px] font-mono text-[#7f8a7c] uppercase tracking-[0.2em]">
              {showMode ? '16-panel show timeline · beat-locked formations' : 'L2 advert layer · drawn order · runs on command'}
            </p>
          </div>

          <div className="led-desk-mode ml-2 flex items-center rounded-md border border-[#353d32] bg-[#090d0a] p-0.5">
            <button
              type="button"
              onClick={() => engine.setControllerMode('show')}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-[8.5px] font-bold transition-all',
                showMode ? 'bg-violet-500/20 text-violet-200' : 'text-[#73806e] hover:text-white'
              )}
            >
              <Clapperboard className="h-3 w-3" /> Show
            </button>
            <button
              type="button"
              onClick={() => engine.setControllerMode('route')}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-[8.5px] font-bold transition-all',
                !showMode ? 'bg-cyan-500/20 text-cyan-200' : 'text-[#73806e] hover:text-white'
              )}
            >
              <Route className="h-3 w-3" /> Route
            </button>
          </div>

          <span
            className={cn(
              'led-desk-status ml-2 px-2 py-1 rounded border text-[8px] font-mono font-black uppercase tracking-[0.16em]',
              engine.statusLabel.tone === 'air'
                ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                : engine.statusLabel.tone === 'paused'
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                  : engine.statusLabel.tone === 'done'
                    ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                    : 'border-[#3c4538] text-[#93a08c]'
            )}
          >
            {engine.statusLabel.label}
          </span>

          <div className="led-desk-actions ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={engine.active ? engine.hold : engine.run}
              disabled={!engine.canRun}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.08em] transition-all cursor-pointer active:scale-95',
                engine.active && engine.playing
                  ? 'bg-led-lime text-[#1d2a19] shadow-[0_0_18px_rgba(203,243,107,0.4)]'
                  : 'bg-[#252d20] text-led-lime border border-led-lime/30 hover:bg-[#2f3a27]',
                !engine.canRun && 'opacity-40 pointer-events-none'
              )}
            >
              {engine.active && engine.playing ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {engine.active && engine.playing ? 'Hold' : engine.active ? 'Resume' : showMode ? 'Run show' : 'Run route'}
            </button>
            {onConfigureGrid && <button type="button" onClick={onConfigureGrid} title="Configure the shared AdShop panel arrangement"
              className="led-desk-panels rounded-md border border-[#34393a] px-2.5 py-1.5 text-[10px] font-bold text-[#bfc9b8] hover:text-white">Panels</button>}
            <button
              type="button"
              onClick={onClose}
              title="Close the choreographer and return to the sequencer desk — nothing is submitted"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#34393a] text-[10px] font-bold text-[#bfc9b8] hover:text-white hover:border-[#4b5a43] transition-all cursor-pointer active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting || !onSubmitToFrontPage}
              aria-label="Submit and close to front page"
              title="Submit and close to front page"
              className={cn(
                'flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer active:scale-95',
                submitting && 'opacity-60 pointer-events-none'
              )}
            >
              <Send className="w-3 h-3" />
              SC2F
            </button>
            <button
              type="button"
              onClick={engine.stop}
              disabled={!engine.active}
              title="Clear the advert layer"
              className={cn(
                'p-2 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-rose-300 hover:border-rose-500/50 transition-all cursor-pointer',
                !engine.active && 'opacity-30 pointer-events-none'
              )}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the desk back to the wall studio"
              title="Close the desk back to the wall studio"
              className="p-2 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-white hover:border-[#4b5a43] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {submitError ? (
          <div
            role="alert"
            className="shrink-0 flex items-start gap-2 border-b border-rose-500/40 bg-rose-950/60 px-4 py-2 text-[10px] font-semibold text-rose-200"
          >
            <span className="font-black uppercase tracking-[0.14em]">SC2F failed</span>
            <span className="min-w-0 flex-1 break-words">{submitError}</span>
            <span className="shrink-0 text-rose-300/80">the wall is still open</span>
          </div>
        ) : null}

        <div className="led-desk-body flex-1 flex min-h-0">
          {/* live wall */}
          <div className="led-desk-stage flex-1 min-w-0 flex flex-col p-4 gap-3 overflow-y-auto">
            <div className="led-desk-stage-caption flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-led-lime animate-pulse" />
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a8b5a0]">
                {showMode ? 'Live choreography desk · L1 + L2' : 'Live route desk · L1 + L2'}
              </span>
              <span className="text-[8.5px] font-mono text-[#6f7a69]">
                {showMode ? 'submit to show this on AdShop' : 'route edits are shared with AdShop'}
              </span>
              {showMode ? (
                <span className="ml-auto rounded border border-violet-400/30 bg-violet-400/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-violet-200">
                  {engine.choreography.bpm} BPM · {engine.choreography.timeScale.toFixed(2)}× · {engine.choreography.cues.length} scenes
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="text-[8.5px] font-mono text-[#7f8a7c]">paint</span>
                  <SeqSwitch label="Draw on the LED wall"
                    checked={engine.boardPaintArmed}
                    onChange={(v) => engine.setBoardPaintArmed(v)}
                    accent="violet"
                  />
                </span>
              )}
            </div>

            <div className="led-desk-wall-wrap flex-1 min-h-0 flex items-center justify-center">
              <div className="relative aspect-square w-full max-w-[470px] max-h-full rounded-lg border border-[#333c30] bg-[#070b07] overflow-hidden shadow-[0_24px_60px_#0008]">
                <WallCanvas {...wall} regions={regions} />
                <AdvertLayer
                  engine={engine}
                  size={wall.size}
                  gap={wall.gap}
                  onInspect={(slot) => engine.setSelectedSlot(slot)}
                  onOpenLink={(url, target) =>
                    window.open(url, target === '_self' ? '_self' : '_blank')
                  }
                  previewChoreography={showMode}
                  showRoute={!showMode}
                  showSteps={!showMode}
                  regions={regions}
                />
              </div>
            </div>

            {/* transport / show timeline under the wall */}
            {showMode ? (
              <ChoreographyTimeline engine={engine} />
            ) : (
              <div className="rounded-lg border border-[#333c30] bg-[#11160f] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-led-display font-bold text-[11.5px] text-[#e8efe0]">
                    {engine.active
                      ? engine.leaderSlot
                        ? `Advert live · panel ${String(engine.leaderSlot).padStart(2, '0')}`
                        : 'Advert live'
                      : 'Layer on standby'}
                  </span>
                  <span className="font-mono text-[8.5px] text-[#7f8a7c]">
                    {engine.path.length ? `${Math.min(engine.cursor + 1, engine.path.length)}/${engine.path.length}` : '0/0'} steps
                    {' · '}
                    {engine.revealed.length} on wall
                  </span>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={engine.rewind}
                    title="Rewind to the first step"
                    className="p-1.5 rounded-md border border-[#34393a] text-[#8d9a86] hover:text-led-lime hover:border-led-lime/40 transition-all cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => engine.setBoardPaintArmed(!engine.boardPaintArmed)}
                    title="Toggle path painting on the wall"
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-bold transition-all cursor-pointer active:scale-95',
                      engine.boardPaintArmed
                        ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-300'
                        : 'border-[#34393a] text-[#9aa69c] hover:text-[#e8efe0]'
                    )}
                  >
                    <PencilRuler className="w-3 h-3" />
                    {engine.paintTool === 'erase' ? 'Erase' : 'Paint'}
                  </button>
                </div>
                <div className="mt-1.5 h-[3px] rounded-full bg-[#26301f] overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-led-lime to-cyan-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* engine panel */}
          <div className={cn('led-desk-controls shrink-0 border-l border-[#2c332a] p-3 overflow-y-auto', showMode ? 'w-[390px]' : 'w-[350px]')}>
            {showMode ? <ChoreographyControls engine={engine} /> : <SequenceControls engine={engine} />}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
