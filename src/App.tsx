import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AdShop } from "./components/AdShop";
import { BoardView, type BoardApi } from "./components/BoardView";
import { FrameEditor } from "./components/FrameEditor";
import { HandoffView } from "./components/HandoffView";
import { Icon } from "./components/Icon";
import { PreviewDock } from "./components/PreviewDock";
import { SheetView } from "./components/SheetView";
import { SliceView } from "./components/SliceView";
import { ThemeMenu } from "./components/ThemeMenu";
import { StudioDialog } from "./components/StudioDialog";
import { Btn, IconBtn } from "./components/ui";
import {
  DEFAULT_SHEET,
  type AdShopHandoff,
  type Doc,
  type Filters,
  type Frame,
  type FrameStatus,
  type SavedView,
  type SheetSettings,
  type StudioProject,
} from "./types";
import {
  canvasBlob,
  copyCanvas,
  copyText,
  downloadBlob,
  downloadText,
  readImageFile,
  pngDimensions,
  slug,
  timecode,
  uid,
} from "./lib/imaging";
import { BUILTIN_VIEWS, seedDoc } from "./lib/seed";
import { DEFAULT_HANDOFF, buildPrompt, manifestJson, type HandoffOptions } from "./lib/prompts";
import { THEMES, renderSheet, type SheetResult } from "./lib/sheet";
import { initHistory, reducer } from "./lib/store";
import {
  applyTheme,
  loadTheme,
  saveTheme,
  type ThemeKey,
} from "./lib/theme";
import { cn } from "./utils/cn";

const Neo1StudioModal = lazy(() => import("./components/Neo1StudioModal"));
const BubbleStudioModal = lazy(() => import("./components/Bubba1StudioModal"));
const ZoomStudioModal = lazy(() => import("./components/ZoomStudioModal").then(m => ({ default: m.ZoomStudioModal })) );
const AniPlayerModal = lazy(() => import("./components/AniPlayerModal").then(m => ({ default: m.AniPlayerModal })) );

type StudioKind = "neo1" | "bubble";
interface StudioSession {
  kind: StudioKind;
  frame: Frame;
  // Keep the original base while the live layers remain editable.
  imageSrc: string;
}

type Tab = "board" | "sheet" | "handoff" | "slice";
type Tone = "info" | "success" | "warn" | "danger";
interface Toast {
  id: string;
  text: string;
  tone: Tone;
  action?: { label: string; run: () => void };
}

const PREF_KEY = "reeldeck.prefs.v1";

interface Prefs {
  sheet?: Partial<SheetSettings>;
  handoff?: Partial<HandoffOptions>;
  views?: SavedView[];
  density?: number;
  theme?: ThemeKey;
  previewCollapsed?: boolean;
}

function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || "{}") as Prefs;
  } catch {
    return {};
  }
}

const TONE: Record<Tone, { color: string; icon: string }> = {
  info: { color: "#4aa8ff", icon: "info" },
  success: { color: "#2fd07a", icon: "check" },
  warn: { color: "#ffc53d", icon: "warn" },
  danger: { color: "#ff4438", icon: "warn" },
};

export default function App() {
  // AdShop is the entry point on every launch. Keep both surfaces mounted so
  // navigating between them doesn't discard an in-progress deck or display.
  const [surface, setSurface] = useState<"adshop" | "studio">("adshop");
  const prefs = useRef<Prefs>(loadPrefs());
  const [hist, dispatch] = useReducer(reducer, undefined, () =>
    initHistory(seedDoc(), prefs.current.sheet)
  );
  const doc = hist.present;

  const [tab, setTab] = useState<Tab>("board");
  const [adShopHandoff, setAdShopHandoff] = useState<AdShopHandoff | null>(null);
  const [sliceFrame, setSliceFrame] = useState<Frame | null>(null);
  const [filters, setFilters] = useState<Filters>({
    query: "",
    shot: "ALL",
    status: "ALL",
    sort: "sequence",
  });
  const [views, setViews] = useState<SavedView[]>(() => [
    ...BUILTIN_VIEWS,
    ...(prefs.current.views ?? []).filter((v) => !v.builtin),
  ]);
  const [activeView, setActiveView] = useState("v_all");
  const [selected, setSelected] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(() =>
    typeof window !== "undefined" && window.innerWidth >= 1280 ? "seed_1" : null
  );
  const [editorId, setEditorId] = useState<string | null>(null);
  const [studioSession, setStudioSession] = useState<StudioSession | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [aniOpen, setAniOpen] = useState(false);
  const [aniIndex, setAniIndex] = useState<number | null>(null);
  const [density, setDensity] = useState(prefs.current.density ?? 268);
  const [handoff, setHandoff] = useState<HandoffOptions>({
    ...DEFAULT_HANDOFF,
    ...prefs.current.handoff,
  });
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<SheetResult | null>(null);
  const [rendering, setRendering] = useState(true);
  const [renderMs, setRenderMs] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeKey>(() =>
    loadTheme()
  );
  // Always-visible live preview — never collapsed/hidden (per "always show preview")
  const [_previewCollapsed] = useState(false);
  void _previewCollapsed;

  const searchRef = useRef<HTMLInputElement>(null);
  const adShopStageRef = useRef<HTMLElement>(null);
  const adShopCommitRef = useRef<HTMLButtonElement>(null);
  const studioBackRef = useRef<HTMLButtonElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
  const canvas = canvasRef.current;
  const renderToken = useRef(0);

  /* ------------------------------ toasts ------------------------------ */
  const toast = useCallback(
    (text: string, tone: Tone = "info", action?: Toast["action"]) => {
      const id = uid("t");
      setToasts((t) => [...t.slice(-3), { id, text, tone, action }]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 7000 : 3600);
    },
    []
  );

  /* ------------------------------ derived ------------------------------ */
  const starts = useMemo(() => {
    const map: Record<string, number> = {};
    let t = 0;
    for (const f of doc.frames) {
      map[f.id] = t;
      t += f.duration;
    }
    return map;
  }, [doc.frames]);

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    let list = doc.frames.filter((f) => {
      if (filters.shot !== "ALL" && f.shot !== filters.shot) return false;
      if (filters.status !== "ALL" && f.status !== filters.status) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.caption.toLowerCase().includes(q) ||
        f.tags.some((t) => t.includes(q)) ||
        f.comments.some((c) => c.text.toLowerCase().includes(q))
      );
    });
    if (filters.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (filters.sort === "duration") list = [...list].sort((a, b) => b.duration - a.duration);
    if (filters.sort === "status") {
      const order: Record<FrameStatus, number> = { rework: 0, draft: 1, approved: 2 };
      list = [...list].sort((a, b) => order[a.status] - order[b.status]);
    }
    return list;
  }, [doc.frames, filters]);

  const scopeFrames = useMemo(() => {
    if (doc.sheet.scope === "filtered") return visible;
    if (doc.sheet.scope === "selected") return doc.frames.filter((f) => selected.includes(f.id));
    return doc.frames;
  }, [doc.sheet.scope, doc.frames, visible, selected]);

  const runtime = doc.frames.reduce((a, f) => a + f.duration, 0);

  /* ------------------------------ sheet render ------------------------------ */
  useEffect(() => {
    const token = ++renderToken.current;
    setRendering(true);
    const t0 = performance.now();
    const timer = window.setTimeout(() => {
      renderSheet(
        canvas,
        { frames: scopeFrames, sheet: doc.sheet, title: doc.title, logline: doc.logline },
        () => renderToken.current !== token
      )
        .then((res) => {
          if (renderToken.current !== token) return;
          setInfo(res);
          setRenderMs(Math.max(1, Math.round(performance.now() - t0)));
          setRendering(false);
        })
        .catch(() => {
          if (renderToken.current === token) setRendering(false);
        });
    }, 130);
    return () => window.clearTimeout(timer);
  }, [canvas, scopeFrames, doc.sheet, doc.title, doc.logline]);

  const refreshPreview = useCallback(() => {
    if (!canvas.width || !canvas.height) return;
    const c = document.createElement("canvas");
    const k = Math.min(1, 900 / canvas.width);
    c.width = Math.max(1, Math.round(canvas.width * k));
    c.height = Math.max(1, Math.round(canvas.height * k));
    c.getContext("2d")!.drawImage(canvas, 0, 0, c.width, c.height);
    setPreview(c.toDataURL("image/jpeg", 0.78));
  }, [canvas]);

  /* the preview is a permanent part of the workspace — keep it fresh on every tab */
  useEffect(() => {
    if (rendering || !info) return;
    const t = window.setTimeout(refreshPreview, 90);
    return () => window.clearTimeout(t);
  }, [rendering, info, refreshPreview]);

  /* ------------------------------ theme ------------------------------ */
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.title = surface === "adshop"
      ? "AdShop — Creative Workspace"
      : "Reel Deck — Storyboard & Contact Sheet Studio";
  }, [surface]);

  /* ------------------------------ prefs ------------------------------ */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          PREF_KEY,
          JSON.stringify({
            sheet: doc.sheet,
            handoff,
            views: views.filter((v) => !v.builtin),
            density,
            theme,
            previewCollapsed: false,
          })
        );
      } catch {
        /* storage full or unavailable — session still works */
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [doc.sheet, handoff, views, density, theme]);

  /* ------------------------------ operations ------------------------------ */
  const importFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBusy("import");
      toast(`Reading ${files.length} image${files.length > 1 ? "s" : ""}…`, "info");
      const results = await Promise.all(
        files.map((f) => readImageFile(f).catch(() => null))
      );
      const ok = results.filter(Boolean) as Awaited<ReturnType<typeof readImageFile>>[];
      setBusy(null);
      if (!ok.length) {
        toast("Those files could not be decoded as images", "danger");
        return;
      }
      const frames: Frame[] = ok.map((r, i) => ({
        id: uid(),
        name: r.name ? r.name.charAt(0).toUpperCase() + r.name.slice(1) : `Frame ${i + 1}`,
        caption: "",
        src: r.src,
        w: r.w,
        h: r.h,
        shot: "WS",
        status: "draft",
        duration: 4,
        tags: [],
        comments: [],
        annotated: false,
        createdAt: Date.now() + i,
      }));
      dispatch({ type: "ADD_FRAMES", frames });
      setFocusId(frames[0].id);
      toast(`${frames.length} frame${frames.length > 1 ? "s" : ""} added to the sequence`, "success", {
        label: "Undo",
        run: () => dispatch({ type: "UNDO" }),
      });
    },
    [toast]
  );

  const api: BoardApi = useMemo(
    () => ({
      update: (id, patch, merge) => dispatch({ type: "UPDATE_FRAME", id, patch, merge }),
      remove: (ids) => {
        if (!ids.length) return;
        dispatch({ type: "DELETE_FRAMES", ids });
        setSelected((s) => s.filter((x) => !ids.includes(x)));
        setFocusId((f) => (f && ids.includes(f) ? null : f));
        toast(`${ids.length} frame${ids.length > 1 ? "s" : ""} deleted`, "warn", {
          label: "Undo",
          run: () => dispatch({ type: "UNDO" }),
        });
      },
      duplicate: (ids) => {
        dispatch({ type: "DUPLICATE", ids });
        toast(`Duplicated ${ids.length} frame${ids.length > 1 ? "s" : ""}`, "success");
      },
      reorder: (id, toIndex) => dispatch({ type: "MOVE", id, toIndex }),
      bake: (orderedIds) => {
        dispatch({ type: "BAKE_ORDER", orderedIds });
        toast("Sort baked into the sequence", "success", {
          label: "Undo",
          run: () => dispatch({ type: "UNDO" }),
        });
      },
      setStatus: (ids, status) => {
        dispatch({ type: "SET_STATUS", ids, status });
        toast(`${ids.length} marked ${status}`, status === "rework" ? "warn" : "success");
      },
      comment: (id, text) => {
        dispatch({ type: "ADD_COMMENT", id, text, author: "You" });
        toast("Comment posted", "success");
      },
      deleteComment: (id, commentId) => {
        dispatch({ type: "DELETE_COMMENT", id, commentId });
        toast("Comment removed", "warn", { label: "Undo", run: () => dispatch({ type: "UNDO" }) });
      },
      importFiles,
      replaceImage: async (id, file) => {
        const r = await readImageFile(file).catch(() => null);
        if (!r) return toast("Could not read that image", "danger");
        dispatch({
          type: "UPDATE_FRAME",
          id,
          patch: { src: r.src, w: r.w, h: r.h, annotated: false },
        });
        toast("Frame image replaced", "success", {
          label: "Undo",
          run: () => dispatch({ type: "UNDO" }),
        });
      },
    }),
    [importFiles, toast]
  );

  const setSheet = useCallback((patch: Partial<SheetSettings>, merge?: string) => {
    dispatch({ type: "SET_SHEET", patch, merge });
  }, []);

  /* ------------------------------ exports ------------------------------ */
  const exportSheet = async (kind: "png" | "jpg") => {
    setBusy("export");
    try {
      const blob = await canvasBlob(canvas, kind === "png" ? "image/png" : "image/jpeg", 0.94);
      downloadBlob(blob, `${slug(doc.title)}-contact-sheet.${kind}`);
      toast(`Sheet exported · ${(blob.size / 1024 / 1024).toFixed(2)} MB`, "success");
    } catch {
      toast("Export failed — try a lower quality setting", "danger");
    }
    setBusy(null);
  };

  const copySheet = async () => {
    const ok = await copyCanvas(canvas);
    toast(ok ? "Contact sheet copied to clipboard" : "Clipboard blocked — use PNG export", ok ? "success" : "warn");
  };

  const printSheet = () => {
    const url = canvas.toDataURL("image/jpeg", 0.9);
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const d = frame.contentDocument!;
    d.open();
    d.write(
      `<title>${slug(doc.title)}</title><style>@page{margin:8mm}body{margin:0;background:#fff}img{width:100%}</style><img src="${url}" onload="setTimeout(()=>{window.focus();window.print()},120)">`
    );
    d.close();
    setTimeout(() => frame.remove(), 60000);
    toast("Print dialog opened", "info");
  };

  /* ------------------------------ handoff ------------------------------ */
  const autoPrompt = useMemo(
    () => buildPrompt(doc, scopeFrames, handoff, info),
    [doc, scopeFrames, handoff, info]
  );
  const prompt = promptOverride ?? autoPrompt;

  const handoffActions = {
    copyPrompt: async () => {
      const ok = await copyText(prompt);
      toast(ok ? "Prompt copied — attach the sheet in your chat" : "Clipboard blocked by the browser", ok ? "success" : "warn");
    },
    copyBoth: async () => {
      setBusy("both");
      try {
        const blob = await canvasBlob(canvas, "image/png");
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([prompt], { type: "text/plain" }),
            "image/png": blob,
          }),
        ]);
        toast("Prompt + contact sheet copied together", "success");
      } catch {
        const ok = await copyText(prompt);
        toast(
          ok ? "Prompt copied. This browser blocks image clipboard — export the PNG." : "Clipboard blocked",
          "warn"
        );
      }
      setBusy(null);
    },
    md: () => {
      downloadText(
        `<!-- ${doc.title} — Reel Deck handoff -->\n\n${prompt}\n`,
        `${slug(doc.title)}-handoff.md`,
        "text/markdown"
      );
      toast("Markdown brief downloaded", "success");
    },
    json: () => {
      downloadText(manifestJson(doc, scopeFrames), `${slug(doc.title)}-manifest.json`, "application/json");
      toast("Frame manifest downloaded", "success");
    },
    bundle: async () => {
      setBusy("bundle");
      try {
        const blob = await canvasBlob(canvas, "image/png");
        const dataUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.onerror = () => rej(new Error("read"));
          fr.readAsDataURL(blob);
        });
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(
          doc.title
        )} — handoff</title><style>
:root{color-scheme:dark}body{margin:0;background:#0d0b0a;color:#f4ece0;font:14px/1.6 "Space Grotesk",system-ui,sans-serif}
header{padding:22px 26px;border-bottom:1px solid #443830;background:linear-gradient(90deg,#1a1614,#0d0b0a)}
h1{margin:0;font:400 40px/1 "Bebas Neue",Impact,sans-serif;letter-spacing:.02em}
p.sub{margin:6px 0 0;color:#a5948a}main{padding:26px;max-width:1400px;margin:0 auto}
img{width:100%;border:1px solid #443830;border-radius:6px;display:block}
pre{white-space:pre-wrap;background:#131010;border:1px solid #2c2420;border-radius:6px;padding:18px;color:#d8cec2;font:12px/1.7 "IBM Plex Mono",monospace}
button{background:linear-gradient(#ffab1f,#ff6a1a);border:0;color:#14100e;font-weight:700;padding:10px 16px;border-radius:5px;cursor:pointer;margin:14px 0}
h2{font:400 24px/1 "Bebas Neue",Impact,sans-serif;letter-spacing:.04em;color:#ffab1f;margin:26px 0 8px}
</style></head><body><header><h1>${esc(doc.title)}</h1><p class="sub">${esc(
          doc.logline
        )}</p><p class="sub">${scopeFrames.length} frames · ${info ? `${info.width}×${info.height}px` : ""} · generated ${new Date().toLocaleString()}</p></header>
<main><h2>Contact sheet</h2><img alt="Contact sheet" src="${dataUrl}">
<h2>Prompt</h2><button onclick="navigator.clipboard.writeText(document.getElementById('p').textContent).then(()=>{this.textContent='Copied ✓'})">Copy prompt</button>
<pre id="p">${esc(prompt)}</pre></main></body></html>`;
        downloadText(html, `${slug(doc.title)}-handoff.html`, "text/html");
        toast("Self-contained handoff bundle downloaded", "success");
      } catch {
        toast("Could not pack the bundle", "danger");
      }
      setBusy(null);
    },
    openModel: async (m: "gpt" | "claude") => {
      await copyText(prompt);
      const short = prompt.length < 5500;
      const url =
        m === "gpt"
          ? `https://chatgpt.com/${short ? `?q=${encodeURIComponent(prompt)}` : ""}`
          : `https://claude.ai/new${short ? `?q=${encodeURIComponent(prompt)}` : ""}`;
      window.open(url, "_blank", "noopener");
      toast("Prompt copied — attach contact-sheet.png in the chat", "info");
    },
  };

  /* ------------------------------ editor ------------------------------ */
  const editorFrame = editorId ? doc.frames.find((f) => f.id === editorId) ?? null : null;
  const editorIndex = editorFrame ? doc.frames.findIndex((f) => f.id === editorFrame.id) : -1;

  const saveFromEditor = (src: string, w: number, h: number, mode: "replace" | "new", name: string) => {
    if (!editorFrame) return;
    if (mode === "replace") {
      dispatch({
        type: "UPDATE_FRAME",
        id: editorFrame.id,
        patch: { src, w, h, name: name || editorFrame.name, annotated: true },
      });
      toast("Annotations saved to the board", "success", {
        label: "Undo",
        run: () => dispatch({ type: "UNDO" }),
      });
    } else {
      const copy: Frame = {
        ...editorFrame,
        id: uid(),
        name: `${name || editorFrame.name} — annotated`,
        src,
        w,
        h,
        annotated: true,
        status: "draft",
        comments: [],
        createdAt: Date.now(),
      };
      dispatch({ type: "ADD_FRAMES", frames: [copy], index: editorIndex + 1 });
      setFocusId(copy.id);
      toast("Saved as a new frame after the original", "success");
    }
    setEditorId(null);
  };

  /* --------------------- Neo1 / Bubble Studio handoff -------------------- */
  const openStudio = (kind: StudioKind, id: string) => {
    const frame = doc.frames.find((item) => item.id === id);
    if (!frame) return;
    const project = frame.studioProject;
    const imageSrc = project?.kind === kind
      ? project.kind === "bubble" ? project.baseSrc : project.canvas.background.imageUrl
      : frame.src;
    setFocusId(id);
    setStudioSession({ kind, frame: { ...frame }, imageSrc });
  };

  // Zoom Studio integration synced with ReelDeck
  const zoomSlices = useMemo(() => doc.frames.map((f) => ({ name: f.name, url: f.src })), [doc.frames]);
  const openZoomStudio = useCallback((id?: string) => {
    const targetId = id ?? (selected.length === 1 ? selected[0] : focusId ?? doc.frames[0]?.id);
    if (!targetId) { toast("Select a frame first to open Zoom Studio", "warn"); return; }
    const idx = doc.frames.findIndex((f) => f.id === targetId);
    setZoomIndex(idx >= 0 ? idx : 0);
    if (targetId) setFocusId(targetId);
    setZoomOpen(true);
  }, [selected, focusId, doc.frames]);

  const handleApplyZoomVariations = useCallback((frames: Array<{ name: string; url: string }>, mode: "append_storyboard" | "replace_frame", targetSliceIndex?: number | null) => {
    if (!frames.length) return;
    const load = async () => {
      const mapped: Frame[] = [];
      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        // estimate dims from source image
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new Image(); img.onload = () => resolve({ w: img.naturalWidth || 1280, h: img.naturalHeight || 720 }); img.onerror = () => resolve({ w: 1280, h: 720 }); img.src = f.url;
        });
        mapped.push({
          id: uid(),
          name: f.name,
          caption: "",
          src: f.url,
          w: dims.w, h: dims.h,
          shot: "WS",
          status: "draft",
          duration: 2 + (i % 3),
          tags: ["zoom-studio"],
          comments: [],
          annotated: true,
          createdAt: Date.now() + i,
        });
      }
      if (mode === "replace_frame" && targetSliceIndex !== null && targetSliceIndex !== undefined && doc.frames[targetSliceIndex]) {
        const targetId = doc.frames[targetSliceIndex].id;
        // replace single frame with sequence: delete then add at same index
        dispatch({ type: "DELETE_FRAMES", ids: [targetId] });
        // after deletion, insert at original index
        setTimeout(() => {
          dispatch({ type: "ADD_FRAMES", frames: mapped, index: targetSliceIndex });
          setFocusId(mapped[0].id);
          setSelected(mapped.map(m => m.id));
        }, 0);
        toast(`Replaced frame with ${mapped.length} zoom frames`, "success", { label: "Undo", run: () => dispatch({ type: "UNDO" }) });
      } else {
        const anchorIdx = targetSliceIndex !== null && targetSliceIndex !== undefined ? targetSliceIndex + 1 : undefined;
        const insertAt = anchorIdx !== undefined && anchorIdx <= doc.frames.length ? anchorIdx : undefined;
        dispatch({ type: "ADD_FRAMES", frames: mapped, index: insertAt });
        setFocusId(mapped[0].id);
        setSelected(mapped.map(m => m.id));
        toast(`Appended ${mapped.length} zoom frames to ReelDeck`, "success", { label: "Undo", run: () => dispatch({ type: "UNDO" }) });
      }
    };
    void load();
  }, [doc.frames]);

  // AniPlayer integration – synced live with ReelDeck deck and Zoom outputs
  const aniFrames = useMemo(() => doc.frames.map(f => ({ url: f.src, name: f.name, caption: f.caption })), [doc.frames]);
  const openAniPlayer = useCallback((id?: string | number) => {
    if (typeof id === "string") {
      const idx = doc.frames.findIndex(f => f.id === id);
      setAniIndex(idx >= 0 ? idx : 0);
      if (idx >= 0) setFocusId(id);
    } else if (typeof id === "number") {
      setAniIndex(Math.max(0, Math.min(doc.frames.length - 1, id)));
      const f = doc.frames[id]; if (f) setFocusId(f.id);
    } else {
      const targetId = selected.length === 1 ? selected[0] : focusId ?? doc.frames[0]?.id;
      if (!targetId) { if (!doc.frames.length) { toast("Add frames to play animation", "warn"); return; } setAniIndex(0); }
      else {
        const idx = doc.frames.findIndex(f => f.id === targetId);
        setAniIndex(idx >= 0 ? idx : 0);
        if (targetId) setFocusId(targetId);
      }
    }
    setAniOpen(true);
  }, [doc.frames, selected, focusId]);

  const saveFromStudio = (src: string, sliceIndex: number | null | undefined, name: string | undefined, project: StudioProject) => {
    if (!studioSession) return;
    const dimensions = pngDimensions(src);
    if (!dimensions) {
      toast("The studio could not create a valid image; the frame was not changed", "danger");
      return;
    }
    const currentIndex = doc.frames.findIndex((item) => item.id === studioSession.frame.id);
    if (currentIndex < 0) {
      toast("The original frame no longer exists", "danger");
      return;
    }
    const frame = doc.frames[currentIndex];
    if (sliceIndex === null) {
      const copy: Frame = {
        ...frame,
        id: uid(),
        name: name || `${frame.name} (${studioSession.kind === "neo1" ? "Neo1" : "Bubble"})`,
        src,
        ...dimensions,
        annotated: true,
        status: "draft",
        comments: [],
        createdAt: Date.now(),
        studioProject: project,
      };
      dispatch({ type: "ADD_FRAMES", frames: [copy], index: currentIndex + 1 });
      setFocusId(copy.id);
      toast("Saved as a new frame after the original", "success");
    } else {
      dispatch({ type: "UPDATE_FRAME", id: frame.id, patch: { src, ...dimensions, annotated: true, studioProject: project } });
      toast("Studio composition saved to the board", "success", {
        label: "Undo", run: () => dispatch({ type: "UNDO" }),
      });
    }
  };

  /* ------------------------------ shortcuts ------------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (surface !== "studio" || editorId || studioSession || tab === "slice") return;
      const el = e.target as HTMLElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "REDO" : "UNDO" });
        return;
      }
      if (meta && e.key.toLowerCase() === "a" && !typing) {
        e.preventDefault();
        setSelected(visible.map((f) => f.id));
        return;
      }
      if (typing) {
        if (e.key === "Escape") el.blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        setTab("board");
        setTimeout(() => searchRef.current?.focus(), 30);
        return;
      }
      if (e.key === "1") setTab("board");
      if (e.key === "2") setTab("sheet");
      if (e.key === "3") setTab("handoff");
      if (e.key.toLowerCase() === "e" && focusId) setEditorId(focusId);
      if ((e.key === "Delete" || e.key === "Backspace") && selected.length) {
        e.preventDefault();
        api.remove(selected);
      }
      if (e.key === "Escape") setSelected([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorId, studioSession, focusId, selected, visible, api, tab, surface]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (surface !== "studio" || editorId || studioSession || tab === "slice") return;
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter(Boolean) as File[];
      if (!files.length) return;
      e.preventDefault();
      setTab("board");
      importFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [editorId, studioSession, importFiles, tab, surface]);

  /* ------------------------------ views ------------------------------ */
  const applyView = (v: SavedView) => {
    setActiveView(v.id);
    setFilters({ query: v.query, shot: v.shot, status: v.status, sort: v.sort });
  };

  const tabs: { key: Tab; label: string; icon: string; badge?: string }[] = [
    { key: "board", label: "Board", icon: "grid", badge: String(doc.frames.length) },
    { key: "sheet", label: "Contact sheet", icon: "sheet" },
    { key: "slice", label: "Slice studio", icon: "scissors" },
    { key: "handoff", label: "LLM handoff", icon: "spark", badge: String(handoff.selected.length) },
  ];

  const openWorkspace = (next: Tab) => {
    setTab(next);
    setSurface("studio");
    window.requestAnimationFrame(() => {
      if (editorId) editorRootRef.current?.focus();
      else studioBackRef.current?.focus();
    });
  };
  const openAdShop = (focusCommit = false) => {
    setSurface("adshop");
    window.requestAnimationFrame(() => {
      const stage = adShopStageRef.current;
      stage?.closest(".as-root")?.scrollTo({ top: 0, behavior: "auto" });
      const target = focusCommit ? adShopCommitRef.current ?? stage : stage;
      target?.focus({ preventScroll: true });
    });
  };
  const handoffToAdShop = (scope: "selected-or-all" | "all", returnTo: AdShopHandoff["returnTo"]) => {
    const ids = new Set(selected);
    const frames = scope === "selected-or-all" && ids.size
      ? doc.frames.filter((frame) => ids.has(frame.id))
      : doc.frames;
    if (!frames.length) {
      toast("Add an image to ReelDeck before sending it to AdShop", "warn");
      return;
    }
    // Copy a snapshot in deck sequence order. Sending again picks up later edits.
    setAdShopHandoff({
      returnTo,
      images: frames.map((frame, index) => ({
        id: frame.id,
        src: frame.src,
        name: frame.name.trim() || `Frame ${index + 1}`,
      })),
    });
    if (surface !== "adshop") openAdShop(true);
  };

  return (
    <>
      <div className={surface === "adshop" ? "h-full" : "hidden"}>
        <AdShop
          stageRef={adShopStageRef}
          commitButtonRef={adShopCommitRef}
          handoff={adShopHandoff}
          reelDeckCount={doc.frames.length}
          onLoadReelDeck={() => handoffToAdShop("all", "adshop")}
          onOpenSlice={() => openWorkspace("slice")}
          onOpenReelDeck={() => openWorkspace("board")}
          onCommitAndReturn={() => {
            openWorkspace("board");
            toast("AdShop display committed for this session", "success");
          }}
        />
      </div>
      <div className={cn("relative h-full flex-col overflow-hidden", surface === "studio" ? "flex" : "hidden")}>
      <div className="stage-bg" />
      <div className="grain" />

      {/* ---------------- top bar ---------------- */}
      <header className="relative z-30 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-ink-900/92 px-3 py-2 backdrop-blur">
        <button
          ref={studioBackRef}
          type="button"
          onClick={() => openAdShop()}
          className="flex h-9 items-center gap-1 rounded-[5px] border border-ink-600 bg-ink-850 px-2 text-[11px] font-semibold text-mute transition-colors hover:border-amber/60 hover:text-bone focus-ring"
          title="Back to AdShop"
        >
          <Icon name="left" size={13} /> AdShop
        </button>
        <div className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-[6px] bg-gradient-to-br from-amber via-ember to-magenta text-ink-950 shadow-[0_4px_18px_-4px_rgba(255,106,26,0.9)]">
            <Icon name="film" size={19} strokeWidth={2} />
          </span>
          <div className="leading-none">
            <h1 className="display text-[26px] text-bone">
              REEL<span className="text-amber">DECK</span>
            </h1>
            <p className="tk mt-[2px] hidden text-dim min-[1400px]:block">Storyboard → contact sheet → LLM</p>
          </div>
        </div>

        <nav className="order-3 flex w-full items-center gap-1 rounded-[6px] border border-ink-600 bg-ink-850 p-1 sm:order-none sm:ml-4 sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "group relative flex flex-1 items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-all duration-200 sm:flex-none",
                tab === t.key
                  ? "bg-gradient-to-b from-amber to-ember text-ink-950 shadow-[0_2px_12px_-2px_rgba(255,140,26,0.8)]"
                  : "text-mute hover:bg-ink-700 hover:text-bone"
              )}
            >
              <Icon name={t.icon} size={14} />
              <span className="hidden sm:inline">{t.label}</span>
              {t.badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 font-mono text-[9px]",
                    tab === t.key ? "bg-ink-950/25 text-ink-950" : "bg-ink-700 text-dim"
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeMenu theme={theme} onTheme={setThemeState} />
          <div className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
          <IconBtn
            icon="undo"
            label={`Undo (${hist.past.length})`}
            disabled={!hist.past.length}
            onClick={() => dispatch({ type: "UNDO" })}
          />
          <IconBtn
            icon="redo"
            label={`Redo (${hist.future.length})`}
            disabled={!hist.future.length}
            onClick={() => dispatch({ type: "REDO" })}
          />
          <div className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
          <IconBtn
            icon="folder"
            label="Reload the demo board"
            className="hidden sm:inline-flex"
            onClick={() => {
              dispatch({ type: "REPLACE", doc: { ...seedDoc(), sheet: doc.sheet } });
              setSelected([]);
              setFocusId("seed_1");
              toast("Demo board restored", "success", {
                label: "Undo",
                run: () => dispatch({ type: "UNDO" }),
              });
            }}
          />
          <IconBtn
            icon="trash"
            label="Clear every frame"
            tone="danger"
            className="hidden sm:inline-flex"
            disabled={!doc.frames.length}
            onClick={() => {
              api.remove(doc.frames.map((f) => f.id));
            }}
          />
          <label className="cursor-pointer">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-amber/60 bg-gradient-to-b from-amber to-ember px-3 text-[12px] font-semibold text-ink-950 shadow-[0_2px_14px_-2px_rgba(255,140,26,0.6)] transition-all hover:brightness-110 active:scale-95">
              <Icon name="upload" size={14} />
              <span className="hidden sm:inline">{busy === "import" ? "Reading…" : "Import"}</span>
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) {
                  setTab("board");
                  importFiles(files);
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </header>

      {/* ---------------- slate strip ---------------- */}
      <div className="relative z-20 flex shrink-0 items-center gap-3 border-b border-line bg-gradient-to-r from-ink-800 via-ink-850 to-ink-900 px-3 py-1.5">
        <span className="hatch hidden h-7 w-10 shrink-0 rounded-[3px] border border-line sm:block" />
        <input
          value={doc.title}
          onChange={(e) => dispatch({ type: "SET_META", patch: { title: e.target.value }, merge: "title" })}
          placeholder="Untitled board"
          className="display w-[190px] shrink-0 rounded border border-transparent bg-transparent px-1 text-[24px] text-bone transition-colors hover:border-ink-600 focus:border-amber focus:bg-ink-900 focus:outline-none sm:w-[280px]"
        />
        <input
          value={doc.logline}
          onChange={(e) => dispatch({ type: "SET_META", patch: { logline: e.target.value }, merge: "logline" })}
          placeholder="Logline — one sentence the model can build against…"
          className="hidden min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 text-[11.5px] text-mute transition-colors hover:border-ink-600 focus:border-amber focus:bg-ink-900 focus:text-bone focus:outline-none md:block"
        />
        <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px] text-dim">
          <span className="hidden rounded border border-ink-600 bg-ink-850 px-1.5 py-0.5 lg:inline">
            ROLL A01
          </span>
          <span className="rounded border border-ink-600 bg-ink-850 px-1.5 py-0.5">
            {doc.frames.length} FR
          </span>
          <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-amber">
            {timecode(runtime)}
          </span>
          <span className="flex items-center gap-1 text-danger">
            <span className="h-1.5 w-1.5 rounded-full bg-danger rec" />
            LIVE
          </span>
        </div>
      </div>

      {/* ---------------- workspace ---------------- */}
      <main className="relative z-10 flex min-h-0 flex-1">
        {tab === "board" && (
          <BoardView
            doc={doc}
            visible={visible}
            filters={filters}
            setFilters={(f) => {
              setFilters(f);
              setActiveView("");
            }}
            views={views}
            activeView={activeView}
            onApplyView={applyView}
            onSaveView={(name) => {
              const v: SavedView = { id: uid("v"), name, ...filters };
              setViews((s) => [...s, v]);
              setActiveView(v.id);
              toast(`View “${name}” saved`, "success");
            }}
            onDeleteView={(id) => {
              setViews((s) => s.filter((v) => v.id !== id));
              if (activeView === id) setActiveView("v_all");
            }}
            selected={selected}
            setSelected={setSelected}
            focusId={focusId}
            setFocusId={setFocusId}
            density={density}
            setDensity={setDensity}
            api={api}
            onOpenEditor={(id) => {
              setFocusId(id);
              setEditorId(id);
            }}
            onOpenStudio={openStudio}
            onOpenZoomStudio={openZoomStudio}
            onOpenAniPlayer={() => openAniPlayer()}
            onGoSheet={() => setTab("sheet")}
            onSendToAdShop={() => handoffToAdShop("selected-or-all", "reeldeck")}
            onSlice={(id) => { const frame = doc.frames.find((f) => f.id === id); if (frame) { setSliceFrame({ ...frame }); setTab("slice"); } }}
            starts={starts}
            searchRef={searchRef}
          />
        )}

        {tab === "sheet" && (
          <SheetView
            canvas={canvas}
            doc={doc}
            sheet={doc.sheet}
            setSheet={setSheet}
            info={info}
            rendering={rendering}
            renderMs={renderMs}
            scopeFrames={scopeFrames}
            counts={{ all: doc.frames.length, filtered: visible.length, selected: selected.length }}
            onReset={() => {
              setSheet({ ...DEFAULT_SHEET });
              toast("Sheet controls reset", "info");
            }}
            onRandomize={() => {
              const themes = ["darkroom", "bone", "blueprint", "neon"] as const;
              const accents = ["#ffab1f", "#ff2e88", "#21d4ee", "#b8f24a", "#ff6a1a"];
              const ratios = ["16:9", "2.39:1", "4:3", "1:1"] as const;
              setSheet({
                columns: 2 + Math.floor(Math.random() * 4),
                gutter: 8 + Math.floor(Math.random() * 40),
                margin: 24 + Math.floor(Math.random() * 80),
                radius: Math.floor(Math.random() * 26),
                captionSize: 14 + Math.floor(Math.random() * 16),
                theme: themes[Math.floor(Math.random() * themes.length)],
                accent: accents[Math.floor(Math.random() * accents.length)],
                ratio: ratios[Math.floor(Math.random() * ratios.length)],
              });
              toast("Layout randomised", "info");
            }}
            onExport={exportSheet}
            onCopy={copySheet}
            onPrint={printSheet}
            onHandoff={() => setTab("handoff")}
          />
        )}

        {tab === "handoff" && (
          <HandoffView
            doc={doc}
            frames={scopeFrames}
            options={handoff}
            setOptions={(patch) => setHandoff((h) => ({ ...h, ...patch }))}
            prompt={prompt}
            overridden={promptOverride !== null}
            onOverride={setPromptOverride}
            info={info}
            preview={preview}
            onRefreshPreview={refreshPreview}
            onCopyPrompt={handoffActions.copyPrompt}
            onCopyBoth={handoffActions.copyBoth}
            onDownloadMd={handoffActions.md}
            onDownloadJson={handoffActions.json}
            onBundle={handoffActions.bundle}
            onOpenModel={handoffActions.openModel}
            onBackToSheet={() => setTab("sheet")}
            busy={busy}
          />
        )}
        <div className={cn("min-h-0 min-w-0 flex-1", tab === "slice" ? "flex" : "hidden")}>
          <SliceView frames={doc.frames} requestedFrame={sliceFrame} onAdd={(frames) => {
            dispatch({ type: "ADD_FRAMES", frames });
            setFocusId(frames[0].id);
            setSelected(frames.map((frame) => frame.id));
            setTab("board");
            toast(`${frames.length} sliced frame${frames.length === 1 ? "" : "s"} added to the deck`, "success", { label: "Undo", run: () => dispatch({ type: "UNDO" }) });
          }} />
        </div>
      </main>

      {/* ---------------- always-on preview (forced visible, never collapsed/hidden) ---------------- */}
      <PreviewDock
        preview={preview}
        width={info?.width ?? 0}
        height={info?.height ?? 0}
        frames={scopeFrames.length}
        themeLabel={THEMES[doc.sheet.theme].label}
        rendering={rendering}
        renderMs={renderMs}
        collapsed={false}
        locked={false}
        onToggle={() => {}}
        onOpenSheet={() => setTab("sheet")}
        onExport={() => exportSheet("png")}
        onCopy={copySheet}
        onHandoff={() => setTab("handoff")}
      />

      {/* ---------------- status bar ---------------- */}
      <footer className="relative z-20 flex shrink-0 items-center gap-3 border-t border-line bg-ink-950/90 px-3 py-1 font-mono text-[9.5px] text-dim">
        <span className="hidden sm:inline">
          <span className="text-mute">1/2/3</span> views · <span className="text-mute">/</span> search ·{" "}
          <span className="text-mute">E</span> annotate · <span className="text-mute">⌘Z</span> undo ·{" "}
          <span className="text-mute">⌘V</span> paste images
        </span>
        <span className="sm:hidden">DRAG TO RESEQUENCE · TAP ✎ TO ANNOTATE</span>
        <span className="ml-auto flex items-center gap-3">
          <span>HISTORY {hist.past.length}</span>
          <span className={cn(scopeFrames.length ? "text-lime" : "text-warn")}>
            SHEET {scopeFrames.length} FR
          </span>
          <span className="hidden md:inline">LAYOUT PREFS SAVED LOCALLY</span>
        </span>
      </footer>

      {/* ---------------- editor ---------------- */}
      {editorFrame && (
        <FrameEditor
          frame={editorFrame}
          index={editorIndex}
          total={doc.frames.length}
          active={surface === "studio"}
          rootRef={editorRootRef}
          onClose={() => setEditorId(null)}
          onSave={saveFromEditor}
          onComment={(text) => api.comment(editorFrame.id, text)}
          onStep={(dir) => {
            const next = doc.frames[editorIndex + dir];
            if (next) {
              setEditorId(next.id);
              setFocusId(next.id);
            }
          }}
        />
      )}

      {zoomOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center text-white">Loading Zoom Studio…</div>}>
          <ZoomStudioModal
            isOpen={zoomOpen}
            onClose={() => setZoomOpen(false)}
            imageUrl={zoomIndex !== null ? doc.frames[zoomIndex]?.src : undefined}
            sliceName={zoomIndex !== null ? doc.frames[zoomIndex]?.name : undefined}
            sliceIndex={zoomIndex}
            slices={zoomSlices}
            onNavigateFrame={(idx) => { setZoomIndex(idx); const f = doc.frames[idx]; if (f) setFocusId(f.id); }}
            onApplyZoomVariations={handleApplyZoomVariations}
            onOpenInAniPlayer={(frames, idx) => {
              handleApplyZoomVariations(frames, idx !== null && idx !== undefined ? "replace_frame" : "append_storyboard", idx ?? zoomIndex);
              setTimeout(() => openAniPlayer(undefined as any), 120);
            }}
          />
        </Suspense>
      )}

      {aniOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center text-white">Loading AniPlayer…</div>}>
          <AniPlayerModal
            isOpen={aniOpen}
            onClose={() => setAniOpen(false)}
            frames={aniFrames}
            initialIndex={aniIndex}
            onSelectFrame={(idx) => { setAniIndex(idx); const f = doc.frames[idx]; if (f) setFocusId(f.id); }}
          />
        </Suspense>
      )}

      {studioSession && (
        <StudioDialog title={studioSession.kind === "neo1" ? "Neo1 Studio" : "Bubble Studio"}>
          <Suspense fallback={
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink-950 text-bone">
              <p>Loading {studioSession.kind === "neo1" ? "Neo1" : "Bubble"} Studio…</p>
              <Btn onClick={() => setStudioSession(null)}>Cancel</Btn>
            </div>
          }>
            {studioSession.kind === "neo1" ? (
              <Neo1StudioModal
                isOpen
                onClose={() => setStudioSession(null)}
                imageUrl={studioSession.imageSrc}
                imageWidth={studioSession.frame.w}
                imageHeight={studioSession.frame.h}
                sliceName={studioSession.frame.name}
                initialLayers={studioSession.frame.studioProject?.kind === "neo1" ? studioSession.frame.studioProject.layers : undefined}
                initialCanvasState={studioSession.frame.studioProject?.kind === "neo1" ? studioSession.frame.studioProject.canvas : undefined}
                onSaveToAssetOrganiser={(src, index, name, layers, canvas) => {
                  if (layers && canvas) saveFromStudio(src, index, name, { kind: "neo1", layers, canvas });
                }}
              />
            ) : (
              <BubbleStudioModal
                isOpen
                onClose={() => setStudioSession(null)}
                imageUrl={studioSession.imageSrc}
                sliceName={studioSession.frame.name}
                initialBubbles={studioSession.frame.studioProject?.kind === "bubble" ? studioSession.frame.studioProject.layers : undefined}
                initialBubbleReference={studioSession.frame.studioProject?.kind === "bubble" ? {
                  width: studioSession.frame.studioProject.displayWidth,
                  height: studioSession.frame.studioProject.displayHeight,
                } : undefined}
                preserveLayersAfterSave
                onSaveToAssetOrganiser={(src, index, name, layers, basis) => {
                  if (layers && basis) saveFromStudio(src, index, name, { kind: "bubble", layers, ...basis });
                }}
              />
            )}
          </Suspense>
        </StudioDialog>
      )}

      {/* ---------------- toasts ---------------- */}
      <div className="pointer-events-none fixed bottom-9 left-1/2 z-[60] flex w-[min(92vw,460px)] -translate-x-1/2 flex-col gap-1.5">
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-2 rounded-[6px] border bg-ink-850/97 px-3 py-2 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.95)] backdrop-blur pop"
              style={{ borderColor: `${tone.color}66` }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${tone.color}22`, color: tone.color }}
              >
                <Icon name={tone.icon} size={12} strokeWidth={2.2} />
              </span>
              <span className="flex-1 text-[12px] text-bone">{t.text}</span>
              {t.action && (
                <Btn
                  size="xs"
                  onClick={() => {
                    t.action!.run();
                    setToasts((s) => s.filter((x) => x.id !== t.id));
                  }}
                >
                  {t.action.label}
                </Btn>
              )}
              <button
                onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
                className="text-dim transition-colors hover:text-bone"
                aria-label="Dismiss"
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
}

export type { Doc };
