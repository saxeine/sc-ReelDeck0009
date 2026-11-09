import { useEffect, useRef, useState } from "react";
import { Check, Grid2X2, Save, Scissors, Trash2, X } from "lucide-react";
import { CustomizableButton } from "./CustomizableButton";
import { CustomizableContainer } from "./CustomizableContainer";
import { CustomizableLabel } from "./CustomizableLabel";
import { remoteStore } from "../services/remoteKeyValueStore";
import {
  defaultFrontPanelGridRegions,
  frontPanelRegionAnchor,
  normalizeFrontPanelGridRegions,
  type FrontPanelGridRegion,
} from "../types/frontPanelGrid";

type GridMode = "2x2" | "3x3" | "4x4";
type GridConfiguration = { name: string; mode: GridMode; activeSlots: number[]; regions?: FrontPanelGridRegion[] };
type SelectionBand = { top: number; left: number; bottom: number; right: number };

type Props = {
  mode: GridMode;
  activeSlots: number[];
  regions?: FrontPanelGridRegion[];
  onApply: (mode: GridMode, activeSlots: number[], regions: FrontPanelGridRegion[]) => void;
  onClose: () => void;
};

const STORAGE_KEY = "seqcarver_grid_configurations_v1";
const MODES: { id: GridMode; label: string; description: string }[] = [
  { id: "4x4", label: "4 × 4", description: "Shared AdShop / Choreographer wall · 16 cells" },
];
const buttonClass = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400 hover:bg-slate-800 cursor-pointer disabled:opacity-40";
const LAYOUT_PRESETS = [
  { id: "regular", label: "Regular", description: "Equal-size panels" },
  { id: "horizontal-halves", label: "Top / bottom", description: "Two horizontal bands" },
  { id: "vertical-halves", label: "Left / right", description: "Two vertical bands" },
  { id: "quadrants", label: "Quadrants", description: "Four balanced regions" },
  { id: "center-hero", label: "Center hero", description: "Large centered feature" },
  { id: "left-hero", label: "Left feature", description: "Tall feature panel" },
  { id: "top-banner", label: "Top banner", description: "Wide top feature" },
  { id: "corner-hero", label: "Corner feature", description: "Large top-left panel" },
  { id: "right-hero", label: "Right feature", description: "Tall right-side feature" },
  { id: "staircase", label: "Diagonal pair", description: "Two offset feature panels" },
] as const;

type RegionRect = Pick<FrontPanelGridRegion, "row" | "col" | "rowSpan" | "colSpan">;

function presetRegions(id: string, side: number): FrontPanelGridRegion[] {
  const half = Math.ceil(side / 2);
  const otherHalf = side - half;
  const smallSpan = Math.min(2, side);
  const centered = Math.floor((side - smallSpan) / 2);
  let rectangles: RegionRect[] = [];
  switch (id) {
    case "horizontal-halves":
      rectangles = [{ row: 0, col: 0, rowSpan: half, colSpan: side }, { row: half, col: 0, rowSpan: otherHalf, colSpan: side }];
      break;
    case "vertical-halves":
      rectangles = [{ row: 0, col: 0, rowSpan: side, colSpan: half }, { row: 0, col: half, rowSpan: side, colSpan: otherHalf }];
      break;
    case "quadrants":
      rectangles = [
        { row: 0, col: 0, rowSpan: half, colSpan: half },
        { row: 0, col: half, rowSpan: half, colSpan: otherHalf },
        { row: half, col: 0, rowSpan: otherHalf, colSpan: half },
        { row: half, col: half, rowSpan: otherHalf, colSpan: otherHalf },
      ];
      break;
    case "center-hero":
      rectangles = [{ row: centered, col: centered, rowSpan: smallSpan, colSpan: smallSpan }];
      break;
    case "left-hero":
      rectangles = [{ row: 0, col: 0, rowSpan: side, colSpan: half }];
      break;
    case "top-banner":
      rectangles = [{ row: 0, col: 0, rowSpan: half, colSpan: side }];
      break;
    case "corner-hero":
      rectangles = [{ row: 0, col: 0, rowSpan: smallSpan, colSpan: smallSpan }];
      break;
    case "right-hero":
      rectangles = [{ row: 0, col: half, rowSpan: side, colSpan: otherHalf }];
      break;
    case "staircase":
      rectangles = [
        { row: 0, col: 0, rowSpan: smallSpan, colSpan: smallSpan },
        { row: side - smallSpan, col: side - smallSpan, rowSpan: smallSpan, colSpan: smallSpan },
      ];
      break;
    default:
      return defaultFrontPanelGridRegions(side);
  }
  rectangles = rectangles.filter((rect) => rect.rowSpan > 0 && rect.colSpan > 0);
  const occupied = new Set<number>();
  const result: FrontPanelGridRegion[] = [];
  for (const rect of rectangles) {
    let overlaps = false;
    for (let row = rect.row; row < rect.row + rect.rowSpan; row++) {
      for (let col = rect.col; col < rect.col + rect.colSpan; col++) {
        const cell = row * side + col;
        if (occupied.has(cell)) overlaps = true;
      }
    }
    if (overlaps) continue;
    result.push({ ...rect, active: true });
    for (let row = rect.row; row < rect.row + rect.rowSpan; row++) {
      for (let col = rect.col; col < rect.col + rect.colSpan; col++) occupied.add(row * side + col);
    }
  }
  for (const cell of defaultFrontPanelGridRegions(side)) {
    if (!occupied.has(cell.row * side + cell.col)) result.push(cell);
  }
  return result.sort((a, b) => a.row - b.row || a.col - b.col);
}

function geometrySignature(regions: FrontPanelGridRegion[]): string {
  return [...regions].sort((a, b) => a.row - b.row || a.col - b.col)
    .map(({ row, col, rowSpan, colSpan }) => `${row},${col},${rowSpan},${colSpan}`).join(";");
}

function readConfigurations(): GridConfiguration[] {
  try {
    const parsed = JSON.parse(remoteStore.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is GridConfiguration =>
      item && typeof item.name === "string" && item.mode === "4x4" && Array.isArray(item.activeSlots),
    ).map((item) => ({
      ...item,
      activeSlots: item.activeSlots.filter((slot: unknown) => Number.isInteger(slot) && Number(slot) > 0),
      regions: normalizeFrontPanelGridRegions(item.regions ?? defaultFrontPanelGridRegions(Number(item.mode[0]), item.activeSlots), Number(item.mode[0])),
    }));
  } catch {
    return [];
  }
}

function makeBand(rowA: number, colA: number, rowB: number, colB: number): SelectionBand {
  return { top: Math.min(rowA, rowB), left: Math.min(colA, colB), bottom: Math.max(rowA, rowB), right: Math.max(colA, colB) };
}

function bandArea(band: SelectionBand): number {
  return (band.bottom - band.top + 1) * (band.right - band.left + 1);
}

function regionIsInsideBand(region: FrontPanelGridRegion, band: SelectionBand): boolean {
  return region.row >= band.top && region.col >= band.left &&
    region.row + region.rowSpan - 1 <= band.bottom && region.col + region.colSpan - 1 <= band.right;
}

/** Build and save rectangular panel-span layouts over a square grid. */
export function GridConfigurationStudio({ mode, activeSlots, regions, onApply, onClose }: Props) {
  const [draftMode, setDraftMode] = useState<GridMode>(mode);
  const initialSide = Number(mode[0]);
  const [draftRegions, setDraftRegions] = useState<FrontPanelGridRegion[]>(() =>
    normalizeFrontPanelGridRegions(regions ?? defaultFrontPanelGridRegions(initialSide, activeSlots), initialSide),
  );
  const [selection, setSelection] = useState<SelectionBand | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<GridConfiguration[]>(readConfigurations);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const closeRef = useRef<HTMLElement>(null);
  const closeHandler = useRef(onClose);
  const anchorCell = useRef<{ row: number; col: number } | null>(null);
  const dragged = useRef(false);
  const skipClick = useRef(false);
  closeHandler.current = onClose;

  const side = Number(draftMode[0]);
  const total = side * side;
  const activePanelSlots = draftRegions.filter((region) => region.active).map((region) => frontPanelRegionAnchor(region, side));
  const layoutOptions = LAYOUT_PRESETS.map((preset) => ({ ...preset, regions: presetRegions(preset.id, side) }))
    .filter((preset, index, list) => list.findIndex((candidate) => geometrySignature(candidate.regions) === geometrySignature(preset.regions)) === index);
  const setNoticeBriefly = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeHandler.current(); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previous?.focus();
    };
  }, []);

  const chooseMode = (nextMode: GridMode) => {
    if (nextMode === draftMode) return;
    const nextSide = Number(nextMode[0]);
    const nextTotal = nextSide * nextSide;
    setDraftMode(nextMode);
    setDraftRegions(defaultFrontPanelGridRegions(nextSide, activePanelSlots.filter((slot) => slot <= nextTotal)));
    setSelection(null);
  };

  const beginBand = (row: number, col: number) => {
    anchorCell.current = { row, col };
    dragged.current = false;
    skipClick.current = false;
    setSelection(makeBand(row, col, row, col));
  };

  const extendBand = (row: number, col: number) => {
    if (!anchorCell.current) return;
    if (anchorCell.current.row !== row || anchorCell.current.col !== col) dragged.current = true;
    setSelection(makeBand(anchorCell.current.row, anchorCell.current.col, row, col));
  };

  const regionAt = (row: number, col: number, list = draftRegions) =>
    list.find((region) => row >= region.row && row < region.row + region.rowSpan && col >= region.col && col < region.col + region.colSpan);

  const togglePanelAt = (row: number, col: number) => {
    const target = regionAt(row, col);
    if (!target) return;
    setDraftRegions((previous) => previous.map((region) => region.row === target.row && region.col === target.col
      ? { ...region, active: !region.active }
      : region));
  };

  const handleBandClick = (row: number, col: number) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    setSelection(makeBand(row, col, row, col));
    togglePanelAt(row, col);
  };

  const mergeSelection = () => {
    if (!selection || bandArea(selection) < 2) {
      setNoticeBriefly("Drag across two or more cells to select a merge area.");
      return;
    }
    const enclosed = draftRegions.filter((region) => regionIsInsideBand(region, selection));
    const coveredCells = enclosed.reduce((sum, region) => sum + region.rowSpan * region.colSpan, 0);
    if (coveredCells !== bandArea(selection) || enclosed.length < 2) {
      setNoticeBriefly("Select complete panel tiles in a rectangle before merging.");
      return;
    }
    const merged: FrontPanelGridRegion = {
      row: selection.top,
      col: selection.left,
      rowSpan: selection.bottom - selection.top + 1,
      colSpan: selection.right - selection.left + 1,
      active: enclosed.some((region) => region.active),
    };
    setDraftRegions((previous) => [...previous.filter((region) => !enclosed.includes(region)), merged]
      .sort((a, b) => a.row - b.row || a.col - b.col));
    setNoticeBriefly(`Merged ${coveredCells} cells into panel ${frontPanelRegionAnchor(merged, side)}.`);
  };

  const splitSelection = () => {
    if (!selection) return;
    const target = regionAt(selection.top, selection.left);
    if (!target || target.rowSpan * target.colSpan === 1) {
      setNoticeBriefly("Select a merged panel to split it back into cells.");
      return;
    }
    const units = Array.from({ length: target.rowSpan * target.colSpan }, (_, index) => ({
      row: target.row + Math.floor(index / target.colSpan),
      col: target.col + (index % target.colSpan),
      rowSpan: 1,
      colSpan: 1,
      active: target.active,
    }));
    setDraftRegions((previous) => [...previous.filter((region) => region !== target), ...units]
      .sort((a, b) => a.row - b.row || a.col - b.col));
    setNoticeBriefly(`Split panel ${frontPanelRegionAnchor(target, side)} into ${units.length} cells.`);
  };

  const saveConfiguration = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const config: GridConfiguration = { name: trimmed, mode: draftMode, activeSlots: activePanelSlots, regions: draftRegions };
    const next = [...saved.filter((item) => item.name.toLowerCase() !== trimmed.toLowerCase()), config];
    setSaved(next);
    remoteStore.setItem(STORAGE_KEY, JSON.stringify(next));
    setName("");
    setNoticeBriefly(`Saved “${trimmed}”.`);
  };

  const loadConfiguration = (config: GridConfiguration) => {
    const nextSide = Number(config.mode[0]);
    setDraftMode(config.mode);
    setDraftRegions(normalizeFrontPanelGridRegions(
      config.regions ?? defaultFrontPanelGridRegions(nextSide, config.activeSlots),
      nextSide,
    ));
    setSelection(null);
  };

  const removeConfiguration = (target: string) => {
    if (deleteTarget !== target) {
      setDeleteTarget(target);
      return;
    }
    const next = saved.filter((item) => item.name !== target);
    setSaved(next);
    remoteStore.setItem(STORAGE_KEY, JSON.stringify(next));
    setDeleteTarget(null);
  };

  const selectAllPanels = () => setDraftRegions((previous) => previous.map((region) => ({ ...region, active: true })));
  const clearPanels = () => setDraftRegions((previous) => previous.map((region) => ({ ...region, active: false })));

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 p-3" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <CustomizableContainer
        ibcId="grid_configuration_studio_modal"
        componentType="modal"
        defaultTitle="Front panel grid configurator"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grid-configuration-title"
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#071321] text-slate-100 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <CustomizableLabel id="grid-configuration-title" labelId="grid_configuration_title" defaultLabel="Front panel grid configurator" as="h2" className="text-lg font-bold" />
            <p className="text-xs text-slate-400">Drag across cells to select a band, then merge or split panels to build your front-page layout.</p>
          </div>
          <CustomizableButton
            ref={closeRef}
            buttonId="grid_configuration_close"
            defaultLabel="Close"
            defaultIcon={<X className="h-4 w-4" />}
            forceZeroText
            aria-label="Close grid configurator"
            onClick={onClose}
            className={buttonClass}
          />
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <CustomizableContainer ibcId="grid_configuration_layout_panel" componentType="panel" defaultTitle="Grid layout" className="space-y-3 rounded-xl border border-slate-800 bg-[#091827] p-3">
              <CustomizableLabel labelId="grid_configuration_layout_heading" defaultLabel="Grid layout" as="h3" className="text-sm font-bold text-cyan-300" />
              <div className="grid grid-cols-1 gap-2">
                {MODES.map((item) => (
                  <CustomizableButton
                    key={item.id}
                    buttonId="grid_configuration_mode"
                    onClick={() => chooseMode(item.id)}
                    aria-pressed={draftMode === item.id}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border p-2 text-center transition cursor-pointer ${draftMode === item.id ? "border-cyan-400 bg-cyan-950/60 text-cyan-200" : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"}`}
                  >
                    {() => <><Grid2X2 className="h-4 w-4" /><strong className="text-xs">{item.label}</strong><span className="text-[9px] text-slate-400">{item.description}</span></>}
                  </CustomizableButton>
                ))}
              </div>
            </CustomizableContainer>

            <CustomizableContainer ibcId="grid_configuration_quick_layouts_panel" componentType="panel" defaultTitle="Quick layout solutions" className="space-y-2 rounded-xl border border-slate-800 bg-[#091827] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <CustomizableLabel labelId="grid_configuration_quick_layouts_heading" defaultLabel="Quick layout solutions" as="h3" className="text-xs font-bold text-cyan-300" />
                <span className="text-[9px] text-slate-500">{layoutOptions.length} presets · click to preview</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {layoutOptions.map((preset) => {
                  const selectedPreset = geometrySignature(draftRegions) === geometrySignature(preset.regions);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.description}
                      aria-pressed={selectedPreset}
                      onClick={() => { setDraftRegions(preset.regions); setSelection(null); setNoticeBriefly(`${preset.label} layout preview loaded. Apply grid to use it on the front page.`); }}
                      className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition ${selectedPreset ? "border-cyan-400 bg-cyan-950/50" : "border-slate-800 bg-slate-950/70 hover:border-cyan-500/60"}`}
                    >
                      <span className="grid aspect-square w-9 gap-px rounded-sm bg-slate-700 p-px" style={{ gridTemplateColumns: `repeat(${side}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${side}, minmax(0, 1fr))` }}>
                        {preset.regions.map((region) => (
                          <span key={`${region.row}-${region.col}-${region.rowSpan}-${region.colSpan}`} className={`rounded-[1px] ${selectedPreset ? "bg-cyan-400/80" : "bg-cyan-800/80"}`} style={{ gridColumn: `${region.col + 1} / span ${region.colSpan}`, gridRow: `${region.row + 1} / span ${region.rowSpan}` }} />
                        ))}
                      </span>
                      <span className="w-full truncate text-[9px] font-semibold text-slate-300">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </CustomizableContainer>

            <CustomizableContainer ibcId="grid_configuration_preview_panel" componentType="panel" defaultTitle="Panel layout editor" className="space-y-3 rounded-xl border border-slate-800 bg-[#091827] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CustomizableLabel labelId="grid_configuration_preview_heading" defaultLabel="Panel layout editor" as="h3" className="text-sm font-bold text-cyan-300" />
                  <span className="text-[10px] text-slate-500">{side} × {side} base grid · {draftRegions.length} panel regions</span>
                </div>
                <span className="text-[11px] text-slate-400">{activePanelSlots.length} active</span>
              </div>

              <div className="relative mx-auto aspect-square w-full max-w-[430px] touch-none select-none">
                <div className="absolute inset-0 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${side}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${side}, minmax(0, 1fr))` }}>
                  {draftRegions.map((region) => {
                    const slot = frontPanelRegionAnchor(region, side);
                    return (
                      <div
                        key={`${region.row}-${region.col}-${region.rowSpan}-${region.colSpan}`}
                        className={`flex min-h-0 min-w-0 flex-col items-center justify-center rounded-lg border font-mono transition ${region.active ? "border-cyan-500/70 bg-cyan-950/75 text-cyan-100" : "border-slate-700 bg-slate-950/90 text-slate-500"}`}
                        style={{ gridColumn: `${region.col + 1} / span ${region.colSpan}`, gridRow: `${region.row + 1} / span ${region.rowSpan}` }}
                      >
                        {region.active && <Check className="mb-1 h-3.5 w-3.5" />}
                        <strong className="text-sm">{slot}</strong>
                        {(region.rowSpan > 1 || region.colSpan > 1) && <span className="mt-1 text-[9px] text-cyan-300/70">{region.rowSpan}×{region.colSpan}</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="absolute inset-0 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${side}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${side}, minmax(0, 1fr))` }}
                  onPointerMove={(event) => {
                    if (!anchorCell.current) return;
                    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-grid-cell]');
                    if (!cell || !event.currentTarget.contains(cell)) return;
                    const index = Number(cell.dataset.gridCell);
                    if (Number.isInteger(index)) extendBand(Math.floor(index / side), index % side);
                  }}>
                  {Array.from({ length: total }, (_, index) => {
                    const row = Math.floor(index / side);
                    const col = index % side;
                    const highlighted = Boolean(selection && row >= selection.top && row <= selection.bottom && col >= selection.left && col <= selection.right);
                    return (
                      <button
                        key={`band-cell-${index + 1}`}
                        data-grid-cell={index}
                        type="button"
                        aria-label={`Select grid cell ${index + 1}`}
                        onPointerDown={(event) => { event.preventDefault(); beginBand(row, col); }}
                        onPointerEnter={() => extendBand(row, col)}
                        onPointerUp={() => {
                          if (anchorCell.current) {
                            skipClick.current = dragged.current;
                            anchorCell.current = null;
                            if (dragged.current) window.setTimeout(() => { skipClick.current = false; }, 0);
                          }
                        }}
                        onClick={() => handleBandClick(row, col)}
                        className={`rounded-md border transition ${highlighted ? "border-amber-300/90 bg-amber-300/25" : "border-cyan-300/10 bg-transparent hover:bg-cyan-300/10"}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={buttonClass} onClick={mergeSelection}><Grid2X2 className="h-3.5 w-3.5" /> Merge band</button>
                <button type="button" className={buttonClass} onClick={splitSelection}><Scissors className="h-3.5 w-3.5" /> Split panel</button>
                <button type="button" className={buttonClass} onClick={selectAllPanels}>Activate all</button>
                <button type="button" className={buttonClass} onClick={clearPanels}>Deactivate all</button>
              </div>
              <div className="min-h-4 text-[11px] text-slate-400" aria-live="polite">
                {notice || (selection ? `Selected band: ${selection.bottom - selection.top + 1} × ${selection.right - selection.left + 1}. Click a cell to toggle its panel.` : "Click a cell to toggle a panel, or drag across cells to select a rectangular band.")}
              </div>
            </CustomizableContainer>
          </div>

          <aside className="space-y-3">
            <CustomizableContainer ibcId="grid_configuration_saved_panel" componentType="panel" defaultTitle="Saved configurations" className="space-y-3 rounded-xl border border-slate-800 bg-[#091827] p-3">
              <div className="flex items-center justify-between">
                <CustomizableLabel labelId="grid_configuration_saved_heading" defaultLabel="Saved configurations" as="h3" className="text-sm font-bold text-cyan-300" />
                <span className="text-[10px] text-slate-500">{saved.length} saved</span>
              </div>
              {saved.length === 0 ? <p className="text-xs text-slate-500">No saved grids yet. Save this setup below.</p> : (
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {saved.map((config) => (
                    <div key={config.name} className="flex gap-1">
                      <button type="button" onClick={() => loadConfiguration(config)} className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-left hover:border-cyan-500/60">
                        <span className="block truncate text-xs font-semibold text-slate-200">{config.name}</span>
                        <span className="text-[10px] text-slate-500">{config.mode} · {config.regions?.length ?? config.activeSlots.length} panels</span>
                      </button>
                      <button type="button" aria-label={`${deleteTarget === config.name ? "Confirm delete" : "Delete"} ${config.name}`} title={deleteTarget === config.name ? "Click again to delete" : "Delete configuration"} onClick={() => removeConfiguration(config.name)} className={`rounded-lg border px-2 text-slate-400 hover:text-rose-300 ${deleteTarget === config.name ? "border-rose-500 text-rose-300" : "border-slate-800"}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <label htmlFor="grid-configuration-name" className="text-xs font-semibold text-slate-300">Save current setup</label>
                <input id="grid-configuration-name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveConfiguration()} placeholder="e.g. Feature panel mosaic" maxLength={40} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400" />
                <button type="button" disabled={!name.trim()} onClick={saveConfiguration} className={`${buttonClass} w-full disabled:cursor-not-allowed`}><Save className="h-3.5 w-3.5" /> Save configuration</button>
              </div>
            </CustomizableContainer>
          </aside>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">
          <span className="text-[11px] text-slate-500">A merged panel uses its top-left cell’s panel ID; its other assignments are preserved.</span>
          <button type="button" disabled={activePanelSlots.length === 0} onClick={() => { onApply(draftMode, activePanelSlots, draftRegions); onClose(); }} className="rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed">Apply grid</button>
        </footer>
      </CustomizableContainer>
    </div>
  );
}
