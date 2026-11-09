import { useMemo, useRef, useState } from "react";
import {
  SHOTS,
  STATUS_META,
  type Doc,
  type Filters,
  type Frame,
  type FrameStatus,
  type SavedView,
  type ShotType,
  type SortKey,
} from "../types";
import { shortDur, timecode } from "../lib/imaging";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";
import { Inspector } from "./Inspector";
import { Btn, Chip, Empty, IconBtn, SectionTitle, Select, Slider } from "./ui";

export interface BoardApi {
  update: (id: string, patch: Partial<Frame>, merge?: string) => void;
  remove: (ids: string[]) => void;
  duplicate: (ids: string[]) => void;
  reorder: (id: string, toIndex: number) => void;
  bake: (orderedIds: string[]) => void;
  setStatus: (ids: string[], status: FrameStatus) => void;
  comment: (id: string, text: string) => void;
  deleteComment: (id: string, commentId: string) => void;
  importFiles: (files: File[]) => void;
  replaceImage: (id: string, file: File) => void;
}

interface Props {
  doc: Doc;
  visible: Frame[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  views: SavedView[];
  activeView: string;
  onApplyView: (v: SavedView) => void;
  onSaveView: (name: string) => void;
  onDeleteView: (id: string) => void;
  selected: string[];
  setSelected: (ids: string[]) => void;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  density: number;
  setDensity: (n: number) => void;
  api: BoardApi;
  onOpenEditor: (id: string) => void;
  onOpenStudio: (kind: "neo1" | "bubble", id: string) => void;
  onOpenZoomStudio: (id?: string) => void;
  onOpenAniPlayer: () => void;
  onGoSheet: () => void;
  onSendToAdShop: () => void;
  onSlice: (id: string) => void;
  starts: Record<string, number>;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export function BoardView(p: Props) {
  const { doc, visible, filters, selected, focusId, api } = p;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; before: boolean } | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [namingView, setNamingView] = useState(false);
  const dragCounter = useRef(0);

  const focus = doc.frames.find((f) => f.id === focusId) ?? null;
  const focusIndex = focus ? doc.frames.findIndex((f) => f.id === focus.id) : -1;
  // Bulk selection must be narrowed to one frame before opening a studio.
  const studioFrameId = selected.length === 1 ? selected[0] : selected.length === 0 ? focus?.id : undefined;
  const canReorder = filters.sort === "sequence";
  const counts = useMemo(() => {
    const c = { draft: 0, approved: 0, rework: 0 };
    doc.frames.forEach((f) => c[f.status]++);
    return c;
  }, [doc.frames]);
  const runtime = doc.frames.reduce((a, f) => a + f.duration, 0);

  const toggleSel = (id: string, additive: boolean) => {
    if (additive) {
      p.setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    } else {
      p.setSelected(selected.includes(id) && selected.length === 1 ? [] : [id]);
    }
  };

  const handleDrop = (targetId: string, before: boolean) => {
    if (!dragId || dragId === targetId) return;
    const ids = doc.frames.map((f) => f.id);
    const from = ids.indexOf(dragId);
    let to = ids.indexOf(targetId) + (before ? 0 : 1);
    if (from < to) to -= 1;
    api.reorder(dragId, to);
    setDragId(null);
    setDropAt(null);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length) api.importFiles(imgs);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* ---------------- left rail ---------------- */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-30 flex w-[248px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-ink-900/98 p-3 backdrop-blur transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:bg-ink-900/60",
          railOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
          <label className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed border-amber/45 bg-gradient-to-b from-amber/10 to-transparent px-3 py-4 text-center transition-all hover:border-amber hover:from-amber/20">
            <Icon name="upload" size={20} className="text-amber transition-transform group-hover:-translate-y-0.5" />
            <span className="text-[12px] font-semibold text-bone">Import frames</span>
            <span className="text-[10.5px] leading-tight text-mute">
              Drop images, click to browse,
              <br />
              or paste from the clipboard
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div>
          <SectionTitle
            right={
              <button
                onClick={() => setNamingView((v) => !v)}
                className="text-dim transition-colors hover:text-amber"
                title="Save current filters as a view"
              >
                <Icon name="plus" size={13} />
              </button>
            }
          >
            Saved views
          </SectionTitle>
          {namingView && (
            <div className="mb-1.5 flex gap-1">
              <input
                autoFocus
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && viewName.trim()) {
                    p.onSaveView(viewName.trim());
                    setViewName("");
                    setNamingView(false);
                  }
                  if (e.key === "Escape") setNamingView(false);
                }}
                placeholder="View name…"
                className="h-7 min-w-0 flex-1 rounded border border-ink-600 bg-ink-850 px-2 text-[11px] text-bone focus:border-amber focus:outline-none"
              />
              <IconBtn
                icon="check"
                label="Save view"
                size={28}
                onClick={() => {
                  if (viewName.trim()) {
                    p.onSaveView(viewName.trim());
                    setViewName("");
                    setNamingView(false);
                  }
                }}
              />
            </div>
          )}
          <div className="space-y-1">
            {p.views.map((v) => (
              <div
                key={v.id}
                className={cn(
                  "group flex items-center gap-2 rounded-[5px] border px-2 py-1.5 transition-all",
                  p.activeView === v.id
                    ? "border-amber/50 bg-amber/12"
                    : "border-transparent hover:border-line hover:bg-ink-800"
                )}
              >
                <button
                  onClick={() => p.onApplyView(v)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Icon
                    name={v.builtin ? "folder" : "eye"}
                    size={13}
                    className={p.activeView === v.id ? "text-amber" : "text-dim"}
                  />
                  <span
                    className={cn(
                      "truncate text-[12px]",
                      p.activeView === v.id ? "text-amber" : "text-mute group-hover:text-bone"
                    )}
                  >
                    {v.name}
                  </span>
                </button>
                {!v.builtin && (
                  <button
                    onClick={() => p.onDeleteView(v.id)}
                    className="text-dim opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                    title="Delete view"
                  >
                    <Icon name="x" size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle hue="#21d4ee">Filter &amp; sort</SectionTitle>
          <div className="relative">
            <Icon name="search" size={13} className="absolute left-2 top-2.5 text-dim" />
            <input
              ref={p.searchRef}
              value={filters.query}
              onChange={(e) => p.setFilters({ ...filters, query: e.target.value })}
              placeholder="Search name, caption, tag…"
              className="h-8 w-full rounded-[5px] border border-ink-600 bg-ink-850 pl-7 pr-6 text-[12px] text-bone focus:border-cyan focus:outline-none"
            />
            {filters.query && (
              <button
                onClick={() => p.setFilters({ ...filters, query: "" })}
                className="absolute right-1.5 top-2 text-dim hover:text-bone"
                title="Clear search"
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>
          <Select<ShotType | "ALL">
            value={filters.shot}
            onChange={(v) => p.setFilters({ ...filters, shot: v })}
            options={[
              { value: "ALL", label: "All shot sizes" },
              ...SHOTS.map((s) => ({ value: s as ShotType | "ALL", label: s })),
            ]}
          />
          <Select<FrameStatus | "ALL">
            value={filters.status}
            onChange={(v) => p.setFilters({ ...filters, status: v })}
            options={[
              { value: "ALL", label: "Any status" },
              { value: "draft", label: "Draft" },
              { value: "approved", label: "Approved" },
              { value: "rework", label: "Rework" },
            ]}
          />
          <Select<SortKey>
            value={filters.sort}
            onChange={(v) => p.setFilters({ ...filters, sort: v })}
            options={[
              { value: "sequence", label: "Sequence (manual)" },
              { value: "name", label: "Name A–Z" },
              { value: "duration", label: "Longest hold" },
              { value: "status", label: "Status" },
            ]}
          />
          {!canReorder && (
            <Btn
              size="xs"
              icon="bolt"
              className="w-full"
              onClick={() => {
                api.bake(visible.map((f) => f.id));
                p.setFilters({ ...filters, sort: "sequence" });
              }}
            >
              Bake this order into sequence
            </Btn>
          )}
        </div>

        <div>
          <SectionTitle hue="#b8f24a">Board density</SectionTitle>
          <Slider
            label="Card width"
            value={p.density}
            min={190}
            max={460}
            step={10}
            unit="px"
            onChange={p.setDensity}
          />
        </div>

        <div className="mt-auto space-y-2 border-t border-line pt-3">
          <SectionTitle hue="#ff2e88">Board health</SectionTitle>
          <div className="flex h-2 overflow-hidden rounded-full bg-ink-700">
            {(["approved", "draft", "rework"] as FrameStatus[]).map((s) => (
              <div
                key={s}
                className="h-full transition-all duration-500"
                style={{
                  width: `${(counts[s] / Math.max(1, doc.frames.length)) * 100}%`,
                  background: STATUS_META[s].color,
                }}
                title={`${counts[s]} ${s}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
            {(["approved", "draft", "rework"] as FrameStatus[]).map((s) => (
              <div key={s} className="rounded border border-ink-600 bg-ink-850 py-1">
                <div style={{ color: STATUS_META[s].color }}>{counts[s]}</div>
                <div className="text-[8px] uppercase tracking-wider text-dim">{s}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-dim">
            <span>{doc.frames.length} FRAMES</span>
            <span className="text-amber">{timecode(runtime)}</span>
          </div>
          <Btn icon="sheet" variant="solid" className="w-full" onClick={p.onGoSheet}>
            Build contact sheet
          </Btn>
        </div>
      </aside>

      {railOpen && (
        <button
          className="absolute inset-0 z-20 bg-ink-950/70 lg:hidden"
          onClick={() => setRailOpen(false)}
          aria-label="Close filters"
        />
      )}

      {/* ---------------- board ---------------- */}
      <section
        className="relative flex min-w-0 flex-1 flex-col"
        onDragEnter={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          dragCounter.current++;
          setFileOver(true);
        }}
        onDragLeave={() => {
          dragCounter.current = Math.max(0, dragCounter.current - 1);
          if (!dragCounter.current) setFileOver(false);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragCounter.current = 0;
          setFileOver(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-850/80 px-3 py-2">
          <IconBtn icon="sliders" label="Filters" className="lg:hidden" onClick={() => setRailOpen(true)} />
          <button
            onClick={() =>
              p.setSelected(selected.length === visible.length ? [] : visible.map((f) => f.id))
            }
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[5px] border px-2 text-[11px] transition-colors",
              selected.length && selected.length === visible.length
                ? "border-amber/60 bg-amber/15 text-amber"
                : "border-ink-600 text-mute hover:border-line hover:text-bone"
            )}
          >
            <Icon name="check" size={12} />
            {selected.length ? `${selected.length} selected` : "Select all"}
          </button>
          <Btn
            size="xs"
            icon="send"
            variant="cool"
            disabled={!doc.frames.length}
            onClick={p.onSendToAdShop}
            title={selected.length ? `Send ${selected.length} selected frame${selected.length === 1 ? "" : "s"} to AdShop` : `Send all ${doc.frames.length} frames to AdShop`}
          >
            {selected.length ? `Send ${selected.length} selected` : "Send all"} to AdShop
          </Btn>

          <Btn size="xs" icon="text" disabled={!studioFrameId}
            title={studioFrameId ? "Open the selected frame in Neo1 Studio" : "Select or focus one frame first"}
            onClick={() => studioFrameId && p.onOpenStudio("neo1", studioFrameId)}>
            Neo1 Studio
          </Btn>
          <Btn size="xs" icon="comment" disabled={!studioFrameId}
            title={studioFrameId ? "Open the selected frame in Bubble Studio" : "Select or focus one frame first"}
            onClick={() => studioFrameId && p.onOpenStudio("bubble", studioFrameId)}>
            Bubble Studio
          </Btn>
          <Btn size="xs" icon="expand" disabled={!studioFrameId}
            variant="cool"
            title={studioFrameId ? "Open Zoom Studio for the selected frame" : "Select or focus one frame first"}
            onClick={() => studioFrameId ? p.onOpenZoomStudio(studioFrameId) : p.onOpenZoomStudio()}>
            Zoom Studio
          </Btn>
          <Btn size="xs" icon="film" variant="cool"
            disabled={!doc.frames.length}
            title={doc.frames.length ? `Play ${doc.frames.length} frames in AniPlayer` : "Add frames to play"}
            onClick={() => p.onOpenAniPlayer()}>
            AniPlayer
          </Btn>

          {selected.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pop">
              <div className="h-5 w-px bg-line" />
              {(["approved", "draft", "rework"] as FrameStatus[]).map((s) => (
                <Chip key={s} color={STATUS_META[s].color} onClick={() => api.setStatus(selected, s)}>
                  {STATUS_META[s].label}
                </Chip>
              ))}
              <div className="h-5 w-px bg-line" />
              <Btn size="xs" icon="copy" onClick={() => api.duplicate(selected)}>
                Duplicate
              </Btn>
              <Btn size="xs" icon="trash" variant="danger" onClick={() => api.remove(selected)}>
                Delete
              </Btn>
              <Btn size="xs" variant="ghost" onClick={() => p.setSelected([])}>
                Clear
              </Btn>
            </div>
          ) : (
            <span className="hidden font-mono text-[10px] text-dim sm:inline">
              {canReorder ? "DRAG CARDS TO RESEQUENCE · DOUBLE-CLICK TO ANNOTATE" : "SORTED VIEW · REORDER DISABLED"}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-dim">
            <span>
              {visible.length}/{doc.frames.length} SHOWN
            </span>
            <span className="text-amber">{shortDur(runtime)}</span>
          </div>
        </div>

        {/* grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {visible.length === 0 ? (
            <Empty
              icon={doc.frames.length ? "search" : "image"}
              title={doc.frames.length ? "Nothing matches" : "Load the first reel"}
              body={
                doc.frames.length
                  ? "No frame matches this filter combination. Clear the search or pick another saved view."
                  : "Drop a folder of stills, renders or storyboard scans. They land in sequence, ready to name, caption, reorder and hand to a model."
              }
              action={
                doc.frames.length ? (
                  <Btn
                    icon="refresh"
                    onClick={() => p.setFilters({ query: "", shot: "ALL", status: "ALL", sort: "sequence" })}
                  >
                    Reset filters
                  </Btn>
                ) : (
                  <label className="cursor-pointer">
                    <span className="inline-flex h-9 items-center gap-2 rounded-[5px] bg-gradient-to-b from-amber to-ember px-4 text-[13px] font-semibold text-ink-950">
                      <Icon name="upload" size={15} /> Import images
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => {
                        onFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )
              }
            />
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${p.density}px, 1fr))` }}
            >
              {visible.map((f, i) => {
                const realIndex = doc.frames.findIndex((x) => x.id === f.id);
                const isSel = selected.includes(f.id);
                const isFocus = focusId === f.id;
                const sm = STATUS_META[f.status];
                return (
                  <article
                    key={f.id}
                    draggable={canReorder}
                    onDragStart={(e) => {
                      setDragId(f.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", f.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDropAt(null);
                    }}
                    onDragOver={(e) => {
                      if (!dragId || !canReorder) return;
                      e.preventDefault();
                      const r = e.currentTarget.getBoundingClientRect();
                      setDropAt({ id: f.id, before: e.clientX < r.left + r.width / 2 });
                    }}
                    onDrop={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      handleDrop(f.id, e.clientX < r.left + r.width / 2);
                    }}
                    onClick={() => p.setFocusId(f.id)}
                    onDoubleClick={() => p.onOpenEditor(f.id)}
                    style={{ animationDelay: `${Math.min(i * 26, 420)}ms` }}
                    className={cn(
                      "group relative flex cursor-pointer flex-col overflow-hidden rounded-md border bg-ink-850 transition-all duration-200 rise",
                      "hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgba(0,0,0,0.95)]",
                      isFocus ? "border-cyan/70 shadow-[0_0_0_1px_rgba(33,212,238,0.35)]" : "border-ink-600 hover:border-line",
                      isSel && "border-amber ring-1 ring-amber/60",
                      dragId === f.id && "drag-ghost"
                    )}
                  >
                    {dropAt?.id === f.id && dragId && dragId !== f.id && (
                      <span
                        className={cn(
                          "absolute inset-y-0 z-20 w-[3px] bg-amber shadow-[0_0_14px_2px_rgba(255,171,31,0.8)]",
                          dropAt.before ? "left-0" : "right-0"
                        )}
                      />
                    )}
                    <span className="absolute inset-y-0 left-0 z-10 w-[3px]" style={{ background: sm.color }} />

                    <div className="relative aspect-video overflow-hidden bg-ink-900">
                      <img
                        src={f.src}
                        alt={f.name}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-ink-950/35" />

                      <span className="absolute bottom-1.5 left-2 display text-[34px] leading-none text-bone/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                        {String(realIndex + 1).padStart(2, "0")}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSel(f.id, true);
                        }}
                        title="Select frame"
                        className={cn(
                          "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border transition-all",
                          isSel
                            ? "border-amber bg-amber text-ink-950"
                            : "border-bone/45 bg-ink-950/60 text-transparent hover:border-amber hover:text-amber/70"
                        )}
                      >
                        <Icon name="check" size={12} strokeWidth={3} />
                      </button>

                      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
                        {canReorder && (
                          <>
                            <IconBtn
                              icon="left"
                              label="Move earlier"
                              size={26}
                              className="bg-ink-950/75"
                              disabled={realIndex === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                api.reorder(f.id, realIndex - 1);
                              }}
                            />
                            <IconBtn
                              icon="right"
                              label="Move later"
                              size={26}
                              className="bg-ink-950/75"
                              disabled={realIndex === doc.frames.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                api.reorder(f.id, realIndex + 1);
                              }}
                            />
                          </>
                        )}
                        <IconBtn
                          icon="expand"
                          label="Enlarge & annotate"
                          size={26}
                          tone="cool"
                          className="bg-ink-950/75"
                          onClick={(e) => {
                            e.stopPropagation();
                            p.onOpenEditor(f.id);
                          }}
                        />
                        <IconBtn
                          icon="scissors"
                          label="Slice this image"
                          size={26}
                          className="bg-ink-950/75"
                          onClick={(e) => { e.stopPropagation(); p.onSlice(f.id); }}
                        />
                        <IconBtn
                          icon="copy"
                          label="Duplicate"
                          size={26}
                          className="bg-ink-950/75"
                          onClick={(e) => {
                            e.stopPropagation();
                            api.duplicate([f.id]);
                          }}
                        />
                        <IconBtn
                          icon="trash"
                          label="Delete"
                          size={26}
                          tone="danger"
                          className="bg-ink-950/75"
                          onClick={(e) => {
                            e.stopPropagation();
                            api.remove([f.id]);
                          }}
                        />
                      </div>

                      <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                        {f.annotated && (
                          <span className="rounded bg-cyan/90 px-1 py-[1px] font-mono text-[8px] font-bold text-ink-950">
                            ✎
                          </span>
                        )}
                        <span className="rounded bg-ink-950/80 px-1.5 py-[1px] font-mono text-[9px] text-amber">
                          {shortDur(f.duration)}
                        </span>
                        <span
                          className="rounded px-1.5 py-[1px] font-mono text-[9px] font-semibold"
                          style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
                        >
                          {f.shot}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-1 p-2 pl-3">
                      <input
                        value={f.name}
                        onChange={(e) => api.update(f.id, { name: e.target.value }, `name-${f.id}`)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Name this frame"
                        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-semibold text-bone transition-colors hover:border-ink-600 focus:border-amber focus:bg-ink-900 focus:outline-none"
                      />
                      <textarea
                        value={f.caption}
                        onChange={(e) => api.update(f.id, { caption: e.target.value }, `cap-${f.id}`)}
                        onClick={(e) => e.stopPropagation()}
                        rows={2}
                        placeholder="Add a caption / comment for the sheet…"
                        className="w-full resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] leading-snug text-mute transition-colors hover:border-ink-600 focus:border-amber focus:bg-ink-900 focus:text-bone focus:outline-none"
                      />
                      <div className="mt-auto flex items-center gap-1.5 pt-1 font-mono text-[9.5px] text-dim">
                        <span className="text-amber/80">{timecode(p.starts[f.id] ?? 0)}</span>
                        {f.comments.length > 0 && (
                          <span className="flex items-center gap-0.5 text-magenta">
                            <Icon name="comment" size={10} />
                            {f.comments.length}
                          </span>
                        )}
                        <span className="ml-auto flex gap-1 overflow-hidden">
                          {f.tags.slice(0, 2).map((t) => (
                            <span key={t} className="truncate rounded bg-ink-700 px-1 text-lime/80">
                              {t}
                            </span>
                          ))}
                        </span>
                        {canReorder && (
                          <Icon name="grip" size={12} className="cursor-grab text-dim opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {fileOver && (
          <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-amber bg-ink-950/85">
            <div className="text-center">
              <Icon name="upload" size={34} className="mx-auto text-amber" />
              <p className="display mt-2 text-3xl text-amber">Drop to append</p>
              <p className="text-[12px] text-mute">Images join the end of the sequence</p>
            </div>
          </div>
        )}
      </section>

      {/* ---------------- inspector ---------------- */}
      <aside
        className={cn(
          "absolute inset-y-0 right-0 z-30 w-[300px] shrink-0 border-l border-line bg-ink-900/98 backdrop-blur transition-transform duration-300 xl:static xl:z-auto xl:translate-x-0 xl:bg-ink-900/60",
          focus ? "translate-x-0 shadow-2xl" : "translate-x-full xl:translate-x-0"
        )}
      >
        <Inspector
          frame={focus}
          index={focusIndex}
          total={doc.frames.length}
          start={focus ? p.starts[focus.id] ?? 0 : 0}
          onClose={() => p.setFocusId(null)}
          onUpdate={(patch, merge) => focus && api.update(focus.id, patch, merge)}
          onDelete={() => focus && api.remove([focus.id])}
          onDuplicate={() => focus && api.duplicate([focus.id])}
          onOpenEditor={() => focus && p.onOpenEditor(focus.id)}
          onOpenStudio={(kind) => focus && p.onOpenStudio(kind, focus.id)}
          onOpenZoomStudio={() => focus && p.onOpenZoomStudio(focus.id)}
          onOpenAniPlayer={() => p.onOpenAniPlayer()}
          onComment={(text) => focus && api.comment(focus.id, text)}
          onDeleteComment={(cid) => focus && api.deleteComment(focus.id, cid)}
          onReplace={(file) => focus && api.replaceImage(focus.id, file)}
          onStep={(dir) => {
            const next = doc.frames[focusIndex + dir];
            if (next) p.setFocusId(next.id);
          }}
        />
      </aside>
    </div>
  );
}