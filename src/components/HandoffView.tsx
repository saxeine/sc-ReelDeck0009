import { useMemo, useState } from "react";
import type { Doc, Frame } from "../types";
import {
  GROUP_META,
  MODELS,
  SUGGESTIONS,
  TARGETS,
  estimateTokens,
  type HandoffOptions,
  type ModelKey,
  type SuggestionGroup,
  type TargetKey,
} from "../lib/prompts";
import type { SheetResult } from "../lib/sheet";
import { shortDur } from "../lib/imaging";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";
import { Btn, Chip, IconBtn, SectionTitle, Select, Slider, Toggle } from "./ui";

export function HandoffView({
  doc,
  frames,
  options,
  setOptions,
  prompt,
  overridden,
  onOverride,
  info,
  preview,
  onRefreshPreview,
  onCopyPrompt,
  onCopyBoth,
  onDownloadMd,
  onDownloadJson,
  onBundle,
  onOpenModel,
  onBackToSheet,
  busy,
}: {
  doc: Doc;
  frames: Frame[];
  options: HandoffOptions;
  setOptions: (patch: Partial<HandoffOptions>) => void;
  prompt: string;
  overridden: boolean;
  onOverride: (text: string | null) => void;
  info: SheetResult | null;
  preview: string | null;
  onRefreshPreview: () => void;
  onCopyPrompt: () => void;
  onCopyBoth: () => void;
  onDownloadMd: () => void;
  onDownloadJson: () => void;
  onBundle: () => void;
  onOpenModel: (m: "gpt" | "claude") => void;
  onBackToSheet: () => void;
  busy: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [group, setGroup] = useState<SuggestionGroup | "all">("all");

  const tokens = estimateTokens(prompt);
  const shown = useMemo(
    () => (group === "all" ? SUGGESTIONS : SUGGESTIONS.filter((s) => s.group === group)),
    [group]
  );
  const runtime = frames.reduce((a, f) => a + f.duration, 0);
  const budget = Math.min(100, (tokens / 32000) * 100);
  const budgetColor = tokens > 24000 ? "#ff4438" : tokens > 12000 ? "#ffc53d" : "#2fd07a";

  const toggle = (id: string) =>
    setOptions({
      selected: options.selected.includes(id)
        ? options.selected.filter((x) => x !== id)
        : [...options.selected, id],
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
      {/* -------- left: attach + suggestions -------- */}
      <section className="flex min-h-0 shrink-0 flex-col gap-4 overflow-y-auto border-line p-3 xl:w-[430px] xl:border-r">
        <div className="relative overflow-hidden rounded-md border border-amber/35 bg-gradient-to-br from-amber/12 via-ink-850 to-ink-900 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-gradient-to-br from-amber to-ember text-ink-950">
              <Icon name="sheet" size={15} />
            </span>
            <div className="min-w-0">
              <div className="tk text-amber">Attachment</div>
              <div className="truncate text-[13px] font-semibold text-bone">contact-sheet.png</div>
            </div>
            <IconBtn icon="refresh" label="Refresh attachment" onClick={onRefreshPreview} className="ml-auto" />
          </div>
          <button
            onClick={onBackToSheet}
            className="group relative block w-full overflow-hidden rounded border border-line bg-ink-950"
            title="Open sheet controls"
          >
            {preview ? (
              <img src={preview} alt="Contact sheet attachment" className="block max-h-52 w-full object-contain" />
            ) : (
              <div className="flex h-32 items-center justify-center text-[12px] text-dim">
                Rendering attachment…
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-ink-950/70 text-[12px] font-semibold text-amber opacity-0 transition-opacity group-hover:opacity-100">
              Adjust the sheet
            </span>
          </button>
          <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px]">
            {[
              ["SIZE", info ? `${info.width}×${info.height}` : "—"],
              ["FRAMES", String(frames.length)],
              ["RUNTIME", shortDur(runtime)],
            ].map(([k, v]) => (
              <div key={k} className="rounded border border-ink-600 bg-ink-850 px-2 py-1">
                <div className="text-dim">{k}</div>
                <div className="truncate text-amber">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle
            right={
              <span className="font-mono text-[10px] text-dim">
                {options.selected.length} PICKED
              </span>
            }
          >
            Prompt suggestions
          </SectionTitle>
          <div className="mb-2 flex flex-wrap gap-1">
            <Chip color="#f4ece0" active={group === "all"} onClick={() => setGroup("all")}>
              All
            </Chip>
            {(Object.keys(GROUP_META) as SuggestionGroup[]).map((g) => (
              <Chip key={g} color={GROUP_META[g].hue} active={group === g} onClick={() => setGroup(g)}>
                {GROUP_META[g].label}
              </Chip>
            ))}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {shown.map((s) => {
              const on = options.selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-[6px] border p-2 pl-3 text-left transition-all duration-200 active:scale-[0.98]",
                    on ? "bg-ink-800" : "border-ink-600 bg-ink-850/70 hover:border-line hover:bg-ink-800"
                  )}
                  style={on ? { borderColor: `${s.hue}99`, boxShadow: `inset 3px 0 0 ${s.hue}` } : undefined}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                        on ? "text-ink-950" : "border-line text-transparent"
                      )}
                      style={on ? { background: s.hue, borderColor: s.hue } : undefined}
                    >
                      <Icon name="check" size={11} strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[12.5px] font-semibold", on ? "text-bone" : "text-mute group-hover:text-bone")}>
                          {s.title}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-dim">{s.blurb}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <SectionTitle hue="#ff2e88">Your extra instructions</SectionTitle>
          <textarea
            value={options.extra}
            onChange={(e) => setOptions({ extra: e.target.value })}
            rows={3}
            placeholder="e.g. Must run offline, keep the bundle under 200kb, ship a keyboard-first UI…"
            className="w-full resize-y rounded-[5px] border border-ink-600 bg-ink-850 px-2 py-1.5 text-[12px] leading-relaxed text-bone focus:border-magenta focus:outline-none"
          />
        </div>
      </section>

      {/* -------- right: composer -------- */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="grid gap-2 border-b border-line bg-ink-850/80 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select<TargetKey>
            label="Build target"
            value={options.target}
            onChange={(v) => setOptions({ target: v })}
            options={TARGETS.map((t) => ({ value: t.key, label: t.label }))}
          />
          <Select<ModelKey>
            label="Model dialect"
            value={options.model}
            onChange={(v) => setOptions({ model: v })}
            options={MODELS.map((m) => ({ value: m.key, label: m.label }))}
          />
          <div className="sm:col-span-2">
            <Slider
              label="Spec depth"
              value={options.detail}
              min={1}
              max={5}
              onChange={(v) => setOptions({ detail: v })}
              hint="1 = terse brief · 5 = exhaustive spec"
            />
            <div className="mt-0.5 flex justify-between font-mono text-[9px] text-dim">
              <span>TERSE</span>
              <span className="text-amber">
                {["", "Brief", "Short", "Standard", "Deep", "Exhaustive"][options.detail]}
              </span>
              <span>EXHAUSTIVE</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:col-span-2 lg:col-span-4 lg:grid-cols-6">
            <Toggle label="Manifest" checked={options.includeManifest} onChange={(v) => setOptions({ includeManifest: v })} />
            <Toggle label="Comments" checked={options.includeComments} onChange={(v) => setOptions({ includeComments: v })} />
            <Toggle label="Timecodes" checked={options.includeTimecodes} onChange={(v) => setOptions({ includeTimecodes: v })} />
            <Toggle label="Design" checked={options.includeDesign} onChange={(v) => setOptions({ includeDesign: v })} />
            <Toggle label="Acceptance" checked={options.includeAcceptance} onChange={(v) => setOptions({ includeAcceptance: v })} />
            <Toggle label="Seed JSON" checked={options.includeJson} onChange={(v) => setOptions({ includeJson: v })} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-900 px-3 py-2">
          <span className="tk text-bone">Composed prompt</span>
          {overridden && <Chip color="#ffc53d">edited by hand</Chip>}
          <div className="ml-auto flex items-center gap-1.5">
            {overridden && (
              <Btn size="xs" icon="refresh" onClick={() => { onOverride(null); setEditing(false); }}>
                Regenerate
              </Btn>
            )}
            <Btn
              size="xs"
              icon={editing ? "check" : "pencil"}
              active={editing}
              onClick={() => {
                if (!editing) onOverride(prompt);
                setEditing(!editing);
              }}
            >
              {editing ? "Done" : "Edit"}
            </Btn>
          </div>
        </div>

        <div className="relative min-h-[280px] flex-1 overflow-hidden bg-ink-950/60">
          {editing ? (
            <textarea
              value={prompt}
              onChange={(e) => onOverride(e.target.value)}
              spellCheck={false}
              className="h-full max-h-[62vh] min-h-[280px] w-full resize-none bg-transparent p-4 font-mono text-[11.5px] leading-relaxed text-bone focus:outline-none xl:max-h-none"
            />
          ) : (
            <pre className="h-full max-h-[62vh] min-h-[280px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11.5px] leading-relaxed text-mute xl:max-h-none">
              {prompt.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    line.startsWith("## ") || line.startsWith("<")
                      ? "mt-2 font-semibold text-amber"
                      : line.startsWith("|")
                      ? "text-cyan/85"
                      : line.startsWith("You are")
                      ? "text-bone"
                      : undefined
                  )}
                >
                  {line || "\u00A0"}
                </div>
              ))}
            </pre>
          )}
        </div>

        <div className="border-t border-line bg-ink-900 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-dim">
            <span>
              <span className="text-mute">TOKENS ≈</span>{" "}
              <span style={{ color: budgetColor }}>{tokens.toLocaleString()}</span>
            </span>
            <span>{prompt.length.toLocaleString()} CHARS</span>
            <span>{doc.frames.length ? frames.length : 0} FRAMES ATTACHED</span>
            <div className="ml-auto flex h-1.5 w-32 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full transition-all duration-500" style={{ width: `${budget}%`, background: budgetColor }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Btn icon="copy" variant="solid" size="md" onClick={onCopyPrompt}>
              Copy prompt
            </Btn>
            <Btn icon="sheet" variant="cool" size="md" onClick={onCopyBoth}>
              {busy === "both" ? "Copying…" : "Copy prompt + sheet"}
            </Btn>
            <Btn icon="download" size="md" onClick={onDownloadMd}>
              .md
            </Btn>
            <Btn icon="download" size="md" onClick={onDownloadJson}>
              manifest.json
            </Btn>
            <Btn icon="save" size="md" onClick={onBundle}>
              {busy === "bundle" ? "Packing…" : "Handoff bundle .html"}
            </Btn>
            <div className="ml-auto flex gap-1.5">
              <Btn icon="link" size="md" onClick={() => onOpenModel("gpt")} title="Copies the prompt, then opens ChatGPT">
                ChatGPT
              </Btn>
              <Btn icon="link" size="md" onClick={() => onOpenModel("claude")} title="Copies the prompt, then opens Claude">
                Claude
              </Btn>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-dim">
            Attach <span className="text-mute">contact-sheet.png</span> in the chat after pasting — the prompt refers to
            frame numbers printed on the sheet. The .html bundle carries the sheet and the prompt in one file.
          </p>
        </div>
      </section>
    </div>
  );
}
