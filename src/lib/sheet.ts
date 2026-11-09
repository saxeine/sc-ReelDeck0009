import {
  STATUS_META,
  type Frame,
  type RatioKey,
  type SheetSettings,
  type SheetTheme,
} from "../types";
import { loadImage, roundRect, shortDur, timecode, wrapLines } from "./imaging";

export interface ThemeSpec {
  label: string;
  bg: string;
  bg2: string;
  panel: string;
  ink: string;
  sub: string;
  line: string;
  swatch: string;
}

export const THEMES: Record<SheetTheme, ThemeSpec> = {
  darkroom: {
    label: "Darkroom",
    bg: "#0d0b0a",
    bg2: "#171210",
    panel: "#141110",
    ink: "#f4ece0",
    sub: "#a5948a",
    line: "#3a2f28",
    swatch: "#ffab1f",
  },
  bone: {
    label: "Bone paper",
    bg: "#efe7da",
    bg2: "#f7f2e9",
    panel: "#fbf8f2",
    ink: "#191512",
    sub: "#6d6058",
    line: "#d3c7b6",
    swatch: "#c2410c",
  },
  blueprint: {
    label: "Blueprint",
    bg: "#061826",
    bg2: "#0a2438",
    panel: "#0b2032",
    ink: "#dcefff",
    sub: "#7fa8c9",
    line: "#17415f",
    swatch: "#21d4ee",
  },
  neon: {
    label: "Neon lab",
    bg: "#0a0410",
    bg2: "#180a2a",
    panel: "#140823",
    ink: "#ffe9f6",
    sub: "#b98fc0",
    line: "#3d1454",
    swatch: "#ff2e88",
  },
};

export const RATIOS: { key: RatioKey; label: string; value: number | null }[] = [
  { key: "16:9", label: "16:9", value: 16 / 9 },
  { key: "2.39:1", label: "2.39:1", value: 2.39 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "9:16", label: "9:16", value: 9 / 16 },
  { key: "source", label: "Source", value: null },
];

export function ratioFor(key: RatioKey, f: Frame): number {
  const found = RATIOS.find((r) => r.key === key);
  if (!found || found.value == null) return f.w / Math.max(1, f.h);
  return found.value;
}

export interface SheetInput {
  frames: Frame[];
  sheet: SheetSettings;
  title: string;
  logline: string;
}

export interface SheetResult {
  width: number;
  height: number;
  rows: number;
  cols: number;
}

const DISPLAY = '"Bebas Neue", Impact, sans-serif';
const SANS = '"Space Grotesk", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", monospace';

function captionMetrics(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  s: SheetSettings,
  cellW: number
) {
  const pad = Math.round(s.captionSize * 0.55);
  let h = pad;
  const nameSize = Math.round(s.captionSize * 1.12);
  const metaSize = Math.round(s.captionSize * 0.78);
  const bodySize = s.captionSize;
  const noteSize = Math.round(s.captionSize * 0.82);

  if (s.showNames) h += nameSize * 1.15 + 3;
  if (s.showTimecode) h += metaSize * 1.3 + 3;

  let captionLines: string[] = [];
  if (s.showCaptions && f.caption.trim()) {
    ctx.font = `400 ${bodySize}px ${SANS}`;
    captionLines = wrapLines(ctx, f.caption.trim(), cellW - pad * 2, 2);
    h += captionLines.length * bodySize * 1.3 + 3;
  }
  let noteLines: string[] = [];
  if (s.showComments && f.comments.length) {
    ctx.font = `400 ${noteSize}px ${SANS}`;
    const latest = f.comments[f.comments.length - 1];
    noteLines = wrapLines(
      ctx,
      `${latest.author}: ${latest.text}`,
      cellW - pad * 2,
      2
    );
    h += noteLines.length * noteSize * 1.3 + 4;
  }
  return {
    height: Math.round(h + pad * 0.6),
    pad,
    nameSize,
    metaSize,
    bodySize,
    noteSize,
    captionLines,
    noteLines,
  };
}

/** Draws the full contact sheet into `canvas`. Safe to call repeatedly. */
export async function renderSheet(
  canvas: HTMLCanvasElement,
  input: SheetInput,
  cancelled?: () => boolean
): Promise<SheetResult> {
  const { sheet: s, title, logline } = input;
  const frames = input.frames;
  const t = THEMES[s.theme];
  const W = Math.max(600, s.width);
  const cols = Math.max(1, Math.min(s.columns, Math.max(1, frames.length)));
  const rows = Math.max(1, Math.ceil(frames.length / cols));

  try {
    await document.fonts.ready;
  } catch {
    /* fonts optional */
  }

  const images = await Promise.all(
    frames.map((f) => loadImage(f.src).catch(() => null))
  );
  if (cancelled?.()) return { width: 0, height: 0, rows, cols };

  const measure = document.createElement("canvas").getContext("2d")!;
  const innerW = W - s.margin * 2;
  const cellW = (innerW - s.gutter * (cols - 1)) / cols;

  const cells = frames.map((f, i) => {
    const imgH = cellW / ratioFor(s.ratio, f);
    const cap = captionMetrics(measure, f, s, cellW);
    const capH =
      s.showNames || s.showCaptions || s.showTimecode || s.showComments
        ? cap.height
        : 0;
    return { f, img: images[i], imgH, cap, capH, total: imgH + capH };
  });

  const rowH: number[] = [];
  for (let r = 0; r < rows; r++) {
    const slice = cells.slice(r * cols, r * cols + cols);
    rowH.push(Math.max(...slice.map((c) => c.total), 40));
  }

  // ---- header ----
  let headerH = 0;
  const titleSize = Math.max(30, Math.round(W * 0.031));
  const logSize = Math.max(12, Math.round(W * 0.0072));
  let logLines: string[] = [];
  if (s.showHeader) {
    measure.font = `400 ${logSize}px ${SANS}`;
    logLines = logline.trim()
      ? wrapLines(measure, logline.trim(), innerW * 0.62, 2)
      : [];
    headerH =
      titleSize * 1.05 +
      14 +
      (logLines.length ? logLines.length * logSize * 1.4 + 10 : 0) +
      26;
  }
  const footerH = s.showFooter ? Math.round(W * 0.022) + 26 : 0;

  const top = s.margin + headerH;
  const bodyH = rowH.reduce((a, b) => a + b, 0) + s.gutter * (rows - 1);
  const H = Math.round(top + bodyH + footerH + s.margin);

  const dpr = Math.max(0.5, Math.min(3, s.scale));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = "high";
  ctx.textBaseline = "alphabetic";

  // ---- background ----
  const bg = ctx.createLinearGradient(0, 0, W * 0.35, H);
  bg.addColorStop(0, t.bg2);
  bg.addColorStop(0.55, t.bg);
  bg.addColorStop(1, t.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // corner glow borrowed from accent
  const glow = ctx.createRadialGradient(W * 0.06, H, 0, W * 0.06, H, W * 0.6);
  glow.addColorStop(0, hexAlpha(s.accent, s.theme === "bone" ? 0.1 : 0.16));
  glow.addColorStop(1, hexAlpha(s.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ---- sprocket strips ----
  if (s.showSprockets && s.margin >= 22) {
    const holeW = Math.min(18, s.margin * 0.34);
    const holeH = holeW * 0.72;
    const step = holeH * 2.3;
    ctx.fillStyle = s.theme === "bone" ? "#ded3c2" : "#000000";
    for (let y = s.margin * 0.6; y < H - s.margin * 0.4; y += step) {
      roundRect(ctx, (s.margin - holeW) / 2, y, holeW, holeH, 2.5);
      ctx.fill();
      roundRect(ctx, W - s.margin + (s.margin - holeW) / 2, y, holeW, holeH, 2.5);
      ctx.fill();
    }
    ctx.strokeStyle = hexAlpha(t.line, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.margin - 8, s.margin * 0.5);
    ctx.lineTo(s.margin - 8, H - s.margin * 0.5);
    ctx.moveTo(W - s.margin + 8, s.margin * 0.5);
    ctx.lineTo(W - s.margin + 8, H - s.margin * 0.5);
    ctx.stroke();
  }

  // ---- header ----
  if (s.showHeader) {
    let y = s.margin + titleSize * 0.86;
    ctx.fillStyle = t.ink;
    ctx.font = `400 ${titleSize}px ${DISPLAY}`;
    ctx.fillText((title || "Untitled board").toUpperCase(), s.margin, y);

    const metaSize = Math.max(10, Math.round(W * 0.0058));
    const totalDur = frames.reduce((a, f) => a + f.duration, 0);
    const meta = `${frames.length} FRAMES · ${cols}×${rows} · ${timecode(
      totalDur
    )} · ${s.ratio.toUpperCase()}`;
    ctx.font = `500 ${metaSize}px ${MONO}`;
    ctx.fillStyle = s.accent;
    ctx.textAlign = "right";
    ctx.fillText(meta, W - s.margin, s.margin + metaSize);
    ctx.fillStyle = t.sub;
    ctx.fillText(
      new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
      W - s.margin,
      s.margin + metaSize * 2.5
    );
    ctx.textAlign = "left";

    y += 14;
    ctx.fillStyle = s.accent;
    ctx.fillRect(s.margin, y, Math.min(150, W * 0.08), 3);
    y += 3 + logSize * 1.15;
    ctx.font = `400 ${logSize}px ${SANS}`;
    ctx.fillStyle = t.sub;
    for (const line of logLines) {
      ctx.fillText(line, s.margin, y);
      y += logSize * 1.4;
    }
  }

  // ---- cells ----
  let elapsed = 0;
  const starts = frames.map((f) => {
    const v = elapsed;
    elapsed += f.duration;
    return v;
  });

  cells.forEach((c, i) => {
    const r = Math.floor(i / cols);
    const col = i % cols;
    const x = s.margin + col * (cellW + s.gutter);
    const y = top + rowH.slice(0, r).reduce((a, b) => a + b, 0) + s.gutter * r;
    const { f, img, imgH, cap } = c;

    // frame plate
    ctx.fillStyle = t.panel;
    roundRect(ctx, x, y, cellW, imgH, s.radius);
    ctx.fill();

    ctx.save();
    roundRect(ctx, x, y, cellW, imgH, s.radius);
    ctx.clip();
    if (img) {
      const ar = img.naturalWidth / img.naturalHeight;
      const boxAr = cellW / imgH;
      let dw = cellW;
      let dh = imgH;
      if (s.fit === "cover" ? ar > boxAr : ar < boxAr) {
        dh = imgH;
        dw = imgH * ar;
      } else {
        dw = cellW;
        dh = cellW / ar;
      }
      ctx.drawImage(img, x + (cellW - dw) / 2, y + (imgH - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = hexAlpha(t.sub, 0.18);
      ctx.fillRect(x, y, cellW, imgH);
      ctx.fillStyle = t.sub;
      ctx.font = `500 ${Math.round(cellW * 0.05)}px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText("IMAGE UNAVAILABLE", x + cellW / 2, y + imgH / 2);
      ctx.textAlign = "left";
    }

    // bottom scrim for badges legibility
    const scrim = ctx.createLinearGradient(0, y + imgH - imgH * 0.3, 0, y + imgH);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = scrim;
    ctx.fillRect(x, y + imgH - imgH * 0.3, cellW, imgH * 0.3);

    if (s.showGrid) {
      ctx.strokeStyle = hexAlpha(s.accent, 0.5);
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x + cellW / 3, y);
      ctx.lineTo(x + cellW / 3, y + imgH);
      ctx.moveTo(x + (cellW * 2) / 3, y);
      ctx.lineTo(x + (cellW * 2) / 3, y + imgH);
      ctx.moveTo(x, y + imgH / 3);
      ctx.lineTo(x + cellW, y + imgH / 3);
      ctx.moveTo(x, y + (imgH * 2) / 3);
      ctx.lineTo(x + cellW, y + (imgH * 2) / 3);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    ctx.strokeStyle = t.line;
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, cellW - 1, imgH - 1, s.radius);
    ctx.stroke();

    const badge = Math.max(16, Math.round(s.captionSize * 1.5));
    if (s.showNumbers) {
      ctx.fillStyle = s.accent;
      roundRect(ctx, x + 8, y + 8, badge * 1.35, badge, 3);
      ctx.fill();
      ctx.fillStyle = contrastInk(s.accent);
      ctx.font = `600 ${Math.round(badge * 0.62)}px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText(
        String(i + 1).padStart(2, "0"),
        x + 8 + badge * 0.675,
        y + 8 + badge * 0.72
      );
      ctx.textAlign = "left";
    }

    // status chip
    const sm = STATUS_META[f.status];
    const chipH = Math.max(13, Math.round(s.captionSize * 0.85));
    ctx.font = `500 ${Math.round(chipH * 0.68)}px ${MONO}`;
    const label = `${f.shot} · ${sm.label.toUpperCase()}`;
    const chipW = ctx.measureText(label).width + chipH * 1.5;
    ctx.fillStyle = "rgba(8,7,6,0.72)";
    roundRect(ctx, x + cellW - chipW - 8, y + 8, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.fillStyle = sm.color;
    ctx.beginPath();
    ctx.arc(
      x + cellW - chipW - 8 + chipH * 0.6,
      y + 8 + chipH / 2,
      chipH * 0.19,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = "#f4ece0";
    ctx.fillText(label, x + cellW - chipW - 8 + chipH * 1.05, y + 8 + chipH * 0.71);

    if (f.annotated) {
      ctx.fillStyle = "#21d4ee";
      ctx.font = `500 ${Math.round(chipH * 0.66)}px ${MONO}`;
      ctx.fillText("✎ ANNOTATED", x + 10, y + imgH - 10);
    }

    // ---- caption block ----
    let cy = y + imgH + cap.pad;
    const tx = x + cap.pad;
    const tw = cellW - cap.pad * 2;
    if (s.showNames) {
      ctx.font = `600 ${cap.nameSize}px ${SANS}`;
      ctx.fillStyle = t.ink;
      const nameLines = wrapLines(ctx, f.name || `Frame ${i + 1}`, tw, 1);
      cy += cap.nameSize * 0.92;
      ctx.fillText(nameLines[0] ?? "", tx, cy);
      cy += cap.nameSize * 0.23 + 3;
    }
    if (s.showTimecode) {
      ctx.font = `500 ${cap.metaSize}px ${MONO}`;
      ctx.fillStyle = s.accent;
      cy += cap.metaSize * 0.9;
      const right = `${shortDur(f.duration)}`;
      ctx.fillText(`IN ${timecode(starts[i])}`, tx, cy);
      ctx.fillStyle = t.sub;
      ctx.textAlign = "right";
      ctx.fillText(right, x + cellW - cap.pad, cy);
      ctx.textAlign = "left";
      cy += cap.metaSize * 0.4 + 3;
    }
    if (cap.captionLines.length) {
      ctx.font = `400 ${cap.bodySize}px ${SANS}`;
      ctx.fillStyle = t.sub;
      for (const line of cap.captionLines) {
        cy += cap.bodySize * 0.95;
        ctx.fillText(line, tx, cy);
        cy += cap.bodySize * 0.35;
      }
      cy += 3;
    }
    if (cap.noteLines.length) {
      ctx.fillStyle = hexAlpha(s.accent, 0.75);
      ctx.fillRect(tx, cy + 2, 2, cap.noteLines.length * cap.noteSize * 1.3);
      ctx.font = `400 ${cap.noteSize}px ${SANS}`;
      ctx.fillStyle = t.sub;
      for (const line of cap.noteLines) {
        cy += cap.noteSize * 0.95;
        ctx.fillText(line, tx + 9, cy);
        cy += cap.noteSize * 0.35;
      }
    }
  });

  if (!frames.length) {
    ctx.fillStyle = t.sub;
    ctx.font = `400 ${Math.round(W * 0.03)}px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText("NO FRAMES IN THIS SCOPE", W / 2, top + 80);
    ctx.font = `400 ${Math.round(W * 0.008)}px ${SANS}`;
    ctx.fillText(
      "Add frames on the board, or widen the sheet scope.",
      W / 2,
      top + 110
    );
    ctx.textAlign = "left";
  }

  // ---- footer ----
  if (s.showFooter) {
    const fy = H - s.margin - footerH + 20;
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.margin, fy);
    ctx.lineTo(W - s.margin, fy);
    ctx.stroke();
    const fs = Math.max(10, Math.round(W * 0.0055));
    ctx.font = `500 ${fs}px ${MONO}`;
    ctx.fillStyle = t.sub;
    ctx.fillText((s.footerText || "").toUpperCase(), s.margin, fy + fs * 2);
    ctx.textAlign = "right";
    ctx.fillStyle = s.accent;
    const approved = frames.filter((f) => f.status === "approved").length;
    ctx.fillText(
      `${approved}/${frames.length} APPROVED · ${Math.round(W * dpr)}×${Math.round(
        H * dpr
      )}PX`,
      W - s.margin,
      fy + fs * 2
    );
    ctx.textAlign = "left";
  }

  return { width: canvas.width, height: canvas.height, rows, cols };
}

export function hexAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full || "ffab1f", 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export function contrastInk(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full || "ffab1f", 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#14100e" : "#fdf6ea";
}
