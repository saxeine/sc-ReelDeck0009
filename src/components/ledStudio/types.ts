/* ------------------------------------------------------------------ */
/* LED Studio — main layer (the physical wall)                         */
/* ------------------------------------------------------------------ */

export enum MappingMode {
  Compensated = 'compensated',
  Joined = 'joined',
}

export enum ContentType {
  Sample = 'sample',
  Image = 'image',
  Video = 'video',
}

export interface SimulatorState {
  size: number;
  gap: number;
  mode: MappingMode;
  outlines: boolean;
  playing: boolean;
  contentType: ContentType;
  filename: string;
}

export const GAP_PRESETS: readonly { label: string; value: number }[] = [
  { label: 'No gap', value: 0 },
  { label: '50 mm', value: 50 },
  { label: '100 mm', value: 100 },
  { label: '200 mm', value: 200 },
];

export const DEFAULT_STATE: SimulatorState = {
  size: 500,
  gap: 50,
  mode: MappingMode.Compensated,
  outlines: true,
  playing: true,
  contentType: ContentType.Sample,
  filename: 'Using sample campaign',
};

/** The wall is fixed at 4 × 4 physical panels. */
export const WALL_COLS = 4;
export const WALL_PANELS = WALL_COLS * WALL_COLS;

/* ------------------------------------------------------------------ */
/* Advert engine — the second layer that runs over the LED wall        */
/* ------------------------------------------------------------------ */

export type ToastKind = 'success' | 'info' | 'error';

export interface ToastMsg {
  id: number;
  text: string;
  kind: ToastKind;
}

export type AdvertSource = 'preset' | 'upload' | 'url';

export interface AdvertAsset {
  id: string;
  name: string;
  url: string;
  source: AdvertSource;
}

export interface AdvertMeta {
  url: string;
  width: number;
  height: number;
  aspect: number;
  brightness: number; // 0..1
  hue: number; // 0..360
  sat: number; // 0..1
  color: string; // dominant hex
  failed?: boolean;
}

export type SortMode = 'none' | 'name-asc' | 'name-desc' | 'brightness' | 'hue' | 'size';
export type GroupMode = 'none' | 'tone' | 'color' | 'aspect';

export interface AssetGroup {
  id: string;
  label: string;
  urls: string[];
}

export interface SpreadSlice {
  url: string;
  col: number; // column within the spread bounding box
  row: number;
  cols: number; // bounding-box size
  rows: number;
  filter?: string;
  stretchX: number;
  stretchY: number;
}

export type HoverEffect = 'none' | 'change-image' | 'zoom';

export interface TileLinkConfig {
  url?: string;
  target: '_blank' | '_self';
  hoverEffect: HoverEffect;
  hoverImage?: string;
}

export interface PanelStyle {
  radius?: number;
  borderColor?: string;
  borderWidth?: number;
  tint?: string;
  tintAmount?: number;
  opacity?: number;
  glow?: boolean;
}

/** One slot of the advert layer that sits on top of a physical LED panel. */
export interface AdvertPanel {
  image: string;
  spread: SpreadSlice | null;
  rotation: string[];
  rotationInterval: number; // seconds per frame
  rotating: boolean;
  link: TileLinkConfig;
  style: PanelStyle;
  parallax: boolean;
  tilt: number; // parallax strength multiplier
}

/* ----------------------------- sequencer ---------------------------- */

export type SeqMode = 'loop' | 'pingpong' | 'once';
export type SeqBehavior = 'flash' | 'reveal' | 'step' | 'spin' | 'pulse';
export type PaintTool = 'paint' | 'erase';
export type SeqPattern = 'all' | 'snake' | 'columns' | 'spiral' | 'ring';

/* ---------------------- show choreography -------------------------- */

/** The controller can run the hand-painted route or a multi-scene show. */
export type ControllerMode = 'route' | 'show';

/** Spatial formations inspired by stadium ribbons and drone show controllers. */
export type ChoreoFormation = 'solo' | 'trail' | 'troupe' | 'wall' | 'mosaic';
export type ChoreoMotion =
  | 'orbit'
  | 'snake'
  | 'wave'
  | 'crossfire'
  | 'bloom'
  | 'pinwheel'
  | 'roller'
  | 'wipe'
  | 'hold';
export type ChoreoTransition = 'glide' | 'dissolve' | 'strobe' | 'snap' | 'flip';
export type ChoreoDirection = 1 | -1;

/** One scene on the show timeline. Durations are beat-locked to the show BPM. */
export interface ChoreoCue {
  id: string;
  name: string;
  motion: ChoreoMotion;
  formation: ChoreoFormation;
  transition: ChoreoTransition;
  direction: ChoreoDirection;
  durationBeats: number;
  speed: number;
  intensity: number;
  /** Motion interpolation time. This may intentionally exceed a beat for slow dissolves. */
  transitionMs: number;
  assetUrls: string[];
  /** Start panel for each asset, aligned by index with assetUrls. */
  castSlots: number[];
  accent: string;
}

/** A render instruction produced by the deterministic choreography resolver. */
export interface ChoreoTileState {
  id: string;
  slot: number;
  previousSlot: number;
  url: string;
  opacity: number;
  scale: number;
  rotate: number;
  rotateX: number;
  translateX: number;
  translateY: number;
  blur: number;
  glow: number;
  /** Source panel index when one artwork is carved into a moving 4×4 mosaic. */
  cropIndex?: number;
  cropCols?: number;
}

export interface ChoreoFrame {
  cueId: string;
  beat: number;
  phase: number;
  progress: number;
  transition: ChoreoTransition;
  transitionMs: number;
  accent: string;
  tiles: ChoreoTileState[];
}

/* ------------------------- layer compositing ------------------------ */

export type LayerMode = 'tiles' | 'spotlight';
export type LayerBlend = 'normal' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'multiply';

export interface AdvertLayerSettings {
  /** 0.15 – 1 */
  opacity: number;
  /** mix-blend-mode applied to the advert layer */
  blend: LayerBlend;
  /** tiles = every revealed panel; spotlight = only the travelling panel */
  mode: LayerMode;
  /** card corner radius in px */
  radius: number;
  /** inset of each advert card inside its LED panel, in % */
  inset: number;
  /** draw the drawn-order route over the wall */
  showRoute: boolean;
  /** accent colour for the sequence route, step dots and leader */
  seqColor: string;
  /** pulse the route while the sequence is drawn or live */
  seqFlash: boolean;
  /** dim the LED wall underneath the advert cards so they read clearly */
  dimMain: boolean;
}

export type AdvertTab = 'artwork' | 'spread' | 'frames' | 'style' | 'link';

export interface LayerStateLabel {
  label: string;
  tone: 'standby' | 'air' | 'paused' | 'done';
}
