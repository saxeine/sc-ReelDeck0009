import { useEffect, useRef, useState } from "react";
import { THEME_OPTIONS, themeOption, type ThemeKey } from "../lib/theme";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";

export function ThemeMenu({
  theme,
  onTheme,
}: {
  theme: ThemeKey;
  onTheme: (key: ThemeKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const current = themeOption(theme);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!host.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={host}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Appearance — ${current.label}`}
        aria-label="Change theme"
        aria-expanded={open}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-[5px] border px-2 transition-all duration-150 active:scale-95 focus-ring",
          open
            ? "border-amber/70 bg-amber/15 text-amber"
            : "border-ink-600 bg-ink-850 text-mute hover:border-line hover:text-bone"
        )}
      >
        <Icon name="palette" size={14} />
        <span className="hidden text-[11px] font-medium md:inline">{current.label}</span>
        <span className="flex items-center gap-[2px]">
          {[current.swatch.bg, current.swatch.line, current.swatch.accent].map((c, i) => (
            <span
              key={i}
              className="h-[9px] w-[5px] rounded-[1px] border border-bone/20"
              style={{ background: c }}
            />
          ))}
        </span>
        <Icon name={open ? "up" : "down"} size={11} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[236px] overflow-hidden rounded-[7px] border border-line bg-ink-900/98 p-1.5 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.85)] backdrop-blur pop">
          <div className="px-1.5 pb-1 pt-0.5 tk text-dim">Appearance</div>
          {THEME_OPTIONS.map((t) => {
            const on = t.key === theme;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  onTheme(t.key);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[5px] border px-1.5 py-1.5 text-left transition-colors",
                  on
                    ? "border-amber/60 bg-amber/12"
                    : "border-transparent hover:border-ink-600 hover:bg-ink-800"
                )}
              >
                <span
                  className="flex h-7 w-9 shrink-0 items-end gap-[2px] overflow-hidden rounded-[3px] p-1"
                  style={{ background: t.swatch.bg, border: `1px solid ${t.swatch.line}` }}
                >
                  <span
                    className="h-2.5 flex-1 rounded-[1px]"
                    style={{ background: t.swatch.panel, border: `1px solid ${t.swatch.line}` }}
                  />
                  <span className="h-3 flex-1 rounded-[1px]" style={{ background: t.swatch.accent }} />
                  <span className="h-1.5 flex-1 rounded-[1px]" style={{ background: t.swatch.ink }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[12px] font-semibold",
                      on ? "text-amber" : "text-bone"
                    )}
                  >
                    {t.label}
                    {t.key === "dark" && (
                      <span className="ml-1 font-mono text-[9px] font-normal text-dim">default</span>
                    )}
                  </span>
                  <span className="block truncate text-[10px] text-dim">{t.hint}</span>
                </span>
                {on && <Icon name="check" size={13} className="shrink-0 text-amber" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
