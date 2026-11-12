import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  Clock3,
  FolderOpen,
  Gauge,
  GripVertical,
  Image as ImageIcon,
  MapPin,
  Plus,
  Repeat,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ChoreoDirection } from '../../types';
import type { AdvertEngine } from '../../engine/useAdvertEngine';
import {
  CHOREO_FORMATIONS,
  CHOREO_MOTIONS,
  CHOREO_TRANSITIONS,
} from '../../engine/choreography';
import { SeqSwitch } from './SequenceControls';
import { ShowTemplates } from './ShowTemplates';
import { cn } from '../../utils/cn';
import { AssetPicker } from '../../../assetProvider/AssetProvider';
import type { LibraryAsset } from '../../../../services/assetLibrary';

function Label({ children, value }: { children: string; value?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#7f8a7c]">{children}</span>
      {value}
    </div>
  );
}

export function ChoreographyControls({ engine }: { engine: AdvertEngine }) {
  const show = engine.choreography;
  const cue = show.selectedCue;
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeCastIndex, setActiveCastIndex] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => setActiveCastIndex(null), [cue?.id]);

  // An imported show can embed or reference artwork not yet in the local
  // advert pool. Keep it selectable in every scene instead of making the
  // imported cast impossible to edit after reopening the desk.
  const castAssets = [...engine.pool];
  const seen = new Set(castAssets.map((asset) => asset.url));
  for (const url of show.cues.flatMap((item) => item.assetUrls)) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const index = castAssets.length + 1;
    castAssets.push({ id: `imported-${index}`, name: `Imported artwork ${index}`, url, source: 'url' });
  }

  const firstFreeSlot = (slots: number[]) => {
    for (let slot = 1; slot <= engine.panelCount; slot++) if (!slots.includes(slot)) return slot;
    return 1;
  };

  const toggleAsset = (url: string) => {
    if (!cue) return;
    const exclusive = cue.formation === 'solo' || cue.formation === 'trail' || cue.formation === 'mosaic';
    const at = cue.assetUrls.indexOf(url);
    if (at >= 0) {
      show.updateCue(cue.id, {
        assetUrls: cue.assetUrls.filter((_, index) => index !== at),
        castSlots: cue.castSlots.filter((_, index) => index !== at),
      });
      setActiveCastIndex(null);
      return;
    }

    const slot = firstFreeSlot(cue.castSlots);
    if (exclusive) {
      show.updateCue(cue.id, { assetUrls: [url], castSlots: [slot] });
      setActiveCastIndex(0);
    } else {
      const assetUrls = [...cue.assetUrls, url].slice(0, 16);
      const castSlots = [...cue.castSlots, slot].slice(0, assetUrls.length);
      show.updateCue(cue.id, { assetUrls, castSlots });
      setActiveCastIndex(assetUrls.length - 1);
    }
  };

  const placeCast = (index: number, slot: number) => {
    if (!cue || index < 0 || index >= cue.assetUrls.length) return;
    const castSlots = [...cue.castSlots];
    castSlots[index] = slot;
    show.updateCue(cue.id, { castSlots });
    setActiveCastIndex(index);
  };

  /**
   * Pull artwork straight from the asset provider library into this scene.
   * Library images are not in the pool yet, so they are stocked there first
   * (keeping the cast grid and the deck in sync) and then cast immediately.
   */
  const addLibraryToCast = (libraryAssets: LibraryAsset[]) => {
    setLibraryOpen(false);
    if (!cue || libraryAssets.length === 0) return;

    const pooled = new Set(engine.pool.map((asset) => asset.url));
    const incoming = libraryAssets.filter((asset, index) => {
      const first = libraryAssets.findIndex((item) => item.src === asset.src);
      return first === index && !pooled.has(asset.src);
    });
    if (incoming.length) {
      engine.addLibraryAssets(incoming.map((asset) => ({ name: asset.name, url: asset.src })));
    }

    const urls: string[] = [];
    for (const asset of libraryAssets) {
      if (!urls.includes(asset.src)) urls.push(asset.src);
    }
    if (!urls.length) return;

    const exclusive = cue.formation === 'solo' || cue.formation === 'trail' || cue.formation === 'mosaic';
    if (exclusive) {
      // Solo, trail and mosaic scenes only perform one advert, so the first
      // library pick takes the stage instead of silently overfilling the cue.
      show.updateCue(cue.id, { assetUrls: [urls[0]], castSlots: [cue.castSlots[0] ?? 1] });
      setActiveCastIndex(0);
      return;
    }

    const assetUrls = [...cue.assetUrls];
    const castSlots = [...cue.castSlots];
    for (const url of urls) {
      if (assetUrls.includes(url) || assetUrls.length >= 16) continue;
      assetUrls.push(url);
      castSlots.push(firstFreeSlot(castSlots));
    }
    show.updateCue(cue.id, { assetUrls, castSlots });
    setActiveCastIndex(assetUrls.length - 1);
  };

  return (
    <div className="flex flex-col gap-4 pb-3">
      {/* editable show templates */}
      <ShowTemplates show={show} />

      {/* clock and show I/O */}
      <section className="rounded-lg border border-[#333c30] bg-[#11160f] p-2.5">
        <div className="mb-2.5 flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-cyan-300" />
          <span className="text-[10.5px] font-bold text-[#e5ece0]">Master show clock</span>
          <span className="ml-auto rounded border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-cyan-200">
            {show.bpm} BPM
          </span>
        </div>
        <input
          type="range"
          min={30}
          max={180}
          step={1}
          value={show.bpm}
          onChange={(event) => show.setBpm(Number(event.target.value))}
          className="w-full"
          aria-label="Show tempo"
        />

        <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/[0.045] p-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Clock3 className="h-3 w-3 text-cyan-300" />
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#8b9785]">
              Master slowdown
            </span>
            <span className="ml-auto font-mono text-[8px] font-bold text-cyan-200">
              {show.timeScale.toFixed(2)}× · {(1 / show.timeScale).toFixed(1)}× longer
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.05}
            value={show.timeScale}
            onChange={(event) => show.setTimeScale(Number(event.target.value))}
            className="w-full"
            aria-label="Master choreography speed"
          />
          <div className="mt-1 flex justify-between font-mono text-[7px] text-[#566151]">
            <span>cinematic slow</span><span>real time</span><span>fast</span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <Repeat className="h-3 w-3 text-[#7f8a7c]" />
          <span className="text-[9.5px] text-[#9aa69c]">Loop complete show</span>
          <SeqSwitch label="Loop complete show" checked={show.loop} onChange={show.setLoop} accent="violet" />
          <div className="flex-1" />
          <button
            type="button"
            onClick={show.exportShow}
            title="Export show JSON"
            className="rounded border border-[#3a4239] p-1.5 text-[#8e9988] transition-colors hover:border-led-lime/45 hover:text-led-lime"
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Import show JSON"
            className="rounded border border-[#3a4239] p-1.5 text-[#8e9988] transition-colors hover:border-cyan-400/45 hover:text-cyan-300"
          >
            <Upload className="h-3 w-3" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then(show.importShow);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </section>

      {/* cue strip */}
      <section>
        <Label value={<span className="font-mono text-[8px] text-[#667060]">{show.cues.length}/64</span>}>
          Scenes
        </Label>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {show.cues.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => show.selectCue(item.id)}
              className={cn(
                'min-w-[76px] shrink-0 rounded-md border px-2 py-1.5 text-left transition-all',
                cue?.id === item.id
                  ? 'border-violet-400/65 bg-violet-400/15 text-violet-100'
                  : 'border-[#333c30] bg-[#11160f] text-[#899383] hover:border-[#4b5748]'
              )}
            >
              <span className="block font-mono text-[7.5px] uppercase tracking-[0.16em] opacity-60">
                Cue {String(index + 1).padStart(2, '0')}
              </span>
              <span className="mt-0.5 block truncate text-[9.5px] font-bold">{item.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={show.addCue}
            title="Add scene"
            className="grid min-w-[38px] shrink-0 place-items-center rounded-md border border-dashed border-[#485044] text-[#7f8a7c] hover:border-led-lime/45 hover:text-led-lime"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {cue ? (
        <>
          {/* selected cue header */}
          <section className="rounded-lg border border-violet-400/25 bg-violet-400/[0.055] p-2.5">
            <div className="flex items-center gap-1.5">
              <input
                value={cue.name}
                onChange={(event) => show.updateCue(cue.id, { name: event.target.value.slice(0, 80) })}
                aria-label="Scene name"
                className="min-w-0 flex-1 rounded border border-[#3a4239] bg-[#090d0a] px-2 py-1.5 text-[10.5px] font-bold text-[#e8eee4] outline-none focus:border-violet-400/60"
              />
              <button
                type="button"
                onClick={() => show.moveCue(cue.id, -1)}
                title="Move scene earlier"
                className="rounded border border-[#3a4239] p-1.5 text-[#8e9988] hover:text-violet-300"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => show.moveCue(cue.id, 1)}
                title="Move scene later"
                className="rounded border border-[#3a4239] p-1.5 text-[#8e9988] hover:text-violet-300"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => show.duplicateCue(cue.id)}
                title="Duplicate scene"
                className="rounded border border-[#3a4239] p-1.5 text-[#8e9988] hover:text-cyan-300"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => show.removeCue(cue.id)}
                title="Delete scene"
                className="rounded border border-[#3a4239] p-1.5 text-[#8e9988] hover:border-rose-500/40 hover:text-rose-300"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </section>

          <section>
            <Label>Motion path</Label>
            <div className="grid grid-cols-3 gap-1">
              {CHOREO_MOTIONS.map((motion) => (
                <button
                  key={motion.id}
                  type="button"
                  title={motion.hint}
                  onClick={() => show.updateCue(cue.id, { motion: motion.id })}
                  className={cn(
                    'rounded-md border px-1.5 py-1.5 text-[9.5px] font-bold transition-all',
                    cue.motion === motion.id
                      ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                      : 'border-[#333c30] text-[#8e9988] hover:text-[#e5ece0]'
                  )}
                >
                  {motion.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[8.5px] leading-snug text-[#667060]">
              {CHOREO_MOTIONS.find((motion) => motion.id === cue.motion)?.hint}
            </p>
          </section>

          <section>
            <Label>Cast formation</Label>
            <div className="grid grid-cols-2 gap-1">
              {CHOREO_FORMATIONS.map((formation) => (
                <button
                  key={formation.id}
                  type="button"
                  title={formation.hint}
                  onClick={() => {
                    const exclusive = formation.id === 'solo' || formation.id === 'trail' || formation.id === 'mosaic';
                    show.updateCue(cue.id, {
                      formation: formation.id,
                      assetUrls: exclusive ? cue.assetUrls.slice(0, 1) : cue.assetUrls,
                      castSlots: exclusive ? cue.castSlots.slice(0, 1) : cue.castSlots,
                    });
                  }}
                  className={cn(
                    'rounded-md border px-1.5 py-1.5 text-[9.5px] font-bold transition-all',
                    cue.formation === formation.id
                      ? 'border-led-lime/60 bg-led-lime/15 text-led-lime'
                      : 'border-[#333c30] text-[#8e9988] hover:text-[#e5ece0]'
                  )}
                >
                  {formation.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[8.5px] leading-snug text-[#667060]">
              {CHOREO_FORMATIONS.find((formation) => formation.id === cue.formation)?.hint}
            </p>
          </section>

          <section>
            <Label
              value={
                <span className="font-mono text-[8px] text-[#768170]">
                  {cue.assetUrls.length} selected · drag to reorder
                </span>
              }
            >
              Advert cast
            </Label>
            {castAssets.length ? (
              <div className="grid grid-cols-5 gap-1.5">
                {castAssets.map((asset) => {
                  const selected = cue.assetUrls.includes(asset.url);
                  const castIndex = selected ? cue.assetUrls.indexOf(asset.url) : -1;
                  const order = castIndex + 1;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      draggable={selected}
                      title={
                        selected
                          ? `Cast ${order} · drag to reorder · click to remove`
                          : `Add ${asset.name} to the cast`
                      }
                      onDragStart={(event) => {
                        if (!selected) {
                          event.preventDefault();
                          return;
                        }
                        event.dataTransfer.setData('application/x-gridline-cast-order', String(castIndex));
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(event) => {
                        if (selected) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = Number(event.dataTransfer.getData('application/x-gridline-cast-order'));
                        if (Number.isInteger(from) && from >= 0) show.reorderCast(cue.id, from, castIndex);
                      }}
                      onClick={() => toggleAsset(asset.url)}
                      className={cn(
                        'group relative aspect-square overflow-hidden rounded-md border transition-all',
                        selected
                          ? 'border-led-lime ring-1 ring-led-lime/35'
                          : 'border-[#333c30] opacity-70 hover:opacity-100'
                      )}
                    >
                      <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-led-lime px-1 font-mono text-[7px] font-black text-[#14200f]">
                          {cue.formation === 'troupe' || cue.formation === 'wall' ? order : <Check className="h-2.5 w-2.5" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-dashed border-[#3a4239] p-3 text-center text-[9px] text-[#667060]">
                No adverts in the pool yet — add some from the library below.
              </div>
            )}

            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              title="Pick images from the asset provider library and cast them in this scene"
              className="mt-1.5 flex w-full items-center gap-2 rounded-md border border-dashed border-[#4b5a43] bg-[#141a13] px-2.5 py-1.5 text-left transition-colors hover:border-led-lime hover:bg-[#1b2418]"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-[#465640] text-led-lime">
                <FolderOpen className="h-3 w-3" />
              </span>
              <span className="leading-tight">
                <span className="block text-[10px] font-bold text-[#e8efe0]">Add from library</span>
                <span className="block text-[8px] text-[#7f8a7c]">
                  Choose pool &amp; library images for this cast
                </span>
              </span>
              <Plus className="ml-auto h-3 w-3 text-[#7f8a7c]" />
            </button>

            {cue.assetUrls.length > 0 && (
              <div className="mt-3 rounded-lg border border-[#364033] bg-[#0a0e0b] p-2.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-led-lime" />
                  <span className="text-[9.5px] font-bold text-[#dce5d7]">Cast start positions</span>
                  <span className="ml-auto font-mono text-[7.5px] text-[#65705f]">
                    drag image · or select then click slot
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: engine.panelCount }, (_, index) => index + 1).map((slot) => {
                    const castHere = cue.castSlots
                      .map((castSlot, castIndex) => ({ castSlot, castIndex }))
                      .filter((item) => item.castSlot === slot);
                    const activeTarget = activeCastIndex !== null && cue.castSlots[activeCastIndex] === slot;
                    return (
                      <div
                        key={slot}
                        role="button"
                        tabIndex={0}
                        title={`Panel ${String(slot).padStart(2, '0')}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const castIndex = Number(event.dataTransfer.getData('application/x-gridline-cast'));
                          if (Number.isInteger(castIndex)) placeCast(castIndex, slot);
                        }}
                        onClick={() => activeCastIndex !== null && placeCast(activeCastIndex, slot)}
                        onKeyDown={(event) => {
                          if ((event.key === 'Enter' || event.key === ' ') && activeCastIndex !== null) {
                            event.preventDefault();
                            placeCast(activeCastIndex, slot);
                          }
                        }}
                        className={cn(
                          'relative aspect-square overflow-hidden rounded-md border bg-[#111711] transition-all',
                          activeTarget
                            ? 'border-led-lime bg-led-lime/10 ring-1 ring-led-lime/25'
                            : 'border-[#30382e] hover:border-cyan-400/45 hover:bg-cyan-400/[0.05]'
                        )}
                      >
                        <span className="absolute left-1 top-1 z-10 font-mono text-[6.5px] font-bold text-white/45">
                          {String(slot).padStart(2, '0')}
                        </span>
                        {castHere.map(({ castIndex }, stackIndex) => (
                          <button
                            key={`${cue.assetUrls[castIndex]}-${castIndex}`}
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData('application/x-gridline-cast', String(castIndex));
                              event.dataTransfer.effectAllowed = 'move';
                              setActiveCastIndex(castIndex);
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveCastIndex(castIndex);
                            }}
                            className={cn(
                              'absolute inset-[12%] overflow-hidden rounded border shadow-lg transition-all',
                              activeCastIndex === castIndex
                                ? 'z-20 border-led-lime ring-1 ring-led-lime/50'
                                : 'border-white/25 hover:border-cyan-300',
                              stackIndex > 0 && 'translate-x-1 translate-y-1'
                            )}
                            style={{ zIndex: 10 + stackIndex }}
                            title={`Cast ${castIndex + 1} · drag to position`}
                          >
                            <img
                              src={cue.assetUrls[castIndex]}
                              alt=""
                              draggable={false}
                              className="h-full w-full object-cover"
                            />
                            <GripVertical className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded bg-black/65 text-white" />
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[8px] leading-snug text-[#65705f]">
                  Start slots seed every motion. Drag a callout on the wall preview to move it between panels.
                  For a corner wipe, place the hero advert in panel 01, 04, 13 or 16.
                </p>
              </div>
            )}
          </section>

          <section>
            <Label>Beat transition</Label>
            <div className="grid grid-cols-5 gap-1">
              {CHOREO_TRANSITIONS.map((transition) => (
                <button
                  key={transition.id}
                  type="button"
                  onClick={() => show.updateCue(cue.id, { transition: transition.id })}
                  className={cn(
                    'rounded border px-1 py-1.5 text-[8.5px] font-bold transition-all',
                    cue.transition === transition.id
                      ? 'border-amber-400/60 bg-amber-400/15 text-amber-200'
                      : 'border-[#333c30] text-[#7f8a7c] hover:text-[#e5ece0]'
                  )}
                >
                  {transition.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-amber-400/20 bg-amber-400/[0.045] p-2.5">
            <Label
              value={
                <span className="flex items-center gap-1 font-mono text-[8px] font-bold text-amber-200">
                  <Clock3 className="h-3 w-3" /> {(cue.transitionMs / 1000).toFixed(1)} sec
                </span>
              }
            >
              Transition time
            </Label>
            <input
              type="range"
              min={80}
              max={12000}
              step={100}
              value={cue.transitionMs}
              onChange={(event) => show.updateCue(cue.id, { transitionMs: Number(event.target.value) })}
              className="w-full"
            />
            <div className="mt-1 flex justify-between font-mono text-[7px] text-[#665f4b]">
              <span>80 ms</span><span>slow cinematic overlap</span><span>12 sec</span>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <Label>Scene length</Label>
              <div className="flex gap-1">
                {[2, 4, 8, 16, 32].map((beats) => (
                  <button
                    key={beats}
                    type="button"
                    onClick={() => show.updateCue(cue.id, { durationBeats: beats })}
                    className={cn(
                      'flex-1 rounded border py-1 font-mono text-[8.5px] font-bold',
                      cue.durationBeats === beats
                        ? 'border-violet-400/55 bg-violet-400/15 text-violet-200'
                        : 'border-[#333c30] text-[#7f8a7c]'
                    )}
                  >
                    {beats}b
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Motion rate</Label>
              <div className="flex gap-1">
                {[0.125, 0.25, 0.5, 1, 2].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => show.updateCue(cue.id, { speed })}
                    className={cn(
                      'flex-1 rounded border py-1 font-mono text-[8.5px] font-bold',
                      cue.speed === speed
                        ? 'border-cyan-400/55 bg-cyan-400/15 text-cyan-200'
                        : 'border-[#333c30] text-[#7f8a7c]'
                    )}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <Label value={<span className="font-mono text-[8px] text-led-lime">{Math.round(cue.intensity * 100)}%</span>}>
                Energy
              </Label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.01}
                value={cue.intensity}
                onChange={(event) => show.updateCue(cue.id, { intensity: Number(event.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <Label>Accent</Label>
              <input
                type="color"
                value={cue.accent}
                onChange={(event) => show.updateCue(cue.id, { accent: event.target.value })}
                className="h-6 w-8 rounded"
              />
            </div>
          </section>

          <section>
            <Label>Direction</Label>
            <div className="grid grid-cols-2 gap-1">
              {([
                [1, 'Clockwise / forward'],
                [-1, 'Counter / reverse'],
              ] as Array<[ChoreoDirection, string]>).map(([direction, label]) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => show.updateCue(cue.id, { direction })}
                  className={cn(
                    'rounded border py-1.5 text-[9px] font-bold',
                    cue.direction === direction
                      ? 'border-violet-400/55 bg-violet-400/15 text-violet-200'
                      : 'border-[#333c30] text-[#7f8a7c]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#333c30] bg-[#11160f] p-2.5">
            <Label
              value={<span className="font-mono text-[8px] text-[#879181]">{Math.round(show.previewProgress * 100)}%</span>}
            >
              Audition position
            </Label>
            <input
              type="range"
              min={0}
              max={0.99}
              step={0.01}
              value={show.previewProgress}
              onChange={(event) => show.scrubCue(Number(event.target.value))}
              className="w-full"
            />
            <div className="mt-2 flex items-center gap-1.5 text-[8.5px] text-[#667060]">
              <ImageIcon className="h-3 w-3" />
              Audition is local to this desk. “Run show” takes the programmed layer on air.
            </div>
          </section>
        </>
      ) : (
        <button
          type="button"
          onClick={show.addCue}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#485044] py-6 text-[10px] font-bold text-[#899383] hover:border-led-lime/45 hover:text-led-lime"
        >
          <Plus className="h-4 w-4" /> Add the first scene
        </button>
      )}

      <AssetPicker
        open={libraryOpen}
        title="Add images from library to the cast"
        targetLabel="cast"
        onClose={() => setLibraryOpen(false)}
        onSend={addLibraryToCast}
      />
    </div>
  );
}
