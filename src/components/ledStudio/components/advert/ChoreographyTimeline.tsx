import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Square } from 'lucide-react';
import type { AdvertEngine } from '../../engine/useAdvertEngine';
import { cn } from '../../utils/cn';

function timecode(ms: number): string {
  const totalTenths = Math.max(0, Math.floor(ms / 100));
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function ChoreographyTimeline({ engine }: { engine: AdvertEngine }) {
  const show = engine.choreography;
  const progress = show.totalDurationMs ? (show.playheadMs / show.totalDurationMs) * 100 : 0;

  return (
    <div className="rounded-lg border border-[#333c30] bg-[#0d120e] p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={engine.active ? engine.hold : engine.run}
          disabled={!engine.canRun}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[9px] font-black uppercase tracking-[0.08em] transition-all',
            engine.active && engine.playing
              ? 'bg-led-lime text-[#17220f]'
              : 'border border-led-lime/30 bg-[#242d1f] text-led-lime',
            !engine.canRun && 'pointer-events-none opacity-35'
          )}
        >
          {engine.active && engine.playing ? (
            <Pause className="h-3 w-3 fill-current" />
          ) : (
            <Play className="h-3 w-3 fill-current" />
          )}
          {engine.active && engine.playing ? 'Hold' : engine.active ? 'Resume' : 'Run show'}
        </button>
        <button
          type="button"
          onClick={engine.stop}
          disabled={!engine.active}
          title="Stop and clear show"
          className="grid h-7 w-7 place-items-center rounded-md border border-[#34393a] text-[#8d9a86] hover:text-rose-300 disabled:opacity-30"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={engine.rewind}
          title="Rewind show"
          className="grid h-7 w-7 place-items-center rounded-md border border-[#34393a] text-[#8d9a86] hover:text-led-lime"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        <span className="ml-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#667060]">
          SMPTE preview · {show.timeScale.toFixed(2)}×
        </span>
        <span className="ml-auto font-mono text-[9px] font-bold text-cyan-200">
          {timecode(show.playheadMs)} <span className="text-[#596454]">/ {timecode(show.totalDurationMs)}</span>
        </span>
      </div>

      <div className="relative flex h-12 gap-1 overflow-hidden rounded-md bg-[#080b09] p-1">
        {show.cues.length === 0 ? (
          <div className="grid flex-1 place-items-center text-[8.5px] text-[#596454]">Add a scene to build the show.</div>
        ) : (
          show.cues.map((cue, index) => {
            const selected = cue.id === show.selectedCueId;
            const live = engine.active && index === show.cueIndex;
            return (
              <button
                key={cue.id}
                type="button"
                onClick={() => {
                  show.selectCue(cue.id);
                  if (engine.active) show.jumpToCue(index);
                }}
                className={cn(
                  'relative min-w-[48px] overflow-hidden rounded border px-1.5 text-left transition-colors',
                  live
                    ? 'border-led-lime/70 bg-led-lime/15 text-led-lime'
                    : selected
                      ? 'border-violet-400/60 bg-violet-400/15 text-violet-200'
                      : 'border-[#333c30] bg-[#141a13] text-[#7f8a7c] hover:border-[#4b5748]'
                )}
                style={{ flexGrow: cue.durationBeats, flexBasis: 0 }}
              >
                <span className="block truncate text-[8.5px] font-bold">{cue.name}</span>
                <span className="mt-0.5 block font-mono text-[6.8px] uppercase tracking-[0.12em] opacity-60">
                  {cue.durationBeats}b · {cue.formation}
                </span>
                <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: cue.accent }} />
              </button>
            );
          })
        )}

        {engine.active && (
          <motion.div
            className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-white shadow-[0_0_8px_white]"
            animate={{ left: `calc(4px + (100% - 8px) * ${Math.min(100, progress) / 100})` }}
            transition={{ duration: 0.08, ease: 'linear' }}
          >
            <span className="absolute -left-[3px] top-0 h-1.5 w-1.5 rotate-45 bg-white" />
          </motion.div>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => show.jumpToCue(show.cueIndex - 1)}
          disabled={show.cueIndex <= 0}
          className="rounded p-1 text-[#71806d] hover:text-white disabled:opacity-25"
          title="Previous scene"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="min-w-0 flex-1 truncate text-[8.5px] text-[#71806d]">
          {show.currentCue ? `${show.currentCue.name} · ${show.currentCue.motion} · ${show.currentCue.formation}` : 'No scene'}
        </span>
        <span className="font-mono text-[7.5px] text-[#596454]">
          {show.cues.length ? `${show.cueIndex + 1}/${show.cues.length}` : '0/0'}
        </span>
        <button
          type="button"
          onClick={() => show.jumpToCue(show.cueIndex + 1)}
          disabled={show.cueIndex >= show.cues.length - 1}
          className="rounded p-1 text-[#71806d] hover:text-white disabled:opacity-25"
          title="Next scene"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
