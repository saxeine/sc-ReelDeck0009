import type { BubbleLayer } from "./components/Bubba1StudioModal";
import type { CanvasState, Layer } from "./components/neo1-app/types";

/** In-session editable project for the most recent studio used on a frame. */
export type StudioProject =
  | { kind: "neo1"; canvas: CanvasState; layers: Layer[] }
  | {
      kind: "bubble";
      baseSrc: string;
      layers: BubbleLayer[];
      displayWidth: number;
      displayHeight: number;
    };

export type ShotType =
  | "EWS"
  | "WS"
  | "MS"
  | "CU"
  | "ECU"
  | "OTS"
  | "POV"
  | "INSERT"
  | "AERIAL";

export type FrameStatus = "draft" | "approved" | "rework";

export interface FrameComment {
  id: string;
  text: string;
  author: string;
  at: number;
}

export interface Frame {
  id: string;
  name: string;
  caption: string;
  src: string;
  w: number;
  h: number;
  shot: ShotType;
  status: FrameStatus;
  duration: number;
  tags: string[];
  comments: FrameComment[];
  annotated: boolean;
  createdAt: number;
  /** Editable source for the most recently saved Neo1 or Bubble composition. */
  studioProject?: StudioProject;
}

/** An in-session snapshot of ReelDeck images sent to the AdShop display. */
export interface AdShopImage {
  id: string;
  name: string;
  src: string;
}

export interface AdShopHandoff {
  images: AdShopImage[];
  /** Where to return after committing the preview. */
  returnTo: "reeldeck" | "adshop";
}

export type RatioKey = "16:9" | "2.39:1" | "4:3" | "1:1" | "9:16" | "source";
export type SheetTheme = "darkroom" | "bone" | "blueprint" | "neon";
export type SheetScope = "all" | "filtered" | "selected";

export interface SheetSettings {
  columns: number;
  ratio: RatioKey;
  fit: "cover" | "contain";
  width: number;
  gutter: number;
  margin: number;
  captionSize: number;
  radius: number;
  theme: SheetTheme;
  accent: string;
  scale: number;
  showNumbers: boolean;
  showNames: boolean;
  showCaptions: boolean;
  showTimecode: boolean;
  showComments: boolean;
  showHeader: boolean;
  showFooter: boolean;
  showSprockets: boolean;
  showGrid: boolean;
  footerText: string;
  scope: SheetScope;
}

export interface Doc {
  title: string;
  logline: string;
  frames: Frame[];
  sheet: SheetSettings;
}

export interface SavedView {
  id: string;
  name: string;
  query: string;
  shot: ShotType | "ALL";
  status: FrameStatus | "ALL";
  sort: SortKey;
  builtin?: boolean;
}

export type SortKey = "sequence" | "name" | "duration" | "status";

export interface Filters {
  query: string;
  shot: ShotType | "ALL";
  status: FrameStatus | "ALL";
  sort: SortKey;
}

export const SHOTS: ShotType[] = [
  "EWS",
  "WS",
  "MS",
  "CU",
  "ECU",
  "OTS",
  "POV",
  "INSERT",
  "AERIAL",
];

export const SHOT_LABEL: Record<ShotType, string> = {
  EWS: "Extreme wide",
  WS: "Wide",
  MS: "Medium",
  CU: "Close-up",
  ECU: "Extreme close-up",
  OTS: "Over the shoulder",
  POV: "Point of view",
  INSERT: "Insert",
  AERIAL: "Aerial",
};

export const STATUS_META: Record<
  FrameStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: "Draft",
    color: "#ffc53d",
    bg: "rgba(255,197,61,0.12)",
    border: "rgba(255,197,61,0.42)",
  },
  approved: {
    label: "Approved",
    color: "#2fd07a",
    bg: "rgba(47,208,122,0.12)",
    border: "rgba(47,208,122,0.42)",
  },
  rework: {
    label: "Rework",
    color: "#ff4438",
    bg: "rgba(255,68,56,0.12)",
    border: "rgba(255,68,56,0.42)",
  },
};

export const DEFAULT_SHEET: SheetSettings = {
  columns: 4,
  ratio: "16:9",
  fit: "cover",
  width: 2400,
  gutter: 22,
  margin: 54,
  captionSize: 20,
  radius: 6,
  theme: "darkroom",
  accent: "#ffab1f",
  scale: 1,
  showNumbers: true,
  showNames: true,
  showCaptions: true,
  showTimecode: true,
  showComments: false,
  showHeader: true,
  showFooter: true,
  showSprockets: true,
  showGrid: false,
  footerText: "REEL DECK · CONTACT SHEET · v1",
  scope: "all",
};
