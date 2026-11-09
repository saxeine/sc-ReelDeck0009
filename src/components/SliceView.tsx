import { useEffect, useMemo, useRef, useState } from "react";
import type { Frame } from "../types";
import { loadImage, uid } from "../lib/imaging";
import { Icon } from "./Icon";
import { Btn } from "./ui";

type Source = { src: string; w: number; h: number; name: string };
type Layout = { columns: number; rows: number; left: number; right: number; top: number; bottom: number; gapX: number; gapY: number };
type Cell = { index: number; x: number; y: number; w: number; h: number };
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type SavedSlice = { src: string; layout: Layout; excluded: number[]; overrides: Record<number, Cell>; xCuts: Record<number, number>; yCuts: Record<number, number>; editingBlock: number };
const CORNERS: { key: Corner; label: string }[] = [
  { key: "top-left", label: "Top left" }, { key: "top-right", label: "Top right" },
  { key: "bottom-left", label: "Bottom left" }, { key: "bottom-right", label: "Bottom right" },
];

const INITIAL: Layout = { columns: 3, rows: 2, left: 0, right: 0, top: 0, bottom: 0, gapX: 0, gapY: 0 };

/** Calculate integer pixel boundaries once for both preview and export. */
export function sliceCells(width: number, height: number, layout: Layout): Cell[] | null {
  const { columns, rows, left, right, top, bottom, gapX, gapY } = layout;
  if (![width, height, columns, rows, left, right, top, bottom, gapX, gapY].every(Number.isFinite)) return null;
  if (![columns, rows, left, right, top, bottom, gapX, gapY].every(Number.isInteger)) return null;
  if (columns < 1 || columns > 12 || rows < 1 || rows > 12 || Math.min(left, right, top, bottom, gapX, gapY) < 0) return null;
  const usableW = width - left - right - gapX * (columns - 1);
  const usableH = height - top - bottom - gapY * (rows - 1);
  if (usableW < columns || usableH < rows) return null;
  return Array.from({ length: rows * columns }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = left + Math.floor((usableW * col) / columns) + gapX * col;
    const y = top + Math.floor((usableH * row) / rows) + gapY * row;
    const endX = left + Math.floor((usableW * (col + 1)) / columns) + gapX * col;
    const endY = top + Math.floor((usableH * (row + 1)) / rows) + gapY * row;
    return { index, x, y, w: endX - x, h: endY - y };
  });
}

/** Apply divider positions to the regular grid. Values are the end of the preceding cell. */
export function adjustDividers(base: Cell[], layout: Layout, xCuts: Record<number, number>, yCuts: Record<number, number>): Cell[] {
  return base.map((cell) => {
    const col = cell.index % layout.columns;
    const row = Math.floor(cell.index / layout.columns);
    const x = col > 0 && xCuts[col - 1] !== undefined ? xCuts[col - 1] + layout.gapX : cell.x;
    const right = xCuts[col] !== undefined ? xCuts[col] : cell.x + cell.w;
    const y = row > 0 && yCuts[row - 1] !== undefined ? yCuts[row - 1] + layout.gapY : cell.y;
    const bottom = yCuts[row] !== undefined ? yCuts[row] : cell.y + cell.h;
    return { index: cell.index, x, y, w: right - x, h: bottom - y };
  });
}

/** Render the exact source pixels inside a crop without resizing or encoding them. */
function CropImage({ source, cell }: { source: Source; cell: Cell }) {
  return <img src={source.src} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute max-w-none" style={{ width: `${source.w / cell.w * 100}%`, height: `${source.h / cell.h * 100}%`, left: `${-cell.x / cell.w * 100}%`, top: `${-cell.y / cell.h * 100}%` }} />;
}

function Field({ label, value, min = 0, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(String(value)); }, [value, focused]);
  return <label className="flex min-w-0 flex-col gap-1 text-[11px] text-mute">{label}
    <input type="number" min={min} max={max} step={1} value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => { const next = e.target.value; setText(next); if (next !== "" && Number.isInteger(Number(next))) onChange(Number(next)); }}
      onBlur={() => { setFocused(false); setText(String(value)); }}
      className="h-7 w-full rounded border border-ink-600 bg-ink-950 px-2 font-mono text-[11px] text-bone outline-none focus:border-amber" />
  </label>;
}

export function SliceView({ frames, requestedFrame, onAdd }: { frames: Frame[]; requestedFrame: Frame | null; onAdd: (frames: Frame[]) => void }) {
  const [source, setSource] = useState<Source | null>(null);
  const [sourceFrameId, setSourceFrameId] = useState<string | null>(null);
  const deckSlices = useRef<Record<string, SavedSlice>>({});
  const [layout, setLayout] = useState<Layout>(INITIAL);
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set());
  const [overrides, setOverrides] = useState<Record<number, Cell>>({});
  const [xCuts, setXCuts] = useState<Record<number, number>>({});
  const [yCuts, setYCuts] = useState<Record<number, number>>({});
  const [editingBlock, setEditingBlock] = useState(0);
  const [draftCell, setDraftCell] = useState<Cell | null>(null);
  const [corner, setCorner] = useState<Corner>("top-left");
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadToken = useRef(0);
  const handleMap = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<Cell | null>(null);
  const dragStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const matRef = useRef<HTMLDivElement>(null);
  const dividerDrag = useRef<{ axis: "x" | "y"; index: number; offset: number } | null>(null);
  const baseCells = useMemo(() => source ? sliceCells(source.w, source.h, layout) : null, [source, layout]);
  const gridCells = useMemo(() => baseCells ? adjustDividers(baseCells, layout, xCuts, yCuts) : null, [baseCells, layout, xCuts, yCuts]);
  const cells = useMemo(() => gridCells?.map((cell) => overrides[cell.index] ?? cell) ?? null, [gridCells, overrides]);
  const appliedCell = cells?.[editingBlock];
  const editedCell = draftCell?.index === editingBlock ? draftCell : appliedCell;
  const hasPendingChange = !!editedCell && !!appliedCell &&
    (editedCell.x !== appliedCell.x || editedCell.y !== appliedCell.y || editedCell.w !== appliedCell.w || editedCell.h !== appliedCell.h);
  const cornerX = editedCell ? editedCell.x + (corner.endsWith("right") ? editedCell.w : 0) : 0;
  const cornerY = editedCell ? editedCell.y + (corner.startsWith("bottom") ? editedCell.h : 0) : 0;
  const selectedCount = cells?.filter((c) => !excluded.has(c.index)).length ?? 0;
  const sourceIndex = frames.findIndex((frame) => frame.id === sourceFrameId);

  const saveCurrentDeckSlice = () => {
    if (!sourceFrameId || !source) return;
    deckSlices.current[sourceFrameId] = { src: source.src, layout, excluded: [...excluded], overrides, xCuts, yCuts, editingBlock };
  };
  const choose = (next: Source, frameId: string | null = null) => {
    saveCurrentDeckSlice();
    ++loadToken.current;
    const saved = frameId ? deckSlices.current[frameId] : undefined;
    const validSaved = saved?.src === next.src ? saved : undefined;
    setSource(next);
    setSourceFrameId(frameId);
    setLayout(validSaved?.layout ?? INITIAL);
    setOverrides(validSaved?.overrides ?? {});
    setXCuts(validSaved?.xCuts ?? {}); setYCuts(validSaved?.yCuts ?? {}); setDraftCell(null);
    setEditingBlock(validSaved?.editingBlock ?? 0);
    setWorking(false);
    setExcluded(new Set(validSaved?.excluded ?? []));
    setError("");
  };
  const chooseFrame = (frame: Frame) => choose({ src: frame.src, w: frame.w, h: frame.h, name: frame.name }, frame.id);
  const cycleFrame = (direction: -1 | 1) => {
    if (!frames.length || hasPendingChange || working) return;
    const index = sourceIndex < 0 ? (direction === 1 ? 0 : frames.length - 1) : (sourceIndex + direction + frames.length) % frames.length;
    chooseFrame(frames[index]);
  };
  useEffect(() => {
    if (requestedFrame) chooseFrame(requestedFrame);
  }, [requestedFrame]);

  const upload = async (file: File) => {
    const token = ++loadToken.current;
    setError("");
    setWorking(true);
    try {
      const raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.readAsDataURL(file);
      });
      const img = await loadImage(raw);
      if (token !== loadToken.current) return;
      saveCurrentDeckSlice();
      setSource({ src: raw, w: img.naturalWidth, h: img.naturalHeight, name: file.name.replace(/\.[^.]+$/, "") || "Contact sheet" });
      setSourceFrameId(null);
      setLayout(INITIAL);
      setExcluded(new Set());
      setOverrides({});
      setXCuts({}); setYCuts({}); setDraftCell(null);
      setEditingBlock(0);
    } catch {
      if (token === loadToken.current) setError("Could not read that image. Try another image file.");
    } finally {
      if (token === loadToken.current) setWorking(false);
    }
  };

  const update = (key: keyof Layout, value: number) => {
    setLayout((l) => ({ ...l, [key]: value }));
    setOverrides({}); setXCuts({}); setYCuts({}); setDraftCell(null);
    if (key === "columns" || key === "rows") { setExcluded(new Set()); setEditingBlock(0); }
  };

  // A handle is a corner of the crop, expressed in source-image pixels.
  // Keep the opposite corner fixed and constrain the crop to the image.
  const moveCorner = (which: Corner, x: number, y: number, base = editedCell) => {
    if (!source || !base) return;
    const rightSide = which.endsWith("right");
    const bottomSide = which.startsWith("bottom");
    const right = base.x + base.w;
    const bottom = base.y + base.h;
    const px = Math.max(rightSide ? base.x + 1 : 0, Math.min(rightSide ? source.w : right - 1, Math.round(x)));
    const py = Math.max(bottomSide ? base.y + 1 : 0, Math.min(bottomSide ? source.h : bottom - 1, Math.round(y)));
    const left = rightSide ? base.x : px;
    const top = bottomSide ? base.y : py;
    setMergeTarget(null);
    setDraftCell({
      index: base.index, x: left, y: top,
      w: (rightSide ? px : right) - left, h: (bottomSide ? py : bottom) - top,
    });
  };

  const dragCorner = (e: React.PointerEvent<HTMLButtonElement>, which: Corner) => {
    const rect = handleMap.current?.getBoundingClientRect();
    const origin = dragOrigin.current;
    const start = dragStart.current;
    if (!rect || !source || !origin || !start) return;
    // Preserve the pointer's original offset from the small handle. Using the
    // absolute pointer position makes the corner jump when grabbed off-centre.
    const originalX = origin.x + (which.endsWith("right") ? origin.w : 0);
    const originalY = origin.y + (which.startsWith("bottom") ? origin.h : 0);
    const x = originalX + (e.clientX - start.x) / rect.width * source.w;
    const y = originalY + (e.clientY - start.y) / rect.height * source.h;
    const inOrigin = x >= origin.x && x <= origin.x + origin.w && y >= origin.y && y <= origin.y + origin.h;
    // Enter the centre of a different block deliberately to merge it. Edges
    // stay free for precise resizing, including when crops already overlap.
    const target = !inOrigin && cells?.find((cell) => cell.index !== origin.index &&
      x >= cell.x + cell.w * 0.25 && x <= cell.x + cell.w * 0.75 &&
      y >= cell.y + cell.h * 0.25 && y <= cell.y + cell.h * 0.75);
    if (target) {
      const left = Math.min(origin.x, target.x);
      const top = Math.min(origin.y, target.y);
      const right = Math.max(origin.x + origin.w, target.x + target.w);
      const bottom = Math.max(origin.y + origin.h, target.y + target.h);
      setMergeTarget(target.index);
      setDraftCell({ index: origin.index, x: left, y: top, w: right - left, h: bottom - top });
    } else {
      setMergeTarget(null);
      moveCorner(which, x, y, origin);
    }
  };

  // Dividers move the two adjacent grid edges together, preserving the gutter.
  const moveDivider = (axis: "x" | "y", index: number, position: number) => {
    if (!gridCells || hasPendingChange) return;
    const first = axis === "x" ? gridCells[index] : gridCells[index * layout.columns];
    const second = axis === "x" ? gridCells[index + 1] : gridCells[(index + 1) * layout.columns];
    if (!first || !second) return;
    const min = axis === "x" ? first.x + 1 : first.y + 1;
    const max = axis === "x" ? second.x + second.w - layout.gapX - 1 : second.y + second.h - layout.gapY - 1;
    const value = Math.min(max, Math.max(min, Math.round(position)));
    if (axis === "x") setXCuts((cuts) => ({ ...cuts, [index]: value }));
    else setYCuts((cuts) => ({ ...cuts, [index]: value }));
    setDraftCell(null);
  };
  const dividerPosition = (axis: "x" | "y", index: number) => {
    if (!gridCells) return 0;
    const cell = axis === "x" ? gridCells[index] : gridCells[index * layout.columns];
    return axis === "x" ? cell.x + cell.w : cell.y + cell.h;
  };
  const dividerPointer = (e: React.PointerEvent<HTMLButtonElement>, axis: "x" | "y") => {
    const rect = matRef.current?.getBoundingClientRect();
    if (!rect || !source) return 0;
    return axis === "x" ? (e.clientX - rect.left) / rect.width * source.w : (e.clientY - rect.top) / rect.height * source.h;
  };

  const add = async (mode: "selected" | "all" = "all") => {
    if (!source || !cells || working || hasPendingChange || (mode === "all" && !selectedCount)) return;
    const token = ++loadToken.current;
    setWorking(true);
    setError("");
    try {
      const image = await loadImage(source.src);
      const chosen = cells.filter((cell) => mode === "selected" ? cell.index === editingBlock : !excluded.has(cell.index));
      if (!chosen.length) return;
      const created: Frame[] = chosen.map((cell, i) => {
        const canvas = document.createElement("canvas");
        canvas.width = cell.w;
        canvas.height = cell.h;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(image, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
        return { id: uid(), name: `${source.name} · ${String(cell.index + 1).padStart(2, "0")}`, caption: "", src: canvas.toDataURL("image/png"), w: cell.w, h: cell.h, shot: "WS", status: "draft", duration: 4, tags: [], comments: [], annotated: false, createdAt: Date.now() + i };
      });
      if (token === loadToken.current) onAdd(created);
    } catch {
      if (token === loadToken.current) setError("Could not slice this image. Please try a different source.");
    } finally {
      if (token === loadToken.current) setWorking(false);
    }
  };

  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto sm:flex-row sm:overflow-hidden">
    <section className="flex min-h-[360px] min-w-0 flex-1 flex-col sm:min-h-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-900/70 px-4 py-3"><div className="min-w-0 flex-1"><div className="tk text-dim">CUTTING MAT / LIVE PREVIEW</div><div className="truncate text-[13px] font-semibold text-bone">{source ? source.name : "Choose an image to begin"}</div></div>{source && <span className="font-mono text-[10px] text-mute">{source.w} × {source.h} PX</span>}<Btn icon="check" variant="solid" disabled={!source || !cells || !selectedCount || working || hasPendingChange} onClick={() => void add()}>{working ? "Working…" : `Add ${selectedCount} block${selectedCount === 1 ? "" : "s"} to deck`}</Btn></div>
      {error && <div role="alert" className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-[12px] text-danger">{error}</div>}
      {source && !cells && <div role="alert" className="border-b border-warn/40 bg-warn/10 px-4 py-2 text-[12px] text-warn">Invalid grid: use 1–12 rows and columns and non-negative margins and gutters that leave at least one pixel per block.</div>}
      <div className="checker flex min-h-[260px] flex-1 items-start justify-center overflow-auto p-3 sm:min-h-0">
        {source ? <div ref={matRef} className="relative w-full max-w-[1000px] shrink-0 shadow-2xl" style={{ aspectRatio: `${source.w} / ${source.h}` }}><img src={source.src} alt={`Source: ${source.name}`} draggable={false} className="block h-full w-full" />{cells?.map((cell) => { const active = !excluded.has(cell.index); return <button type="button" key={cell.index} aria-label={`${active ? "Exclude" : "Include"} block ${cell.index + 1}`} aria-pressed={active} title={`${active ? "Exclude" : "Include"} block ${cell.index + 1}`} onClick={() => setExcluded((prev) => { const next = new Set(prev); if (next.has(cell.index)) next.delete(cell.index); else next.add(cell.index); return next; })} className={`absolute border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${active ? "border-amber/90 bg-amber/10 hover:bg-amber/25" : "border-bone/40 bg-black/60 hover:bg-black/40"}`} style={{ left: `${cell.x / source.w * 100}%`, top: `${cell.y / source.h * 100}%`, width: `${cell.w / source.w * 100}%`, height: `${cell.h / source.h * 100}%` }}><span className="absolute left-1 top-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white">{String(cell.index + 1).padStart(2, "0")}{!active && " · OFF"}</span></button>; })}{editedCell && (hasPendingChange || overrides[editingBlock]) && <div aria-label={`${hasPendingChange ? "Pending" : "Committed"} crop for block ${editingBlock + 1}`} className="pointer-events-none absolute z-10 overflow-hidden border-2 border-cyan shadow-[0_0_0_1px_rgba(0,0,0,0.8)]" style={{ left: `${editedCell.x / source.w * 100}%`, top: `${editedCell.y / source.h * 100}%`, width: `${editedCell.w / source.w * 100}%`, height: `${editedCell.h / source.h * 100}%` }}><CropImage source={source} cell={editedCell} /><span className="absolute left-1 top-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-cyan">{String(editingBlock + 1).padStart(2, "0")} · {hasPendingChange ? "PREVIEW" : "CROP"}</span></div>}{gridCells && (["x", "y"] as const).flatMap((axis) => Array.from({ length: (axis === "x" ? layout.columns : layout.rows) - 1 }, (_, index) => {
          const pos = dividerPosition(axis, index);
          const gap = axis === "x" ? layout.gapX : layout.gapY;
          const dimension = axis === "x" ? source.w : source.h;
          return <button key={`${axis}-${index}`} type="button" aria-label={`${axis === "x" ? "Vertical" : "Horizontal"} divider ${index + 1}`} aria-valuetext={`${pos} pixels`} title={hasPendingChange ? "Commit or discard the block edit first" : `Drag divider ${index + 1}; arrow keys move 1px, Shift moves 10px`} disabled={hasPendingChange} className={`group absolute z-20 touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${axis === "x" ? "top-0 h-full w-3 -translate-x-1/2 cursor-col-resize" : "left-0 h-3 w-full -translate-y-1/2 cursor-row-resize"} ${hasPendingChange ? "pointer-events-none opacity-40" : ""}`} style={axis === "x" ? { left: `${(pos + gap / 2) / dimension * 100}%` } : { top: `${(pos + gap / 2) / dimension * 100}%` }}
            onPointerDown={(e) => { dividerDrag.current = { axis, index, offset: dividerPointer(e, axis) - pos }; e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); }}
            onPointerMove={(e) => { const d = dividerDrag.current; if (d && e.currentTarget.hasPointerCapture(e.pointerId)) moveDivider(d.axis, d.index, dividerPointer(e, d.axis) - d.offset); }}
            onPointerUp={() => { dividerDrag.current = null; }} onPointerCancel={() => { dividerDrag.current = null; }}
            onKeyDown={(e) => { const step = e.shiftKey ? 10 : 1; const delta = axis === "x" ? (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0) : (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0); if (delta) { e.preventDefault(); moveDivider(axis, index, pos + delta); } }}>
            <span className={`pointer-events-none absolute bg-cyan/80 group-hover:bg-white ${axis === "x" ? "left-1/2 top-0 h-full w-px" : "left-0 top-1/2 h-px w-full"}`} />
            <span className={`pointer-events-none absolute rounded border border-cyan bg-ink-950 px-1 font-mono text-[9px] text-cyan ${axis === "x" ? "left-1/2 top-2 -translate-x-1/2" : "left-2 top-1/2 -translate-y-1/2"}`}>⋮</span>
          </button>;
        }))}</div> : <div className="max-w-xs text-center"><Icon name="scissors" size={34} className="mx-auto text-amber" /><h3 className="display mt-3 text-[26px] text-bone">READY TO CUT</h3><p className="mt-1 text-[12px] leading-relaxed text-mute">Upload a contact sheet or select a deck image. Adjust the grid, then add your chosen blocks as new frames.</p><Btn className="mt-4" icon="upload" onClick={() => fileRef.current?.click()}>Choose an image</Btn></div>}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-ink-900 px-4 py-2 font-mono text-[10px] text-dim"><span className="text-amber">{selectedCount} BLOCKS SELECTED</span><span>ORDER: LEFT TO RIGHT, TOP TO BOTTOM</span><span className="ml-auto">ORIGINAL IMAGE PRESERVED</span></div>
    </section>
    <aside className="w-full shrink-0 space-y-3 border-t border-line bg-ink-900/80 p-3 sm:w-[220px] sm:overflow-y-auto sm:border-l sm:border-t-0 lg:w-[240px]">
      <div><div className="tk text-amber">SLICE STUDIO / CONTROLS</div><p className="mt-1 text-[10px] leading-snug text-mute">Choose an image and adjust the grid. The original stays untouched.</p></div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-amber/60 bg-amber/10 px-2 py-2 text-[11px] font-semibold text-amber hover:bg-amber/20"><Icon name="upload" size={16} /> Upload a contact sheet<input ref={fileRef} type="file" accept="image/*" disabled={hasPendingChange || working} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} /></label>
      <label className="block text-[11px] text-mute">Or choose an image from the deck
        <select aria-label="Choose deck image" value={sourceIndex >= 0 ? sourceFrameId ?? "" : ""} disabled={hasPendingChange || working} onChange={(e) => { const f = frames.find((frame) => frame.id === e.target.value); if (f) chooseFrame(f); }} className="mt-1 h-7 w-full rounded border border-ink-600 bg-ink-950 px-2 text-[12px] text-bone">
          <option value="">Choose a frame…</option>{frames.map((f, i) => <option key={f.id} value={f.id}>{String(i + 1).padStart(2, "0")} · {f.name}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-1" aria-label="Browse deck images">
        <Btn size="xs" icon="left" disabled={!frames.length || hasPendingChange || working} onClick={() => cycleFrame(-1)} aria-label="Previous deck image">Previous</Btn>
        <span className="min-w-0 flex-1 text-center font-mono text-[10px] text-dim">{sourceIndex >= 0 ? `${sourceIndex + 1} / ${frames.length}` : `— / ${frames.length}`}</span>
        <Btn size="xs" icon="right" disabled={!frames.length || hasPendingChange || working} onClick={() => cycleFrame(1)} aria-label="Next deck image">Next</Btn>
      </div>
      <p className="text-[10px] leading-snug text-dim">Browse in deck order; committed slice edits are kept when you return. {hasPendingChange ? "Commit or discard the current block edit to browse." : ""}</p>
      <div className="border-t border-line pt-3"><div className="tk mb-2 text-amber">02 / GRID</div><div className="grid grid-cols-2 gap-2"><Field label="Columns" value={layout.columns} min={1} max={12} onChange={(v) => update("columns", v)} /><Field label="Rows" value={layout.rows} min={1} max={12} onChange={(v) => update("rows", v)} /></div><p className="mt-1 text-[10px] text-dim">Drag the cyan dividers on the image to resize adjacent blocks; click a block to include or exclude it. Manual block crops stay fixed when dividers move.</p></div>
      <div className="border-t border-line pt-3"><div className="tk mb-2 text-amber">03 / TRIM IN PIXELS</div><p className="mb-2 text-[10px] leading-snug text-dim">Margins trim edges; gutters remove gaps.</p><div className="grid grid-cols-2 gap-2">{([ ["left", "Left margin"], ["right", "Right margin"], ["top", "Top margin"], ["bottom", "Bottom margin"], ["gapX", "Horizontal gutter"], ["gapY", "Vertical gutter"] ] as const).map(([key, label]) => <Field key={key} label={label} value={layout[key]} onChange={(v) => update(key, v)} />)}</div></div>
      <div className="border-t border-line pt-3">
        <div className="tk mb-2 text-amber">04 / BLOCK HANDLES</div>
        {editedCell && source ? <>
          <label className="block text-[11px] text-mute">Adjust block
            <select aria-label="Block to adjust" value={editingBlock} disabled={hasPendingChange} onChange={(e) => { setDraftCell(null); setEditingBlock(Number(e.target.value)); }} className="mt-1 h-7 w-full rounded border border-ink-600 bg-ink-950 px-2 text-[11px] text-bone">
              {cells?.map((cell) => <option key={cell.index} value={cell.index}>Block {cell.index + 1}{excluded.has(cell.index) ? " (excluded)" : ""}</option>)}
            </select>
          </label>
          <div className="mt-3 rounded border border-line bg-ink-950 p-2">
            <div className="mb-1 flex items-center justify-between gap-1"><span className="tk text-dim">BLOCK RESULT</span><span className={hasPendingChange ? "font-mono text-[9px] text-amber" : "font-mono text-[9px] text-dim"}>{hasPendingChange ? "UNCOMMITTED" : "CURRENT"}</span></div>
            <div className="checker flex min-h-16 items-center justify-center overflow-hidden rounded p-1">
              <div role="img" aria-label={`Live cropped image preview for block ${editingBlock + 1}`} className="relative overflow-hidden" style={{ aspectRatio: `${editedCell.w} / ${editedCell.h}`, width: `min(100%, ${Math.max(1, 140 * editedCell.w / editedCell.h)}px)` }}><CropImage source={source} cell={editedCell} /></div>
            </div>
          </div>
          <p className="my-2 text-[10px] leading-snug text-dim">Drag a corner to resize. Drag into the centre of another block to preview a combined crop. Commit to apply; grid changes reset adjustments.</p>
          <div className="mx-2 my-3">
            <div ref={handleMap} aria-label="Block handle map" className="relative h-28 w-full rounded border border-line bg-ink-950 touch-none">
              {cells?.map((cell) => <div key={cell.index} aria-hidden="true" className="pointer-events-none absolute overflow-hidden border border-line/70 font-mono text-[8px] leading-none text-dim" style={{ left: `${cell.x / source.w * 100}%`, top: `${cell.y / source.h * 100}%`, width: `${cell.w / source.w * 100}%`, height: `${cell.h / source.h * 100}%` }}>{cell.index + 1}</div>)}
              <div className="pointer-events-none absolute border border-dashed border-amber/70 bg-amber/10" style={{ left: `${editedCell.x / source.w * 100}%`, top: `${editedCell.y / source.h * 100}%`, width: `${editedCell.w / source.w * 100}%`, height: `${editedCell.h / source.h * 100}%` }} />
              {CORNERS.map(({ key, label }) => {
                const x = editedCell.x + (key.endsWith("right") ? editedCell.w : 0);
                const y = editedCell.y + (key.startsWith("bottom") ? editedCell.h : 0);
                return <button type="button" key={key} aria-label={`${label} handle`} aria-pressed={corner === key} title={`${label} — drag or use arrow keys`} className={`absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${corner === key ? "border-amber bg-amber" : "border-amber bg-ink-900"}`} style={{ left: `${x / source.w * 100}%`, top: `${y / source.h * 100}%` }} onPointerDown={(e) => { dragOrigin.current = { ...editedCell }; dragStart.current = { x: e.clientX, y: e.clientY, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); setCorner(key); e.preventDefault(); }} onPointerMove={(e) => { const start = dragStart.current; if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 3) start.moved = true; if (start?.moved && e.currentTarget.hasPointerCapture(e.pointerId)) dragCorner(e, key); }} onPointerUp={(e) => { if (dragStart.current?.moved) dragCorner(e, key); dragOrigin.current = null; dragStart.current = null; }} onPointerCancel={() => { if (dragOrigin.current) setDraftCell(dragOrigin.current); setMergeTarget(null); dragOrigin.current = null; dragStart.current = null; }} onKeyDown={(e) => { const step = e.shiftKey ? 10 : 1; const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0; const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0; if (dx || dy) { e.preventDefault(); setCorner(key); moveCorner(key, x + dx, y + dy); } }} />;
              })}
            </div>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-1">{CORNERS.map(({ key, label }) => <button key={key} type="button" aria-pressed={corner === key} onClick={() => setCorner(key)} className={`rounded border px-1 py-1 text-[10px] ${corner === key ? "border-amber bg-amber/10 text-amber" : "border-line text-mute hover:text-bone"}`}>{label}</button>)}</div>
          <div className="grid grid-cols-2 gap-2"><Field label="Handle X (px)" value={cornerX} max={source.w} onChange={(x) => moveCorner(corner, x, cornerY)} /><Field label="Handle Y (px)" value={cornerY} max={source.h} onChange={(y) => moveCorner(corner, cornerX, y)} /></div>
          <div className="mt-2 flex items-center justify-between gap-1"><span className="font-mono text-[10px] text-dim">{editedCell.w} × {editedCell.h} PX</span><button type="button" onClick={() => { const initial = gridCells?.[editingBlock]; if (initial) setDraftCell({ ...initial }); setMergeTarget(null); }} className="text-[10px] text-mute underline hover:text-amber">Reset block</button></div>
          <div className="mt-2 flex gap-1">
            <Btn size="xs" variant="solid" disabled={!hasPendingChange} onClick={() => { if (editedCell) { setOverrides((prev) => ({ ...prev, [editingBlock]: { ...editedCell } })); setDraftCell(null); setMergeTarget(null); } }}>Commit changes</Btn>
            <Btn size="xs" variant="ghost" disabled={!hasPendingChange} onClick={() => { setDraftCell(null); setMergeTarget(null); }}>Discard</Btn>
          </div>
          {mergeTarget !== null && hasPendingChange && <p className="mt-1 text-[10px] text-cyan">Previewing block {editingBlock + 1} combined with block {mergeTarget + 1}.</p>}
          {hasPendingChange && <p role="status" className="mt-1 text-[10px] text-amber">Uncommitted — commit or discard before adding blocks or switching blocks.</p>}
          <Btn size="xs" icon="send" className="mt-2 w-full" disabled={working || hasPendingChange} onClick={() => void add("selected")}>Send block {editingBlock + 1} to ReelDeck</Btn>
          <p className="mt-1 text-[10px] leading-snug text-dim">Sends this block only, even if it is excluded from the batch.</p>
        </> : <p className="text-[10px] text-dim">Choose an image and a valid grid to adjust block corners.</p>}
      </div>
      <button type="button" onClick={() => { setLayout(INITIAL); setExcluded(new Set()); setOverrides({}); setXCuts({}); setYCuts({}); setEditingBlock(0); setDraftCell(null); }} className="text-[11px] text-mute underline hover:text-amber">Reset grid and trim</button>
    </aside>
  </div>;
}
