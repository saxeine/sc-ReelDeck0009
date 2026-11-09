import { motion } from 'motion/react';
import {
  Activity,
  ArrowRightLeft,
  ArrowRightToLine,
  Brush,
  Eraser,
  FlipHorizontal2,
  Footprints,
  Layers,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Shuffle,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import type { LayerBlend, LayerMode, SeqBehavior, SeqMode, SeqPattern } from '../../types';
import type { AdvertEngine } from '../../engine/useAdvertEngine';
import { PATTERN_LABELS } from '../../utils/patterns';
import { cn } from '../../utils/cn';

/* ------------------------------------------------------------------ */
/* Shared switch                                                       */
/* ------------------------------------------------------------------ */

export function SeqSwitch({
  checked,
  onChange,
  accent = 'lime',
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: 'lime' | 'violet' | 'amber';
  label: string;
}) {
  const onClass =
    accent === 'lime'
      ? 'bg-led-lime shadow-[0_0_14px_rgba(203,243,107,0.45)]'
      : accent === 'amber'
        ? 'bg-[#ff8a1f] shadow-[0_0_14px_rgba(255,138,31,0.5)]'
        : 'bg-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.45)]';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'relative w-8 h-[18px] rounded-full transition-colors cursor-pointer shrink-0',
        checked ? onClass : 'bg-[#3b423c]'
      )}
    >
      <motion.span
        animate={{ x: checked ? 15 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'absolute top-[2px] w-[14px] h-[14px] rounded-full',
          checked ? 'bg-[#1d2a19]' : 'bg-[#a9b3a4]'
        )}
      />
    </button>
  );
}

function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#7f8a7c]">{children}</span>
      {right}
    </div>
  );
}

function MiniBtn({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded-md border transition-all cursor-pointer active:scale-90',
        danger
          ? 'border-[#34393a] text-[#7f8a7c] hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10'
          : 'border-[#34393a] text-[#9aa69c] hover:text-led-lime hover:border-led-lime/40 hover:bg-led-lime/10',
        disabled && 'opacity-30 pointer-events-none'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

const MODES: Array<{ id: SeqMode; label: string; icon: React.ElementType }> = [
  { id: 'loop', label: 'Loop', icon: Repeat },
  { id: 'pingpong', label: 'Ping-pong', icon: ArrowRightLeft },
  { id: 'once', label: 'Once', icon: ArrowRightToLine },
];

const SEQ_COLORS = ['#ff8a1f', '#ffc107', '#cbf36b', '#22d3ee', '#a78bfa', '#ff4d8d', '#ffffff'];

const BEHAVIORS: Array<{ id: SeqBehavior; label: string; icon: React.ElementType; hint: string }> = [
  {
    id: 'flash',
    label: 'Flash',
    icon: Zap,
    hint: 'The advert shows on one panel, hides, then the next panel takes it — show, hide, next.',
  },
  {
    id: 'reveal',
    label: 'Reveal',
    icon: Sparkles,
    hint: 'Adverts stay and accumulate panel by panel until the whole drawn set covers the wall.',
  },
  {
    id: 'step',
    label: 'Step',
    icon: Footprints,
    hint: 'The whole advert set is up; each lead panel flips to its next frame.',
  },
  {
    id: 'spin',
    label: 'Spin',
    icon: RotateCcw,
    hint: 'Every sequenced advert flips to its next frame on each beat.',
  },
  {
    id: 'pulse',
    label: 'Pulse',
    icon: Activity,
    hint: 'A travelling highlight only — artwork stays put.',
  },
];

const BLENDS: LayerBlend[] = ['normal', 'screen', 'overlay', 'soft-light', 'hard-light', 'multiply'];
const LAYER_MODES: Array<{ id: LayerMode; label: string }> = [
  { id: 'tiles', label: 'Full layer' },
  { id: 'spotlight', label: 'Spotlight' },
];

export function SequenceControls({ engine }: { engine: AdvertEngine }) {
  const patterns: SeqPattern[] = ['all', 'snake', 'columns', 'spiral', 'ring'];
  const behaviorHint = BEHAVIORS.find((b) => b.id === engine.behavior)?.hint;
  const progress = engine.path.length
    ? ((engine.revealed.length + (engine.playing ? 0 : 0)) / engine.path.length) * 100
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- transport ---------------- */}
      <div className="rounded-lg border border-[#333c30] bg-[#11160f] p-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={engine.active ? engine.hold : engine.run}
            disabled={!engine.path.length}
            className={cn(
              'h-9 px-3 rounded-md flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer active:scale-95',
              engine.active && engine.playing
                ? 'bg-led-lime text-[#1d2a19] shadow-[0_0_22px_rgba(203,243,107,0.45)]'
                : 'bg-[#242d1f] text-led-lime border border-led-lime/30 hover:bg-[#2d3a26]',
              !engine.path.length && 'opacity-40 pointer-events-none'
            )}
          >
            {engine.active && engine.playing ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            {engine.active && engine.playing ? 'Hold' : engine.active ? 'Resume' : 'Run'}
          </button>
          <button
            type="button"
            onClick={engine.stop}
            disabled={!engine.active}
            title="Clear the advert layer"
            className={cn(
              'h-9 w-9 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-rose-300 hover:border-rose-500/50 transition-all grid place-items-center cursor-pointer active:scale-95',
              !engine.active && 'opacity-30 pointer-events-none'
            )}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={engine.rewind}
            disabled={!engine.path.length}
            title="Rewind to step 1"
            className={cn(
              'h-9 w-9 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-led-lime hover:border-led-lime/40 transition-all grid place-items-center cursor-pointer active:scale-95',
              !engine.path.length && 'opacity-30 pointer-events-none'
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-led-display font-bold text-[11px] text-[#e8efe0] truncate">
                {engine.leaderSlot ? `Lead · S${String(engine.leaderSlot).padStart(2, '0')}` : 'Stopped'}
              </span>
              <span className="font-mono text-[8.5px] text-[#7f8a7c] shrink-0">
                {engine.path.length ? `${Math.min(engine.cursor + 1, engine.path.length)}/${engine.path.length}` : '0/0'}
              </span>
            </div>
            <div className="mt-1 h-[3px] rounded-full bg-[#26301f] overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-led-lime to-cyan-400"
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              />
            </div>
          </div>
        </div>
        <p className="mt-2 text-[9px] font-mono text-[#6f7a69] leading-snug">
          runs on command · space toggles · esc clears the layer
        </p>
      </div>

      {/* ---------------- brush ---------------- */}
      <div>
        <SectionLabel>Brush</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'paint' as const, label: 'Paint', icon: Brush },
            { id: 'erase' as const, label: 'Erase', icon: Eraser },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => engine.setPaintTool(t.id)}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer active:scale-95',
                engine.paintTool === t.id
                  ? t.id === 'erase'
                    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
                    : 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                  : 'border-[#333c30] text-[#9aa69c] hover:text-[#e8efe0] hover:bg-[#1b2418]'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- presets + path ops ---------------- */}
      <div>
        <SectionLabel
          right={<span className="text-[8.5px] font-mono text-[#6f7a69]">{engine.path.length} steps</span>}
        >
          Path presets
        </SectionLabel>
        <div className="flex flex-wrap gap-1">
          {patterns.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => engine.applyPattern(p)}
              className="px-2 py-1 rounded border border-[#333c30] text-[10px] font-semibold text-[#9aa69c] hover:text-led-lime hover:border-led-lime/40 hover:bg-led-lime/10 transition-all cursor-pointer active:scale-95"
            >
              {PATTERN_LABELS[p]}
            </button>
          ))}
          <div className="flex-1" />
          <MiniBtn icon={Trash2} label="Undo last step" onClick={engine.popStep} disabled={!engine.sequence.length} />
          <MiniBtn
            icon={FlipHorizontal2}
            label="Reverse path"
            onClick={engine.reversePath}
            disabled={engine.sequence.length < 2}
          />
          <MiniBtn
            icon={Shuffle}
            label="Shuffle steps"
            onClick={engine.shufflePath}
            disabled={engine.sequence.length < 3}
          />
          <MiniBtn icon={X} label="Clear path" onClick={engine.clearPath} danger disabled={!engine.sequence.length} />
        </div>
      </div>

      {/* ---------------- drawn order ---------------- */}
      <div>
        <SectionLabel>Drawn order</SectionLabel>
        {engine.path.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#333c30] px-3 py-2.5 text-[10px] text-[#7f8a7c] leading-relaxed">
            Drag across the canvas above — or straight over the LED wall — to draw the order adverts take
            over the panels.
          </div>
        ) : (
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-0.5 px-0.5">
            {engine.path.map((slot, i) => (
              <button
                key={`${slot}-${i}`}
                type="button"
                onClick={() => engine.removeStep(i)}
                title={`Remove panel ${slot} from the path`}
                className={cn(
                  'group shrink-0 flex items-center gap-1 pl-1.5 pr-1 py-1 rounded border text-[9.5px] font-mono font-bold transition-all cursor-pointer active:scale-90',
                  i === engine.cursor && engine.active
                    ? 'border-led-lime/70 bg-led-lime/20 text-led-lime'
                    : 'border-[#333c30] bg-[#161d14] text-[#9aa69c] hover:border-rose-500/40 hover:text-rose-300'
                )}
              >
                <span className="text-[#5f6a5a]">{i + 1}·</span>S{String(slot).padStart(2, '0')}
                <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[8.5px] font-mono text-[#5f6a5a] leading-snug">
          drag to paint · a panel can take up to 3 passes · click a step to remove it
        </p>
      </div>

      {/* ---------------- sequence colour ---------------- */}
      <div>
        <SectionLabel
          right={
            <span className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-[#7f8a7c]">flash</span>
              <SeqSwitch label="Flash sequence colour"
                checked={engine.layer.seqFlash}
                onChange={(v) => engine.setLayer({ seqFlash: v })}
                accent="amber"
              />
            </span>
          }
        >
          Sequence colour
        </SectionLabel>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SEQ_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => engine.setLayer({ seqColor: color })}
              className={cn(
                'w-6 h-6 rounded-md border-2 transition-all cursor-pointer active:scale-90',
                (engine.layer.seqColor || '#ff8a1f').toLowerCase() === color
                  ? 'border-white/85 scale-110'
                  : 'border-black/50 hover:scale-105'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={engine.layer.seqColor || '#ff8a1f'}
            onChange={(e) => engine.setLayer({ seqColor: e.target.value })}
            className="w-6 h-6"
            title="Custom sequence colour"
          />
          <span className="ml-auto font-mono text-[8px] uppercase text-[#6f7a69]">
            {(engine.layer.seqColor || '#ff8a1f').toUpperCase()}
          </span>
        </div>
        <p className="mt-1.5 text-[8.5px] font-mono text-[#5f6a5a] leading-snug">
          route, step dots and the leader ping all take this colour
        </p>
      </div>

      {/* ---------------- timing ---------------- */}
      <div>
        <div className="flex justify-between text-[8.5px] font-mono text-[#7f8a7c] mb-1">
          <span className="uppercase tracking-[0.18em]">Step interval</span>
          <span className="text-led-lime font-bold">{engine.intervalMs} ms</span>
        </div>
        <input
          type="range"
          min={180}
          max={2400}
          step={20}
          value={engine.intervalMs}
          onChange={(e) => engine.setIntervalMs(Number(e.target.value))}
          className="w-full h-1 cursor-pointer"
        />
      </div>

      <div>
        <SectionLabel>Wrap mode</SectionLabel>
        <div className="grid grid-cols-3 gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => engine.setMode(m.id)}
              className={cn(
                'flex items-center justify-center gap-1 py-1.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer active:scale-95',
                engine.mode === m.id
                  ? 'border-violet-500/60 bg-violet-500/15 text-violet-300'
                  : 'border-[#333c30] text-[#9aa69c] hover:text-[#e8efe0] hover:bg-[#1b2418]'
              )}
            >
              <m.icon className="w-3 h-3" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Turn behaviour</SectionLabel>
        <div className="grid grid-cols-2 gap-1">
          {BEHAVIORS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => engine.setBehavior(b.id)}
              className={cn(
                'flex items-center justify-center gap-1 py-1.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer active:scale-95',
                engine.behavior === b.id
                  ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                  : 'border-[#333c30] text-[#9aa69c] hover:text-[#e8efe0] hover:bg-[#1b2418]'
              )}
            >
              <b.icon className="w-3 h-3" />
              {b.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[9.5px] text-[#7f8a7c] leading-snug">{behaviorHint}</p>
      </div>

      {engine.unequipped > 0 && (
        <button
          type="button"
          onClick={engine.equipFrames}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-300 text-[10px] font-bold hover:bg-violet-500/20 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Equip {engine.unequipped} panel{engine.unequipped > 1 ? 's' : ''} with frames
        </button>
      )}

      {/* ---------------- composite ---------------- */}
      <div className="rounded-lg border border-[#333c30] bg-[#11160f] p-2.5">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers className="w-3.5 h-3.5 text-led-lime" />
          <span className="text-[10px] font-bold text-[#e8efe0]">Layer composite</span>
        </div>

        <div className="flex justify-between text-[8.5px] font-mono text-[#7f8a7c] mb-1">
          <span className="uppercase tracking-[0.18em]">Opacity</span>
          <span className="text-led-lime font-bold">{Math.round(engine.layer.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.01}
          value={engine.layer.opacity}
          onChange={(e) => engine.setLayer({ opacity: Number(e.target.value) })}
          className="w-full h-1 cursor-pointer mb-2.5"
        />

        <SectionLabel>Blend</SectionLabel>
        <select
          value={engine.layer.blend}
          onChange={(e) => engine.setBlend(e.target.value as LayerBlend)}
          className="w-full bg-[#0b100c] border border-[#333c30] rounded-md px-2 py-1.5 text-[10px] text-[#dce3d9] outline-none focus:border-led-lime/50 mb-2.5"
        >
          {BLENDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <SectionLabel>Coverage</SectionLabel>
        <div className="grid grid-cols-2 gap-1 mb-2.5">
          {LAYER_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => engine.setLayerMode(m.id)}
              className={cn(
                'py-1.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer active:scale-95',
                engine.layer.mode === m.id
                  ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                  : 'border-[#333c30] text-[#9aa69c] hover:text-[#e8efe0] hover:bg-[#1b2418]'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between text-[8.5px] font-mono text-[#7f8a7c] mb-1">
              <span>RADIUS</span>
              <span className="text-[#bfc9b8]">{engine.layer.radius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={28}
              step={1}
              value={engine.layer.radius}
              onChange={(e) => engine.setLayer({ radius: Number(e.target.value) })}
              className="w-full h-1 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-[8.5px] font-mono text-[#7f8a7c] mb-1">
              <span>INSET</span>
              <span className="text-[#bfc9b8]">{engine.layer.inset}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={engine.layer.inset}
              onChange={(e) => engine.setLayer({ inset: Number(e.target.value) })}
              className="w-full h-1 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9aa69c]">Dim LED wall under adverts</span>
            <SeqSwitch label="Dim LED wall under adverts" checked={engine.layer.dimMain} onChange={(v) => engine.setLayer({ dimMain: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9aa69c]">Show route on wall</span>
            <SeqSwitch label="Show route on wall" checked={engine.layer.showRoute} onChange={(v) => engine.setLayer({ showRoute: v })} />
          </div>
        </div>
      </div>

      {/* ---------------- board paint ---------------- */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => engine.setBoardPaintArmed(!engine.boardPaintArmed)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            engine.setBoardPaintArmed(!engine.boardPaintArmed);
          }
        }}
        className={cn(
          'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all cursor-pointer active:scale-[0.99]',
          engine.boardPaintArmed
            ? 'border-cyan-500/50 bg-cyan-500/10'
            : 'border-[#333c30] bg-[#11160f] hover:border-[#46523f]'
        )}
      >
        <Brush className={cn('w-4 h-4 shrink-0', engine.boardPaintArmed ? 'text-cyan-300' : 'text-[#7f8a7c]')} />
        <span className="flex-1 min-w-0">
          <span
            className={cn(
              'block text-[10.5px] font-bold',
              engine.boardPaintArmed ? 'text-cyan-200' : 'text-[#dce3d9]'
            )}
          >
            Draw on the LED wall {engine.boardPaintArmed && '· armed'}
          </span>
          <span className="block text-[9px] text-[#7f8a7c] leading-snug">
            {engine.boardPaintArmed
              ? 'Drag across the preview panels. Esc to exit.'
              : 'Paint the takeover order straight onto the wall.'}
          </span>
        </span>
        <SeqSwitch label="Draw on the LED wall"
          checked={engine.boardPaintArmed}
          onChange={(v) => engine.setBoardPaintArmed(v)}
          accent="violet"
        />
      </div>
    </div>
  );
}
