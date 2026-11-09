import { useRef, useState } from "react";
import { SHOTS, SHOT_LABEL, STATUS_META, type Frame, type FrameStatus, type ShotType } from "../types";
import { shortDur, timecode } from "../lib/imaging";
import { Icon } from "./Icon";
import { Btn, Chip, IconBtn, SectionTitle, Seg, Select } from "./ui";

function ago(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function Inspector({
  frame,
  index,
  start,
  total,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onOpenEditor,
  onOpenStudio,
  onOpenZoomStudio,
  onOpenAniPlayer,
  onComment,
  onDeleteComment,
  onReplace,
  onStep,
}: {
  frame: Frame | null;
  index: number;
  start: number;
  total: number;
  onClose: () => void;
  onUpdate: (patch: Partial<Frame>, merge?: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenEditor: () => void;
  onOpenStudio: (kind: "neo1" | "bubble") => void;
  onOpenZoomStudio?: () => void;
  onOpenAniPlayer?: () => void;
  onComment: (text: string) => void;
  onDeleteComment: (id: string) => void;
  onReplace: (file: File) => void;
  onStep: (dir: -1 | 1) => void;
}) {
  const [draft, setDraft] = useState("");
  const [tag, setTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!frame) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink-800 text-dim">
          <Icon name="target" size={20} />
        </span>
        <p className="display text-2xl text-mute">No frame selected</p>
        <p className="text-[12px] leading-relaxed text-dim">
          Click any frame on the board to name it, caption it, time it and read the crew thread.
        </p>
      </div>
    );
  }

  const sm = STATUS_META[frame.status];

  return (
    <div key={frame.id} className="slide-left flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-ink-850 px-3 py-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[5px] font-mono text-[12px] font-semibold text-ink-950"
          style={{ background: sm.color }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="tk text-dim">Inspector</div>
          <div className="truncate text-[13px] font-semibold text-bone">{frame.name}</div>
        </div>
        <IconBtn icon="left" label="Previous frame" onClick={() => onStep(-1)} disabled={index <= 0} />
        <IconBtn icon="right" label="Next frame" onClick={() => onStep(1)} disabled={index >= total - 1} />
        <IconBtn icon="x" label="Close inspector" onClick={onClose} className="xl:hidden" />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <button
          onClick={onOpenEditor}
          className="group relative block w-full overflow-hidden rounded-md border border-line"
          title="Open in frame studio"
        >
          <img src={frame.src} alt={frame.name} className="block aspect-video w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-ink-950/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex items-center gap-2 rounded-full border border-amber/60 bg-ink-900/90 px-3 py-1.5 text-[12px] font-semibold text-amber">
              <Icon name="expand" size={14} /> Enlarge &amp; annotate
            </span>
          </span>
          {frame.annotated && (
            <span className="absolute left-2 top-2 rounded bg-cyan/90 px-1.5 py-[1px] font-mono text-[9px] font-semibold text-ink-950">
              ANNOTATED
            </span>
          )}
        </button>

        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-mute">Open in studio</div>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn size="xs" icon="text" variant="cool" onClick={() => onOpenStudio("neo1")}>Neo1 Studio</Btn>
            <Btn size="xs" icon="comment" onClick={() => onOpenStudio("bubble")}>Bubble Studio</Btn>
          </div>
          {onOpenZoomStudio && (
            <Btn size="xs" icon="expand" variant="cool" className="mt-1.5 w-full" onClick={onOpenZoomStudio}>Zoom Studio</Btn>
          )}
          {onOpenAniPlayer && (
            <Btn size="xs" icon="film" variant="cool" className="mt-1.5 w-full" onClick={onOpenAniPlayer}>AniPlayer</Btn>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
          {[
            ["IN", timecode(start)],
            ["OUT", timecode(start + frame.duration)],
            ["HOLD", shortDur(frame.duration)],
          ].map(([k, v]) => (
            <div key={k} className="rounded border border-ink-600 bg-ink-850 px-2 py-1.5">
              <div className="text-dim">{k}</div>
              <div className="text-amber">{v}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <SectionTitle>Name &amp; caption</SectionTitle>
          <input
            value={frame.name}
            onChange={(e) => onUpdate({ name: e.target.value }, `name-${frame.id}`)}
            placeholder="Frame name"
            className="h-9 w-full rounded-[5px] border border-ink-600 bg-ink-850 px-2 text-[13px] font-semibold text-bone focus:border-amber focus:outline-none"
          />
          <textarea
            value={frame.caption}
            onChange={(e) => onUpdate({ caption: e.target.value }, `cap-${frame.id}`)}
            rows={3}
            placeholder="Caption printed under the frame on the contact sheet…"
            className="w-full resize-y rounded-[5px] border border-ink-600 bg-ink-850 px-2 py-1.5 text-[12px] leading-relaxed text-bone focus:border-amber focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <SectionTitle hue="#21d4ee">Shot</SectionTitle>
          <Select<ShotType>
            value={frame.shot}
            onChange={(v) => onUpdate({ shot: v })}
            options={SHOTS.map((s) => ({ value: s, label: `${s} — ${SHOT_LABEL[s]}` }))}
          />
          <div className="flex items-center gap-2">
            <span className="tk flex-1 text-mute">Hold</span>
            <IconBtn
              icon="minus"
              label="Shorter"
              size={26}
              onClick={() => onUpdate({ duration: Math.max(0.5, +(frame.duration - 0.5).toFixed(1)) })}
            />
            <input
              type="number"
              step={0.5}
              min={0.5}
              value={frame.duration}
              onChange={(e) => onUpdate({ duration: Math.max(0.5, Number(e.target.value) || 0.5) }, `dur-${frame.id}`)}
              className="h-7 w-16 rounded border border-ink-600 bg-ink-850 px-2 text-center font-mono text-[12px] text-amber focus:border-amber focus:outline-none"
            />
            <IconBtn
              icon="plus"
              label="Longer"
              size={26}
              onClick={() => onUpdate({ duration: +(frame.duration + 0.5).toFixed(1) })}
            />
          </div>
          <Seg<FrameStatus>
            value={frame.status}
            onChange={(v) => onUpdate({ status: v })}
            options={[
              { value: "draft", label: "Draft" },
              { value: "approved", label: "Approved" },
              { value: "rework", label: "Rework" },
            ]}
          />
        </div>

        <div>
          <SectionTitle hue="#b8f24a">Tags</SectionTitle>
          <div className="mb-2 flex flex-wrap gap-1">
            {frame.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-lime/40 bg-lime/10 px-2 py-[2px] font-mono text-[10px] text-lime"
              >
                {t}
                <button
                  onClick={() => onUpdate({ tags: frame.tags.filter((x) => x !== t) })}
                  className="opacity-60 transition-opacity hover:opacity-100"
                  title={`Remove ${t}`}
                >
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
            {!frame.tags.length && <span className="text-[11px] text-dim">No tags yet</span>}
          </div>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tag.trim()) {
                const v = tag.trim().toLowerCase().replace(/\s+/g, "-");
                if (!frame.tags.includes(v)) onUpdate({ tags: [...frame.tags, v] });
                setTag("");
              }
            }}
            placeholder="Add tag + Enter"
            className="h-8 w-full rounded-[5px] border border-ink-600 bg-ink-850 px-2 text-[12px] text-bone focus:border-lime focus:outline-none"
          />
        </div>

        <div>
          <SectionTitle
            hue="#ff2e88"
            right={<span className="font-mono text-[10px] text-dim">{frame.comments.length}</span>}
          >
            Crew thread
          </SectionTitle>
          <div className="space-y-1.5">
            {frame.comments.map((c) => (
              <div
                key={c.id}
                className="group rounded-[5px] border border-ink-600 bg-ink-850 p-2 transition-colors hover:border-line"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-magenta/25 font-mono text-[8px] font-bold text-magenta">
                    {c.author.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-semibold text-bone">{c.author}</span>
                  <span className="font-mono text-[9px] text-dim">{ago(c.at)}</span>
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    title="Delete comment"
                    className="ml-auto text-dim opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
                <p className="text-[11.5px] leading-relaxed text-mute">{c.text}</p>
              </div>
            ))}
            {!frame.comments.length && (
              <p className="rounded border border-dashed border-line/60 px-2 py-3 text-[11px] text-dim">
                No comments. Notes you add here travel with the frame into the LLM handoff.
              </p>
            )}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) {
                onComment(draft.trim());
                setDraft("");
              }
            }}
            rows={2}
            placeholder="Add a comment… (⌘Enter to post)"
            className="mt-2 w-full resize-none rounded-[5px] border border-ink-600 bg-ink-850 px-2 py-1.5 text-[12px] text-bone focus:border-magenta focus:outline-none"
          />
          <Btn
            size="xs"
            icon="comment"
            className="mt-1 w-full"
            disabled={!draft.trim()}
            onClick={() => {
              onComment(draft.trim());
              setDraft("");
            }}
          >
            Post comment
          </Btn>
        </div>

        <div className="space-y-1.5 border-t border-line pt-3">
          <Btn icon="pencil" variant="cool" className="w-full" onClick={onOpenEditor}>
            Open frame studio
          </Btn>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn icon="copy" onClick={onDuplicate}>
              Duplicate
            </Btn>
            <Btn icon="image" onClick={() => fileRef.current?.click()}>
              Replace
            </Btn>
          </div>
          <Btn icon="trash" variant="danger" className="w-full" onClick={onDelete}>
            Delete frame
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onReplace(f);
              e.target.value = "";
            }}
          />
          <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-dim">
            <span>{frame.w}×{frame.h}px</span>
            <Chip color={sm.color}>{sm.label}</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}
