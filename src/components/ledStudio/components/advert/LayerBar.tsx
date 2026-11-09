import { Activity, Clapperboard, Footprints, Layers, Pause, Play, RotateCcw, Sparkles, Square, Zap } from 'lucide-react';
import type { SeqBehavior } from '../../types';
import type { AdvertEngine } from '../../engine/useAdvertEngine';
import { cn } from '../../utils/cn';

const BEHAVIOURS: Array<{ id: SeqBehavior; label: string; icon: React.ElementType }> = [
  { id: 'flash', label: 'Flash', icon: Zap },
  { id: 'reveal', label: 'Reveal', icon: Sparkles },
  { id: 'step', label: 'Step', icon: Footprints },
  { id: 'spin', label: 'Spin', icon: RotateCcw },
  { id: 'pulse', label: 'Pulse', icon: Activity },
];

const TONE: Record<string, string> = {
  standby: 'border-[#3c4538] bg-black/40 text-[#93a08c]',
  air: 'border-led-lime/60 bg-led-lime/15 text-led-lime shadow-[0_0_18px_rgba(203,243,107,0.25)]',
  paused: 'border-amber-400/60 bg-amber-400/15 text-amber-300',
  done: 'border-cyan-400/60 bg-cyan-400/15 text-cyan-300',
};

/**
 * The "run on command" strip — the physical wall stays on main content until
 * the advert layer is commanded to take over.
 */
export function LayerBar({ engine }: { engine: AdvertEngine }) {
  const tone = engine.statusLabel.tone;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[#262d24] bg-[#0f1310]/70">
      <span
        className={cn(
          'flex items-center gap-1.5 px-2 py-[3px] rounded border text-[8px] font-mono font-black uppercase tracking-[0.16em]',
          TONE[tone]
        )}
      >
        <Layers className="w-2.5 h-2.5" />
        L2 advert · {engine.statusLabel.label}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={engine.active ? engine.hold : engine.run}
          disabled={!engine.canRun}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9.5px] font-black uppercase tracking-[0.08em] transition-all cursor-pointer active:scale-95',
            engine.active && engine.playing
              ? 'bg-led-lime text-[#1d2a19] shadow-[0_0_18px_rgba(203,243,107,0.4)]'
              : 'bg-[#252d20] text-led-lime border border-led-lime/30 hover:bg-[#2f3a27]',
            !engine.canRun && 'opacity-40 pointer-events-none'
          )}
        >
          {engine.active && engine.playing ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          {engine.active && engine.playing ? 'Hold' : engine.active ? 'Resume' : engine.controllerMode === 'show' ? 'Run show' : 'Run route'}
        </button>
        <button
          type="button"
          onClick={engine.stop}
          disabled={!engine.active}
          title="Clear the advert layer"
          className={cn(
            'p-1.5 rounded-md border border-[#34393a] text-[#8d9a86] hover:text-rose-300 hover:border-rose-500/50 transition-all cursor-pointer active:scale-95',
            !engine.active && 'opacity-30 pointer-events-none'
          )}
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={engine.rewind}
          disabled={!engine.canRun}
          title="Rewind the sequence"
          className={cn(
            'p-1.5 rounded-md border border-[#34393a] text-[#8d9a86] hover:text-led-lime hover:border-led-lime/40 transition-all cursor-pointer active:scale-95',
            !engine.canRun && 'opacity-30 pointer-events-none'
          )}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {engine.controllerMode === 'show' ? (
        <span className="flex items-center gap-1.5 font-mono text-[9px] text-violet-200">
          <Clapperboard className="h-3 w-3" />
          {engine.choreography.currentCue?.name ?? 'No scene'} · {engine.choreography.bpm} BPM ·{' '}
          {engine.choreography.timeScale.toFixed(2)}× · {engine.revealed.length} panels
        </span>
      ) : (
        <>
          <span className="font-mono text-[9px] text-[#8d9a86]">
            {engine.revealed.length}/{engine.path.length || 0} panels
            {engine.leaderSlot ? ` · lead S${String(engine.leaderSlot).padStart(2, '0')}` : ''}
          </span>

          <div className="flex items-center gap-[3px] ml-1">
            {BEHAVIOURS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => engine.setBehavior(b.id)}
                title={`Turn behaviour — ${b.label}`}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-[3px] rounded border text-[8.5px] font-bold transition-all cursor-pointer active:scale-95',
                  engine.behavior === b.id
                    ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-300'
                    : 'border-[#333c30] text-[#7f8a7c] hover:text-[#dce3d9]'
                )}
              >
                <b.icon className="w-2.5 h-2.5" />
                {b.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          onClick={() => engine.setLayerMode(engine.layer.mode === 'tiles' ? 'spotlight' : 'tiles')}
          title="Toggle full-layer vs spotlight coverage"
          className={cn(
            'px-1.5 py-[3px] rounded border text-[8.5px] font-bold transition-all cursor-pointer active:scale-95',
            engine.layer.mode === 'spotlight'
              ? 'border-violet-400/60 bg-violet-400/15 text-violet-300'
              : 'border-[#333c30] text-[#7f8a7c] hover:text-[#dce3d9]'
          )}
        >
          {engine.layer.mode === 'spotlight' ? 'spotlight' : 'full layer'}
        </button>
        <label className="flex items-center gap-1 text-[8.5px] font-mono text-[#7f8a7c]">
          opa
          <input
            type="range"
            min={0.15}
            max={1}
            step={0.01}
            value={engine.layer.opacity}
            onChange={(e) => engine.setLayer({ opacity: Number(e.target.value) })}
            className="w-14 h-1 cursor-pointer"
          />
          <span className="text-[#bfc9b8] w-6 text-right">
            {Math.round(engine.layer.opacity * 100)}%
          </span>
        </label>
      </div>
    </div>
  );
}
