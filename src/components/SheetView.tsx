import { useEffect, useRef, useState } from "react";
import type { Doc, Frame, SheetSettings, SheetTheme } from "../types";
import { RATIOS, THEMES } from "../lib/sheet";
import type { SheetResult } from "../lib/sheet";
import { shortDur } from "../lib/imaging";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";
import { Btn, IconBtn, SectionTitle, Seg, Select, Slider, Toggle } from "./ui";

const ACCENTS = ["#ffab1f", "#ff6a1a", "#ff2e88", "#21d4ee", "#b8f24a", "#4aa8ff", "#f4ece0"];

export function SheetView({
  canvas,
  doc,
  sheet,
  setSheet,
  info,
  rendering,
  renderMs,
  scopeFrames,
  counts,
  onReset,
  onRandomize,
  onExport,
  onCopy,
  onPrint,
  onHandoff,
}: {
  canvas: HTMLCanvasElement;
  doc: Doc;
  sheet: SheetSettings;
  setSheet: (patch: Partial<SheetSettings>, merge?: string) => void;
  info: SheetResult | null;
  rendering: boolean;
  renderMs: number;
  scopeFrames: Frame[];
  counts: { all: number; filtered: number; selected: number };
  onReset: () => void;
  onRandomize: () => void;
  onExport: (kind: "png" | "jpg") => void;
  onCopy: () => void;
  onPrint: () => void;
  onHandoff: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<"fit" | "half" | "full">("fit");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.appendChild(canvas);
    canvas.style.display = "block";
    canvas.style.borderRadius = "3px";
    canvas.style.boxShadow = "var(--canvas-shadow)";
    return () => {
      if (canvas.parentNode === el) el.removeChild(canvas);
    };
  }, [canvas]);

  useEffect(() => {
    canvas.style.width = zoom === "fit" ? "100%" : zoom === "half" ? `${Math.round(canvas.width / 2)}px` : `${canvas.width}px`;
    canvas.style.height = "auto";
    canvas.style.maxWidth = zoom === "fit" ? "100%" : "none";
    canvas.style.margin = "0 auto";
  }, [zoom, canvas, info?.width, info?.height]);

  const runtime = scopeFrames.reduce((a, f) => a + f.duration, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* ------------- preview stage ------------- */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-850/80 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger rec" />
            <span className="tk text-bone">Live sheet</span>
          </div>
          <Seg
            value={zoom}
            onChange={setZoom}
            options={[
              { value: "fit", label: "Fit" },
              { value: "half", label: "50%" },
              { value: "full", label: "1:1" },
            ]}
            size="xs"
          />
          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-dim">
            {rendering ? (
              <span className="text-amber">RENDERING…</span>
            ) : (
              <span className="text-lime">RENDERED {renderMs}MS</span>
            )}
            <span className="hidden sm:inline">
              {info ? `${info.width}×${info.height}` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Btn size="xs" icon="copy" onClick={onCopy}>
              Copy
            </Btn>
            <Btn size="xs" icon="printer" onClick={onPrint} className="hidden sm:inline-flex">
              Print
            </Btn>
            <Btn size="xs" icon="download" variant="solid" onClick={() => onExport("png")}>
              PNG
            </Btn>
          </div>
        </div>

        <div className="sheet-stage relative min-h-0 flex-1 overflow-auto p-4 sm:p-7">
          {rendering && (
            <div className="sweep pointer-events-none absolute inset-x-7 top-7 z-10 h-[3px] overflow-hidden rounded-full bg-amber/20" />
          )}
          <div ref={host} className="mx-auto w-full max-w-[1400px]" />
          {!scopeFrames.length && (
            <p className="mt-4 text-center text-[12px] text-mute">
              Nothing in scope — switch the scope control to <span className="text-amber">All frames</span>.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-ink-900 px-3 py-1.5 font-mono text-[10px] text-dim">
          <span>
            <span className="text-mute">SCOPE</span>{" "}
            <span className="text-amber">{scopeFrames.length} FRAMES</span>
          </span>
          <span>
            <span className="text-mute">GRID</span>{" "}
            <span className="text-cyan">
              {info ? `${info.cols}×${info.rows}` : "—"}
            </span>
          </span>
          <span>
            <span className="text-mute">RUNTIME</span> <span className="text-lime">{shortDur(runtime)}</span>
          </span>
          <span className="hidden sm:inline">
            <span className="text-mute">THEME</span>{" "}
            <span className="text-magenta">{THEMES[sheet.theme].label.toUpperCase()}</span>
          </span>
          <button onClick={onHandoff} className="ml-auto flex items-center gap-1 text-amber transition-colors hover:text-bone">
            HAND OFF TO LLM <Icon name="right" size={11} />
          </button>
        </div>
      </section>

      {/* ------------- control region ------------- */}
      <aside className="flex max-h-[46vh] w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-line bg-ink-900/80 p-3 lg:max-h-none lg:w-[306px] lg:border-l lg:border-t-0">
        <div className="flex items-center gap-1.5">
          <Icon name="sliders" size={14} className="text-amber" />
          <h3 className="display text-xl text-bone">Sheet controls</h3>
          <div className="ml-auto flex gap-1">
            <IconBtn icon="shuffle" label="Randomise layout" onClick={onRandomize} tone="accent" />
            <IconBtn icon="refresh" label="Reset to defaults" onClick={onReset} />
          </div>
        </div>

        <div className="space-y-2.5">
          <SectionTitle>Grid</SectionTitle>
          <Slider label="Columns" value={sheet.columns} min={1} max={6} onChange={(v) => setSheet({ columns: v }, "cols")} />
          <Slider label="Sheet width" value={sheet.width} min={1000} max={4200} step={50} unit="px" onChange={(v) => setSheet({ width: v }, "w")} />
          <Slider label="Gutter" value={sheet.gutter} min={0} max={80} unit="px" onChange={(v) => setSheet({ gutter: v }, "g")} />
          <Slider label="Margin" value={sheet.margin} min={8} max={160} unit="px" onChange={(v) => setSheet({ margin: v }, "m")} />
          <Slider label="Corner radius" value={sheet.radius} min={0} max={40} unit="px" onChange={(v) => setSheet({ radius: v }, "r")} />
          <div className="flex items-center justify-between gap-2">
            <span className="tk text-mute">Aspect</span>
            <Select
              className="w-[124px]"
              value={sheet.ratio}
              onChange={(v) => setSheet({ ratio: v })}
              options={RATIOS.map((r) => ({ value: r.key, label: r.label }))}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="tk text-mute">Framing</span>
            <Seg
              value={sheet.fit}
              onChange={(v) => setSheet({ fit: v })}
              options={[
                { value: "cover", label: "Crop to fill" },
                { value: "contain", label: "Fit whole" },
              ]}
              size="xs"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <SectionTitle hue="#21d4ee">Look</SectionTitle>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(THEMES) as SheetTheme[]).map((k) => {
              const t = THEMES[k];
              return (
                <button
                  key={k}
                  onClick={() => setSheet({ theme: k, accent: t.swatch })}
                  title={t.label}
                  className={cn(
                    "group overflow-hidden rounded-[5px] border transition-all active:scale-95",
                    sheet.theme === k ? "border-amber shadow-[0_0_12px_-2px_rgba(255,171,31,0.7)]" : "border-ink-600 hover:border-line"
                  )}
                >
                  <span className="flex h-8 items-end gap-[2px] p-1" style={{ background: t.bg }}>
                    <span className="h-3 flex-1 rounded-[1px]" style={{ background: t.panel, border: `1px solid ${t.line}` }} />
                    <span className="h-4 flex-1 rounded-[1px]" style={{ background: t.swatch }} />
                    <span className="h-2 flex-1 rounded-[1px]" style={{ background: t.sub }} />
                  </span>
                  <span className="block bg-ink-850 py-[3px] text-[8.5px] uppercase tracking-wider text-mute">
                    {t.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={sheet.accent}
              onChange={(e) => setSheet({ accent: e.target.value }, "accent")}
              className="h-7 w-9 shrink-0 rounded"
              title="Accent colour"
            />
            <div className="flex flex-1 gap-1">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSheet({ accent: c })}
                  title={c}
                  className={cn(
                    "h-5 flex-1 rounded-[3px] border transition-transform hover:scale-110",
                    sheet.accent.toLowerCase() === c ? "border-bone" : "border-ink-600"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Toggle label="Sprockets" checked={sheet.showSprockets} onChange={(v) => setSheet({ showSprockets: v })} />
            <Toggle label="Thirds grid" checked={sheet.showGrid} onChange={(v) => setSheet({ showGrid: v })} />
            <Toggle label="Header" checked={sheet.showHeader} onChange={(v) => setSheet({ showHeader: v })} />
            <Toggle label="Footer" checked={sheet.showFooter} onChange={(v) => setSheet({ showFooter: v })} />
          </div>
        </div>

        <div className="space-y-2.5">
          <SectionTitle hue="#b8f24a">Captions</SectionTitle>
          <Slider label="Type size" value={sheet.captionSize} min={10} max={44} unit="px" onChange={(v) => setSheet({ captionSize: v }, "cs")} />
          <div className="grid grid-cols-2 gap-1.5">
            <Toggle label="Numbers" checked={sheet.showNumbers} onChange={(v) => setSheet({ showNumbers: v })} />
            <Toggle label="Names" checked={sheet.showNames} onChange={(v) => setSheet({ showNames: v })} />
            <Toggle label="Captions" checked={sheet.showCaptions} onChange={(v) => setSheet({ showCaptions: v })} />
            <Toggle label="Timecode" checked={sheet.showTimecode} onChange={(v) => setSheet({ showTimecode: v })} />
            <Toggle label="Crew notes" checked={sheet.showComments} onChange={(v) => setSheet({ showComments: v })} hint="Print the latest comment under each frame" />
          </div>
          <input
            value={sheet.footerText}
            onChange={(e) => setSheet({ footerText: e.target.value }, "footer")}
            placeholder="Footer slug"
            className="h-8 w-full rounded-[5px] border border-ink-600 bg-ink-850 px-2 font-mono text-[11px] text-bone focus:border-amber focus:outline-none"
          />
        </div>

        <div className="space-y-2.5">
          <SectionTitle hue="#ff2e88">Output</SectionTitle>
          <div className="flex items-center justify-between gap-2">
            <span className="tk text-mute">Scope</span>
            <Seg
              value={sheet.scope}
              onChange={(v) => setSheet({ scope: v })}
              options={[
                { value: "all", label: `All ${counts.all}` },
                { value: "filtered", label: `View ${counts.filtered}` },
                { value: "selected", label: `Sel ${counts.selected}` },
              ]}
              size="xs"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="tk text-mute">Quality</span>
            <Seg
              value={String(sheet.scale)}
              onChange={(v) => setSheet({ scale: Number(v) })}
              options={[
                { value: "0.75", label: "Draft" },
                { value: "1", label: "1×" },
                { value: "1.5", label: "1.5×" },
                { value: "2", label: "2×" },
              ]}
              size="xs"
            />
          </div>
          <div className="rounded-[5px] border border-ink-600 bg-ink-850 p-2 font-mono text-[10px] text-dim">
            <div className="flex justify-between">
              <span>PIXELS</span>
              <span className="text-amber">{info ? `${info.width} × ${info.height}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>FRAMES</span>
              <span className="text-cyan">{scopeFrames.length}</span>
            </div>
            <div className="flex justify-between">
              <span>PROJECT</span>
              <span className="truncate text-lime">{doc.title || "Untitled"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn icon="download" variant="solid" onClick={() => onExport("png")}>
              PNG
            </Btn>
            <Btn icon="download" onClick={() => onExport("jpg")}>
              JPG
            </Btn>
            <Btn icon="copy" onClick={onCopy}>
              Copy image
            </Btn>
            <Btn icon="printer" onClick={onPrint}>
              Print
            </Btn>
          </div>
          <Btn icon="send" variant="cool" className="w-full" onClick={onHandoff}>
            Hand off with prompt
          </Btn>
        </div>
      </aside>
    </div>
  );
}
