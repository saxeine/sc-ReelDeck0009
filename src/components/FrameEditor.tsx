import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import type { Frame } from "../types";
import { loadImage, readImageFile, uid } from "../lib/imaging";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";
import { Btn, IconBtn, SectionTitle, Slider, Toggle } from "./ui";

type Tool = "select" | "line" | "arrow" | "rect" | "text" | "crop" | "marquee";

interface BaseObj {
  id: string;
  color: string;
}
export type TextAlign = "left" | "center" | "right";

type TextObj = BaseObj & {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  align?: TextAlign;
  plate?: boolean;
};

type Obj =
  | (BaseObj & { kind: "line" | "arrow"; x1: number; y1: number; x2: number; y2: number; width: number })
  | (BaseObj & { kind: "rect"; x: number; y: number; w: number; h: number; width: number; fill: boolean })
  | TextObj
  | (BaseObj & { kind: "image"; x: number; y: number; w: number; h: number; src: string });

interface TextEdit {
  /** null while composing a brand new label */
  id: string | null;
  x: number;
  y: number;
  value: string;
  size: number;
  align: TextAlign;
  plate: boolean;
  color: string;
  /** increments per edit session so the field remounts with clean focus */
  session: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Snapshot {
  baseSrc: string;
  objects: Obj[];
}

const TOOLS: { key: Tool; icon: string; label: string; hot: string }[] = [
  { key: "select", icon: "cursor", label: "Select / move", hot: "V" },
  { key: "line", icon: "line", label: "Line", hot: "L" },
  { key: "arrow", icon: "arrow", label: "Arrow", hot: "A" },
  { key: "rect", icon: "square", label: "Box", hot: "R" },
  { key: "text", icon: "text", label: "Text", hot: "T" },
  { key: "crop", icon: "crop", label: "Crop", hot: "C" },
  { key: "marquee", icon: "scissors", label: "Region cut / copy", hot: "M" },
];

const SWATCHES = ["#ffab1f", "#ff6a1a", "#ff2e88", "#21d4ee", "#b8f24a", "#ff4438", "#f4ece0", "#0d0b0a"];
const CROP_PRESETS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "16:9", value: 16 / 9 },
  { label: "2.39", value: 2.39 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "9:16", value: 9 / 16 },
];

const TEXT_FONT = '"Space Grotesk", system-ui, sans-serif';
const TEXT_WEIGHT = 600;

export interface TextLayout {
  lines: string[];
  widths: number[];
  w: number;
  h: number;
  left: number;
  top: number;
  lineH: number;
  padX: number;
  padY: number;
  align: TextAlign;
}

let MEASURE: CanvasRenderingContext2D | null = null;
function measureCtx(): CanvasRenderingContext2D {
  if (!MEASURE) {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    MEASURE = c.getContext("2d")!;
  }
  return MEASURE;
}

/** Single source of truth for how a text object is measured, drawn and hit-tested. */
export function textLayout(o: {
  x: number;
  y: number;
  text: string;
  size: number;
  align?: TextAlign;
}): TextLayout {
  const ctx = measureCtx();
  const lines = (o.text.length ? o.text : " ").split("\n");
  ctx.font = `${TEXT_WEIGHT} ${o.size}px ${TEXT_FONT}`;
  const widths = lines.map((l) => ctx.measureText(l.length ? l : " ").width);
  const w = Math.max(4, ...widths);
  const lineH = o.size * 1.18;
  const h = lineH * lines.length;
  const align: TextAlign = o.align ?? "left";
  const left = align === "center" ? o.x - w / 2 : align === "right" ? o.x - w : o.x;
  return {
    lines,
    widths,
    w,
    h,
    left,
    top: o.y,
    lineH,
    padX: Math.round(o.size * 0.22),
    padY: Math.round(o.size * 0.13),
    align,
  };
}

function objBounds(o: Obj): Rect {
  if (o.kind === "line" || o.kind === "arrow") {
    return {
      x: Math.min(o.x1, o.x2),
      y: Math.min(o.y1, o.y2),
      w: Math.abs(o.x2 - o.x1),
      h: Math.abs(o.y2 - o.y1),
    };
  }
  if (o.kind === "text") {
    const L = textLayout(o);
    return { x: L.left, y: L.top, w: L.w, h: L.h };
  }
  if (o.kind === "rect" || o.kind === "image") return { x: o.x, y: o.y, w: o.w, h: o.h };
  return { x: 0, y: 0, w: 0, h: 0 };
}

function moveObjTo(o: Obj, x: number, y: number): Obj {
  if (o.kind === "line" || o.kind === "arrow") {
    const dx = x - o.x1;
    const dy = y - o.y1;
    return { ...o, x1: x, y1: y, x2: o.x2 + dx, y2: o.y2 + dy };
  }
  if (o.kind === "text" || o.kind === "rect" || o.kind === "image") return { ...o, x, y };
  return o;
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(String(Math.round(value))); }, [value, focused]);
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1 rounded-[4px] border border-ink-600 bg-ink-850 px-1.5 py-1 focus-within:border-amber">
      <span className="font-mono text-[9px] uppercase text-dim">{label}</span>
      <input
        type="number"
        className="no-spin w-full min-w-0 bg-transparent text-right font-mono text-[11px] text-bone outline-none"
        value={draft}
        min={min}
        max={max}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (draft.trim() === "" || !Number.isFinite(Number(draft))) setDraft(String(Math.round(value))); }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (next.trim() !== "" && Number.isFinite(Number(next))) onChange(Number(next));
        }}
      />
    </label>
  );
}

let RASTER: { src: string; w: number; h: number } | null = null;

function normRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

function shiftObj(o: Obj, dx: number, dy: number): Obj {
  switch (o.kind) {
    case "line":
    case "arrow":
      return { ...o, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy };
    default:
      return { ...o, x: o.x + dx, y: o.y + dy };
  }
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function FrameEditor({
  frame,
  index,
  total,
  active = true,
  rootRef,
  onClose,
  onSave,
  onComment,
  onStep,
}: {
  frame: Frame;
  index: number;
  total: number;
  active?: boolean;
  rootRef?: Ref<HTMLDivElement>;
  onClose: () => void;
  onSave: (src: string, w: number, h: number, mode: "replace" | "new", name: string) => void;
  onComment: (text: string) => void;
  onStep: (dir: -1 | 1) => void;
}) {
  const [baseSrc, setBaseSrc] = useState(frame.src);
  const [baseImg, setBaseImg] = useState<HTMLImageElement | null>(null);
  const [objects, setObjects] = useState<Obj[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#ffab1f");
  const [width, setWidth] = useState(6);
  const [fontSize, setFontSize] = useState(48);
  const [fillBox, setFillBox] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Obj | null>(null);
  const [region, setRegion] = useState<Rect | null>(null);
  const [zoom, setZoom] = useState(1);
  const [box, setBox] = useState({ w: 800, h: 500 });
  const [textEdit, setTextEdit] = useState<TextEdit | null>(null);
  const [textAlign, setTextAlign] = useState<TextAlign>("left");
  const [textPlate, setTextPlate] = useState(true);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [comment, setComment] = useState("");
  const [name, setName] = useState(frame.name);
  const [hint, setHint] = useState("Pick a tool. Drag on the frame to draw.");
  const [hasClip, setHasClip] = useState(!!RASTER);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [dirty, setDirty] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgCache = useRef(new Map<string, HTMLImageElement>());
  const textEditRef = useRef<TextEdit | null>(null);
  const textFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const textSession = useRef(0);
  const lastPush = useRef({ key: "", at: 0 });
  const drag = useRef<
    | null
    | {
        mode: "draw" | "move" | "handle";
        start: { x: number; y: number };
        origin: Obj | null;
        handle: number;
        pushed: boolean;
      }
  >(null);

  const bw = baseImg?.naturalWidth ?? frame.w;
  const bh = baseImg?.naturalHeight ?? frame.h;

  /* ---- load base ---- */
  useEffect(() => {
    let alive = true;
    loadImage(baseSrc).then((img) => {
      if (!alive) return;
      setBaseImg(img);
      imgCache.current.set(baseSrc, img);
    });
    return () => {
      alive = false;
    };
  }, [baseSrc]);

  /* ---- reset when navigating to another frame ---- */
  useEffect(() => {
    setBaseSrc(frame.src);
    setObjects([]);
    setPast([]);
    setFuture([]);
    setSelId(null);
    setRegion(null);
    setName(frame.name);
    setDirty(false);
    setZoom(1);
    textEditRef.current = null;
    setTextEdit(null);
  }, [frame.id, frame.src]);

  useEffect(() => {
    textEditRef.current = textEdit;
  }, [textEdit]);

  /* ---- viewport ---- */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = Math.min((box.w - 56) / bw, (box.h - 56) / bh) || 1;
  const scale = Math.max(0.05, fit * zoom);
  const dispW = Math.round(bw * scale);
  const dispH = Math.round(bh * scale);

  const push = useCallback(
    (prevObjects: Obj[], prevSrc: string) => {
      setPast((p) => [...p, { baseSrc: prevSrc, objects: prevObjects }].slice(-40));
      setFuture([]);
      setDirty(true);
    },
    []
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const last = p[p.length - 1];
      setFuture((f) => [{ baseSrc, objects }, ...f].slice(0, 40));
      setBaseSrc(last.baseSrc);
      setObjects(last.objects);
      setSelId(null);
      return p.slice(0, -1);
    });
  }, [baseSrc, objects]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, { baseSrc, objects }].slice(-40));
      setBaseSrc(next.baseSrc);
      setObjects(next.objects);
      return f.slice(1);
    });
  }, [baseSrc, objects]);

  /* ---- painting ---- */
  const paintObj = useCallback(
    (ctx: CanvasRenderingContext2D, o: Obj, k: number) => {
      ctx.strokeStyle = o.color;
      ctx.fillStyle = o.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (o.kind === "line" || o.kind === "arrow") {
        ctx.lineWidth = o.width;
        ctx.beginPath();
        ctx.moveTo(o.x1, o.y1);
        ctx.lineTo(o.x2, o.y2);
        ctx.stroke();
        if (o.kind === "arrow") {
          const ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
          const head = Math.max(12, o.width * 4);
          ctx.beginPath();
          ctx.moveTo(o.x2, o.y2);
          ctx.lineTo(o.x2 - head * Math.cos(ang - 0.42), o.y2 - head * Math.sin(ang - 0.42));
          ctx.lineTo(o.x2 - head * Math.cos(ang + 0.42), o.y2 - head * Math.sin(ang + 0.42));
          ctx.closePath();
          ctx.fill();
        }
      } else if (o.kind === "rect") {
        ctx.lineWidth = o.width;
        if (o.fill) {
          ctx.globalAlpha = 0.22;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.globalAlpha = 1;
        }
        ctx.strokeRect(o.x, o.y, o.w, o.h);
      } else if (o.kind === "text") {
        const L = textLayout(o);
        ctx.save();
        if (o.plate !== false) {
          ctx.globalAlpha = 0.82;
          ctx.fillStyle = "#0d0b0a";
          ctx.fillRect(
            L.left - L.padX,
            L.top - L.padY,
            L.w + L.padX * 2,
            L.h + L.padY * 2
          );
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = o.color;
        ctx.font = `${TEXT_WEIGHT} ${o.size}px ${TEXT_FONT}`;
        ctx.textAlign = L.align;
        ctx.textBaseline = "top";
        L.lines.forEach((line, i) => {
          ctx.fillText(line, o.x, L.top + i * L.lineH);
        });
        ctx.restore();
      } else if (o.kind === "image") {
        const im = imgCache.current.get(o.src);
        if (im) {
          ctx.drawImage(im, o.x, o.y, o.w, o.h);
          ctx.lineWidth = Math.max(1, 2 / k);
          ctx.strokeStyle = "rgba(244,236,224,0.35)";
          ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
      }
    },
    []
  );

  const handlesFor = useCallback((o: Obj): { x: number; y: number }[] => {
    if (o.kind === "line" || o.kind === "arrow")
      return [
        { x: o.x1, y: o.y1 },
        { x: o.x2, y: o.y2 },
      ];
    if (o.kind === "rect" || o.kind === "image") return [{ x: o.x + o.w, y: o.y + o.h }];
    if (o.kind === "text") {
      const L = textLayout(o);
      return [{ x: L.left + L.w + L.padX, y: L.top + L.h + L.padY }];
    }
    return [];
  }, []);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !baseImg) return;
    const ctx = c.getContext("2d")!;
    if (c.width !== bw || c.height !== bh) {
      c.width = bw;
      c.height = bh;
    }
    ctx.clearRect(0, 0, bw, bh);
    ctx.drawImage(baseImg, 0, 0, bw, bh);
    const editingId = textEdit?.id ?? null;
    for (const o of objects) if (o.id !== editingId) paintObj(ctx, o, scale);
    if (draft) paintObj(ctx, draft, scale);

    const sel = objects.find((o) => o.id === selId && o.id !== editingId);
    if (sel) {
      const hs = 9 / scale;
      ctx.save();
      ctx.strokeStyle = "#21d4ee";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 5 / scale]);
      if (sel.kind === "rect" || sel.kind === "image") {
        ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      } else if (sel.kind === "text") {
        const L = textLayout(sel);
        ctx.strokeRect(
          L.left - L.padX,
          L.top - L.padY,
          L.w + L.padX * 2,
          L.h + L.padY * 2
        );
      }
      ctx.setLineDash([]);
      for (const h of handlesFor(sel)) {
        ctx.fillStyle = "#0d0b0a";
        ctx.strokeStyle = "#21d4ee";
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.rect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    if (region) {
      ctx.save();
      ctx.fillStyle = "rgba(8,7,6,0.62)";
      if (tool === "crop") {
        ctx.beginPath();
        ctx.rect(0, 0, bw, bh);
        ctx.rect(region.x, region.y + region.h, region.w, -region.h);
        ctx.fill("evenodd");
      } else {
        ctx.fillRect(region.x, region.y, region.w, region.h);
      }
      ctx.strokeStyle = tool === "crop" ? "#ffab1f" : "#ff2e88";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([8 / scale, 6 / scale]);
      ctx.strokeRect(region.x, region.y, region.w, region.h);
      ctx.setLineDash([]);
      if (tool === "crop") {
        ctx.strokeStyle = "rgba(255,171,31,0.45)";
        ctx.lineWidth = 1 / scale;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(region.x + (region.w * i) / 3, region.y);
          ctx.lineTo(region.x + (region.w * i) / 3, region.y + region.h);
          ctx.moveTo(region.x, region.y + (region.h * i) / 3);
          ctx.lineTo(region.x + region.w, region.y + (region.h * i) / 3);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }, [
    baseImg,
    bw,
    bh,
    objects,
    draft,
    selId,
    region,
    scale,
    tool,
    textEdit?.id,
    paintObj,
    handlesFor,
  ]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  /* ---- coordinate helpers ---- */
  const toImg = (e: React.PointerEvent | React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * bw,
      y: ((e.clientY - r.top) / r.height) * bh,
    };
  };

  const hitTest = useCallback(
    (x: number, y: number): Obj | null => {
      const tol = 10 / scale;
      for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        if (o.kind === "line" || o.kind === "arrow") {
          if (distToSeg(x, y, o.x1, o.y1, o.x2, o.y2) <= tol + o.width / 2) return o;
        } else if (o.kind === "rect") {
          const inside = x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
          const nearEdge =
            inside &&
            !(x >= o.x + tol && x <= o.x + o.w - tol && y >= o.y + tol && y <= o.y + o.h - tol);
          if (nearEdge || (o.fill && inside)) return o;
        } else if (o.kind === "image") {
          if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
        } else if (o.kind === "text") {
          const L = textLayout(o);
          if (
            x >= L.left - L.padX - 4 &&
            x <= L.left + L.w + L.padX + 4 &&
            y >= L.top - L.padY - 4 &&
            y <= L.top + L.h + L.padY + 4
          )
            return o;
        }
      }
      return null;
    },
    [objects, scale]
  );

  /* ---- text editing ---- */
  const beginText = useCallback(
    (o?: TextObj) => {
      setRegion(null);
      if (o) {
        textSession.current += 1;
        setTextEdit({
          id: o.id,
          x: o.x,
          y: o.y,
          value: o.text,
          size: o.size,
          align: o.align ?? "left",
          plate: o.plate !== false,
          color: o.color,
          session: textSession.current,
        });
        setSelId(o.id);
        setFontSize(o.size);
        setColor(o.color);
        setTextAlign(o.align ?? "left");
        setTextPlate(o.plate !== false);
        setTool("select");
        setHint("Editing label — Enter commits · Shift+Enter adds a line · Esc cancels");
      } else {
        textSession.current += 1;
        setSelId(null);
        setTextEdit({
          id: null,
          x: 0,
          y: 0,
          value: "",
          size: fontSize,
          align: textAlign,
          plate: textPlate,
          color,
          session: textSession.current,
        });
      }
    },
    [fontSize, textAlign, textPlate, color]
  );

  const beginTextAt = useCallback(
    (x: number, y: number) => {
      textSession.current += 1;
      setSelId(null);
      setTextEdit({
        id: null,
        x,
        y,
        value: "",
        size: fontSize,
        align: textAlign,
        plate: textPlate,
        color,
        session: textSession.current,
      });
      setHint("Type a label — Enter commits, Shift+Enter adds a line");
    },
    [fontSize, textAlign, textPlate, color]
  );

  const finishText = useCallback(
    (mode: "commit" | "cancel" = "commit") => {
      const ed = textEditRef.current;
      textEditRef.current = null;
      setTextEdit(null);
      if (!ed) return;
      if (mode === "cancel") {
        if (!ed.id) setHint("Text cancelled");
        return;
      }
      const value = ed.value.replace(/[ \t]+$/gm, "").replace(/^\n+/, "").trimEnd();
      if (!value.trim()) {
        if (ed.id) {
          push(objects, baseSrc);
          setObjects((l) => l.filter((o) => o.id !== ed.id));
          setSelId(null);
          setHint("Empty label removed");
        }
        return;
      }
      if (ed.id) {
        push(objects, baseSrc);
        setObjects((l) =>
          l.map((o) =>
            o.id === ed.id
              ? ({
                  ...o,
                  kind: "text",
                  x: ed.x,
                  y: ed.y,
                  text: value,
                  size: ed.size,
                  align: ed.align,
                  plate: ed.plate,
                  color: ed.color,
                } as Obj)
              : o
          )
        );
        setSelId(ed.id);
      } else {
        const o: Obj = {
          id: uid("o"),
          kind: "text",
          color: ed.color,
          x: ed.x,
          y: ed.y,
          text: value,
          size: ed.size,
          align: ed.align,
          plate: ed.plate,
        };
        push(objects, baseSrc);
        setObjects((l) => [...l, o]);
        setSelId(o.id);
        setTool("select");
      }
      setHint("Label placed — drag to position, arrow keys nudge, double-click to edit");
    },
    [objects, baseSrc, push]
  );

  /* keep the caret in the inline field for every new editing session */
  const textSessionId = textEdit?.session ?? null;
  useEffect(() => {
    if (textSessionId == null) return;
    const raf = requestAnimationFrame(() => {
      const el = textFieldRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const end = el.value.length;
      try {
        el.setSelectionRange(end, end);
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [textSessionId]);

  /* ---- pointer ---- */
  const onDown = (e: React.PointerEvent) => {
    if (textEditRef.current) {
      finishText("commit");
      return;
    }
    const p = toImg(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === "select") {
      const sel = objects.find((o) => o.id === selId);
      if (sel) {
        const hs = handlesFor(sel);
        for (let i = 0; i < hs.length; i++) {
          if (Math.hypot(p.x - hs[i].x, p.y - hs[i].y) < 12 / scale) {
            drag.current = { mode: "handle", start: p, origin: sel, handle: i, pushed: false };
            return;
          }
        }
      }
      const hit = hitTest(p.x, p.y);
      setSelId(hit?.id ?? null);
      if (hit) {
        drag.current = { mode: "move", start: p, origin: hit, handle: -1, pushed: false };
        setHint("Drag to move · Delete removes · handles resize");
      }
      return;
    }
    if (tool === "text") {
      const existing = hitTest(p.x, p.y);
      if (existing && existing.kind === "text") beginText(existing);
      else beginTextAt(p.x, p.y);
      return;
    }
    if (tool === "crop" || tool === "marquee") {
      setRegion({ x: p.x, y: p.y, w: 0, h: 0 });
      drag.current = { mode: "draw", start: p, origin: null, handle: -1, pushed: false };
      return;
    }
    const base = { id: uid("o"), color };
    const o: Obj =
      tool === "rect"
        ? { ...base, kind: "rect", x: p.x, y: p.y, w: 0, h: 0, width, fill: fillBox }
        : { ...base, kind: tool === "arrow" ? "arrow" : "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y, width };
    setDraft(o);
    drag.current = { mode: "draw", start: p, origin: null, handle: -1, pushed: false };
  };

  const onMove = (e: React.PointerEvent) => {
    const p = toImg(e);
    setCursor({ x: Math.round(p.x), y: Math.round(p.y) });
    const d = drag.current;
    if (!d) return;
    if (d.mode === "draw") {
      if (tool === "crop" || tool === "marquee") {
        setRegion(normRect(d.start, p));
      } else if (draft) {
        if (draft.kind === "rect") {
          const r = normRect(d.start, p);
          setDraft({ ...draft, ...r });
        } else if (draft.kind === "line" || draft.kind === "arrow") {
          const shift = e.shiftKey;
          let { x, y } = p;
          if (shift) {
            const dx = x - d.start.x;
            const dy = y - d.start.y;
            if (Math.abs(dx) > Math.abs(dy)) y = d.start.y;
            else x = d.start.x;
          }
          setDraft({ ...draft, x2: x, y2: y });
        }
      }
      return;
    }
    if (!d.origin) return;
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    if (!d.pushed && Math.hypot(dx, dy) > 1) {
      push(objects, baseSrc);
      d.pushed = true;
    }
    const o = d.origin;
    setObjects((list) =>
      list.map((it) => {
        if (it.id !== o.id) return it;
        if (d.mode === "move") return shiftObj(o, dx, dy);
        // handle drag
        if (it.kind === "line" || it.kind === "arrow") {
          return d.handle === 0 ? { ...it, x1: p.x, y1: p.y } : { ...it, x2: p.x, y2: p.y };
        }
        if (it.kind === "rect") {
          return { ...it, w: Math.max(6, p.x - it.x), h: Math.max(6, p.y - it.y) };
        }
        if (it.kind === "image") {
          const ratio = o.kind === "image" ? o.w / o.h : 1;
          const w = Math.max(20, p.x - it.x);
          return { ...it, w, h: w / ratio };
        }
        if (it.kind === "text") {
          // the bottom-right handle scales the type instead of a bounding box
          const L = textLayout(it);
          const next = Math.max(8, Math.min(500, Math.round((p.y - L.top) / Math.max(1, L.lines.length) / 1.18)));
          return { ...it, size: next };
        }
        return it;
      })
    );
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === "draw" && draft) {
      const big =
        draft.kind === "rect"
          ? draft.w > 4 && draft.h > 4
          : draft.kind === "line" || draft.kind === "arrow"
          ? Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 4
          : false;
      if (big) {
        push(objects, baseSrc);
        setObjects((l) => [...l, draft]);
        setSelId(draft.id);
      }
      setDraft(null);
    }
    if (d.mode === "draw" && region && (region.w < 6 || region.h < 6)) setRegion(null);
  };

  /* ---- raster ops ---- */
  const regionToClipboard = async (erase: boolean) => {
    if (!region || !baseImg) return;
    const r = {
      x: Math.round(Math.max(0, region.x)),
      y: Math.round(Math.max(0, region.y)),
      w: Math.round(Math.min(region.w, bw - region.x)),
      h: Math.round(Math.min(region.h, bh - region.y)),
    };
    if (r.w < 2 || r.h < 2) return;
    const c = document.createElement("canvas");
    c.width = r.w;
    c.height = r.h;
    c.getContext("2d")!.drawImage(baseImg, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    RASTER = { src: c.toDataURL("image/png"), w: r.w, h: r.h };
    setHasClip(true);
    if (erase) {
      const full = document.createElement("canvas");
      full.width = bw;
      full.height = bh;
      const fx = full.getContext("2d")!;
      fx.drawImage(baseImg, 0, 0);
      fx.fillStyle = "#0d0b0a";
      fx.fillRect(r.x, r.y, r.w, r.h);
      push(objects, baseSrc);
      setBaseSrc(full.toDataURL("image/png"));
      setHint(`Cut ${r.w}×${r.h}px — paste it back anywhere with ⌘V`);
    } else {
      setHint(`Copied ${r.w}×${r.h}px to the frame clipboard`);
    }
    setRegion(null);
  };

  const pasteClipboard = async (src?: string) => {
    const data = src ? null : RASTER;
    const source = src ?? data?.src;
    if (!source) {
      setHint("Clipboard is empty — cut or copy a region first");
      return;
    }
    const img = await loadImage(source);
    imgCache.current.set(source, img);
    const maxW = bw * 0.45;
    const k = Math.min(1, maxW / img.naturalWidth);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    const o: Obj = {
      id: uid("o"),
      kind: "image",
      color: "#f4ece0",
      x: (bw - w) / 2,
      y: (bh - h) / 2,
      w,
      h,
      src: source,
    };
    push(objects, baseSrc);
    setObjects((l) => [...l, o]);
    setSelId(o.id);
    setTool("select");
    setHint("Pasted — drag to place, corner handle scales");
  };

  const applyCrop = () => {
    if (!region || !baseImg || region.w < 8 || region.h < 8) return;
    const r = {
      x: Math.round(Math.max(0, region.x)),
      y: Math.round(Math.max(0, region.y)),
      w: Math.round(Math.min(region.w, bw - region.x)),
      h: Math.round(Math.min(region.h, bh - region.y)),
    };
    const c = document.createElement("canvas");
    c.width = r.w;
    c.height = r.h;
    c.getContext("2d")!.drawImage(baseImg, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    push(objects, baseSrc);
    setObjects((list) => list.map((o) => shiftObj(o, -r.x, -r.y)));
    setBaseSrc(c.toDataURL("image/png"));
    setRegion(null);
    setZoom(1);
    setHint(`Cropped to ${r.w}×${r.h}px`);
  };

  const cropPreset = (ratio: number | null) => {
    if (!ratio) {
      setRegion(null);
      return;
    }
    let w = bw * 0.86;
    let h = w / ratio;
    if (h > bh * 0.86) {
      h = bh * 0.86;
      w = h * ratio;
    }
    setTool("crop");
    setRegion({ x: (bw - w) / 2, y: (bh - h) / 2, w, h });
  };

  const deleteSelected = () => {
    if (region) {
      setRegion(null);
      return;
    }
    if (!selId) return;
    push(objects, baseSrc);
    setObjects((l) => l.filter((o) => o.id !== selId));
    setSelId(null);
  };

  /* ---- object property helpers ---- */
  const pushOnce = useCallback(
    (key: string) => {
      const now = performance.now();
      key = `${selId}:${key}`;
      if (lastPush.current.key !== key || now - lastPush.current.at > 800) {
        push(objects, baseSrc);
      }
      lastPush.current = { key, at: now };
    },
    [objects, baseSrc, push, selId]
  );

  const patchSelected = useCallback(
    (patch: Partial<Record<string, unknown>>, historyKey?: string) => {
      if (!selId) return;
      if (historyKey) pushOnce(historyKey);
      setObjects((l) => l.map((o) => (o.id === selId ? ({ ...o, ...patch } as Obj) : o)));
    },
    [selId, pushOnce]
  );

  /** colour / size / align changes land on the live draft when one is open */
  const applyTextAttrs = useCallback(
    (
      patch: Partial<Pick<TextEdit, "color" | "size" | "align" | "plate">>,
      historyKey?: string
    ) => {
      const draft = textEditRef.current;
      if (draft) {
        setTextEdit((t) => (t ? { ...t, ...patch } : t));
        return;
      }
      const sel = objects.find((o) => o.id === selId);
      if (sel?.kind === "text") patchSelected(patch as Partial<Record<string, unknown>>, historyKey);
    },
    [objects, selId, patchSelected]
  );

  const setSelectedPos = (x: number, y: number) => {
    if (!selId) return;
    pushOnce("pos");
    setObjects((l) => l.map((o) => (o.id === selId ? moveObjTo(o, x, y) : o)));
  };

  const changeAlign = (next: TextAlign) => {
    setTextAlign(next);
    const draft = textEditRef.current;
    if (draft) {
      // matain the visual left edge while the anchor flips
      const L = textLayout({ ...draft, text: draft.value });
      const x = next === "left" ? L.left : next === "center" ? L.left + L.w / 2 : L.left + L.w;
      setTextEdit((t) => (t ? { ...t, align: next, x } : t));
      return;
    }
    const sel = objects.find((o) => o.id === selId);
    if (sel?.kind === "text" && (sel.align ?? "left") !== next) {
      const L = textLayout(sel);
      const x = next === "left" ? L.left : next === "center" ? L.left + L.w / 2 : L.left + L.w;
      patchSelected({ align: next, x }, "text-align");
    }
  };

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (!selId) return;
      pushOnce("nudge");
      setObjects((l) => l.map((o) => (o.id === selId ? shiftObj(o, dx, dy) : o)));
    },
    [selId, pushOnce]
  );

  const placeSelected = (fx: number, fy: number) => {
    const sel = objects.find((o) => o.id === selId);
    if (!sel) return;
    const b = objBounds(sel);
    const dx = (bw - b.w) * fx - b.x;
    const dy = (bh - b.h) * fy - b.y;
    pushOnce("place");
    setObjects((l) => l.map((o) => (o.id === sel.id ? shiftObj(o, dx, dy) : o)));
    const col = fx === 0 ? "left" : fx === 0.5 ? "centre" : "right";
    const row = fy === 0 ? "top" : fy === 0.5 ? "middle" : "bottom";
    setHint(`Selection anchored ${row} ${col}`);
  };

  const flatten = (): HTMLCanvasElement => {
    const c = document.createElement("canvas");
    c.width = bw;
    c.height = bh;
    const ctx = c.getContext("2d")!;
    if (baseImg) ctx.drawImage(baseImg, 0, 0, bw, bh);
    const ed = textEditRef.current;
    for (const o of objects) if (!ed || o.id !== ed.id) paintObj(ctx, o, 1);
    if (ed?.value.trim()) paintObj(ctx, { id: ed.id ?? "draft", kind: "text", x: ed.x, y: ed.y, text: ed.value, size: ed.size, align: ed.align, plate: ed.plate, color: ed.color }, 1);
    return c;
  };

  const save = (mode: "replace" | "new") => {
    const c = flatten();
    onSave(c.toDataURL("image/jpeg", 0.93), bw, bh, mode, name.trim());
  };

  /* ---- keyboard ---- */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = /INPUT|TEXTAREA|SELECT/.test(el?.tagName ?? "") || !!el?.isContentEditable;

      // fields own their keys — Escape leaves the field, it does not close the studio
      if (typing) {
        if (e.key === "Escape" && !textEditRef.current) {
          (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.blur?.();
        }
        return;
      }

      if (e.key === "Escape") {
        if (textEditRef.current) return finishText("cancel");
        if (region) return setRegion(null);
        if (selId) return setSelId(null);
        onClose();
        return;
      }

      const meta = e.metaKey || e.ctrlKey;

      if (!meta && selId && e.key.startsWith("Arrow")) {
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (dx || dy) {
          e.preventDefault();
          nudge(dx, dy);
          return;
        }
      }
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key.toLowerCase() === "c") {
        e.preventDefault();
        regionToClipboard(false);
        return;
      }
      if (meta && e.key.toLowerCase() === "x") {
        e.preventDefault();
        regionToClipboard(true);
        return;
      }
      if (meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save("replace");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Enter" && tool === "crop" && region) {
        e.preventDefault();
        applyCrop();
        return;
      }
      const t = TOOLS.find((x) => x.hot.toLowerCase() === e.key.toLowerCase());
      if (t) {
        setTool(t.key);
        setRegion(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---- system paste ---- */
  useEffect(() => {
    if (!active) return;
    const onPaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const file = items.find((i) => i.type.startsWith("image/"))?.getAsFile();
      if (!file) return;
      e.preventDefault();
      const { src } = await readImageFile(file);
      pasteClipboard(src);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const selected = objects.find((o) => o.id === selId) ?? null;
  const toolHint = useMemo<string>(
    () =>
      ({
        select: "Click an object to select · drag to move · corner handle resizes",
        line: "Drag to draw a line · hold Shift to constrain",
        arrow: "Drag to draw an arrow · hold Shift to constrain",
        rect: "Drag to draw a box · toggle fill in the panel",
        text: "Click where the label should sit, type, press Enter",
        crop: "Drag a crop region, then Apply crop (or Enter)",
        marquee: "Drag a region, then Cut or Copy it",
      })[tool],
    [tool]
  );

  useEffect(() => {
    setHint(toolHint);
  }, [toolHint]);

  return (
    <div ref={rootRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Frame studio" className="fixed inset-0 z-50 flex flex-col bg-ink-950/97 outline-none backdrop-blur-md pop">
      {/* header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-gradient-to-r from-ink-800 via-ink-850 to-ink-900 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-gradient-to-br from-cyan to-info text-ink-950">
            <Icon name="pencil" size={17} />
          </span>
          <div className="leading-none">
            <div className="tk text-cyan">Frame studio</div>
            <div className="display text-xl text-bone">
              {String(index + 1).padStart(2, "0")} · {name || frame.name}
            </div>
          </div>
        </div>

        <div className="mx-1 flex items-center gap-1">
          <IconBtn icon="left" label="Previous frame" onClick={() => onStep(-1)} disabled={index === 0} />
          <span className="font-mono text-[11px] text-mute">
            {index + 1}/{total}
          </span>
          <IconBtn icon="right" label="Next frame" onClick={() => onStep(1)} disabled={index === total - 1} />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <IconBtn icon="undo" label="Undo (⌘Z)" onClick={undo} disabled={!past.length} />
          <IconBtn icon="redo" label="Redo (⇧⌘Z)" onClick={redo} disabled={!future.length} />
          <div className="mx-1 h-5 w-px bg-line" />
          <IconBtn icon="minus" label="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))} />
          <button
            onClick={() => setZoom(1)}
            className="h-7 min-w-[62px] rounded border border-ink-600 bg-ink-850 px-2 font-mono text-[11px] text-amber hover:border-amber/60"
            title="Reset to fit"
          >
            {Math.round(scale * 100)}%
          </button>
          <IconBtn icon="plus" label="Zoom in" onClick={() => setZoom((z) => Math.min(8, z * 1.25))} />
          <div className="mx-1 h-5 w-px bg-line" />
          {dirty && (
            <span className="tk hidden text-warn sm:inline">unsaved</span>
          )}
          <Btn icon="copy" onClick={() => save("new")}>
            Save as new
          </Btn>
          <Btn icon="save" variant="solid" onClick={() => save("replace")}>
            Save to board
          </Btn>
          <IconBtn icon="x" label="Close studio (Esc)" onClick={onClose} tone="danger" size={32} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* tool rail */}
        <div className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-line bg-ink-900 py-2">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTool(t.key);
                setRegion(null);
                setHint(t.label);
              }}
              title={`${t.label} (${t.hot})`}
              className={cn(
                "group relative flex h-9 w-9 items-center justify-center rounded-[6px] border transition-all duration-150 active:scale-90",
                tool === t.key
                  ? "border-amber/70 bg-amber/18 text-amber shadow-[0_0_16px_-4px_rgba(255,171,31,0.8)]"
                  : "border-transparent text-mute hover:border-line hover:bg-ink-700 hover:text-bone"
              )}
            >
              <Icon name={t.icon} size={17} />
              <span className="absolute bottom-[2px] right-[3px] font-mono text-[7px] opacity-60">
                {t.hot}
              </span>
            </button>
          ))}
          <div className="my-1 h-px w-7 bg-line" />
          <IconBtn
            icon="scissors"
            label="Cut region (⌘X)"
            tone="danger"
            size={36}
            disabled={!region || tool === "crop"}
            onClick={() => regionToClipboard(true)}
          />
          <IconBtn
            icon="copy"
            label="Copy region (⌘C)"
            tone="cool"
            size={36}
            disabled={!region || tool === "crop"}
            onClick={() => regionToClipboard(false)}
          />
          <IconBtn
            icon="paste"
            label="Paste (⌘V)"
            tone="accent"
            size={36}
            disabled={!hasClip}
            onClick={() => pasteClipboard()}
          />
          <IconBtn icon="trash" label="Delete selection (Del)" tone="danger" size={36} onClick={deleteSelected} />
        </div>

        {/* canvas stage */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {tool === "crop" && region && region.w > 8 && (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber/50 bg-ink-900/95 px-3 py-1.5 shadow-xl pop">
              <span className="font-mono text-[11px] text-amber">
                {Math.round(region.w)} × {Math.round(region.h)}
              </span>
              <Btn size="xs" variant="solid" icon="check" onClick={applyCrop}>
                Apply crop
              </Btn>
              <Btn size="xs" variant="ghost" onClick={() => setRegion(null)}>
                Cancel
              </Btn>
            </div>
          )}
          {tool === "marquee" && region && region.w > 8 && (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-magenta/50 bg-ink-900/95 px-3 py-1.5 shadow-xl pop">
              <span className="font-mono text-[11px] text-magenta">
                {Math.round(region.w)} × {Math.round(region.h)}
              </span>
              <Btn size="xs" variant="cool" icon="copy" onClick={() => regionToClipboard(false)}>
                Copy
              </Btn>
              <Btn size="xs" variant="danger" icon="scissors" onClick={() => regionToClipboard(true)}>
                Cut
              </Btn>
            </div>
          )}

          <div
            ref={wrapRef}
            className="checker relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-7"
            onWheel={(e) => {
              if (!e.ctrlKey && !e.metaKey) return;
              e.preventDefault();
              setZoom((z) => Math.max(0.25, Math.min(8, z * (e.deltaY > 0 ? 0.9 : 1.1))));
            }}
          >
            <div className="relative shrink-0" style={{ width: dispW, height: dispH }}>
              <canvas
                ref={canvasRef}
                style={{ width: dispW, height: dispH, touchAction: "none" }}
                className={cn(
                  "block shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] ring-1 ring-line",
                  tool === "select" ? "cursor-move" : "cursor-crosshair"
                )}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={() => setCursor(null)}
                onDoubleClick={(e) => {
                  if (tool === "crop") {
                    applyCrop();
                    return;
                  }
                  const p = toImg(e);
                  const hit = hitTest(p.x, p.y);
                  if (hit?.kind === "text") beginText(hit);
                }}
              />
              {textEdit &&
                (() => {
                  const k = scale;
                  const L = textLayout({
                    x: textEdit.x,
                    y: textEdit.y,
                    text: textEdit.value,
                    size: textEdit.size,
                    align: textEdit.align,
                  });
                  const padX = Math.max(4, L.padX * k);
                  const padY = Math.max(2, L.padY * k);
                  const left = Math.max(0, L.left * k - padX);
                  const width = Math.min(
                    Math.max(176, (L.w + L.padX * 2) * k + 2),
                    Math.max(176, dispW - left)
                  );
                  return (
                    <div
                      className="absolute z-20"
                      style={{ left, top: Math.max(0, L.top * k - padY), width }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <textarea
                        ref={textFieldRef}
                        value={textEdit.value}
                        placeholder="Type your label…"
                        spellCheck={false}
                        rows={Math.max(1, L.lines.length)}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (textEditRef.current) textEditRef.current = { ...textEditRef.current, value };
                          setTextEdit((t) => (t ? { ...t, value } : t));
                        }}
                        onBlur={() => finishText("commit")}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Escape") {
                            e.preventDefault();
                            finishText("cancel");
                            return;
                          }
                          if (e.key === "Enter" && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            finishText("commit");
                          }
                        }}
                        className="block w-full resize-none overflow-hidden rounded-[3px] border border-dashed outline-none"
                        style={{
                          fontFamily: TEXT_FONT,
                          fontWeight: TEXT_WEIGHT,
                          fontSize: Math.max(12, textEdit.size * k),
                          lineHeight: 1.18,
                          color: textEdit.color,
                          textAlign: textEdit.align,
                          background: textEdit.plate ? "rgba(13,11,10,0.86)" : "transparent",
                          borderColor: textEdit.color,
                          padding: `${padY}px ${padX}px`,
                          caretColor: textEdit.color,
                          minHeight: Math.max(30, (L.h + L.padY * 2) * k),
                        }}
                      />
                      <div className="mt-1 flex items-center gap-2 whitespace-nowrap rounded-[3px] border border-line bg-ink-900/95 px-1.5 py-1 font-mono text-[9px] text-dim shadow-lg">
                        <span>ENTER commit</span>
                        <span className="hidden sm:inline">⇧ENTER line</span>
                        <span>ESC cancel</span>
                        <button
                          type="button"
                          className="ml-auto rounded border border-amber/50 px-1.5 py-[1px] text-amber transition-colors hover:bg-amber/15"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            finishText("commit");
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-line bg-ink-900 px-3 py-1.5 font-mono text-[10px] text-dim">
            <span className="text-amber">{tool.toUpperCase()}</span>
            <span className="hidden truncate sm:inline">{hint}</span>
            <span className="ml-auto flex items-center gap-3">
              {cursor && (
                <span>
                  x{cursor.x} y{cursor.y}
                </span>
              )}
              <span>
                {bw}×{bh}
              </span>
              <span className={cn(hasClip ? "text-lime" : "text-dim")}>
                CLIP {hasClip ? `${RASTER?.w}×${RASTER?.h}` : "EMPTY"}
              </span>
            </span>
          </div>
        </div>

        {/* right panel */}
        <aside className="hidden w-[262px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-ink-900 p-3 lg:flex">
          <div>
            <SectionTitle hue={color}>Stroke</SectionTitle>
            <div className="mb-2 grid grid-cols-8 gap-1">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    if (selected?.kind === "text" || textEdit) applyTextAttrs({ color: c }, "text-color");
                    else if (selected) patchSelected({ color: c }, "color");
                  }}
                  title={c}
                  className={cn(
                    "h-5 rounded-[3px] border transition-transform hover:scale-110",
                    color === c ? "border-bone" : "border-ink-600"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); if (selected?.kind === "text" || textEdit) applyTextAttrs({ color: e.target.value }, "text-color"); else if (selected) patchSelected({ color: e.target.value }, "color"); }}
                className="h-7 w-9 rounded"
                title="Custom colour"
              />
              <span className="font-mono text-[11px] text-mute">{color.toUpperCase()}</span>
            </div>
            <div className="mt-2 space-y-2">
              <Slider label="Stroke width" value={width} min={1} max={40} onChange={setWidth} unit="px" />
              <Slider label="Text size" value={textEdit?.size ?? (selected?.kind === "text" ? selected.size : fontSize)} min={12} max={200} onChange={(v) => { setFontSize(v); applyTextAttrs({ size: v }, "text-size"); }} unit="px" />
              <Toggle label="Fill boxes" checked={fillBox} onChange={setFillBox} />
            </div>
          </div>

          {(selected?.kind === "text" || tool === "text") && (
            <div className="space-y-2">
              <SectionTitle hue="#21d4ee">Text & position</SectionTitle>
              {selected?.kind === "text" && <Btn size="xs" icon="pencil" onClick={() => beginText(selected)}>Edit text</Btn>}
              <div className="flex gap-1" aria-label="Text alignment">
                {(["left", "center", "right"] as const).map((align) => (
                  <button key={align} type="button" title={`Align ${align}`} aria-label={`Align text ${align}`} aria-pressed={(selected?.kind === "text" ? selected.align ?? "left" : textAlign) === align} onClick={() => changeAlign(align)} className={cn("rounded border px-2 py-1", (selected?.kind === "text" ? selected.align ?? "left" : textAlign) === align ? "border-amber text-amber" : "border-line text-mute")}><Icon name={align === "left" ? "alignLeft" : align === "center" ? "alignCenter" : "alignRight"} size={14} /></button>
                ))}
              </div>
              <Toggle label="Text background" checked={selected?.kind === "text" ? selected.plate !== false : textPlate} onChange={(v) => { setTextPlate(v); applyTextAttrs({ plate: v }, "text-plate"); }} />
              {selected?.kind === "text" && <>
                <div className="flex gap-1">
                  <NumField label="X" value={selected.x} onChange={(v) => setSelectedPos(v, selected.y)} />
                  <NumField label="Y" value={selected.y} onChange={(v) => setSelectedPos(selected.x, v)} />
                </div>
                <div className="tk text-dim">Position on frame</div>
                <div className="grid w-24 grid-cols-3 gap-1">
                  {[0, 0.5, 1].flatMap((y) => [0, 0.5, 1].map((x) => <button key={`${x}-${y}`} type="button" aria-label={`Place ${y === 0 ? "top" : y === 0.5 ? "middle" : "bottom"} ${x === 0 ? "left" : x === 0.5 ? "center" : "right"}`} onClick={() => placeSelected(x, y)} className="h-6 rounded border border-line bg-ink-850 text-mute hover:border-amber hover:text-amber">·</button>))}
                </div>
                <p className="text-[10px] text-dim">Drag to move, or use arrow keys (Shift for 10 px). Double-click to edit.</p>
              </>}
            </div>
          )}

          <div>
            <SectionTitle hue="#21d4ee">Crop presets</SectionTitle>
            <div className="grid grid-cols-3 gap-1">
              {CROP_PRESETS.map((p) => (
                <Btn key={p.label} size="xs" onClick={() => cropPreset(p.value)}>
                  {p.label}
                </Btn>
              ))}
            </div>
          </div>

          <div className="min-h-0">
            <SectionTitle hue="#b8f24a" right={<span className="font-mono text-[10px] text-dim">{objects.length}</span>}>
              Layers
            </SectionTitle>
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {objects.length === 0 && (
                <p className="rounded border border-dashed border-line/60 px-2 py-3 text-[11px] text-dim">
                  Nothing drawn yet. Lines, arrows, boxes, labels and pasted pixels stack here.
                </p>
              )}
              {[...objects].reverse().map((o) => (
                <div
                  key={o.id}
                  onClick={() => {
                    setSelId(o.id);
                    setTool("select");
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-[11px] transition-colors",
                    selId === o.id
                      ? "border-cyan/60 bg-cyan/10 text-cyan"
                      : "border-ink-600 bg-ink-850 text-mute hover:border-line hover:text-bone"
                  )}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: o.color }} />
                  <Icon
                    name={o.kind === "text" ? "text" : o.kind === "image" ? "image" : o.kind === "rect" ? "square" : o.kind}
                    size={12}
                  />
                  <span className="truncate">
                    {o.kind === "text" ? o.text : o.kind === "image" ? "Pasted pixels" : o.kind}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      push(objects, baseSrc);
                      setObjects((l) => l.filter((x) => x.id !== o.id));
                    }}
                    className="ml-auto text-dim transition-colors hover:text-danger"
                    title="Delete layer"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle hue="#ffab1f">Frame</SectionTitle>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setDirty(true)}
              placeholder="Frame name"
              className="mb-2 h-8 w-full rounded border border-ink-600 bg-ink-850 px-2 text-[12px] text-bone focus:border-amber focus:outline-none"
            />
            <div className="mb-1 tk text-mute">Add comment</div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Note for the crew…"
              className="w-full resize-none rounded border border-ink-600 bg-ink-850 px-2 py-1.5 text-[12px] text-bone focus:border-amber focus:outline-none"
            />
            <Btn
              size="xs"
              icon="comment"
              className="mt-1 w-full"
              disabled={!comment.trim()}
              onClick={() => {
                onComment(comment.trim());
                setComment("");
                setHint("Comment added to the frame thread");
              }}
            >
              Post comment
            </Btn>
            <p className="mt-2 text-[10px] leading-relaxed text-dim">
              Name edits apply when you save. Comments post immediately to the board thread.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
