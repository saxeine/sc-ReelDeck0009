import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link2,
  Lock,
  LockOpen,
  MousePointer2,
  Palette,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Scissors,
  Square,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { AdvertTab, ContentType, HoverEffect, MappingMode, SpreadSlice } from '../../types';
import type { AdvertEngine } from '../../engine/useAdvertEngine';
import { SPREAD_FILTERS, computeSpreadSlices, spreadBackground } from '../../utils/spread';
import { AdvertPanelVisual } from './AdvertPanelVisual';
import { SeqSwitch } from './SequenceControls';
import { AdvertLayer } from './AdvertLayer';
import { WallCanvas } from '../WallCanvas';
import { cn } from '../../utils/cn';

export interface DeckWall {
  size: number;
  gap: number;
  mode: MappingMode;
  outlines: boolean;
  playing: boolean;
  contentType: ContentType;
  mediaElement: HTMLImageElement | HTMLVideoElement | null;
  resetSignal: number;
  /** front page panel grid configurator output — the deck mirrors the same panels */
  regions?: import('../../../../types/frontPanelGrid').FrontPanelGridRegion[] | null;
  /** uploaded media URL for L1 */
  mediaUrl?: string | null;
}

/* ------------------------------------------------------------------ */
/* Micro components                                                    */
/* ------------------------------------------------------------------ */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[8.5px] font-mono uppercase tracking-[0.2em] text-[#7f8a7c]">{label}</span>
        {hint && <span className="text-[8.5px] font-mono text-[#5f6a5a]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PoolPickGrid({
  engine,
  onPick,
  compact,
}: {
  engine: AdvertEngine;
  onPick: (url: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn('grid gap-1.5', compact ? 'grid-cols-6' : 'grid-cols-5')}>
      {engine.pool.map((asset) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onPick(asset.url)}
          title={asset.name}
          className="group relative rounded-md overflow-hidden border border-[#333c30] hover:border-led-lime/60 transition-all cursor-pointer active:scale-95"
        >
          <img
            src={asset.url}
            alt={asset.name}
            loading="lazy"
            className={cn('w-full object-cover', compact ? 'h-10' : 'h-14')}
          />
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        </button>
      ))}
    </div>
  );
}

function UrlRow({
  value,
  onChange,
  onApply,
  applyLabel,
  onSendToPool,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  applyLabel: string;
  onSendToPool?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        disabled={disabled}
        className="flex-1 min-w-0 bg-[#0b100c] border border-[#333c30] rounded-md px-2.5 py-1.5 text-[10.5px] font-mono text-[#dce3d9] placeholder:text-[#54604f] outline-none focus:border-led-lime/50"
      />
      <button
        type="button"
        onClick={onApply}
        disabled={disabled || !value.trim()}
        className="px-2.5 py-1.5 rounded-md bg-led-lime hover:bg-[#d8fa8a] text-[#1d2a19] text-[10px] font-black transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
      >
        {applyLabel}
      </button>
      {onSendToPool && (
        <button
          type="button"
          onClick={onSendToPool}
          disabled={disabled || !value.trim()}
          title="Add this URL to the advert pool"
          className="p-1.5 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-led-lime hover:border-led-lime/40 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function ArtworkTab({ engine }: { engine: AdvertEngine }) {
  const [draft, setDraft] = useState('');
  const slot = engine.selectedSlot;
  const panel = engine.panels[slot];
  const disabled = engine.locked;

  return (
    <div className="led-advert-tab-layout grid grid-cols-[auto_1fr] gap-5">
      <div>
        <Field label={`Panel ${slot} · advert`}>
          <div className="relative w-36 h-36 rounded-lg overflow-hidden border border-[#333c30] mt-1.5">
            <AdvertPanelVisual panel={panel} frame={engine.displayFrame(slot)} slot={slot} />
          </div>
        </Field>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            engine.assignImage(slot, '');
            engine.assignRotation(slot, []);
            engine.clearSpread([slot]);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-rose-300 hover:border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40"
        >
          <Trash2 className="w-3 h-3" /> Clear advert
        </button>
      </div>

      <div className="min-w-0">
        <Field label="Pick from the advert pool" hint={`${engine.pool.length} images`}>
          <PoolPickGrid
            engine={engine}
            onPick={(url) => {
              if (disabled) return;
              engine.assignImage(slot, url);
            }}
          />
        </Field>
        <Field label="Or load a URL">
          <UrlRow
            value={draft}
            onChange={setDraft}
            onApply={() => engine.assignImage(slot, draft.trim())}
            applyLabel="Load"
            onSendToPool={() => engine.addUrl(draft)}
            disabled={disabled}
          />
        </Field>
        <p className="text-[10px] text-[#7f8a7c] leading-relaxed">
          A still image sits under the sequencer: in <b className="text-[#c0cbb8]">reveal</b> mode the panel
          appears when its step comes up; in <b className="text-[#c0cbb8]">step</b> /{' '}
          <b className="text-[#c0cbb8]">spin</b> modes the frame set below is what flips.
        </p>
      </div>
    </div>
  );
}

function SpreadTab({ engine }: { engine: AdvertEngine }) {
  const [sel, setSel] = useState<Set<number>>(
    () => new Set(Array.from({ length: engine.panelCount }, (_, i) => i + 1))
  );
  const [url, setUrl] = useState(engine.masterArtwork);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('none');
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1);
  const [remember, setRemember] = useState(true);
  const disabled = engine.locked;

  const sorted = useMemo(
    () => [...sel].filter((s) => s <= engine.panelCount).sort((a, b) => a - b),
    [sel, engine.panelCount]
  );
  const preview = useMemo(
    () => computeSpreadSlices(sorted, engine.cols, url, filter, sx, sy),
    [sorted, engine.cols, url, filter, sx, sy]
  );

  return (
    <div className="led-advert-tab-layout grid grid-cols-[auto_1fr] gap-5">
      <div>
        <Field label="Wall slots" hint={`${sorted.length} selected`}>
          <div
            className="grid gap-1 w-[132px]"
            style={{ gridTemplateColumns: `repeat(${engine.cols}, minmax(0,1fr))` }}
          >
            {Array.from({ length: engine.panelCount }, (_, i) => i + 1).map((slot) => (
              <button
                key={slot}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setSel((prev) => {
                    const next = new Set(prev);
                    if (next.has(slot)) next.delete(slot);
                    else next.add(slot);
                    return next;
                  })
                }
                className={cn(
                  'aspect-square rounded border font-mono text-[9.5px] font-bold transition-all cursor-pointer active:scale-90',
                  sel.has(slot)
                    ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                    : 'border-[#333c30] text-[#5f6a5a] hover:text-[#c0cbb8]'
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Preview">
          <div
            className="w-[132px] h-[132px] rounded-md overflow-hidden border border-[#333c30] grid gap-px bg-[#26301f]"
            style={{
              gridTemplateColumns: `repeat(${engine.cols}, minmax(0,1fr))`,
              gridTemplateRows: `repeat(${engine.cols}, minmax(0,1fr))`,
            }}
          >
            {Array.from({ length: engine.panelCount }, (_, i) => i + 1).map((slot) => {
              const slice: SpreadSlice | undefined = preview[slot];
              return slice ? (
                <div key={slot} style={spreadBackground(slice)} />
              ) : (
                <div key={slot} className="bg-[#0b100c]" />
              );
            })}
          </div>
        </Field>
      </div>

      <div className="min-w-0">
        <Field label="Artwork source">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setUrl(engine.masterArtwork)}
              className={cn(
                'flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-md border transition-all cursor-pointer',
                url === engine.masterArtwork
                  ? 'border-led-lime/60 bg-led-lime/10'
                  : 'border-[#333c30] hover:border-[#4b5a43]'
              )}
            >
              <img src={engine.masterArtwork} alt="" className="w-8 h-8 rounded object-cover" />
              <span className="text-[9.5px] font-bold text-[#dce3d9]">Master</span>
            </button>
            <span className="text-[8.5px] font-mono text-[#5f6a5a]">or pick a pool image ↓</span>
          </div>
          <PoolPickGrid engine={engine} compact onPick={setUrl} />
          <div className="mt-2">
            <UrlRow
              value={draft}
              onChange={setDraft}
              onApply={() => draft.trim() && setUrl(draft.trim())}
              applyLabel="Use"
              onSendToPool={() => engine.addUrl(draft)}
              disabled={disabled}
            />
          </div>
        </Field>

        <Field label="Colour treatment">
          <div className="flex flex-wrap gap-1">
            {Object.keys(SPREAD_FILTERS).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 py-1 rounded border text-[9.5px] font-semibold capitalize transition-all cursor-pointer active:scale-95',
                  filter === f
                    ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                    : 'border-[#333c30] text-[#9aa69c] hover:text-[#e8efe0]'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Stretch X" hint={`${sx.toFixed(2)}×`}>
            <input
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={sx}
              onChange={(e) => setSx(Number(e.target.value))}
              className="w-full"
            />
          </Field>
          <Field label="Stretch Y" hint={`${sy.toFixed(2)}×`}>
            <input
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={sy}
              onChange={(e) => setSy(Number(e.target.value))}
              className="w-full"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="accent-led-lime"
          />
          <span className="text-[10px] text-[#9aa69c]">Remember as the master artwork</span>
        </label>

        <button
          type="button"
          disabled={disabled || sorted.length === 0 || !url}
          onClick={() => {
            engine.applySpread(sorted, url, filter === 'none' ? undefined : filter, sx, sy);
            if (remember) engine.setMasterArtwork(url);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-led-lime hover:bg-[#d8fa8a] text-[#1d2a19] text-[11px] font-black transition-all cursor-pointer active:scale-[0.98] shadow-[0_0_24px_rgba(203,243,107,0.28)] disabled:opacity-40 disabled:pointer-events-none"
        >
          <Scissors className="w-4 h-4" />
          Carve poster across {sorted.length} panel{sorted.length === 1 ? '' : 's'}
        </button>
        <button
          type="button"
          disabled={disabled || sorted.length === 0}
          onClick={() => engine.clearSpread(sorted)}
          className="mt-1.5 w-full py-1.5 rounded-md border border-[#34393a] text-[10px] font-bold text-[#9aa69c] hover:text-rose-300 hover:border-rose-500/40 transition-all cursor-pointer disabled:opacity-40"
        >
          Clear spread from selection
        </button>
      </div>
    </div>
  );
}

function FramesTab({ engine }: { engine: AdvertEngine }) {
  const slot = engine.selectedSlot;
  const panel = engine.panels[slot];
  const frames = panel.rotation;
  const [previewIdx, setPreviewIdx] = useState(0);
  const disabled = engine.locked;

  useEffect(() => {
    if (frames.length < 2) return;
    const id = window.setInterval(
      () => setPreviewIdx((i) => (i + 1) % frames.length),
      Math.max(0.5, panel.rotationInterval) * 1000
    );
    return () => window.clearInterval(id);
  }, [frames.length, panel.rotationInterval]);

  useEffect(() => setPreviewIdx(0), [slot, frames.length]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= frames.length) return;
    const next = [...frames];
    [next[i], next[j]] = [next[j], next[i]];
    engine.assignRotation(slot, next);
  };

  return (
    <div className="led-advert-tab-layout grid grid-cols-[auto_1fr] gap-5">
      <div>
        <Field
          label="Live preview"
          hint={frames.length > 1 ? `${panel.rotationInterval}s / frame` : undefined}
        >
          <div className="relative w-36 h-36 rounded-lg overflow-hidden border border-[#333c30] mt-1.5">
            <AdvertPanelVisual
              panel={panel}
              frame={frames.length ? frames[previewIdx % frames.length] : engine.displayFrame(slot)}
              slot={slot}
            />
          </div>
        </Field>
        <Field label="Seconds per frame" hint={`${panel.rotationInterval}s`}>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.5}
            value={panel.rotationInterval}
            disabled={disabled}
            onChange={(e) => engine.updatePanel(slot, { rotationInterval: Number(e.target.value) })}
            className="w-36"
          />
        </Field>
        <div className="flex items-center gap-2">
          <SeqSwitch label="Free-run when idle"
            checked={panel.rotating}
            onChange={(v) => engine.updatePanel(slot, { rotating: v })}
          />
          <span className="text-[10px] text-[#9aa69c]">Free-run when idle</span>
        </div>
        {engine.active && (
          <p className="mt-2 text-[9px] text-led-lime/80 leading-snug w-36">
            Sequencer is live — this panel flips when its drawn step leads.
          </p>
        )}
      </div>

      <div className="min-w-0">
        <Field
          label={`Frame set (${frames.length})`}
          hint={frames.length < 2 ? 'needs 2+ to flip' : undefined}
        >
          {frames.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#333c30] px-3 py-4 text-[10px] text-[#7f8a7c] leading-relaxed">
              No frames yet — tap pool images below to append frames, or use “cycle whole pool”.
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1.5">
              <AnimatePresence initial={false}>
                {frames.map((frame, i) => (
                  <motion.div
                    key={`${frame}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group relative shrink-0 w-[70px] h-[70px] rounded-md overflow-hidden border border-[#414d3b]"
                  >
                    <img src={frame} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-0.5 left-0.5 px-1 rounded bg-black/80 font-mono text-[8.5px] font-bold text-violet-300">
                      {i + 1}
                    </span>
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={disabled || i === 0}
                        className="p-1 rounded bg-[#26301f] text-[#dce3d9] cursor-pointer disabled:opacity-30"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => engine.assignRotation(slot, frames.filter((_, x) => x !== i))}
                        disabled={disabled}
                        className="p-1 rounded bg-[#26301f] text-rose-300 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={disabled || i === frames.length - 1}
                        className="p-1 rounded bg-[#26301f] text-[#dce3d9] cursor-pointer disabled:opacity-30"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Field>

        <Field label="Append from pool">
          <PoolPickGrid
            engine={engine}
            compact
            onPick={(url) => {
              if (disabled) return;
              engine.appendFrame(slot, url);
            }}
          />
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                engine.assignRotation(
                  slot,
                  engine.pool.map((a) => a.url)
                )
              }
              className="px-2.5 py-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-300 text-[10px] font-bold hover:bg-violet-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              Cycle whole pool
            </button>
            <button
              type="button"
              disabled={disabled || frames.length === 0}
              onClick={() => engine.assignRotation(slot, [])}
              className="px-2.5 py-1.5 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-rose-300 hover:border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40"
            >
              Clear frames
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => engine.equipFrames()}
              className="px-2.5 py-1.5 rounded-md border border-led-lime/40 bg-led-lime/10 text-led-lime text-[10px] font-bold hover:bg-led-lime/20 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              Equip whole path
            </button>
          </div>
        </Field>
      </div>
    </div>
  );
}

const BORDER_SWATCHES = ['#1e293b', '#9cc97d', '#cbf36b', '#22d3ee', '#a78bfa', '#f59e0b', '#f43f5e'];

function StyleTab({ engine }: { engine: AdvertEngine }) {
  const slot = engine.selectedSlot;
  const panel = engine.panels[slot];
  const st = panel.style;
  const disabled = engine.locked;
  const up = (patch: Parameters<AdvertEngine['updateStyle']>[1]) => engine.updateStyle(slot, patch);

  return (
    <div className="led-advert-tab-layout grid grid-cols-2 gap-5">
      <div className="min-w-0">
        <Field label={`Card preview — panel ${slot}`}>
          <div
            className="relative w-36 h-36 mt-1.5 overflow-hidden"
            style={{
              borderRadius: engine.layer.radius,
              border: `${st.borderWidth ?? 1}px solid ${st.borderColor ?? '#9cc97d'}`,
              opacity: st.opacity ?? 1,
              boxShadow: st.glow ? `0 0 22px ${st.borderColor ?? '#9cc97d'}88` : undefined,
            }}
          >
            <AdvertPanelVisual panel={panel} frame={engine.displayFrame(slot)} slot={slot} />
          </div>
        </Field>

        <Field label="Border width" hint={`${st.borderWidth ?? 1}px`}>
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={st.borderWidth ?? 1}
            disabled={disabled}
            onChange={(e) => up({ borderWidth: Number(e.target.value) })}
            className="w-full"
          />
        </Field>
        <div className="flex items-center gap-2 mb-3">
          <SeqSwitch label="Neon glow around the card" checked={!!st.glow} onChange={(v) => up({ glow: v })} />
          <span className="text-[10px] text-[#9aa69c]">Neon glow around the card</span>
        </div>
        <div className="flex items-center gap-2">
          <SeqSwitch label="2.5D parallax on hover"
            checked={panel.parallax}
            onChange={(v) => engine.updatePanel(slot, { parallax: v })}
            accent="violet"
          />
          <span className="text-[10px] text-[#9aa69c]">2.5D parallax on hover</span>
        </div>
        <Field label="Depth strength" hint={`${(panel.tilt || 1).toFixed(2)}×`}>
          <input
            type="range"
            min={0.2}
            max={2.4}
            step={0.1}
            value={panel.tilt || 1}
            disabled={disabled || !panel.parallax}
            onChange={(e) => engine.updatePanel(slot, { tilt: Number(e.target.value) })}
            className="w-full"
          />
        </Field>
      </div>

      <div className="min-w-0">
        <Field label="Border colour">
          <div className="flex items-center gap-1.5 flex-wrap">
            {BORDER_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                disabled={disabled}
                onClick={() => up({ borderColor: color })}
                className={cn(
                  'w-7 h-7 rounded-md border-2 transition-all cursor-pointer active:scale-90',
                  st.borderColor === color
                    ? 'border-white/80 scale-110'
                    : 'border-black/50 hover:scale-105'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={st.borderColor ?? '#9cc97d'}
              disabled={disabled}
              onChange={(e) => up({ borderColor: e.target.value })}
              className="w-7 h-7"
              title="Custom border colour"
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tint wash" hint={st.tint ?? '#0f172a'}>
            <input
              type="color"
              value={st.tint ?? '#0f172a'}
              disabled={disabled}
              onChange={(e) => up({ tint: e.target.value })}
              className="w-9 h-7"
            />
          </Field>
          <Field label="Tint strength" hint={`${Math.round((st.tintAmount ?? 0) * 100)}%`}>
            <input
              type="range"
              min={0}
              max={0.7}
              step={0.02}
              value={st.tintAmount ?? 0}
              disabled={disabled}
              onChange={(e) => up({ tintAmount: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </div>

        <Field label="Card opacity" hint={`${Math.round((st.opacity ?? 1) * 100)}%`}>
          <input
            type="range"
            min={0.35}
            max={1}
            step={0.01}
            value={st.opacity ?? 1}
            disabled={disabled}
            onChange={(e) => up({ opacity: Number(e.target.value) })}
            className="w-full"
          />
        </Field>

        <div className="flex flex-wrap gap-1.5 mt-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => engine.applyStyleToAll({ ...st })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-led-lime hover:bg-[#d8fa8a] text-[#1d2a19] text-[10px] font-black transition-all cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5" /> Broadcast to all
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => engine.resetPanel(slot)}
            className="px-3 py-1.5 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-rose-300 hover:border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40"
          >
            Reset panel
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkTab({ engine }: { engine: AdvertEngine }) {
  const slot = engine.selectedSlot;
  const link = engine.panels[slot].link;
  const [imgDraft, setImgDraft] = useState('');
  const disabled = engine.locked;

  const effects: Array<{ id: HoverEffect; label: string; desc: string }> = [
    { id: 'none', label: 'None', desc: 'Plain hover' },
    { id: 'change-image', label: 'Swap image', desc: 'Reveal alt artwork' },
    { id: 'zoom', label: 'Zoom', desc: 'Scale the artwork' },
  ];

  return (
    <div className="led-advert-tab-layout grid grid-cols-2 gap-5">
      <div className="min-w-0">
        <Field label="Destination URL">
          <input
            value={link.url ?? ''}
            disabled={disabled}
            onChange={(e) => engine.updateLink(slot, { url: e.target.value })}
            placeholder="https://example.com/campaign"
            className="w-full bg-[#0b100c] border border-[#333c30] rounded-md px-2.5 py-1.5 text-[10.5px] font-mono text-[#dce3d9] placeholder:text-[#54604f] outline-none focus:border-cyan-500/60"
          />
        </Field>
        <Field label="Open behaviour">
          <div className="grid grid-cols-2 gap-1.5">
            {(['_blank', '_self'] as const).map((target) => (
              <button
                key={target}
                type="button"
                disabled={disabled}
                onClick={() => engine.updateLink(slot, { target })}
                className={cn(
                  'py-1.5 rounded-md border text-[10px] font-bold font-mono transition-all cursor-pointer active:scale-95',
                  link.target === target
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                    : 'border-[#333c30] text-[#9aa69c] hover:text-[#e8efe0]'
                )}
              >
                {target === '_blank' ? 'New window' : 'Same tab'}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={disabled || !link.url}
            onClick={() => link.url && window.open(link.url, link.target === '_self' ? '_self' : '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-[#04262b] text-[10px] font-black transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Test link
          </button>
          <button
            type="button"
            disabled={disabled || !link.url}
            onClick={() => engine.updateLink(slot, { url: '', hoverEffect: 'none', hoverImage: undefined })}
            className="px-3 py-1.5 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-rose-300 hover:border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40"
          >
            Remove link
          </button>
        </div>
        <p className="mt-3 text-[10px] text-[#7f8a7c] leading-relaxed">
          Linked advert cards show a follow chip on hover — clicking it opens the campaign destination.
        </p>
      </div>

      <div className="min-w-0">
        <Field label="Hover effect">
          <div className="grid grid-cols-3 gap-1.5">
            {effects.map((effect) => (
              <button
                key={effect.id}
                type="button"
                disabled={disabled}
                onClick={() => engine.updateLink(slot, { hoverEffect: effect.id })}
                className={cn(
                  'rounded-md border px-2 py-2 text-left transition-all cursor-pointer active:scale-95',
                  link.hoverEffect === effect.id
                    ? 'border-cyan-500/60 bg-cyan-500/10'
                    : 'border-[#333c30] hover:border-[#4b5a43]'
                )}
              >
                <span
                  className={cn(
                    'block text-[10px] font-bold',
                    link.hoverEffect === effect.id ? 'text-cyan-300' : 'text-[#dce3d9]'
                  )}
                >
                  {effect.label}
                </span>
                <span className="block text-[8.5px] text-[#7f8a7c]">{effect.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {link.hoverEffect === 'change-image' && (
          <Field label="Hover artwork">
            <div className="flex items-center gap-2 mb-2">
              {link.hoverImage ? (
                <div className="relative w-11 h-11 rounded-md overflow-hidden border border-cyan-500/50">
                  <img src={link.hoverImage} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => engine.updateLink(slot, { hoverImage: undefined })}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/80 text-rose-300 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-[#7f8a7c]">Pick the reveal image ↓</span>
              )}
            </div>
            <PoolPickGrid engine={engine} compact onPick={(url) => engine.updateLink(slot, { hoverImage: url })} />
            <div className="mt-2">
              <UrlRow
                value={imgDraft}
                onChange={setImgDraft}
                onApply={() => engine.updateLink(slot, { hoverImage: imgDraft.trim() })}
                applyLabel="Set"
                disabled={disabled}
              />
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

const TABS: Array<{ id: AdvertTab; label: string; icon: React.ElementType }> = [
  { id: 'artwork', label: 'Artwork', icon: ImageIcon },
  { id: 'spread', label: 'Spread', icon: LayoutGrid },
  { id: 'frames', label: 'Frames', icon: RotateCw },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'link', label: 'Link', icon: Link2 },
];

export function AdvertDeck({
  engine,
  wall,
  tab,
  onTab,
  onClose,
}: {
  engine: AdvertEngine;
  wall: DeckWall;
  tab: AdvertTab;
  onTab: (tab: AdvertTab) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-[#050805]/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="led-advert-deck relative glass border border-[#333c30] rounded-xl w-[min(1120px,96vw)] h-[min(720px,92vh)] flex flex-col overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
      >
        <div className="led-advert-deck-header h-14 shrink-0 flex items-center gap-3 px-4 border-b border-[#2c332a]">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-led-lime to-emerald-500 flex items-center justify-center shadow-[0_0_18px_rgba(203,243,107,0.35)]">
            <Layers className="w-3.5 h-3.5 text-[#1d2a19]" />
          </div>
          <div className="led-advert-deck-title leading-tight">
            <h2 className="font-led-display font-bold text-[12.5px] text-white">Advert control deck</h2>
            <p className="text-[8px] font-mono text-[#7f8a7c] uppercase tracking-[0.2em]">
              panel {String(engine.selectedSlot).padStart(2, '0')} · layer L2 over 4×4 wall
            </p>
          </div>

          <div className="led-advert-deck-panel-list flex items-center gap-1 ml-3 overflow-x-auto">
            {Array.from({ length: engine.panelCount }, (_, i) => i + 1).map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => engine.setSelectedSlot(slot)}
                className={cn(
                  'w-6 h-6 shrink-0 rounded font-mono text-[9px] font-bold transition-all cursor-pointer active:scale-90',
                  engine.selectedSlot === slot
                    ? 'bg-led-lime text-[#1d2a19] shadow-[0_0_12px_rgba(203,243,107,0.5)]'
                    : 'bg-[#171d14] border border-[#333c30] text-[#7f8a7c] hover:text-[#dce3d9]'
                )}
              >
                {slot}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                engine.setLocked(!engine.locked);
              }}
              title={engine.locked ? 'Unlock editing' : 'Lock editing (presentation mode)'}
              className={cn(
                'p-2 rounded-md border transition-all cursor-pointer',
                engine.locked
                  ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
                  : 'border-[#34393a] text-[#9aa69c] hover:text-[#e8efe0]'
              )}
            >
              {engine.locked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close advert deck"
              className="p-2 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-white hover:border-[#4b5a43] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="led-advert-deck-tabs w-[74px] shrink-0 border-r border-[#2c332a] py-3 flex flex-col gap-1 items-center overflow-y-auto">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTab(t.id)}
                  className="relative w-[58px] py-2 rounded-lg flex flex-col items-center gap-1 cursor-pointer group"
                >
                  {active && (
                    <motion.span
                      layoutId="deck-tab-pill"
                      className="absolute inset-0 rounded-lg border bg-led-lime/15 border-led-lime/50"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <t.icon
                    className={cn(
                      'relative z-10 w-4 h-4 transition-colors',
                      active ? 'text-led-lime' : 'text-[#6f7a69] group-hover:text-[#c0cbb8]'
                    )}
                  />
                  <span
                    className={cn(
                      'relative z-10 text-[7.5px] font-mono uppercase tracking-[0.12em] transition-colors',
                      active ? 'text-led-lime' : 'text-[#5f6a5a] group-hover:text-[#9aa69c]'
                    )}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
            <div className="mt-auto px-1 text-center">
              <MousePointer2 className="w-3 h-3 text-[#4b5745] mx-auto" />
            </div>
          </div>

          <div className="led-advert-deck-content flex-1 min-w-0 overflow-y-auto p-5 relative">
            {engine.locked && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-200 text-[10px] font-semibold">
                <Lock className="w-3.5 h-3.5" /> Presentation lock is on — edits are paused.
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {tab === 'artwork' && <ArtworkTab engine={engine} />}
                {tab === 'spread' && <SpreadTab engine={engine} />}
                {tab === 'frames' && <FramesTab engine={engine} />}
                {tab === 'style' && <StyleTab engine={engine} />}
                {tab === 'link' && <LinkTab engine={engine} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* always-on live wall */}
          <div className="hidden md:flex w-[248px] shrink-0 border-l border-[#2c332a] p-3 flex-col gap-3 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#7f8a7c]">
                  Live wall · L1 + L2
                </span>
                <span
                  className={cn(
                    'px-1.5 py-[2px] rounded border text-[7px] font-mono font-bold uppercase tracking-[0.14em]',
                    engine.active
                      ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                      : 'border-[#3c4538] text-[#93a08c]'
                  )}
                >
                  {engine.statusLabel.label}
                </span>
              </div>
              <div className="rounded-md border border-[#333c30] bg-[#070b07] p-1.5">
                <div className="relative aspect-square w-full">
                  <WallCanvas {...wall} regions={wall.regions ?? null} mediaUrl={wall.mediaUrl ?? null} />
                  <AdvertLayer
                    engine={engine}
                    size={wall.size}
                    gap={wall.gap}
                    onInspect={(slot) => engine.setSelectedSlot(slot)}
                    onOpenLink={(url, target) =>
                      window.open(url, target === '_self' ? '_self' : '_blank')
                    }
                    interactive={false}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={engine.active ? engine.hold : engine.run}
                  disabled={!engine.path.length}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-bold transition-all cursor-pointer active:scale-95',
                    engine.active && engine.playing
                      ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                      : 'border-[#34393a] text-[#c0cbb8] hover:text-led-lime hover:border-led-lime/40',
                    !engine.path.length && 'opacity-40 pointer-events-none'
                  )}
                >
                  {engine.active && engine.playing ? (
                    <Pause className="w-2.5 h-2.5" />
                  ) : (
                    <Play className="w-2.5 h-2.5" />
                  )}
                  {engine.active && engine.playing ? 'Hold' : engine.active ? 'Resume' : 'Run'}
                </button>
                <button
                  type="button"
                  onClick={engine.stop}
                  disabled={!engine.active}
                  title="Clear the advert layer"
                  className={cn(
                    'p-1 rounded border border-[#34393a] text-[#8d9a86] hover:text-rose-300 transition-all cursor-pointer active:scale-95',
                    !engine.active && 'opacity-30 pointer-events-none'
                  )}
                >
                  <Square className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={engine.rewind}
                  title="Rewind"
                  className="p-1 rounded border border-[#34393a] text-[#8d9a86] hover:text-led-lime transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
                <span className="ml-auto font-mono text-[8px] text-[#7f8a7c]">
                  {engine.revealed.length}/{engine.path.length} panels
                </span>
              </div>
            </div>

            <div className="rounded-md border border-[#333c30] bg-[#11160f] p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#7f8a7c]">
                  Panel {String(engine.selectedSlot).padStart(2, '0')}
                </span>
                <span className="font-mono text-[8px] text-[#7f8a7c]">
                  {engine.panels[engine.selectedSlot]?.rotation.length ?? 0} frames
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { on: !!engine.panels[engine.selectedSlot]?.spread, label: 'poster slice' },
                  { on: !!engine.panels[engine.selectedSlot]?.link.url, label: 'linked' },
                  { on: !!engine.panels[engine.selectedSlot]?.parallax, label: '2.5D' },
                  { on: !!engine.panels[engine.selectedSlot]?.style.glow, label: 'glow' },
                ]
                  .filter((chip) => chip.on)
                  .map((chip) => (
                    <span
                      key={chip.label}
                      className="px-1.5 py-[2px] rounded border border-[#3c4538] text-[8px] font-mono text-[#bfc9b8]"
                    >
                      {chip.label}
                    </span>
                  ))}
                {!engine.panels[engine.selectedSlot]?.spread &&
                  !engine.panels[engine.selectedSlot]?.link.url &&
                  !engine.panels[engine.selectedSlot]?.parallax && (
                    <span className="text-[8.5px] text-[#6f7a69]">stills only</span>
                  )}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[8px] font-mono text-[#7f8a7c] mb-1">
                <span className="uppercase tracking-[0.18em]">Layer opacity</span>
                <span className="text-led-lime">{Math.round(engine.layer.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.01}
                value={engine.layer.opacity}
                onChange={(e) => engine.setLayer({ opacity: Number(e.target.value) })}
                className="w-full h-1 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
