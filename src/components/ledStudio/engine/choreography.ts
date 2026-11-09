import type {
  AdvertAsset,
  ChoreoCue,
  ChoreoDirection,
  ChoreoFormation,
  ChoreoFrame,
  ChoreoMotion,
  ChoreoTileState,
  ChoreoTransition,
} from '../types';

export const CHOREO_MOTIONS: Array<{
  id: ChoreoMotion;
  label: string;
  hint: string;
}> = [
  { id: 'orbit', label: 'Orbit', hint: 'Clock the cast around the outer and inner LED rings.' },
  { id: 'snake', label: 'Ribbon', hint: 'Run the cast through every panel in a continuous stadium ribbon.' },
  { id: 'wave', label: 'Wave', hint: 'A phased luminance and scale wave rolls across the wall.' },
  { id: 'crossfire', label: 'Crossfire', hint: 'Opposing corner lines converge through the centre.' },
  { id: 'bloom', label: 'Bloom', hint: 'Explode from the centre and resolve at the perimeter.' },
  { id: 'pinwheel', label: 'Pinwheel', hint: 'Rotate the full formation around the wall centre.' },
  { id: 'roller', label: 'Roller deck', hint: 'Rows turn like an airport split-flap information board.' },
  { id: 'wipe', label: 'Corner wipe', hint: 'Reveal a hero image progressively from its positioned start panel.' },
  { id: 'hold', label: 'Hold', hint: 'Lock the complete cast in its resolved formation.' },
];

export const CHOREO_FORMATIONS: Array<{
  id: ChoreoFormation;
  label: string;
  hint: string;
}> = [
  { id: 'solo', label: 'Solo', hint: 'One advert dances panel to panel.' },
  { id: 'trail', label: 'Echo trail', hint: 'One advert leaves luminous copies behind it.' },
  { id: 'troupe', label: 'Troupe', hint: 'Every selected advert becomes an independently positioned dancer.' },
  { id: 'wall', label: 'Full ribbon', hint: 'All 16 panels perform as a coordinated field.' },
  { id: 'mosaic', label: 'Living mosaic', hint: 'Slice one advert into 16 pieces, move it, then reform it.' },
];

export const CHOREO_TRANSITIONS: Array<{
  id: ChoreoTransition;
  label: string;
}> = [
  { id: 'glide', label: 'Glide' },
  { id: 'dissolve', label: 'Dissolve' },
  { id: 'strobe', label: 'Strobe' },
  { id: 'snap', label: 'Beat snap' },
  { id: 'flip', label: 'Roller flip' },
];

const ACCENTS = ['#ff8a1f', '#22d3ee', '#cbf36b', '#a78bfa', '#ff4d8d'];

const mod = (value: number, n: number) => ((value % n) + n) % n;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function makeId(prefix = 'cue'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cueDurationMs(cue: ChoreoCue, bpm: number): number {
  return Math.max(250, cue.durationBeats * (60_000 / clamp(bpm, 20, 240)));
}

export function defaultCastSlots(count: number, panelCount = 16): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  return Array.from({ length: count }, (_, index) =>
    clamp(Math.round((index * (panelCount - 1)) / (count - 1)) + 1, 1, panelCount)
  );
}

export function normalizeCastSlots(slots: number[] | undefined, count: number, panelCount = 16): number[] {
  const fallback = defaultCastSlots(count, panelCount);
  return Array.from({ length: count }, (_, index) =>
    clamp(Math.round(Number(slots?.[index]) || fallback[index] || 1), 1, panelCount)
  );
}

export function createChoreoCue(assets: string[], patch: Partial<ChoreoCue> = {}): ChoreoCue {
  const assetUrls = (patch.assetUrls ?? assets.slice(0, 4)).filter(Boolean).slice(0, 16);
  return {
    id: patch.id ?? makeId(),
    name: patch.name ?? 'New scene',
    motion: patch.motion ?? 'orbit',
    formation: patch.formation ?? 'troupe',
    transition: patch.transition ?? 'glide',
    direction: patch.direction ?? 1,
    durationBeats: patch.durationBeats ?? 8,
    speed: patch.speed ?? 1,
    intensity: patch.intensity ?? 0.72,
    transitionMs: patch.transitionMs ?? 1200,
    assetUrls,
    castSlots: normalizeCastSlots(patch.castSlots, assetUrls.length),
    accent: patch.accent ?? '#22d3ee',
  };
}

/** Clockwise perimeter followed by the inner four-panel ring. */
function orbitOrder(cols: number): number[] {
  const at = (r: number, c: number) => r * cols + c + 1;
  const out: number[] = [];
  for (let c = 0; c < cols; c++) out.push(at(0, c));
  for (let r = 1; r < cols; r++) out.push(at(r, cols - 1));
  for (let c = cols - 2; c >= 0; c--) out.push(at(cols - 1, c));
  for (let r = cols - 2; r >= 1; r--) out.push(at(r, 0));

  if (cols > 2) {
    for (let c = 1; c < cols - 1; c++) out.push(at(1, c));
    for (let r = 2; r < cols - 1; r++) out.push(at(r, cols - 2));
    for (let c = cols - 3; c >= 1; c--) out.push(at(cols - 2, c));
    for (let r = cols - 3; r >= 2; r--) out.push(at(r, 1));
  }
  return out;
}

function snakeOrder(cols: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < cols; r++) {
    if (r % 2 === 0) for (let c = 0; c < cols; c++) out.push(r * cols + c + 1);
    else for (let c = cols - 1; c >= 0; c--) out.push(r * cols + c + 1);
  }
  return out;
}

function columnWaveOrder(cols: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (c % 2 === 0) for (let r = cols - 1; r >= 0; r--) out.push(r * cols + c + 1);
    else for (let r = 0; r < cols; r++) out.push(r * cols + c + 1);
  }
  return out;
}

function crossfireOrder(cols: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (r: number, c: number) => {
    const slot = r * cols + c + 1;
    if (!seen.has(slot)) {
      seen.add(slot);
      out.push(slot);
    }
  };
  for (let d = 0; d < cols; d++) {
    push(d, d);
    push(d, cols - 1 - d);
    push(cols - 1 - d, d);
    push(cols - 1 - d, cols - 1 - d);
  }
  for (let slot = 1; slot <= cols * cols; slot++) if (!seen.has(slot)) out.push(slot);
  return out;
}

function bloomOrder(cols: number): number[] {
  const centre = (cols - 1) / 2;
  return Array.from({ length: cols * cols }, (_, i) => i + 1).sort((a, b) => {
    const ar = Math.floor((a - 1) / cols);
    const ac = (a - 1) % cols;
    const br = Math.floor((b - 1) / cols);
    const bc = (b - 1) % cols;
    const ad = Math.hypot(ar - centre, ac - centre);
    const bd = Math.hypot(br - centre, bc - centre);
    return ad - bd || a - b;
  });
}

function wipeOrder(cols: number, anchorSlot: number): number[] {
  const ar = Math.floor((anchorSlot - 1) / cols);
  const ac = (anchorSlot - 1) % cols;
  const rowDirection = ar < cols / 2 ? 1 : -1;
  const colDirection = ac < cols / 2 ? 1 : -1;
  return Array.from({ length: cols * cols }, (_, index) => index + 1).sort((a, b) => {
    const ra = Math.floor((a - 1) / cols);
    const ca = (a - 1) % cols;
    const rb = Math.floor((b - 1) / cols);
    const cb = (b - 1) % cols;
    const da = Math.abs(ra - ar) + Math.abs(ca - ac);
    const db = Math.abs(rb - ar) + Math.abs(cb - ac);
    return da - db || (ra - rb) * rowDirection || (ca - cb) * colDirection;
  });
}

function orderFor(motion: ChoreoMotion, cols: number): number[] {
  if (motion === 'snake' || motion === 'roller' || motion === 'wipe' || motion === 'hold') return snakeOrder(cols);
  if (motion === 'wave') return columnWaveOrder(cols);
  if (motion === 'crossfire') return crossfireOrder(cols);
  if (motion === 'bloom') return bloomOrder(cols);
  return orbitOrder(cols);
}

function rotateSlot(slot: number, cols: number, turns: number): number {
  let r = Math.floor((slot - 1) / cols);
  let c = (slot - 1) % cols;
  for (let i = 0; i < mod(turns, 4); i++) [r, c] = [c, cols - 1 - r];
  return r * cols + c + 1;
}

function destinationForFullField(
  sourceSlot: number,
  motion: ChoreoMotion,
  beat: number,
  direction: ChoreoDirection,
  cols: number
): number {
  if (motion === 'hold' || motion === 'wipe' || motion === 'roller') return sourceSlot;
  if (motion === 'pinwheel') return rotateSlot(sourceSlot, cols, beat * direction);

  if (motion === 'wave') {
    const r = Math.floor((sourceSlot - 1) / cols);
    const c = (sourceSlot - 1) % cols;
    const shift = beat * direction * (r % 2 === 0 ? 1 : -1);
    return r * cols + mod(c + shift, cols) + 1;
  }

  const order = orderFor(motion, cols);
  const at = Math.max(0, order.indexOf(sourceSlot));
  const stride = motion === 'bloom' ? 2 : 1;
  return order[mod(at + beat * direction * stride, order.length)];
}

function tileDynamics(
  slot: number,
  previousSlot: number,
  cue: ChoreoCue,
  phase: number,
  beat: number,
  cols: number,
  trailOpacity = 1
): Pick<
  ChoreoTileState,
  'opacity' | 'scale' | 'rotate' | 'rotateX' | 'translateX' | 'translateY' | 'blur' | 'glow'
> {
  if (cue.motion === 'hold') {
    return {
      opacity: trailOpacity,
      scale: 1,
      rotate: 0,
      rotateX: 0,
      translateX: 0,
      translateY: 0,
      blur: 0,
      glow: 0.28 * cue.intensity,
    };
  }

  const r = Math.floor((slot - 1) / cols);
  const c = (slot - 1) % cols;
  const pr = Math.floor((previousSlot - 1) / cols);
  const pc = (previousSlot - 1) % cols;
  const energy = cue.intensity;
  const wave = (Math.sin((r + c) * 1.28 - beat * 0.8 - phase * Math.PI * 2) + 1) / 2;
  const eased = 1 - Math.pow(1 - phase, 3);

  let opacity = trailOpacity;
  let scale = 0.92 + wave * 0.12 * energy;
  let rotate = cue.motion === 'pinwheel' ? (beat * 18 + phase * 18) * cue.direction * energy : 0;
  let rotateX = 0;
  let translateX = 0;
  let translateY = 0;
  let blur = 0;

  if (cue.transition === 'glide') {
    translateX = (pc - c) * 112 * (1 - eased);
    translateY = (pr - r) * 112 * (1 - eased);
    scale *= 0.9 + eased * 0.1;
  } else if (cue.transition === 'dissolve') {
    opacity *= clamp(phase * 3, 0.12, 1);
    blur = (1 - eased) * 7 * energy;
  } else if (cue.transition === 'strobe') {
    opacity *= phase < 0.16 ? 0.25 : phase < 0.34 ? 1 : 0.72 + wave * 0.28;
    scale *= phase < 0.18 ? 1.1 : 1;
  } else if (cue.transition === 'flip') {
    rotateX = -92 * (1 - eased) * cue.direction;
    scale *= 0.94 + eased * 0.06;
    opacity *= clamp(phase * 5, 0.18, 1);
  } else {
    scale *= phase < 0.18 ? 1.12 : 1;
  }

  if (cue.motion === 'wave') scale *= 0.84 + wave * 0.24 * energy;
  if (cue.motion === 'roller') scale *= 0.97 + phase * 0.03;
  if (cue.motion === 'bloom') {
    const centre = (cols - 1) / 2;
    const distance = Math.hypot(r - centre, c - centre) / Math.max(1, centre * Math.SQRT2);
    scale *= 0.88 + distance * 0.17 * energy;
    rotate += (distance - 0.5) * 18 * cue.direction * energy;
  }
  if (cue.motion === 'crossfire') rotate += (c < cols / 2 ? -1 : 1) * 8 * energy;

  return {
    opacity: clamp(opacity, 0, 1),
    scale,
    rotate,
    rotateX,
    translateX,
    translateY,
    blur,
    glow: clamp(0.2 + wave * 0.8 * energy, 0, 1),
  };
}

function nearestCastIndex(slot: number, cue: ChoreoCue, cols: number, assetCount: number): number {
  const r = Math.floor((slot - 1) / cols);
  const c = (slot - 1) % cols;
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < assetCount; index++) {
    const castSlot = cue.castSlots[index] ?? defaultCastSlots(assetCount, cols * cols)[index] ?? 1;
    const cr = Math.floor((castSlot - 1) / cols);
    const cc = (castSlot - 1) % cols;
    const nextDistance = Math.abs(r - cr) + Math.abs(c - cc);
    if (nextDistance < distance) {
      distance = nextDistance;
      nearest = index;
    }
  }
  return nearest;
}

/**
 * Resolve a cue at an arbitrary time. The function is pure, making live output,
 * scrubbing and eventual hardware frame export deterministic.
 */
export function buildChoreoFrame(
  cue: ChoreoCue,
  elapsedMs: number,
  bpm: number,
  cols = 4
): ChoreoFrame {
  const duration = cueDurationMs(cue, bpm);
  const beatMs = 60_000 / clamp(bpm, 20, 240) / clamp(cue.speed, 0.125, 4);
  const absoluteBeat = Math.max(0, elapsedMs) / beatMs;
  const beat = Math.floor(absoluteBeat);
  const phase = absoluteBeat - beat;
  const progress = clamp(elapsedMs / duration, 0, 1);
  const assets = cue.assetUrls.filter(Boolean);
  const fallback = assets[0] ?? '';
  const tiles: ChoreoTileState[] = [];
  const panelCount = cols * cols;
  const order = orderFor(cue.motion, cols);
  const direction = cue.direction;
  const castSlots = normalizeCastSlots(cue.castSlots, assets.length, panelCount);

  if (cue.formation === 'wall' || cue.formation === 'mosaic') {
    const anchor = castSlots[0] ?? 1;
    const revealOrder = cue.motion === 'wipe' ? wipeOrder(cols, anchor) : [];
    const revealCount = Math.max(1, Math.ceil(progress * panelCount));

    for (let sourceIndex = 0; sourceIndex < panelCount; sourceIndex++) {
      const sourceSlot = sourceIndex + 1;
      if (cue.motion === 'wipe' && revealOrder.indexOf(sourceSlot) >= revealCount) continue;

      const sourceRow = Math.floor(sourceIndex / cols);
      const sourceCol = sourceIndex % cols;
      const staggeredBeat = cue.motion === 'roller'
        ? Math.max(0, absoluteBeat - sourceRow * 0.22 - sourceCol * 0.045)
        : absoluteBeat;
      const localBeat = Math.floor(staggeredBeat);
      const localPhase = staggeredBeat - localBeat;
      const slot = destinationForFullField(sourceSlot, cue.motion, localBeat, direction, cols);
      const previousSlot = destinationForFullField(sourceSlot, cue.motion, localBeat - 1, direction, cols);
      const assetIndex = cue.motion === 'roller'
        ? mod(sourceIndex + localBeat * direction - sourceRow, Math.max(1, assets.length))
        : nearestCastIndex(sourceSlot, cue, cols, Math.max(1, assets.length));
      const url = cue.formation === 'mosaic' ? fallback : assets[assetIndex] ?? fallback;
      if (!url) continue;
      tiles.push({
        id: `${cue.id}-piece-${sourceIndex}`,
        slot,
        previousSlot,
        url,
        ...(cue.formation === 'mosaic' ? { cropIndex: sourceIndex, cropCols: cols } : {}),
        ...tileDynamics(slot, previousSlot, cue, localPhase, localBeat, cols),
      });
    }
  } else {
    const cast =
      cue.formation === 'solo'
        ? [fallback]
        : cue.formation === 'trail'
          ? Array.from({ length: Math.round(3 + cue.intensity * 4) }, () => fallback)
          : assets;

    cast.forEach((url, index) => {
      if (!url) return;
      const castAssetIndex = cue.formation === 'trail' ? 0 : index;
      const preferredSlot = castSlots[castAssetIndex] ?? defaultCastSlots(cast.length, panelCount)[castAssetIndex] ?? 1;
      const anchorAt = Math.max(0, order.indexOf(preferredSlot));
      const offset = cue.formation === 'trail' ? -index : 0;
      const moving = cue.motion !== 'hold' && cue.motion !== 'wipe';
      const at = mod(anchorAt + (moving ? beat * direction : 0) + offset, order.length);
      const previousAt = mod(anchorAt + (moving ? (beat - 1) * direction : 0) + offset, order.length);
      const slot = order[at];
      const previousSlot = order[previousAt];
      const trailOpacity = cue.formation === 'trail' ? clamp(1 - index / Math.max(2, cast.length), 0.18, 1) : 1;
      tiles.push({
        id: `${cue.id}-${cue.formation}-${index}`,
        slot,
        previousSlot,
        url,
        ...tileDynamics(slot, previousSlot, cue, phase, beat, cols, trailOpacity),
      });
    });
  }

  return {
    cueId: cue.id,
    beat,
    phase,
    progress,
    transition: cue.transition,
    transitionMs: clamp(cue.transitionMs, 80, 12_000),
    accent: cue.accent,
    tiles,
  };
}

export interface ChoreoShowPreset {
  id: string;
  name: string;
  description: string;
  cues: ChoreoCue[];
  loop?: boolean;
  timeScale?: number;
  bpm?: number;
}

export function buildShowPresets(pool: AdvertAsset[]): ChoreoShowPreset[] {
  const urls = pool.map((asset) => asset.url).filter(Boolean);
  const one = urls.slice(0, 1);
  const cast = urls.slice(0, 4);

  return [
    {
      id: 'stadium-takeover',
      name: 'Stadium takeover',
      description: 'Relay, full ribbon wave, then a re-forming hero mosaic.',
      timeScale: 0.65,
      cues: [
        createChoreoCue(cast, {
          name: 'Perimeter relay',
          motion: 'orbit',
          formation: 'troupe',
          transition: 'glide',
          transitionMs: 1600,
          durationBeats: 8,
          accent: ACCENTS[0],
        }),
        createChoreoCue(cast, {
          name: 'Ribbon wave',
          motion: 'wave',
          formation: 'wall',
          transition: 'dissolve',
          transitionMs: 1800,
          durationBeats: 12,
          speed: 1,
          accent: ACCENTS[1],
        }),
        createChoreoCue(one, {
          name: 'Hero re-form',
          motion: 'pinwheel',
          formation: 'mosaic',
          transition: 'glide',
          transitionMs: 2400,
          direction: -1,
          durationBeats: 12,
          intensity: 0.86,
          accent: ACCENTS[2],
        }),
      ],
    },
    {
      id: 'drone-swarm',
      name: 'Drone swarm',
      description: 'Crossing trails build into a rotating 16-piece formation.',
      timeScale: 0.6,
      cues: [
        createChoreoCue(one, {
          name: 'Launch trails',
          motion: 'crossfire',
          formation: 'trail',
          transition: 'dissolve',
          transitionMs: 1800,
          durationBeats: 8,
          accent: ACCENTS[4],
        }),
        createChoreoCue(cast, {
          name: 'Four-point swarm',
          motion: 'bloom',
          formation: 'troupe',
          transition: 'snap',
          transitionMs: 900,
          durationBeats: 12,
          speed: 1,
          accent: ACCENTS[3],
        }),
        createChoreoCue(one, {
          name: 'Pinwheel lock',
          motion: 'pinwheel',
          formation: 'mosaic',
          transition: 'glide',
          transitionMs: 2600,
          durationBeats: 12,
          accent: ACCENTS[1],
        }),
      ],
    },
    {
      id: 'brand-reveal',
      name: 'Brand reveal',
      description: 'A single image gains echoes, blooms, and resolves wall-wide.',
      timeScale: 0.55,
      cues: [
        createChoreoCue(one, {
          name: 'Solo run',
          motion: 'snake',
          formation: 'solo',
          transition: 'glide',
          transitionMs: 1500,
          durationBeats: 8,
          speed: 1,
          accent: ACCENTS[2],
        }),
        createChoreoCue(one, {
          name: 'Echo build',
          motion: 'orbit',
          formation: 'trail',
          transition: 'dissolve',
          transitionMs: 2200,
          durationBeats: 12,
          intensity: 1,
          accent: ACCENTS[0],
        }),
        createChoreoCue(one, {
          name: 'Brand lockup',
          motion: 'hold',
          formation: 'mosaic',
          transition: 'dissolve',
          transitionMs: 3500,
          durationBeats: 16,
          speed: 0.5,
          accent: ACCENTS[2],
        }),
      ],
    },
    {
      id: 'airport-roller',
      name: 'Airport roller deck',
      description: 'Slow split-flap rows cycle the advert cast, settle, and hold like a departures board.',
      timeScale: 0.45,
      bpm: 96,
      cues: [
        createChoreoCue(cast, {
          name: 'Board populate',
          motion: 'roller',
          formation: 'wall',
          transition: 'flip',
          transitionMs: 2200,
          durationBeats: 16,
          speed: 0.5,
          intensity: 0.68,
          accent: '#ffc107',
        }),
        createChoreoCue(cast, {
          name: 'Gate row roll',
          motion: 'roller',
          formation: 'wall',
          transition: 'flip',
          transitionMs: 3600,
          durationBeats: 24,
          speed: 0.25,
          direction: -1,
          intensity: 0.52,
          accent: '#ff8a1f',
        }),
        createChoreoCue(cast, {
          name: 'Departures hold',
          motion: 'hold',
          formation: 'wall',
          transition: 'dissolve',
          transitionMs: 4800,
          durationBeats: 16,
          speed: 0.25,
          intensity: 0.35,
          accent: '#ffc107',
        }),
      ],
    },
    {
      id: 'corner-wipe-hold',
      name: 'Corner wipe + hold',
      description: 'One hero image progressively wipes from its positioned corner and remains locked on screen.',
      loop: false,
      timeScale: 0.45,
      bpm: 84,
      cues: [
        createChoreoCue(one, {
          name: 'Corner progressive wipe',
          motion: 'wipe',
          formation: 'mosaic',
          transition: 'dissolve',
          transitionMs: 3200,
          durationBeats: 16,
          speed: 0.25,
          castSlots: [1],
          intensity: 0.62,
          accent: ACCENTS[2],
        }),
        createChoreoCue(one, {
          name: 'Hero image hold',
          motion: 'hold',
          formation: 'mosaic',
          transition: 'dissolve',
          transitionMs: 5000,
          durationBeats: 32,
          speed: 0.25,
          castSlots: [1],
          intensity: 0.28,
          accent: ACCENTS[2],
        }),
      ],
    },
  ];
}
