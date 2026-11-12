import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { Btn } from "../ui";
import { useAssetLibrary } from "../../hooks/useAssetLibrary";
import {
  addLibraryAssets,
  removeLibraryAssets,
  updateLibraryAsset,
  type AssetOrigin,
  type LibraryAsset,
  type NewLibraryAsset,
} from "../../services/assetLibrary";

const ORIGIN_LABELS: Record<AssetOrigin, string> = {
  upload: "UPLOAD",
  slice: "SLICE",
  zoom: "ZOOM",
  frame: "FRAME",
};

type OriginFilter = AssetOrigin | "all" | "favorite";

const FILTERS: Array<{ key: OriginFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "upload", label: "Uploads" },
  { key: "slice", label: "Slices" },
  { key: "zoom", label: "Zoom" },
  { key: "favorite", label: "Favourites" },
];

function matchesQuery(asset: LibraryAsset, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    asset.name.toLowerCase().includes(needle) ||
    asset.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
    asset.origin.includes(needle)
  );
}

function filterAssets(assets: LibraryAsset[], filter: OriginFilter, query: string) {
  return assets.filter((asset) => {
    if (filter === "favorite" && !asset.favorite) return false;
    if (filter !== "all" && filter !== "favorite" && asset.origin !== filter) return false;
    return matchesQuery(asset, query);
  });
}

/**
 * The asset provider space: an editable holding area backed by the library
 * database. It receives sliced blocks and zoom creations and feeds the
 * sequencer and the choreographer (via AssetPicker) and the ReelDeck board.
 */
export function AssetProvider({ onAddToDeck }: { onAddToDeck?: (assets: LibraryAsset[]) => void }) {
  const assets = useAssetLibrary();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OriginFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => filterAssets(assets, filter, query), [assets, filter, query]);
  const inspector = selected.length === 1 ? assets.find((asset) => asset.id === selected[0]) ?? null : null;

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const reads = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => new Promise<NewLibraryAsset | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const src = String(reader.result || "");
          const name = file.name.replace(/\.[^.]+$/, "");
          if (!src) { resolve(null); return; }
          const img = new Image();
          img.onload = () => resolve({ name, origin: "upload", src, w: img.naturalWidth, h: img.naturalHeight });
          // Keep the asset even when dimensions cannot be measured.
          img.onerror = () => resolve({ name, origin: "upload", src });
          img.src = src;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }));
    void Promise.all(reads).then((items) => addLibraryAssets(items.filter((item): item is NewLibraryAsset => item !== null)));
  };

  const deleteSelected = () => {
    if (!selected.length) return;
    void removeLibraryAssets(selected);
    setSelected([]);
  };

  const addTag = (asset: LibraryAsset, tag: string) => {
    const clean = tag.trim();
    if (!clean || asset.tags.includes(clean)) return;
    void updateLibraryAsset(asset.id, { tags: [...asset.tags, clean] });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-900/70 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="tk text-dim">ASSET PROVIDER / HOLDING AREA</div>
          <div className="truncate text-[13px] font-semibold text-bone">
            {assets.length} asset{assets.length === 1 ? "" : "s"} · feeds the sequencer &amp; choreographer
          </div>
        </div>
        <label className="flex items-center gap-1.5 rounded-[6px] border border-line bg-ink-950 px-2 py-1.5 text-mute">
          <Icon name="search" size={13} />
          <input
            aria-label="Search the library"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or tag"
            className="w-40 bg-transparent text-[11px] text-bone outline-none placeholder:text-mute"
          />
        </label>
        <Btn icon="upload" variant="solid" onClick={() => fileRef.current?.click()}>Add images</Btn>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(event) => { handleFiles(event.target.files); event.target.value = ""; }} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-ink-900/40 px-4 py-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              filter === item.key
                ? "border-amber bg-amber/15 text-amber"
                : "border-line text-mute hover:border-mute hover:text-bone"
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-mute">{selected.length} selected</span>
          <Btn size="xs" onClick={() => setSelected(visible.map((asset) => asset.id))}>Select all</Btn>
          <Btn size="xs" onClick={() => setSelected([])}>Clear</Btn>
          {onAddToDeck && (
            <Btn size="xs" icon="plus" disabled={!selected.length}
              onClick={() => onAddToDeck(assets.filter((asset) => selected.includes(asset.id)))}>
              Add to board
            </Btn>
          )}
          <Btn size="xs" variant="danger" icon="trash" disabled={!selected.length} onClick={deleteSelected}>Delete</Btn>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {visible.length === 0 ? (
            <div className="mx-auto max-w-xs py-16 text-center">
              <Icon name="folder" size={34} className="mx-auto text-amber" />
              <h3 className="display mt-3 text-[22px] text-bone">THE LIBRARY IS EMPTY</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-mute">
                Add images here, or save slices from the Slice studio and creations from Zoom Studio.
                Library artwork feeds the sequencer and the choreographer.
              </p>
              <Btn className="mt-4" icon="upload" onClick={() => fileRef.current?.click()}>Add images</Btn>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((asset) => {
                const isSelected = selected.includes(asset.id);
                return (
                  <div
                    key={asset.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => toggle(asset.id)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(asset.id); } }}
                    className={`group cursor-pointer overflow-hidden rounded-[6px] border transition-colors ${
                      isSelected ? "border-amber ring-1 ring-amber/60" : "border-line hover:border-mute"
                    }`}
                  >
                    <img src={asset.src} alt="" draggable={false} className="aspect-video w-full bg-ink-950 object-cover" />
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <span className="truncate text-[11px] text-bone">{asset.name}</span>
                      <span className="tk ml-auto shrink-0 rounded border border-line px-1 py-0.5 text-[8px] text-mute">
                        {ORIGIN_LABELS[asset.origin]}
                      </span>
                      <button
                        type="button"
                        aria-label={asset.favorite ? "Remove from favourites" : "Add to favourites"}
                        title={asset.favorite ? "Remove from favourites" : "Add to favourites"}
                        onClick={(event) => { event.stopPropagation(); void updateLibraryAsset(asset.id, { favorite: !asset.favorite }); }}
                        className={`shrink-0 ${asset.favorite ? "text-amber" : "text-mute opacity-0 group-hover:opacity-100"}`}
                      >
                        <Icon name="spark" size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {inspector && (
          <aside className="hidden w-[250px] shrink-0 flex-col gap-3 overflow-auto border-l border-line bg-ink-900/60 p-4 lg:flex">
            <img src={inspector.src} alt="" draggable={false} className="w-full rounded-[6px] border border-line bg-ink-950 object-contain" />
            <label className="flex flex-col gap-1 text-[10px] text-mute">
              NAME
              <input
                key={inspector.id}
                defaultValue={inspector.name}
                aria-label="Asset name"
                onBlur={(event) => { if (event.target.value.trim() && event.target.value !== inspector.name) void updateLibraryAsset(inspector.id, { name: event.target.value }); }}
                onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }}
                className="h-7 rounded border border-line bg-ink-950 px-2 text-[11px] text-bone outline-none focus:border-amber"
              />
            </label>
            <div className="flex flex-col gap-1 text-[10px] text-mute">
              TAGS
              <div className="flex flex-wrap gap-1">
                {inspector.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[9px] text-bone">
                    {tag}
                    <button type="button" aria-label={`Remove tag ${tag}`}
                      onClick={() => void updateLibraryAsset(inspector.id, { tags: inspector.tags.filter((item) => item !== tag) })}
                      className="text-mute hover:text-bone">
                      <Icon name="x" size={9} />
                    </button>
                  </span>
                ))}
                {inspector.tags.length === 0 && <span className="text-[9px] text-mute">No tags yet</span>}
              </div>
              <input
                value={tagDraft}
                aria-label="Add tag"
                placeholder="Add tag + Enter"
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { addTag(inspector, tagDraft); setTagDraft(""); }
                }}
                className="h-7 rounded border border-line bg-ink-950 px-2 text-[11px] text-bone outline-none focus:border-amber"
              />
            </div>
            <Btn size="sm" icon="spark" onClick={() => void updateLibraryAsset(inspector.id, { favorite: !inspector.favorite })}>
              {inspector.favorite ? "Unfavourite" : "Favourite"}
            </Btn>
            {onAddToDeck && <Btn size="sm" icon="plus" onClick={() => onAddToDeck([inspector])}>Add to board</Btn>}
            <div className="text-[9px] leading-relaxed text-mute">
              {ORIGIN_LABELS[inspector.origin]} · {inspector.w || "?"}×{inspector.h || "?"} PX
              {" · ADDED "}
              {new Date(inspector.createdAt).toLocaleDateString()}
            </div>
            <Btn size="sm" variant="danger" icon="trash" onClick={() => { void removeLibraryAssets([inspector.id]); setSelected([]); }}>
              Delete asset
            </Btn>
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * Consumer-side picker. The sequencer and the choreographer pull library
 * artwork through this dialog, so the provider feeds them on demand.
 */
export function AssetPicker({ open, title = "Add from library", targetLabel, onClose, onSend }: {
  open: boolean;
  title?: string;
  /** What the send button adds the picks to (e.g. "pool", "cast"). */
  targetLabel?: string;
  onClose: () => void;
  onSend: (assets: LibraryAsset[]) => void;
}) {
  const assets = useAssetLibrary();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (open) { setQuery(""); setPicked([]); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const visible = useMemo(() => filterAssets(assets, "all", query), [assets, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[8px] border border-line bg-ink-900 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Icon name="folder" size={16} className="text-amber" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-bone">{title}</div>
            <div className="text-[9px] text-mute">ASSET PROVIDER · {assets.length} STORED</div>
          </div>
          <label className="flex items-center gap-1.5 rounded-[6px] border border-line bg-ink-950 px-2 py-1.5 text-mute">
            <Icon name="search" size={12} />
            <input
              aria-label="Search the library"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-28 bg-transparent text-[11px] text-bone outline-none placeholder:text-mute"
            />
          </label>
          <Btn size="xs" onClick={onClose}>Close</Btn>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {visible.length === 0 ? (
            <div className="py-12 text-center text-[11px] text-mute">
              No library assets yet. Add images, slices, or zoom creations in the Library first.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((asset) => {
                const isPicked = picked.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={isPicked}
                    onClick={() => setPicked((prev) => (prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id]))}
                    className={`overflow-hidden rounded-[6px] border text-left transition-colors ${
                      isPicked ? "border-amber ring-1 ring-amber/60" : "border-line hover:border-mute"
                    }`}
                  >
                    <img src={asset.src} alt="" draggable={false} className="aspect-video w-full bg-ink-950 object-cover" />
                    <div className="truncate px-2 py-1.5 text-[10px] text-bone">{asset.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="text-[10px] text-mute">{picked.length} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Btn size="sm" onClick={onClose}>Cancel</Btn>
            <Btn
              size="sm"
              variant="solid"
              icon="plus"
              disabled={!picked.length}
              onClick={() =>
                onSend(
                  picked
                    .map((id) => assets.find((asset) => asset.id === id))
                    .filter((asset): asset is LibraryAsset => Boolean(asset)),
                )
              }
            >
              Add {picked.length || ""} to {targetLabel ?? (title.toLowerCase().includes("choreograph") ? "pool" : "sources")}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
