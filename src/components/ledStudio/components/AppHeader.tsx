import { Grid2x2, Layers, Pause, Play, RotateCcw, Send, SlidersHorizontal, Square, Waypoints, X } from 'lucide-react';
import type { AdvertEngine } from '../engine/useAdvertEngine';
import type { SimulatorState } from '../types';
import { cn } from '../utils/cn';

export interface AppHeaderProps {
  engine: AdvertEngine;
  main: SimulatorState;
  sequencerOpen: boolean;
  poolOpen: boolean;
  onOpenSequencer: () => void;
  onTogglePool: () => void;
  onOpenDeck: () => void;
  onReset: () => void;
  /** Transmit the complete studio program, keeping the wall open. */
  onSubmitToFrontPage: () => void;
  /** SC2F — transmit and close to the front page in one click. */
  onSubmitAndClose: () => void;
  submitting?: boolean;
  submittedLabel?: string | null;
  /** Plain close — returns to the sequencer desk. */
  onCloseWall: () => void;
}

export function AppHeader({
  engine,
  main,
  sequencerOpen,
  poolOpen,
  onOpenSequencer,
  onTogglePool,
  onOpenDeck,
  onReset,
  onSubmitToFrontPage,
  onSubmitAndClose,
  submitting = false,
  submittedLabel,
  onCloseWall,
}: AppHeaderProps) {
  return (
    <header className="led-app-header relative z-30 h-14 shrink-0 flex items-center gap-3 px-4 border-b border-[#2c332a] bg-[#0b0e0b]/90 backdrop-blur">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-led-lime via-[#9fdc63] to-emerald-600 flex items-center justify-center shadow-[0_0_22px_rgba(203,243,107,0.35)] shrink-0">
          <Grid2x2 className="w-4 h-4 text-[#16210f]" />
        </div>
        <div className="leading-tight hidden sm:block min-w-0">
          <h1 className="font-led-display font-bold text-[13px] text-white tracking-tight truncate">
            Choreograph <span className="text-led-lime">LED Studio</span>
          </h1>
          <p className="text-[7.5px] font-mono text-[#7f8a7c] uppercase tracking-[0.22em] truncate">
            4×4 preview wall · sequenced advert layer
          </p>
        </div>
      </div>

      {/* layer stack */}
      <div className="hidden lg:flex items-center gap-1.5 ml-2">
        <span className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#3c4538] bg-[#131811] text-[8px] font-mono font-bold uppercase tracking-[0.14em] text-[#b6c2ae]">
          <span className="w-1.5 h-1.5 rounded-full bg-led-lime animate-pulse" />
          L1 main · {main.contentType === 'sample' ? 'sample campaign' : main.filename.slice(0, 16)}
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded border text-[8px] font-mono font-bold uppercase tracking-[0.14em]',
            engine.active
              ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
              : 'border-[#3c4538] bg-[#131811] text-[#93a08c]'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', engine.active ? 'bg-led-lime animate-pulse' : 'bg-[#6f7a69]')} />
          L2 advert · {engine.statusLabel.label}
        </span>
      </div>

      {/* global transport */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={engine.active ? engine.hold : engine.run}
          disabled={!engine.canRun}
          title={engine.active ? 'Hold the active controller' : engine.controllerMode === 'show' ? 'Run the choreography show' : 'Run the advert route'}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[9.5px] font-black uppercase tracking-[0.08em] transition-all cursor-pointer active:scale-95',
            engine.active && engine.playing
              ? 'bg-led-lime text-[#1d2a19] shadow-[0_0_18px_rgba(203,243,107,0.4)]'
              : 'bg-[#242d1f] text-led-lime border border-led-lime/30 hover:bg-[#2f3a27]',
            !engine.canRun && 'opacity-40 pointer-events-none'
          )}
        >
          {engine.active && engine.playing ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span className="hidden md:inline">
            {engine.active && engine.playing ? 'Hold' : engine.active ? 'Resume' : engine.controllerMode === 'show' ? 'Run show' : 'Run route'}
          </span>
        </button>
        <button
          type="button"
          onClick={engine.stop}
          disabled={!engine.active}
          title="Stop and clear the advert layer"
          className={cn(
            'p-1.5 rounded-md border border-[#34393a] text-[#8d9a86] hover:text-rose-300 hover:border-rose-500/50 transition-all cursor-pointer active:scale-95',
            !engine.active && 'opacity-30 pointer-events-none'
          )}
        >
          <Square className="w-3 h-3" />
        </button>

        <div className="w-px h-5 bg-[#2c332a] mx-1" />

        <button
          type="button"
          onClick={onOpenSequencer}
          title="Open the perimeter choreography and route controller"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer active:scale-95',
            sequencerOpen
              ? 'bg-violet-500/15 border-violet-500/50 text-violet-300'
              : 'border-[#34393a] text-[#bfc9b8] hover:text-violet-300 hover:border-violet-400/50'
          )}
        >
          <Waypoints className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Choreograph</span>
        </button>
        <button
          type="button"
          onClick={onTogglePool}
          title="Advert pool drawer"
          className={cn(
            'p-2 rounded-md border transition-all cursor-pointer',
            poolOpen
              ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
              : 'border-transparent text-[#8d9a86] hover:text-[#e8efe0] hover:bg-[#1b2418]'
          )}
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onOpenDeck}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-led-lime/90 hover:bg-led-lime text-[#1d2a19] text-[10px] font-black transition-all cursor-pointer active:scale-95 shadow-[0_0_18px_rgba(203,243,107,0.25)]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Advert deck</span>
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset studio"
          title="Reset setup"
          className="p-2 rounded-md border border-[#34393a] text-[#8d9a86] hover:text-rose-300 hover:border-rose-500/50 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-[#2c332a] mx-1" />

        {/* Submit bridge — the same code path as the header SC2F and the sequencer */}
        <button
          type="button"
          onClick={onSubmitToFrontPage}
          disabled={submitting}
          title={submittedLabel ? `Submit the complete studio program to the front page 4×4 (last: ${submittedLabel})` : 'Submit the complete studio program to the front page 4×4'}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/15 text-[9.5px] font-black uppercase tracking-[0.08em] text-emerald-200 hover:bg-emerald-500/25 hover:text-emerald-100 transition-all cursor-pointer active:scale-95',
            submitting && 'opacity-60 pointer-events-none'
          )}
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Submit to front page 4×4</span>
          <span className="md:hidden">Submit</span>
        </button>
        <button
          type="button"
          onClick={onSubmitAndClose}
          disabled={submitting}
          aria-label="Submit and close to front page"
          title="Submit and close to front page"
          className={cn(
            'flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer active:scale-95',
            submitting && 'opacity-60 pointer-events-none'
          )}
        >
          <Send className="w-3 h-3" />
          SC2F
        </button>
        <button
          type="button"
          onClick={onCloseWall}
          title="Close the wall and return to the sequencer desk (nothing is submitted)"
          aria-label="Close the LED wall and return to the sequencer"
          className="p-2 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-white hover:border-[#4b5a43] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
