import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDownUp,
  FolderOpen,
  Layers,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Scaling,
  Sun,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type { AdvertTab, GroupMode, SortMode } from '../../types';
import type { AdvertEngine } from '../../engine/useAdvertEngine';
import { sortAssets } from '../../utils/sorter';
import { cn } from '../../utils/cn';
import { AssetPicker } from '../../../assetProvider/AssetProvider';
import type { LibraryAsset } from '../../../../services/assetLibrary';

const SORTS: Array<{ id: SortMode; icon: React.ElementType; label: string }> = [
  { id: 'name-asc', icon: ArrowDownAZ, label: 'Name A→Z' },
  { id: 'name-desc', icon: ArrowDownZA, label: 'Name Z→A' },
  { id: 'brightness', icon: Sun, label: 'Luminance' },
  { id: 'hue', icon: Palette, label: 'Hue' },
  { id: 'size', icon: Scaling, label: 'Resolution' },
];

const GROUP_MODES: Array<{ id: GroupMode; label: string }> = [
  { id: 'none', label: 'Flat' },
  { id: 'tone', label: 'Tone' },
  { id: 'color', label: 'Colour' },
  { id: 'aspect', label: 'Aspect' },
];

export function AdvertPool({
  engine,
  onOpenDeck,
  onClose,
}: {
  engine: AdvertEngine;
  onOpenDeck: (tab: AdvertTab) => void;
  onClose: () => void;
}) {
  const [urlDraft, setUrlDraft] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const pending = engine.pool.filter((a) => !engine.metas[a.url]).length;

  const visible = useMemo(() => {
    let list = engine.pool;
    if (engine.autoSort && engine.sortMode !== 'none') {
      list = sortAssets(list, engine.metas, engine.sortMode);
    }
    if (engine.groupFilter && engine.groupMode !== 'none') {
      const group = engine.groups.find((g) => g.id === engine.groupFilter);
      if (group) {
        const set = new Set(group.urls);
        list = list.filter((s) => set.has(s.url));
      }
    }
    return list;
  }, [engine.pool, engine.metas, engine.sortMode, engine.autoSort, engine.groupFilter, engine.groupMode, engine.groups]);

  const handleLibrarySend = (assets: LibraryAsset[]) => {
    engine.addLibraryAssets(assets.map((asset) => ({ name: asset.name, url: asset.src })));
    setLibraryOpen(false);
  };

  return (
    <aside className="h-full w-[300px] shrink-0 glass border-l border-[#2c332a] flex flex-col min-h-0">
      <div className="h-12 shrink-0 flex items-center gap-2 px-3 border-b border-[#2c332a]">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.4)]">
          <Layers className="w-3 h-3 text-[#0d0f18]" />
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <h2 className="font-led-display font-bold text-[11.5px] text-white tracking-tight">Advert pool</h2>
          <p className="text-[7.5px] font-mono text-[#7f8a7c] uppercase tracking-[0.18em]">
            second set · {engine.pool.length} images → S{String(engine.selectedSlot).padStart(2, '0')}
          </p>
        </div>
        {pending > 0 && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-[#7f8a7c] hover:text-[#e8efe0] hover:bg-[#1b2418] transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* load artwork */}
      <div className="px-3 pt-3">
        <label
          htmlFor="advert-upload"
          className="flex items-center gap-2 rounded-md border border-dashed border-[#4b5a43] hover:border-led-lime bg-[#161d14] px-2.5 py-2 cursor-pointer transition-colors"
        >
          <span className="w-6 h-6 rounded grid place-items-center border border-[#465640] text-led-lime text-[13px] shrink-0">
            ↑
          </span>
          <span className="leading-tight">
            <span className="block text-[10.5px] font-bold text-[#e8efe0]">Load advert images</span>
            <span className="block text-[8.5px] text-[#7f8a7c]">JPG · PNG · WebP — multi-select</span>
          </span>
          <Upload className="w-3.5 h-3.5 text-[#7f8a7c] ml-auto" />
        </label>
        <input
          id="advert-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) engine.addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex gap-1.5 mt-1.5">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlDraft.trim()) {
                engine.addUrl(urlDraft);
                setUrlDraft('');
              }
            }}
            placeholder="https:// artwork url"
            className="flex-1 min-w-0 bg-[#0b100c] border border-[#333c30] rounded-md px-2 py-1.5 text-[10px] font-mono text-[#dce3d9] placeholder:text-[#54604f] outline-none focus:border-led-lime/50"
          />
          <button
            type="button"
            onClick={() => {
              engine.addUrl(urlDraft);
              setUrlDraft('');
            }}
            disabled={!urlDraft.trim()}
            title="Add artwork URL to the pool"
            className="p-1.5 rounded-md border border-[#34393a] text-[#9aa69c] hover:text-led-lime hover:border-led-lime/40 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-[#4b5a43] hover:border-led-lime bg-[#161d14] px-2.5 py-2 mt-1.5 cursor-pointer transition-colors"
        >
          <span className="w-6 h-6 rounded grid place-items-center border border-[#465640] text-led-lime text-[13px] shrink-0">
            <FolderOpen className="w-3.5 h-3.5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[10.5px] font-bold text-[#e8efe0]">Add from library</span>
            <span className="block text-[8.5px] text-[#7f8a7c]">Asset provider holding area</span>
          </span>
          <FolderOpen className="w-3.5 h-3.5 text-[#7f8a7c] ml-auto" />
        </button>
      </div>

      {/* sort + group */}
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => engine.setSortMode(engine.sortMode === s.id ? 'none' : s.id)}
              title={s.label}
              className={cn(
                'p-1.5 rounded border transition-all cursor-pointer active:scale-90',
                engine.sortMode === s.id
                  ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
                  : 'border-[#333c30] text-[#7f8a7c] hover:text-[#dce3d9] hover:bg-[#1b2418]'
              )}
            >
              <s.icon className="w-3.5 h-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              engine.setSortMode('none');
              engine.handleGroupMode('none');
            }}
            title="Reset sort & grouping"
            className="p-1.5 rounded border border-[#333c30] text-[#7f8a7c] hover:text-rose-300 hover:border-rose-500/40 transition-all cursor-pointer active:scale-90"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={engine.applySortedOrder}
            disabled={engine.sortMode === 'none'}
            title="Commit the sorted order into the pool"
            className="ml-auto p-1.5 rounded border border-amber-400/40 text-amber-300 hover:bg-amber-400/15 transition-all cursor-pointer active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 mt-1.5">
          {GROUP_MODES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => engine.handleGroupMode(g.id)}
              className={cn(
                'px-1.5 py-[3px] rounded border text-[9px] font-bold transition-all cursor-pointer active:scale-95',
                engine.groupMode === g.id
                  ? 'border-indigo-400/60 bg-indigo-400/15 text-indigo-300'
                  : 'border-[#333c30] text-[#7f8a7c] hover:text-[#dce3d9]'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {engine.groupMode !== 'none' && (
          <div className="flex gap-1 mt-1.5 overflow-x-auto pb-0.5">
            {engine.groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => engine.setGroupFilter(engine.groupFilter === g.id ? null : g.id)}
                className={cn(
                  'shrink-0 px-1.5 py-[3px] rounded border text-[8.5px] font-mono font-bold transition-all cursor-pointer active:scale-95',
                  engine.groupFilter === g.id
                    ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-300'
                    : 'border-[#333c30] text-[#7f8a7c] hover:text-[#dce3d9]'
                )}
              >
                {g.label} · {g.urls.length}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* artwork grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {visible.map((asset) => {
            const meta = engine.metas[asset.url];
            return (
              <motion.div
                key={asset.id}
                layout
                className="group relative rounded-md overflow-hidden border border-[#333c30] hover:border-led-lime/60 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    engine.assignImage(engine.selectedSlot, asset.url);
                    if (!engine.active) engine.notify('Advert stored — run the layer to put it on the wall', 'info');
                  }}
                  title={`${asset.name} — load into panel ${engine.selectedSlot}`}
                  className="block w-full text-left cursor-pointer"
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    loading="lazy"
                    className="w-full h-[68px] object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1.5 pt-4 pb-1">
                    <span className="block text-[8.5px] font-bold text-[#e8efe0] truncate">
                      {asset.name}
                    </span>
                  </span>
                </button>
                {meta && (
                  <span
                    className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-black/60 shadow"
                    style={{ backgroundColor: meta.color }}
                    title={`${meta.color} · ${Math.round(meta.brightness * 100)}% lum · ${Math.round(meta.hue)}°`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => engine.removeAsset(asset.id)}
                  title="Remove from pool"
                  className="absolute top-1 left-1 p-0.5 rounded bg-black/75 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </motion.div>
            );
          })}
          {visible.length === 0 && (
            <div className="col-span-2 rounded-md border border-dashed border-[#333c30] px-3 py-6 text-center text-[10px] text-[#7f8a7c]">
              No artwork in this group.
            </div>
          )}
        </div>
        <p className="mt-2.5 text-[8.5px] font-mono text-[#6f7a69] leading-snug">
          click a card to load panel {engine.selectedSlot} · the sequencer decides when it appears
        </p>
      </div>

      {/* quick actions */}
      <div className="p-3 border-t border-[#2c332a] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => engine.distributePool()}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-led-lime/40 bg-led-lime/10 text-led-lime text-[10px] font-bold hover:bg-led-lime/20 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Fill path with this set
        </button>
        <button
          type="button"
          onClick={() => engine.applyPoster()}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-[#34393a] text-[#c0cbb8] text-[10px] font-bold hover:border-led-lime/40 hover:text-led-lime transition-all cursor-pointer active:scale-[0.98]"
        >
          <Layers className="w-3.5 h-3.5" />
          Carve master poster
        </button>
        <button
          type="button"
          onClick={() => onOpenDeck('spread')}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-[#34393a] text-[#9aa69c] text-[10px] font-bold hover:border-violet-400/50 hover:text-violet-300 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Scaling className="w-3.5 h-3.5" />
          Open spread studio
        </button>
      </div>
      <AssetPicker
        open={libraryOpen}
        title="Add from library to the choreographer"
        onClose={() => setLibraryOpen(false)}
        onSend={handleLibrarySend}
      />
    </aside>
  );
}
