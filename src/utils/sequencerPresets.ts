export type SequencerWrapMode = "loop" | "pingpong" | "once";
export type SequencerTurnMode = "step" | "spin" | "pulse";
export type SequencerWarp =
  | "none"
  | "bend"
  | "arc"
  | "wave"
  | "fisheye"
  | "tilt"
  | "swirl"
  | "pinch"
  | "bulge"
  | "ripple"
  | "fold"
  | "vortex"
  | "skew"
  | "cylinder"
  | "flip3d"
  | "zoomtwist";

export interface SequencerWarpPresetInfo {
  id: SequencerWarp;
  name: string;
  description: string;
  group: "core" | "extended";
  transform: string;
}

export const PRIMARY_SEQUENCER_WARPS: readonly SequencerWarp[] = [
  "none",
  "bend",
  "arc",
  "wave",
  "fisheye",
  "tilt",
];

export const SEQUENCER_WARP_PRESETS: readonly SequencerWarpPresetInfo[] = [
  { id: "none", name: "None", description: "Flat unwarped panel geometry", group: "core", transform: "" },
  { id: "bend", name: "Bend", description: "Forward perspective pitch with subtle vertical skew", group: "core", transform: "perspective(450px) rotateX(12deg) skewY(-3deg)" },
  { id: "arc", name: "Arc", description: "Curved horizontal rotation with slight zoom", group: "core", transform: "perspective(500px) rotateY(-14deg) scale(1.05)" },
  { id: "wave", name: "Wave", description: "Diagonal roll and horizontal shear ripple", group: "core", transform: "perspective(420px) rotateZ(3deg) skewX(5deg)" },
  { id: "fisheye", name: "Fisheye", description: "Radial center magnification", group: "core", transform: "scale(1.14)" },
  { id: "tilt", name: "Tilt", description: "Dual-axis perspective corner tilt", group: "core", transform: "perspective(480px) rotateX(-12deg) rotateY(12deg)" },
  { id: "swirl", name: "Swirl", description: "Torsional z-axis twist with perspective depth", group: "extended", transform: "perspective(420px) rotateZ(11deg) rotateX(8deg) scale(1.08)" },
  { id: "pinch", name: "Pinch", description: "Inward compression with steep depth recession", group: "extended", transform: "perspective(360px) scale3d(0.86, 0.86, 1) rotateX(14deg)" },
  { id: "bulge", name: "Bulge", description: "Wide-angle convex expansion toward viewer", group: "extended", transform: "perspective(320px) scale3d(1.18, 1.12, 1) rotateX(-6deg)" },
  { id: "ripple", name: "Ripple", description: "Bidirectional shear wave distortion", group: "extended", transform: "perspective(440px) skewX(-8deg) skewY(5deg) scale(1.06)" },
  { id: "fold", name: "Fold", description: "Sharp origami vertical crease angle", group: "extended", transform: "perspective(340px) rotateY(26deg) skewY(-6deg) scale(0.96)" },
  { id: "vortex", name: "Vortex", description: "Deep spiral pull with oblique banking", group: "extended", transform: "perspective(360px) rotateZ(-16deg) rotateY(18deg) scale(0.92)" },
  { id: "skew", name: "Skew", description: "Crisp parallelogram horizontal shear", group: "extended", transform: "skewX(-14deg) skewY(3deg) scale(1.04)" },
  { id: "cylinder", name: "Cylinder", description: "Wrapped horizontal drum projection", group: "extended", transform: "perspective(300px) rotateY(-24deg) scaleX(0.92) scaleY(1.08)" },
  { id: "flip3d", name: "Flip 3d", description: "Steep 3d card banking across horizontal axis", group: "extended", transform: "perspective(380px) rotateX(28deg) rotateZ(-4deg) scale(1.05)" },
  { id: "zoomtwist", name: "Zoom twist", description: "Punchy forward zoom paired with counter-rotation", group: "extended", transform: "perspective(400px) scale(1.16) rotateZ(8deg) rotateY(-10deg)" },
];

export function getSequencerWarpTransform(warp: SequencerWarp): string {
  const found = SEQUENCER_WARP_PRESETS.find((item) => item.id === warp);
  return found ? found.transform : "";
}

export type BuiltinSequencerPreset = "all" | "reverse" | "snake" | "columns" | "column-snake" | "spiral" | "spiral-reverse" | "ring" | "ring-reverse" | "diagonal" | "checkerboard" | "corners" | "cross" | "x";
export type SequencerPreset = BuiltinSequencerPreset | "custom";
export const BUILTIN_SEQUENCER_PRESETS: { id: BuiltinSequencerPreset; name: string; description: string }[] = [
  { id: "all", name: "Rows", description: "Left to right, top to bottom" },
  { id: "reverse", name: "Reverse rows", description: "Right to left, bottom to top" },
  { id: "snake", name: "Row snake", description: "Alternating row directions" },
  { id: "columns", name: "Columns", description: "Top to bottom, column by column" },
  { id: "column-snake", name: "Column snake", description: "Alternating column directions" },
  { id: "spiral", name: "Spiral inward", description: "Clockwise, outside to center" },
  { id: "spiral-reverse", name: "Spiral outward", description: "Center to outside" },
  { id: "ring", name: "Border clockwise", description: "Around the outer edge" },
  { id: "ring-reverse", name: "Border counterclockwise", description: "Reverse around the outer edge" },
  { id: "diagonal", name: "Diagonal sweep", description: "Alternating diagonals" },
  { id: "checkerboard", name: "Checkerboard", description: "One color, then the other" },
  { id: "corners", name: "Corners", description: "Four corners clockwise" },
  { id: "cross", name: "Cross", description: "Center row and column" },
  { id: "x", name: "X", description: "Both diagonals" },
];

export function getPresetPath(preset: SequencerPreset, totalSlots: number): number[] {
  const side = totalSlots === 4 ? 2 : totalSlots === 9 ? 3 : 4;
  const rows = Array.from({ length: side * side }, (_, i) => i + 1);
  const index = (r: number, c: number) => r * side + c + 1;
  const spiral: number[] = [];
  for (let top = 0, left = 0, bottom = side - 1, right = side - 1; top <= bottom && left <= right; top++, left++, bottom--, right--) {
    for (let c = left; c <= right; c++) spiral.push(index(top, c));
    for (let r = top + 1; r <= bottom; r++) spiral.push(index(r, right));
    if (bottom > top) for (let c = right - 1; c >= left; c--) spiral.push(index(bottom, c));
    if (right > left) for (let r = bottom - 1; r > top; r--) spiral.push(index(r, left));
  }
  const border = spiral.slice(0, side === 2 ? 4 : 4 * side - 4);
  const cols = Array.from({ length: side }, (_, c) => Array.from({ length: side }, (_, r) => index(r, c)));
  switch (preset) {
    case "reverse": return rows.reverse();
    case "snake": return Array.from({ length: side }, (_, r) => Array.from({ length: side }, (_, c) => index(r, r % 2 ? side - 1 - c : c))).flat();
    case "columns": return cols.flat();
    case "column-snake": return cols.flatMap((col, c) => c % 2 ? [...col].reverse() : col);
    case "spiral": return spiral;
    case "spiral-reverse": return [...spiral].reverse();
    case "ring": return border;
    case "ring-reverse": return [border[0], ...border.slice(1).reverse()];
    case "diagonal": {
      const out: number[] = [];
      for (let d = 0; d <= 2 * (side - 1); d++) {
        const group = rows.filter((n) => Math.floor((n - 1) / side) + (n - 1) % side === d);
        out.push(...(d % 2 ? group.reverse() : group));
      }
      return out;
    }
    case "checkerboard": return [...rows.filter((n) => (Math.floor((n - 1) / side) + (n - 1) % side) % 2 === 0), ...rows.filter((n) => (Math.floor((n - 1) / side) + (n - 1) % side) % 2 === 1)];
    case "corners": return [1, side, side * side, side * (side - 1) + 1];
    case "cross": return rows.filter((n) => Math.floor((n - 1) / side) === Math.floor(side / 2) || (n - 1) % side === Math.floor(side / 2));
    case "x": return rows.filter((n) => Math.floor((n - 1) / side) === (n - 1) % side || Math.floor((n - 1) / side) + (n - 1) % side === side - 1);
    default: return rows;
  }
}

/** Adapt a selected path to a new grid without losing the original custom sequence. */
export function sequencerPathForGrid(preset: SequencerPreset, path: readonly number[], customPath: readonly number[] | undefined, totalSlots: number): number[] {
  const candidate = preset === "custom" ? (customPath || path).filter((id) => id >= 1 && id <= totalSlots) : getPresetPath(preset, totalSlots);
  return candidate.length ? [...candidate] : getPresetPath("all", totalSlots);
}

export function parseSequencerPath(input: string, totalSlots: number): number[] {
  const parts = input.trim().split(/[\s,]+/).filter(Boolean);
  if (!parts.length) throw new Error("Add at least one slot to the path.");
  if (parts.length > 128) throw new Error("A path can contain at most 128 steps.");
  if (parts.some((p) => !/^\d+$/.test(p) || Number(p) < 1 || Number(p) > totalSlots)) throw new Error(`Use slot numbers from 1 to ${totalSlots}, separated by commas.`);
  return parts.map(Number);
}

export function effectiveSequencerInterval(interval: number, scale = 1): number {
  const safeInterval = Number.isFinite(interval) ? Math.max(120, Math.min(2500, interval)) : 900;
  const safeScale = Number.isFinite(scale) ? Math.max(0.25, Math.min(4, scale)) : 1;
  return Math.round(Math.max(120, safeInterval * safeScale));
}
export function sequencerImageStretch(x = 1, y = 1, active = true): React.CSSProperties {
  if (!active) return {};
  const safe = (n: number) => Number.isFinite(n) ? Math.max(0.5, Math.min(2, n)) : 1;
  return { scale: `${safe(x)} ${safe(y)}` };
}

export interface CustomSequencerPreset {
  name: string;
  savedAt: string;
  totalSlots: number;
  path: number[];
  wrapMode: SequencerWrapMode;
  turnMode: SequencerTurnMode;
  warp: SequencerWarp;
  stepIntervalMs: number;
  timingScale: number;
  stretchX: number;
  stretchY: number;
}
const DB_NAME = "SeqCarverSequencerPresets";
const STORE = "presets";
function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Device storage is unavailable.")); return; }
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: "name" });
    open.onerror = () => reject(open.error || new Error("Could not open preset storage."));
    open.onblocked = () => reject(new Error("Preset storage is blocked by another tab."));
    open.onsuccess = () => {
      const db = open.result;
      try {
        const tx = db.transaction(STORE, mode);
        const request = operation(tx.objectStore(STORE));
        tx.oncomplete = () => { db.close(); resolve(request.result); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error("Could not save preset.")); };
      } catch (error) { db.close(); reject(error); }
    };
  });
}
export async function listSequencerPresets(): Promise<CustomSequencerPreset[]> {
  const list = await transact<CustomSequencerPreset[]>("readonly", (store) => store.getAll());
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
export async function saveSequencerPreset(preset: Omit<CustomSequencerPreset, "savedAt">): Promise<void> {
  const name = preset.name.trim();
  if (!name) throw new Error("Enter a preset name.");
  if (name.length > 80) throw new Error("Preset name must be 80 characters or fewer.");
  if (![4, 9, 16].includes(preset.totalSlots)) throw new Error("Unsupported grid size.");
  parseSequencerPath(preset.path.join(","), preset.totalSlots);
  await transact("readwrite", (store) => store.put({ ...preset, name, savedAt: new Date().toISOString() }));
}
export async function deleteSequencerPreset(name: string): Promise<void> {
  await transact("readwrite", (store) => store.delete(name));
}
