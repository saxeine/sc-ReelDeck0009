import {
Anchor,
ArrowDown,
ArrowUp,
Check,
CheckSquare,
ChevronLeft,
ChevronRight,
CircleDot,
Copy,
Eye,
EyeOff,
FlipHorizontal,
FlipVertical,
Layers,
Lightbulb,
Lock,
MessageSquare,
Mic,
Move,
Palette,
Plus,
Radio,
Redo2,
RotateCcw,
Scissors,
Sliders,
Sparkles,
Trash2,
Undo2,
Unlock,
X
} from "lucide-react";
import React,{ useCallback,useEffect,useRef,useState } from "react";
import { uiText } from "../hooks/useUIConfig";
import { DIALOGUE_CATEGORIES } from "../utils/suggestiveDialogueData";
import { useSpeechRecognition } from "../utils/useSpeechRecognition";
import { CustomizableButton } from "./CustomizableButton";
import { positionFirstBubble, scaleBubbleLayers, starburstPoints, wrapBubbleText } from "./bubble-studio/geometry";
import { CustomizableLabel } from "./CustomizableLabel";

export interface BubbleLayer {
  id: string;
  name: string;
  type: "speech" | "thought" | "scream" | "narration" | "whisper" | "banner";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorLayerId?: string;
  // Tail Connection Type & Geometry
  tailType: "bezier" | "straight" | "thought_dots" | "none";
  tailX: number; // Tip offset relative to bubble center X
  tailY: number; // Tip offset relative to bubble center Y
  tailBaseX?: number; // Base attachment offset relative to bubble center X
  tailBaseY?: number; // Base attachment offset relative to bubble center Y
  tailBaseWidth: number; // Width of tail attachment base
  tailCurveOffset: number; // Curvature bend offset (-100 to 100)
  tailDotCount: number; // Number of thought dots (2 to 8)
  tailDotScaleRatio: number; // Thought dot size falloff ratio (0.3 to 0.95)
  tailTipRadius: number; // Tip sharpness / roundness
  tailUseCustomColors: boolean; // Custom color override toggle
  tailFillColor: string; // Tail fill override
  tailBorderColor: string; // Tail border override
  // Typography & Style
  fontSize: number;
  fontFamily: string;
  textColor: string;
  textOnly?: boolean;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "dotted";
  padding: number;
  borderRadius: number;
  textAlign: "left" | "center" | "right";
  isBold: boolean;
  isItalic: boolean;
  rotation: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  visible: boolean;
  locked: boolean;
}

export interface BubbleSaveBasis {
  baseSrc: string;
  displayWidth: number;
  displayHeight: number;
}

export interface Bubba1StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  slices?: { name: string; url: string }[];
  characterLayers?: any[];
  initialBubbles?: BubbleLayer[];
  initialBubbleReference?: { width: number; height: number };
  /** Keep the original image and live layers after saving, for continued editing. */
  preserveLayersAfterSave?: boolean;

  currentIndex?: number;
  imageUrl?: string;
  sliceIndex?: number | null;
  sliceName?: string;
  onUpdateSliceUrl?: (index: number, newUrl: string) => void;
  onNavigateFrame?: (newIdx: number) => void;
  onAddFrame?: (newSlice: { name: string; url: string }, layers?: BubbleLayer[]) => void;
  onDeleteFrame?: (index: number) => void;
  onSaveToAssetOrganiser?: (dataUrl: string, sliceIndex?: number | null, sliceName?: string, layers?: BubbleLayer[], basis?: BubbleSaveBasis) => void;
  onResendFrameToCarve?: (url: string, name?: string) => void;
  onResendFrameToCrop?: (url: string) => void;
}

const DEFAULT_PRESETS: Omit<BubbleLayer, "id">[] = [
  {
    name: "Classic Speech",
    type: "speech",
    text: "Hey there! Welcome to Bubba1 Studio.",
    x: 140,
    y: 100,
    width: 240,
    height: 95,
    tailType: "bezier",
    tailX: -40,
    tailY: 85,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 28,
    tailCurveOffset: 15,
    tailDotCount: 3,
    tailDotScaleRatio: 0.65,
    tailTipRadius: 2,
    tailUseCustomColors: false,
    tailFillColor: "#ffffff",
    tailBorderColor: "#0f172a",
    fontSize: 16,
    fontFamily: "Comic Sans MS, cursive, sans-serif",
    textColor: "#0f172a",
    fillColor: "#ffffff",
    borderColor: "#0f172a",
    borderWidth: 3,
    borderStyle: "solid",
    padding: 14,
    borderRadius: 22,
    textAlign: "center",
    isBold: true,
    isItalic: false,
    rotation: 0,
    opacity: 1,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
  {
    name: "Thought Cloud",
    type: "thought",
    text: "Hmm... what happens next?",
    x: 160,
    y: 120,
    width: 220,
    height: 90,
    tailType: "thought_dots",
    tailX: -30,
    tailY: 80,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 22,
    tailCurveOffset: 0,
    tailDotCount: 4,
    tailDotScaleRatio: 0.7,
    tailTipRadius: 0,
    tailUseCustomColors: false,
    tailFillColor: "#f8fafc",
    tailBorderColor: "#6366f1",
    fontSize: 15,
    fontFamily: "sans-serif",
    textColor: "#1e1b4b",
    fillColor: "#f8fafc",
    borderColor: "#6366f1",
    borderWidth: 2.5,
    borderStyle: "solid",
    padding: 12,
    borderRadius: 30,
    textAlign: "center",
    isBold: false,
    isItalic: true,
    rotation: 0,
    opacity: 0.95,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
  {
    name: "Action Burst",
    type: "scream",
    text: "ACTION! BOOM!",
    x: 150,
    y: 110,
    width: 210,
    height: 85,
    tailType: "straight",
    tailX: 0,
    tailY: 75,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 32,
    tailCurveOffset: 20,
    tailDotCount: 3,
    tailDotScaleRatio: 0.65,
    tailTipRadius: 0,
    tailUseCustomColors: false,
    tailFillColor: "#ef4444",
    tailBorderColor: "#fef08a",
    fontSize: 18,
    fontFamily: "Impact, sans-serif",
    textColor: "#ffffff",
    fillColor: "#ef4444",
    borderColor: "#fef08a",
    borderWidth: 3,
    borderStyle: "solid",
    padding: 10,
    borderRadius: 6,
    textAlign: "center",
    isBold: true,
    isItalic: false,
    rotation: -3,
    opacity: 1,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
  {
    name: "Narration Strip",
    type: "narration",
    text: "MEANWHILE IN THE CINEMATIC STUDIO...",
    x: 100,
    y: 40,
    width: 320,
    height: 48,
    tailType: "none",
    tailX: 0,
    tailY: 0,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 0,
    tailCurveOffset: 0,
    tailDotCount: 3,
    tailDotScaleRatio: 0.65,
    tailTipRadius: 0,
    tailUseCustomColors: false,
    tailFillColor: "#0f172a",
    tailBorderColor: "#eab308",
    fontSize: 13,
    fontFamily: "monospace",
    textColor: "#fef08a",
    fillColor: "#0f172a",
    borderColor: "#eab308",
    borderWidth: 2,
    borderStyle: "solid",
    padding: 8,
    borderRadius: 2,
    textAlign: "center",
    isBold: true,
    isItalic: false,
    rotation: 0,
    opacity: 0.9,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
  {
    name: "Secret Whisper",
    type: "whisper",
    text: "(psst... keep this quiet)",
    x: 160,
    y: 120,
    width: 210,
    height: 80,
    tailType: "bezier",
    tailX: 30,
    tailY: 70,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 18,
    tailCurveOffset: -25,
    tailDotCount: 3,
    tailDotScaleRatio: 0.65,
    tailTipRadius: 0,
    tailUseCustomColors: false,
    tailFillColor: "#f1f5f9",
    tailBorderColor: "#94a3b8",
    fontSize: 14,
    fontFamily: "sans-serif",
    textColor: "#334155",
    fillColor: "#f1f5f9",
    borderColor: "#94a3b8",
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 12,
    borderRadius: 18,
    textAlign: "center",
    isBold: false,
    isItalic: true,
    rotation: 0,
    opacity: 0.9,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
  {
    name: "Comic Pop Yellow",
    type: "speech",
    text: "WHAM! THAT WAS AMAZING!",
    x: 150,
    y: 110,
    width: 230,
    height: 90,
    tailType: "bezier",
    tailX: -35,
    tailY: 80,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 30,
    tailCurveOffset: 20,
    tailDotCount: 3,
    tailDotScaleRatio: 0.65,
    tailTipRadius: 0,
    tailUseCustomColors: false,
    tailFillColor: "#fef08a",
    tailBorderColor: "#0f172a",
    fontSize: 16,
    fontFamily: "Impact, sans-serif",
    textColor: "#0f172a",
    fillColor: "#fef08a",
    borderColor: "#0f172a",
    borderWidth: 3.5,
    borderStyle: "solid",
    padding: 12,
    borderRadius: 16,
    textAlign: "center",
    isBold: true,
    isItalic: false,
    rotation: 2,
    opacity: 1,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
  {
    name: "Sky Cyan Cloud",
    type: "thought",
    text: "Floating on cloud nine...",
    x: 170,
    y: 110,
    width: 220,
    height: 85,
    tailType: "thought_dots",
    tailX: 25,
    tailY: 75,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 20,
    tailCurveOffset: 0,
    tailDotCount: 4,
    tailDotScaleRatio: 0.7,
    tailTipRadius: 0,
    tailUseCustomColors: false,
    tailFillColor: "#e0f2fe",
    tailBorderColor: "#0284c7",
    fontSize: 14,
    fontFamily: "sans-serif",
    textColor: "#0369a1",
    fillColor: "#e0f2fe",
    borderColor: "#0284c7",
    borderWidth: 2.5,
    borderStyle: "solid",
    padding: 12,
    borderRadius: 32,
    textAlign: "center",
    isBold: true,
    isItalic: true,
    rotation: 0,
    opacity: 0.95,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
  {
    name: "Dark Neon Whisper",
    type: "whisper",
    text: "System status: Operational.",
    x: 160,
    y: 120,
    width: 240,
    height: 75,
    tailType: "bezier",
    tailX: -20,
    tailY: 70,
    tailBaseX: 0,
    tailBaseY: 0,
    tailBaseWidth: 16,
    tailCurveOffset: -15,
    tailDotCount: 3,
    tailDotScaleRatio: 0.65,
    tailTipRadius: 0,
    tailUseCustomColors: false,
    tailFillColor: "#0f172a",
    tailBorderColor: "#a855f7",
    fontSize: 13,
    fontFamily: "monospace",
    textColor: "#c084fc",
    fillColor: "#0f172a",
    borderColor: "#a855f7",
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 10,
    borderRadius: 14,
    textAlign: "center",
    isBold: true,
    isItalic: false,
    rotation: 0,
    opacity: 0.95,
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
  },
{
    name: "Classic Round",
    type: "speech", text: "Oh really?", x: 160, y: 120, width: 140, height: 100,
    tailType: "bezier", tailX: -30, tailY: 70, tailBaseWidth: 20, tailCurveOffset: 15, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 5,
    tailUseCustomColors: false, tailFillColor: "#ffffff", tailBorderColor: "#000000",
    fontSize: 18, fontFamily: "sans-serif", textColor: "#000000", fillColor: "#ffffff", borderColor: "#000000", borderWidth: 2, borderStyle: "solid",
    padding: 12, borderRadius: 50, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Sticky Note",
    type: "narration", text: "Don't forget!", x: 150, y: 100, width: 180, height: 120,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fef08a", tailBorderColor: "#ca8a04",
    fontSize: 20, fontFamily: "cursive", textColor: "#854d0e", fillColor: "#fef08a", borderColor: "#ca8a04", borderWidth: 1, borderStyle: "solid",
    padding: 15, borderRadius: 0, textAlign: "center", isBold: false, isItalic: true, rotation: 5, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Danger Zone",
    type: "scream", text: "WATCH OUT!", x: 140, y: 120, width: 220, height: 80,
    tailType: "straight", tailX: 40, tailY: 60, tailBaseWidth: 30, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#ef4444", tailBorderColor: "#7f1d1d",
    fontSize: 24, fontFamily: "Impact, sans-serif", textColor: "#ffffff", fillColor: "#ef4444", borderColor: "#7f1d1d", borderWidth: 3, borderStyle: "solid",
    padding: 10, borderRadius: 0, textAlign: "center", isBold: true, isItalic: true, rotation: -3, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Digital Display",
    type: "banner", text: "10:45 AM", x: 160, y: 80, width: 160, height: 60,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#020617", tailBorderColor: "#10b981",
    fontSize: 24, fontFamily: "monospace", textColor: "#10b981", fillColor: "#020617", borderColor: "#10b981", borderWidth: 2, borderStyle: "solid",
    padding: 10, borderRadius: 4, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Soft Cloud",
    type: "thought", text: "I wonder...", x: 160, y: 120, width: 180, height: 110,
    tailType: "thought_dots", tailX: -30, tailY: 80, tailBaseWidth: 15, tailCurveOffset: 0, tailDotCount: 4, tailDotScaleRatio: 0.7, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#f1f5f9", tailBorderColor: "#94a3b8",
    fontSize: 16, fontFamily: "sans-serif", textColor: "#475569", fillColor: "#f1f5f9", borderColor: "#94a3b8", borderWidth: 3, borderStyle: "dotted",
    padding: 15, borderRadius: 40, textAlign: "center", isBold: false, isItalic: true, rotation: 0, opacity: 0.9, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Info Tag",
    type: "narration", text: "Fact: Cats sleep 15h a day.", x: 140, y: 80, width: 240, height: 50,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#dbeafe", tailBorderColor: "#3b82f6",
    fontSize: 14, fontFamily: "sans-serif", textColor: "#1e3a8a", fillColor: "#dbeafe", borderColor: "#3b82f6", borderWidth: 1, borderStyle: "solid",
    padding: 8, borderRadius: 12, textAlign: "left", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Whisper Bubble",
    type: "speech", text: "(don't tell anyone)", x: 160, y: 130, width: 200, height: 70,
    tailType: "bezier", tailX: 20, tailY: 50, tailBaseWidth: 10, tailCurveOffset: -10, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 2,
    tailUseCustomColors: false, tailFillColor: "#ffffff", tailBorderColor: "#cbd5e1",
    fontSize: 14, fontFamily: "serif", textColor: "#64748b", fillColor: "#ffffff", borderColor: "#cbd5e1", borderWidth: 1, borderStyle: "dashed",
    padding: 10, borderRadius: 30, textAlign: "center", isBold: false, isItalic: true, rotation: 0, opacity: 0.8, flipX: false, flipY: false, visible: true, locked: false
  }
];

const PRESETS_P2: Omit<BubbleLayer, "id">[] = [
  {
    name: "Cyberpunk Terminal",
    type: "speech", text: "> SYSTEM READY...", x: 150, y: 110, width: 220, height: 80,
    tailType: "straight", tailX: -20, tailY: 70, tailBaseWidth: 20, tailCurveOffset: 0, tailDotCount: 3, tailDotScaleRatio: 0.65, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#020617", tailBorderColor: "#22d3ee",
    fontSize: 14, fontFamily: "monospace", textColor: "#22d3ee", fillColor: "#020617", borderColor: "#22d3ee", borderWidth: 2, borderStyle: "solid",
    padding: 12, borderRadius: 4, textAlign: "left", isBold: true, isItalic: false, rotation: 0, opacity: 0.9, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Golden Plaque",
    type: "narration", text: "THE GRAND FINALE", x: 160, y: 40, width: 260, height: 50,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fef08a", tailBorderColor: "#b45309",
    fontSize: 16, fontFamily: "Georgia, serif", textColor: "#78350f", fillColor: "#fef08a", borderColor: "#b45309", borderWidth: 4, borderStyle: "solid",
    padding: 10, borderRadius: 8, textAlign: "center", isBold: true, isItalic: true, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Ghostly Wail",
    type: "scream", text: "Wooooo...", x: 160, y: 120, width: 200, height: 90,
    tailType: "bezier", tailX: 30, tailY: 80, tailBaseWidth: 25, tailCurveOffset: -40, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 5,
    tailUseCustomColors: false, tailFillColor: "#f8fafc", tailBorderColor: "#cbd5e1",
    fontSize: 18, fontFamily: "sans-serif", textColor: "#94a3b8", fillColor: "#f8fafc", borderColor: "#cbd5e1", borderWidth: 2, borderStyle: "dotted",
    padding: 12, borderRadius: 40, textAlign: "center", isBold: false, isItalic: true, rotation: 5, opacity: 0.7, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Neon Pink",
    type: "speech", text: "Party time!", x: 150, y: 110, width: 180, height: 80,
    tailType: "bezier", tailX: -25, tailY: 70, tailBaseWidth: 18, tailCurveOffset: 15, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fdf4ff", tailBorderColor: "#f472b6",
    fontSize: 15, fontFamily: "Comic Sans MS, cursive", textColor: "#db2777", fillColor: "#fdf4ff", borderColor: "#f472b6", borderWidth: 3, borderStyle: "solid",
    padding: 10, borderRadius: 16, textAlign: "center", isBold: true, isItalic: false, rotation: -2, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Matrix Code",
    type: "speech", text: "01001101", x: 150, y: 110, width: 200, height: 70,
    tailType: "straight", tailX: 0, tailY: 60, tailBaseWidth: 15, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#064e3b", tailBorderColor: "#10b981",
    fontSize: 14, fontFamily: "monospace", textColor: "#34d399", fillColor: "#064e3b", borderColor: "#10b981", borderWidth: 2, borderStyle: "dashed",
    padding: 10, borderRadius: 0, textAlign: "center", isBold: false, isItalic: false, rotation: 0, opacity: 0.85, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Dreamy Cloud",
    type: "thought", text: "So peaceful...", x: 160, y: 120, width: 220, height: 100,
    tailType: "thought_dots", tailX: -30, tailY: 90, tailBaseWidth: 20, tailCurveOffset: 0, tailDotCount: 5, tailDotScaleRatio: 0.8, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#f3e8ff", tailBorderColor: "#d8b4fe",
    fontSize: 16, fontFamily: "cursive", textColor: "#6b21a8", fillColor: "#f3e8ff", borderColor: "#d8b4fe", borderWidth: 3, borderStyle: "solid",
    padding: 14, borderRadius: 40, textAlign: "center", isBold: false, isItalic: true, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Caution Alert",
    type: "scream", text: "WARNING!!!", x: 150, y: 110, width: 190, height: 80,
    tailType: "straight", tailX: 0, tailY: 70, tailBaseWidth: 25, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fef08a", tailBorderColor: "#ef4444",
    fontSize: 20, fontFamily: "Impact, sans-serif", textColor: "#ef4444", fillColor: "#fef08a", borderColor: "#ef4444", borderWidth: 5, borderStyle: "solid",
    padding: 10, borderRadius: 8, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Retro 8-Bit",
    type: "speech", text: "LEVEL UP!", x: 150, y: 110, width: 180, height: 75,
    tailType: "straight", tailX: -15, tailY: 65, tailBaseWidth: 15, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#2563eb", tailBorderColor: "#ffffff",
    fontSize: 16, fontFamily: "monospace", textColor: "#ffffff", fillColor: "#2563eb", borderColor: "#ffffff", borderWidth: 4, borderStyle: "solid",
    padding: 10, borderRadius: 0, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Vampire Whisper",
    type: "whisper", text: "I thirst...", x: 160, y: 120, width: 180, height: 70,
    tailType: "bezier", tailX: 25, tailY: 60, tailBaseWidth: 15, tailCurveOffset: 20, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#18181b", tailBorderColor: "#7f1d1d",
    fontSize: 14, fontFamily: "Georgia, serif", textColor: "#fca5a5", fillColor: "#18181b", borderColor: "#7f1d1d", borderWidth: 2, borderStyle: "solid",
    padding: 10, borderRadius: 12, textAlign: "center", isBold: false, isItalic: true, rotation: 0, opacity: 0.9, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Minimalist Round",
    type: "speech", text: "Just sayin.", x: 150, y: 110, width: 160, height: 160,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#ffffff", tailBorderColor: "#000000",
    fontSize: 14, fontFamily: "sans-serif", textColor: "#000000", fillColor: "#ffffff", borderColor: "#000000", borderWidth: 1, borderStyle: "solid",
    padding: 16, borderRadius: 80, textAlign: "center", isBold: false, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Typewriter",
    type: "narration", text: "CHAPTER ONE", x: 160, y: 80, width: 200, height: 60,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#f8fafc", tailBorderColor: "#0f172a",
    fontSize: 18, fontFamily: "monospace", textColor: "#0f172a", fillColor: "#f8fafc", borderColor: "#0f172a", borderWidth: 2, borderStyle: "solid",
    padding: 12, borderRadius: 0, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Vampire Bite",
    type: "scream", text: "HISS!", x: 150, y: 120, width: 140, height: 80,
    tailType: "straight", tailX: -30, tailY: 70, tailBaseWidth: 20, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#000000", tailBorderColor: "#dc2626",
    fontSize: 22, fontFamily: "serif", textColor: "#dc2626", fillColor: "#000000", borderColor: "#dc2626", borderWidth: 2, borderStyle: "solid",
    padding: 10, borderRadius: 8, textAlign: "center", isBold: true, isItalic: true, rotation: -4, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Electric Shock",
    type: "speech", text: "ZAAAAP!", x: 140, y: 110, width: 180, height: 80,
    tailType: "bezier", tailX: 10, tailY: 60, tailBaseWidth: 15, tailCurveOffset: 30, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fef08a", tailBorderColor: "#eab308",
    fontSize: 24, fontFamily: "Impact, sans-serif", textColor: "#854d0e", fillColor: "#fef08a", borderColor: "#eab308", borderWidth: 3, borderStyle: "solid",
    padding: 10, borderRadius: 10, textAlign: "center", isBold: true, isItalic: false, rotation: 2, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Gamer Tag",
    type: "banner", text: "Player 1", x: 160, y: 60, width: 140, height: 40,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#3b82f6", tailBorderColor: "#1d4ed8",
    fontSize: 16, fontFamily: "sans-serif", textColor: "#ffffff", fillColor: "#3b82f6", borderColor: "#1d4ed8", borderWidth: 2, borderStyle: "solid",
    padding: 6, borderRadius: 20, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Frost Bite",
    type: "speech", text: "So cold...", x: 150, y: 130, width: 160, height: 80,
    tailType: "bezier", tailX: -20, tailY: 60, tailBaseWidth: 12, tailCurveOffset: -20, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#e0f2fe", tailBorderColor: "#7dd3fc",
    fontSize: 18, fontFamily: "cursive", textColor: "#0284c7", fillColor: "#e0f2fe", borderColor: "#7dd3fc", borderWidth: 2, borderStyle: "solid",
    padding: 12, borderRadius: 20, textAlign: "center", isBold: false, isItalic: true, rotation: 0, opacity: 0.9, flipX: false, flipY: false, visible: true, locked: false
  }

];


const PRESETS_P3: Omit<BubbleLayer, "id">[] = [
  {
    name: "Hacker Text",
    type: "speech", text: "ACCESS GRANTED", x: 150, y: 110, width: 220, height: 70,
    tailType: "straight", tailX: -20, tailY: 60, tailBaseWidth: 15, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#000000", tailBorderColor: "#39ff14",
    fontSize: 14, fontFamily: "monospace", textColor: "#39ff14", fillColor: "#000000", borderColor: "#39ff14", borderWidth: 2, borderStyle: "solid",
    padding: 10, borderRadius: 2, textAlign: "left", isBold: true, isItalic: false, rotation: 0, opacity: 0.9, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Heart Bubble",
    type: "speech", text: "I love this!", x: 160, y: 120, width: 160, height: 120,
    tailType: "bezier", tailX: -20, tailY: 80, tailBaseWidth: 20, tailCurveOffset: 15, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#ffe4e6", tailBorderColor: "#fb7185",
    fontSize: 16, fontFamily: "cursive", textColor: "#be123c", fillColor: "#ffe4e6", borderColor: "#fb7185", borderWidth: 3, borderStyle: "solid",
    padding: 14, borderRadius: 60, textAlign: "center", isBold: true, isItalic: true, rotation: -5, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Caution Strip",
    type: "narration", text: "RESTRICTED AREA", x: 160, y: 40, width: 280, height: 45,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fef08a", tailBorderColor: "#000000",
    fontSize: 14, fontFamily: "Impact, sans-serif", textColor: "#000000", fillColor: "#fef08a", borderColor: "#000000", borderWidth: 4, borderStyle: "dashed",
    padding: 8, borderRadius: 0, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Ice Cold",
    type: "thought", text: "Brrr...", x: 160, y: 120, width: 180, height: 90,
    tailType: "thought_dots", tailX: 20, tailY: 70, tailBaseWidth: 15, tailCurveOffset: 0, tailDotCount: 4, tailDotScaleRatio: 0.7, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#f0fdfa", tailBorderColor: "#2dd4bf",
    fontSize: 15, fontFamily: "sans-serif", textColor: "#0f766e", fillColor: "#f0fdfa", borderColor: "#2dd4bf", borderWidth: 2, borderStyle: "solid",
    padding: 12, borderRadius: 30, textAlign: "center", isBold: true, isItalic: true, rotation: 2, opacity: 0.85, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Molten Lava",
    type: "scream", text: "IT BURNS!", x: 150, y: 110, width: 200, height: 80,
    tailType: "straight", tailX: 0, tailY: 70, tailBaseWidth: 25, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#7f1d1d", tailBorderColor: "#f59e0b",
    fontSize: 18, fontFamily: "Impact, sans-serif", textColor: "#fde68a", fillColor: "#7f1d1d", borderColor: "#f59e0b", borderWidth: 3, borderStyle: "solid",
    padding: 10, borderRadius: 10, textAlign: "center", isBold: true, isItalic: false, rotation: 4, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Golden Ticket",
    type: "banner", text: "WINNER!", x: 160, y: 80, width: 220, height: 60,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fef3c7", tailBorderColor: "#d97706",
    fontSize: 22, fontFamily: "Georgia, serif", textColor: "#92400e", fillColor: "#fef3c7", borderColor: "#d97706", borderWidth: 2, borderStyle: "solid",
    padding: 8, borderRadius: 12, textAlign: "center", isBold: true, isItalic: false, rotation: -2, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Alien Slime",
    type: "speech", text: "Glorg blargh...", x: 150, y: 120, width: 200, height: 90,
    tailType: "bezier", tailX: -25, tailY: 80, tailBaseWidth: 20, tailCurveOffset: 25, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 5,
    tailUseCustomColors: false, tailFillColor: "#dcfce7", tailBorderColor: "#22c55e",
    fontSize: 16, fontFamily: "Comic Sans MS, cursive", textColor: "#166534", fillColor: "#dcfce7", borderColor: "#22c55e", borderWidth: 4, borderStyle: "dotted",
    padding: 14, borderRadius: 25, textAlign: "center", isBold: false, isItalic: true, rotation: 0, opacity: 0.9, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Retro Synthwave",
    type: "speech", text: "V I B E S", x: 150, y: 110, width: 220, height: 75,
    tailType: "straight", tailX: 20, tailY: 65, tailBaseWidth: 15, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#2e1065", tailBorderColor: "#f472b6",
    fontSize: 18, fontFamily: "sans-serif", textColor: "#22d3ee", fillColor: "#2e1065", borderColor: "#f472b6", borderWidth: 3, borderStyle: "solid",
    padding: 10, borderRadius: 8, textAlign: "center", isBold: true, isItalic: true, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Classic Note",
    type: "narration", text: "Note to self: buy milk.", x: 160, y: 60, width: 200, height: 80,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fef9c3", tailBorderColor: "#eab308",
    fontSize: 15, fontFamily: "cursive", textColor: "#854d0e", fillColor: "#fef9c3", borderColor: "#eab308", borderWidth: 1, borderStyle: "solid",
    padding: 12, borderRadius: 2, textAlign: "left", isBold: false, isItalic: false, rotation: 3, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Void Darkness",
    type: "thought", text: "...", x: 160, y: 120, width: 140, height: 80,
    tailType: "thought_dots", tailX: -15, tailY: 70, tailBaseWidth: 15, tailCurveOffset: 0, tailDotCount: 3, tailDotScaleRatio: 0.6, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#020617", tailBorderColor: "#334155",
    fontSize: 20, fontFamily: "monospace", textColor: "#94a3b8", fillColor: "#020617", borderColor: "#334155", borderWidth: 2, borderStyle: "solid",
    padding: 10, borderRadius: 40, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 0.95, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Loud Megaphone",
    type: "scream", text: "ATTENTION ALL!", x: 150, y: 110, width: 240, height: 85,
    tailType: "straight", tailX: 40, tailY: 70, tailBaseWidth: 35, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#ffffff", tailBorderColor: "#000000",
    fontSize: 22, fontFamily: "Impact, sans-serif", textColor: "#000000", fillColor: "#ffffff", borderColor: "#000000", borderWidth: 4, borderStyle: "solid",
    padding: 10, borderRadius: 0, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Pixel Speech",
    type: "speech", text: "Hello, World!", x: 150, y: 110, width: 200, height: 75,
    tailType: "straight", tailX: -20, tailY: 65, tailBaseWidth: 20, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#ffffff", tailBorderColor: "#000000",
    fontSize: 14, fontFamily: "monospace", textColor: "#000000", fillColor: "#ffffff", borderColor: "#000000", borderWidth: 3, borderStyle: "dashed",
    padding: 12, borderRadius: 0, textAlign: "center", isBold: true, isItalic: false, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Neon Blue Whisper",
    type: "whisper", text: "did you hear that?", x: 160, y: 120, width: 200, height: 70,
    tailType: "bezier", tailX: 25, tailY: 60, tailBaseWidth: 15, tailCurveOffset: -10, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#082f49", tailBorderColor: "#38bdf8",
    fontSize: 13, fontFamily: "sans-serif", textColor: "#bae6fd", fillColor: "#082f49", borderColor: "#38bdf8", borderWidth: 1, borderStyle: "solid",
    padding: 10, borderRadius: 20, textAlign: "center", isBold: false, isItalic: true, rotation: 0, opacity: 0.8, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Royal Scroll",
    type: "narration", text: "Hear ye, hear ye!", x: 160, y: 40, width: 240, height: 60,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#fdf8ff", tailBorderColor: "#7e22ce",
    fontSize: 16, fontFamily: "Georgia, serif", textColor: "#4c1d95", fillColor: "#fdf8ff", borderColor: "#7e22ce", borderWidth: 3, borderStyle: "solid",
    padding: 12, borderRadius: 4, textAlign: "center", isBold: true, isItalic: true, rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false
  },
  {
    name: "Floating Banner",
    type: "banner", text: "~ Just Chilling ~", x: 160, y: 80, width: 220, height: 50,
    tailType: "none", tailX: 0, tailY: 0, tailBaseWidth: 0, tailCurveOffset: 0, tailDotCount: 0, tailDotScaleRatio: 0, tailTipRadius: 0,
    tailUseCustomColors: false, tailFillColor: "#ffffff", tailBorderColor: "#94a3b8",
    fontSize: 15, fontFamily: "sans-serif", textColor: "#475569", fillColor: "#ffffff", borderColor: "#94a3b8", borderWidth: 2, borderStyle: "solid",
    padding: 8, borderRadius: 25, textAlign: "center", isBold: false, isItalic: false, rotation: 0, opacity: 0.9, flipX: false, flipY: false, visible: true, locked: false
  }
];



export const Bubba1StudioModal: React.FC<Bubba1StudioModalProps> = ({
  isOpen,
  onClose,
  slices = [],
  currentIndex = 0,
  imageUrl,
  sliceIndex,
  sliceName,
  characterLayers = [],
  initialBubbles,
  initialBubbleReference,
  preserveLayersAfterSave = false,
  onUpdateSliceUrl,
  onNavigateFrame,
  onAddFrame,
  onSaveToAssetOrganiser,
  onResendFrameToCarve,
}) => {
  // Resolve active image & slice info
  const activeIndex = sliceIndex ?? currentIndex;
  const currentSlice = slices[activeIndex] || null;
  const activeImageUrl = imageUrl || currentSlice?.url || "";
  const activeName = sliceName || currentSlice?.name || `Slice #${activeIndex + 1}`;

  const studioImgRef = useRef<HTMLImageElement>(null);
  const positionedInitialBubble = useRef(false);
  const hadInitialBubbles = useRef(Boolean(initialBubbles));
  const imageSizeRef = useRef<{ width: number; height: number } | null>(
    initialBubbleReference?.width && initialBubbleReference?.height ? { ...initialBubbleReference } : null
  );
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Layer state & selection
  const [layers, setLayers] = useState<BubbleLayer[]>(() => {
    if (initialBubbles) return initialBubbles;
    return [
      {
        id: `bubble-${Date.now()}`,
        ...DEFAULT_PRESETS[0],
      },
    ];
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() =>
    layers.length > 0 ? layers[0].id : null
  );

  // ReelDeck mounts a fresh studio for each frame; do not reset layers when
  // the flattened background changes after a save.

  // Undo / Redo History Stack
  const [history, setHistory] = useState<BubbleLayer[][]>(() => [[...layers]]);
  const [historyStep, setHistoryStep] = useState<number>(0);

  const pushHistory = useCallback((newLayers: BubbleLayer[]) => {
    setLayers(newLayers);
    setHistory((prev) => {
      const sliced = prev.slice(0, historyStep + 1);
      return [...sliced, newLayers];
    });
    setHistoryStep((prev) => prev + 1);
  }, [historyStep]);

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setLayers(history[prevStep]);
    }
  }, [historyStep, history]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setLayers(history[nextStep]);
    }
  }, [historyStep, history]);

  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<"bubbles" | "tail" | "transform" | "style" | "layers">("bubbles");
  const [isP1Open, setIsP1Open] = useState(false);
  const [isP2Open, setIsP2Open] = useState(false);
  const [isP3Open, setIsP3Open] = useState(false);
  const [activeBubbaCategory, setActiveBubbaCategory] = useState<string>("action");
  const [showBubbaSuggestions, setShowBubbaSuggestions] = useState(false);

  // Speech Recognition for Bubba1 Studio
  const {
    isListening: isBubbaListening,
    interimTranscript: bubbaInterimTranscript,
    isSupported: isBubbaSpeechSupported,
    startListening: startBubbaListening,
    stopListening: stopBubbaListening,
  } = useSpeechRecognition();

  // Dragging State
  const [dragMode, setDragMode] = useState<"layer" | "tail" | "tailBase" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se" | "resize-e" | "resize-s" | "rotate" | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; startX: number; startY: number; startW?: number; startH?: number; startR?: number; centerX?: number; centerY?: number } | null>(null);

  // The original editor stores geometry in displayed pixels, not image pixels.
  // Re-scale live layers *and every undo state* on window/layout changes so a
  // bubble stays attached to the same point of the source image.
  const syncImageSize = useCallback(() => {
    const image = studioImgRef.current;
    if (!image?.complete || !image.naturalWidth) return;
    const { width, height } = image.getBoundingClientRect();
    if (!width || !height) return;

    if (!positionedInitialBubble.current) {
      positionedInitialBubble.current = true;
      if (!hadInitialBubbles.current) {
        setLayers((current) => positionFirstBubble(current, width, height));
        setHistory((current) => current.map((entry) => positionFirstBubble(entry, width, height)));
      }
    }

    const previous = imageSizeRef.current;
    imageSizeRef.current = { width, height };
    if (!previous) return;
    const sx = width / previous.width;
    const sy = height / previous.height;
    if (Math.abs(sx - 1) < 0.00001 && Math.abs(sy - 1) < 0.00001) return;
    setLayers((current) => scaleBubbleLayers(current, sx, sy));
    setHistory((current) => current.map((entry) => scaleBubbleLayers(entry, sx, sy)));
    // Don't continue a drag with mouse offsets captured at the old scale.
    setDragMode(null);
    setDragStart(null);
  }, []);

  useEffect(() => {
    if (!isOpen || !studioImgRef.current) return;
    const observer = new ResizeObserver(syncImageSize);
    observer.observe(studioImgRef.current);
    syncImageSize();
    return () => observer.disconnect();
  }, [isOpen, syncImageSize]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  // Pointer down handler for layers, tail tip handle, and tail base handle
  const handlePointerDown = (e: React.PointerEvent, layerId: string, mode: "layer" | "tail" | "tailBase" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se" | "resize-e" | "resize-s" | "rotate") => {
    e.stopPropagation();
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.locked || !layer.visible) return;

    setSelectedLayerId(layerId);
    setDragMode(mode);

    if (mode === "layer") {
      setDragStart({ mouseX: e.clientX, mouseY: e.clientY, startX: layer.x, startY: layer.y });
    } else if (mode === "tail") {
      setDragStart({ mouseX: e.clientX, mouseY: e.clientY, startX: layer.tailX, startY: layer.tailY });
    } else if (mode === "tailBase") {
      setDragStart({ mouseX: e.clientX, mouseY: e.clientY, startX: layer.tailBaseX || 0, startY: layer.tailBaseY || 0 });
    } else {
      // Resize or rotate
      const rect = (e.target as HTMLElement).parentElement?.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : 0;
      const centerY = rect ? rect.top + rect.height / 2 : 0;
      setDragStart({
        mouseX: e.clientX, mouseY: e.clientY,
        startX: layer.x, startY: layer.y,
        startW: layer.width, startH: layer.height,
        startR: layer.rotation || 0,
        centerX, centerY
      });
    }
  };

  // Pointer move & pointer up window listeners for smooth dragging
  useEffect(() => {
    if (!dragMode || !dragStart || !selectedLayerId) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStart.mouseX;
      const dy = e.clientY - dragStart.mouseY;

      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== selectedLayerId) return l;
          if (dragMode === "layer") {
            return { ...l, x: Math.round(dragStart.startX + dx), y: Math.round(dragStart.startY + dy) };
          } else if (dragMode === "tail") {
            return {
              ...l,
              tailX: Math.round(dragStart.startX + dx),
              tailY: Math.round(dragStart.startY + dy),
              anchorLayerId: undefined,
            };
          } else if (dragMode === "tailBase") {
            return { ...l, tailBaseX: Math.round(dragStart.startX + dx), tailBaseY: Math.round(dragStart.startY + dy) };
          } else if (dragMode === "rotate") {
            const angle = Math.atan2(e.clientY - (dragStart.centerY || 0), e.clientX - (dragStart.centerX || 0)) * (180 / Math.PI);
            return { ...l, rotation: Math.round(angle + 90) };
          } else if (dragMode.startsWith("resize")) {
             // simplified resizing (just width/height for now, keeping x/y fixed at top left unless we do full transform)
             let newW = dragStart.startW || 0;
             let newH = dragStart.startH || 0;
             let newX = dragStart.startX;
             let newY = dragStart.startY;
             if (dragMode === "resize-se") { newW += dx; newH += dy; }
             if (dragMode === "resize-e") { newW += dx; }
             if (dragMode === "resize-s") { newH += dy; }
             if (dragMode === "resize-nw") { newW -= dx; newH -= dy; newX += dx; newY += dy; }
             if (dragMode === "resize-ne") { newW += dx; newH -= dy; newY += dy; }
             if (dragMode === "resize-sw") { newW -= dx; newH += dy; newX += dx; }
             return { ...l, width: Math.max(50, newW), height: Math.max(20, newH), x: newX, y: newY };
          }
          return l;
        })
      );
    };

    const handlePointerUp = () => {
      setDragMode(null);
      setDragStart(null);
      setLayers((current) => {
        setHistory((prev) => {
          const sliced = prev.slice(0, historyStep + 1);
          return [...sliced, current];
        });
        setHistoryStep((prev) => prev + 1);
        return current;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragMode, dragStart, selectedLayerId, historyStep]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete/Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLayerId) {
          e.preventDefault();
          handleDeleteSelectedLayer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedLayerId]);

  // Helper function to resolve tail coordinates dynamically if anchored to a Neo1 layer
  const resolveTailCoords = useCallback((layer: BubbleLayer) => {
    let tailX = layer.tailX;
    let tailY = layer.tailY;

    if (layer.anchorLayerId && characterLayers && characterLayers.length > 0) {
      const cl = characterLayers.find((l) => l.id === layer.anchorLayerId);
      if (cl) {
        const canvasWidth = 1080;
        const canvasHeight = 1080;
        const clPctX = cl.x / canvasWidth;
        const clPctY = cl.y / canvasHeight;

        const domWidth = studioImgRef.current?.clientWidth || studioImgRef.current?.width || 800;
        const domHeight = studioImgRef.current?.clientHeight || studioImgRef.current?.height || 600;

        const mappedX = clPctX * domWidth;
        const mappedY = clPctY * domHeight;

        const bubbleCenterX = layer.x + layer.width / 2;
        const bubbleCenterY = layer.y + layer.height / 2;

        tailX = mappedX - bubbleCenterX;
        tailY = mappedY - bubbleCenterY;
      }
    }
    return { tailX, tailY };
  }, [characterLayers]);

  // Helper function to draw tail on Canvas 2D
  const drawTail2D = (
    ctx: CanvasRenderingContext2D,
    layer: BubbleLayer,
    scaleX: number,
    scaleY: number
  ) => {
    if (layer.tailType === "none" || layer.textOnly) return;

    const { tailX: resolvedTailX, tailY: resolvedTailY } = resolveTailCoords(layer);

    const lw = layer.width * scaleX;
    const lh = layer.height * scaleY;
    const centerX = lw / 2;
    const centerY = lh / 2;

    const baseX = centerX + (layer.tailBaseX || 0) * scaleX;
    const baseY = centerY + (layer.tailBaseY || 0) * scaleY;

    const tailX = resolvedTailX * scaleX;
    const tailY = resolvedTailY * scaleY;
    const tipX = centerX + tailX;
    const tipY = centerY + tailY;

    const dx = tipX - baseX;
    const dy = tipY - baseY;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;

    const baseW = layer.tailBaseWidth * Math.min(scaleX, scaleY);
    const curveShift = (layer.tailCurveOffset || 0) * Math.min(scaleX, scaleY);

    const fill = layer.tailUseCustomColors && layer.tailFillColor ? layer.tailFillColor : layer.fillColor;
    const stroke = layer.tailUseCustomColors && layer.tailBorderColor ? layer.tailBorderColor : layer.borderColor;
    const strokeW = layer.borderWidth * Math.min(scaleX, scaleY);

    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;

    if (layer.borderStyle === "dashed") ctx.setLineDash([8 * scaleX, 4 * scaleX]);
    else if (layer.borderStyle === "dotted") ctx.setLineDash([3 * scaleX, 3 * scaleX]);
    else ctx.setLineDash([]);

    const b1x = baseX - px * (baseW / 2);
    const b1y = baseY - py * (baseW / 2);
    const b2x = baseX + px * (baseW / 2);
    const b2y = baseY + py * (baseW / 2);

    if (layer.tailType === "thought_dots") {
      const dotCount = layer.tailDotCount || 3;
      const dotScale = layer.tailDotScaleRatio || 0.65;
      const initialRadius = baseW / 2;

      for (let i = 1; i <= dotCount; i++) {
        const ratio = i / (dotCount + 1);
        const dotX = baseX + dx * ratio + px * (Math.sin(i) * curveShift * 0.2);
        const dotY = baseY + dy * ratio + py * (Math.sin(i) * curveShift * 0.2);
        const radius = Math.max(2 * Math.min(scaleX, scaleY), initialRadius * Math.pow(dotScale, i - 1));

        ctx.beginPath();
        ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(b1x, b1y);

      const mx = baseX + dx * 0.5;
      const my = baseY + dy * 0.5;

      if (layer.tailType === "bezier") {
        const ctrlX = mx + px * curveShift;
        const ctrlY = my + py * curveShift;
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, b2x, b2y);
      } else {
        // straight
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(b2x, b2y);
      }

      ctx.closePath();
      ctx.fill();
      if (strokeW > 0) ctx.stroke();
    }

    ctx.restore();
  };

  // Render Canvas Function for Bake & Save
  const renderCanvas = useCallback(async (displayWidth: number, displayHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx || !activeImageUrl) return reject(new Error("Frame image is unavailable."));

      const img = new Image();
      if (activeImageUrl.startsWith("http://") || activeImageUrl.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }

      img.onload = () => {
        try {
        const naturalW = img.naturalWidth || 800;
        const naturalH = img.naturalHeight || 600;
        canvas.width = naturalW;
        canvas.height = naturalH;

        // 1. Draw Background Image at original natural resolution
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Responsive Scale factor relative to actual rendered DOM image dimensions
        const scaleX = canvas.width / displayWidth;
        const scaleY = canvas.height / displayHeight;

        // Composite each bubble as a group. Applying opacity separately to the
        // tail, body and text would darken their overlaps and differ from the
        // single-opacity live preview.
        const foreground = document.createElement("canvas");
        foreground.width = canvas.width;
        foreground.height = canvas.height;
        const layerContext = foreground.getContext("2d");
        if (!layerContext) throw new Error("Canvas is unavailable.");
        const backgroundContext = ctx;
        layers.forEach((layer) => {
          if (!layer.visible) return;
          const ctx = layerContext;
          ctx.clearRect(0, 0, foreground.width, foreground.height);
          ctx.save();

          const lx = layer.x * scaleX;
          const ly = layer.y * scaleY;
          const lw = layer.width * scaleX;
          const lh = layer.height * scaleY;

          ctx.translate(lx + lw / 2, ly + lh / 2);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
          ctx.translate(-(lw / 2), -(lh / 2));

          // Draw Tail First (behind bubble body)
          if (!layer.textOnly) {
            drawTail2D(ctx, layer, scaleX, scaleY);
          }

          // Main Shape Drawing (Skip if textOnly)
          if (!layer.textOnly) {
            ctx.beginPath();
            ctx.fillStyle = layer.fillColor;
            ctx.strokeStyle = layer.borderColor;
            ctx.lineWidth = layer.borderWidth * scaleX;

            if (layer.borderStyle === "dashed") ctx.setLineDash([8 * scaleX, 4 * scaleX]);
            else if (layer.borderStyle === "dotted") ctx.setLineDash([3 * scaleX, 3 * scaleX]);
            else ctx.setLineDash([]);

            if (layer.type === "narration") {
              ctx.rect(0, 0, lw, lh);
            } else if (layer.type === "scream") {
              starburstPoints(lw, lh).forEach(([x, y], index) => {
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.closePath();
            } else {
              // Rounded Rectangle
              const r = layer.borderRadius * Math.min(scaleX, scaleY);
              const radius = Math.max(0, Math.min(r, lw / 2, lh / 2));
              if (typeof ctx.roundRect === "function") {
                ctx.roundRect(0, 0, lw, lh, radius);
              } else {
                ctx.moveTo(radius, 0);
                ctx.lineTo(lw - radius, 0);
                ctx.quadraticCurveTo(lw, 0, lw, radius);
                ctx.lineTo(lw, lh - radius);
                ctx.quadraticCurveTo(lw, lh, lw - radius, lh);
                ctx.lineTo(radius, lh);
                ctx.quadraticCurveTo(0, lh, 0, lh - radius);
                ctx.lineTo(0, radius);
                ctx.quadraticCurveTo(0, 0, radius, 0);
                ctx.closePath();
              }
            }

            ctx.fill();
            if (layer.borderWidth > 0) ctx.stroke();
          }

          // Dialogue Text Rendering
          if (layer.text) {
            ctx.fillStyle = layer.textColor;
            ctx.font = `${layer.isBold ? "bold " : ""}${layer.isItalic ? "italic " : ""}${
              layer.fontSize * scaleX
            }px ${layer.fontFamily}`;
            ctx.textAlign = layer.textAlign;
            ctx.textBaseline = "middle";

            const textInset = (layer.padding + layer.borderWidth) * scaleX;
            const textX =
              layer.textAlign === "left"
                ? textInset
                : layer.textAlign === "right"
                ? lw - textInset
                : lw / 2;
            const textY = lh / 2;

            if (layer.textOnly) {
              ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
              ctx.shadowBlur = 4 * Math.min(scaleX, scaleY);
              ctx.shadowOffsetX = 1 * scaleX;
              ctx.shadowOffsetY = 1 * scaleY;
            } else {
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;
            }

            const maxTextWidth = Math.max(1, lw - textInset * 2);
            const lines = wrapBubbleText(ctx, layer.text, maxTextWidth);
            const lineHeight = layer.fontSize * scaleX * 1.25;
            const startY = textY - ((lines.length - 1) * lineHeight) / 2;
            lines.forEach((lineText, idx) => {
              ctx.fillText(lineText, textX, startY + idx * lineHeight, maxTextWidth);
            });
          }

          ctx.restore();
          backgroundContext.save();
          backgroundContext.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
          backgroundContext.drawImage(foreground, 0, 0);
          backgroundContext.restore();
        });

        const result = canvas.toDataURL("image/png");
        if (!result.startsWith("data:image/png;base64,")) throw new Error("Canvas is too large to export.");
        resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error("Could not load the frame image."));
      img.src = activeImageUrl;
    });
  }, [activeImageUrl, layers]);

  // Helper actions
  const handleAddPreset = (presetIdx: number, list: 'P1' | 'P2' | 'P3' = 'P1') => {
    const preset = list === 'P3' ? (PRESETS_P3[presetIdx] || PRESETS_P3[0]) : list === 'P2' ? (PRESETS_P2[presetIdx] || PRESETS_P2[0]) : (DEFAULT_PRESETS[presetIdx] || DEFAULT_PRESETS[0]);
    const bounds = studioImgRef.current?.getBoundingClientRect();
    const fit = bounds?.width && bounds.height
      ? Math.min(1, Math.max(1, bounds.width - 16) / preset.width, Math.max(1, bounds.height - 16) / preset.height)
      : 1;
    const presetLayer = scaleBubbleLayers([{ ...preset, id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }], fit, fit)[0];
    let nextLayers: BubbleLayer[];
    if (selectedLayerId) {
      // Replace the selected layer while retaining its position and ID.
      nextLayers = layers.map((l) => l.id === selectedLayerId
        ? { ...presetLayer, id: l.id, x: l.x, y: l.y }
        : l);
    } else {
      // Start new bubbles on the visible image, including narrow viewports.
      const width = bounds?.width || 800, height = bounds?.height || 600;
      const offset = (layers.length % 4) * 10;
      const newBubble: BubbleLayer = {
        ...presetLayer,
        x: Math.max(0, Math.min(width - presetLayer.width, (width - presetLayer.width) / 2 + offset)),
        y: Math.max(0, Math.min(height - presetLayer.height, (height - presetLayer.height) / 3 + offset)),
      };
      nextLayers = [...layers, newBubble];
      setSelectedLayerId(newBubble.id);
    }
    pushHistory(nextLayers);
  };

  const updateSelectedLayer = (props: Partial<BubbleLayer>) => {
    if (!selectedLayerId) return;
    const nextLayers = layers.map((l) =>
      l.id === selectedLayerId ? { ...l, ...props } : l
    );
    pushHistory(nextLayers);
  };

  const handleDeleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    const nextLayers = layers.filter((l) => l.id !== selectedLayerId);
    pushHistory(nextLayers);
    setSelectedLayerId(null);
  };

  const handleDuplicateSelectedLayer = () => {
    if (!selectedLayer) return;
    const duplicated: BubbleLayer = {
      ...selectedLayer,
      id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${selectedLayer.name} Copy`,
      x: selectedLayer.x + 25,
      y: selectedLayer.y + 25,
    };
    const nextLayers = [...layers, duplicated];
    pushHistory(nextLayers);
    setSelectedLayerId(duplicated.id);
  };

  const handleMoveLayerOrder = (direction: "up" | "down") => {
    if (!selectedLayerId) return;
    const idx = layers.findIndex((l) => l.id === selectedLayerId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= layers.length) return;

    const nextLayers = [...layers];
    const [moved] = nextLayers.splice(idx, 1);
    nextLayers.splice(newIdx, 0, moved);
    pushHistory(nextLayers);
  };

  // Helper function to render live SVG tail in DOM preview
  const renderTailSvgDOM = (layer: BubbleLayer) => {
    if (layer.tailType === "none") return null;

    const { tailX: resolvedTailX, tailY: resolvedTailY } = resolveTailCoords(layer);

    const lw = layer.width;
    const lh = layer.height;
    const centerX = lw / 2;
    const centerY = lh / 2;

    const baseX = centerX + (layer.tailBaseX || 0);
    const baseY = centerY + (layer.tailBaseY || 0);

    const tailX = resolvedTailX;
    const tailY = resolvedTailY;
    const tipX = centerX + tailX;
    const tipY = centerY + tailY;

    const dx = tipX - baseX;
    const dy = tipY - baseY;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;

    const baseW = layer.tailBaseWidth;
    const curveShift = layer.tailCurveOffset || 0;

    const fill = layer.tailUseCustomColors && layer.tailFillColor ? layer.tailFillColor : layer.fillColor;
    const stroke = layer.tailUseCustomColors && layer.tailBorderColor ? layer.tailBorderColor : layer.borderColor;
    const strokeW = layer.borderWidth;

    const b1x = baseX - px * (baseW / 2);
    const b1y = baseY - py * (baseW / 2);
    const b2x = baseX + px * (baseW / 2);
    const b2y = baseY + py * (baseW / 2);

    if (layer.tailType === "thought_dots") {
      const dotCount = layer.tailDotCount || 3;
      const dotScale = layer.tailDotScaleRatio || 0.65;
      const initialRadius = baseW / 2;
      const dots = [];

      for (let i = 1; i <= dotCount; i++) {
        const ratio = i / (dotCount + 1);
        const dotX = baseX + dx * ratio + px * (Math.sin(i) * curveShift * 0.2);
        const dotY = baseY + dy * ratio + py * (Math.sin(i) * curveShift * 0.2);
        const radius = Math.max(2, initialRadius * Math.pow(dotScale, i - 1));

        dots.push(
          <circle
            key={i}
            cx={dotX}
            cy={dotY}
            r={radius}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
            strokeDasharray={layer.borderStyle === "dashed" ? "8,4" : layer.borderStyle === "dotted" ? "3,3" : undefined}
          />
        );
      }
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
          {dots}
        </svg>
      );
    }

    let d = "";
    const mx = baseX + dx * 0.5;
    const my = baseY + dy * 0.5;

    if (layer.tailType === "bezier") {
      const ctrlX = mx + px * curveShift;
      const ctrlY = my + py * curveShift;
      d = `M ${b1x},${b1y} Q ${ctrlX},${ctrlY} ${tipX},${tipY} Q ${ctrlX},${ctrlY} ${b2x},${b2y} Z`;
    } else {
      // straight
      d = `M ${b1x},${b1y} L ${tipX},${tipY} L ${b2x},${b2y} Z`;
    }

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
        <path
          d={d}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray={layer.borderStyle === "dashed" ? "8,4" : layer.borderStyle === "dotted" ? "3,3" : undefined}
        />
      </svg>
    );
  };

  // Save actions
  const handleSaveToOrganiser = async (createNew: boolean = false): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setIsSaving(true);
    try {
    const displayedImage = studioImgRef.current?.getBoundingClientRect();
    if (!displayedImage?.width || !displayedImage.height) throw new Error("Frame preview is not ready.");
    const basis: BubbleSaveBasis = {
      baseSrc: activeImageUrl,
      displayWidth: displayedImage.width,
      displayHeight: displayedImage.height,
    };
    const bakedDataUrl = await renderCanvas(basis.displayWidth, basis.displayHeight);
    if (!mountedRef.current) return false;
    if (createNew) {
      // Calculate target new index cleanly
      const newSliceIdx = slices.length;
      const nextNum = newSliceIdx + 1;

      // Smart increment name generation
      let newSliceName = `${activeName} (Bubble)`;
      const numMatch = activeName.match(/(.*?)(_|-|\s)?(\d+)(\.[a-zA-Z]+)?$/);
      if (slices.length && numMatch) {
        const prefix = numMatch[1] || "Slice";
        const sep = numMatch[2] || " ";
        const digits = numMatch[3];
        const ext = numMatch[4] || "";
        const nextDigits = String(nextNum).padStart(digits.length, "0");
        newSliceName = `${prefix}${sep}${nextDigits}${ext}`;
      } else if (slices.length) {
        newSliceName = `${activeName} #${nextNum}`;
      }

      if (onAddFrame) {
        onAddFrame({
          name: newSliceName,
          url: bakedDataUrl,
        }, layers);
      } else if (onSaveToAssetOrganiser) {
        onSaveToAssetOrganiser(bakedDataUrl, null, newSliceName, layers, basis);
      }

      if (onNavigateFrame) {
        onNavigateFrame(newSliceIdx);
      }
      setSaveNotice(`Saved as a new ReelDeck frame: ${newSliceName}!`);
      setTimeout(() => setSaveNotice(null), 3000);
    } else {
      if (!preserveLayersAfterSave && onUpdateSliceUrl && activeIndex !== null && activeIndex !== undefined) {
        onUpdateSliceUrl(activeIndex, bakedDataUrl);
      }
      if (onSaveToAssetOrganiser) {
        onSaveToAssetOrganiser(bakedDataUrl, activeIndex, activeName, layers, basis);
      }
      setSaveNotice(`Saved to ReelDeck: ${activeName}!`);
      setTimeout(() => setSaveNotice(null), 3000);

      if (!preserveLayersAfterSave) {
        // Standalone mode swaps in the baked background, so clear the live
        // layers to avoid drawing them twice. ReelDeck keeps the base image
        // and all layers instead, making repeated saves fully editable.
        setLayers([]);
        setSelectedLayerId(null);
        setHistory([[]]);
        setHistoryStep(0);
      }
    }
    return true;
    } catch (error) {
      console.error("Could not save Bubble Studio composition:", error);
      if (mountedRef.current) setSaveNotice("Could not save. Check that the image is accessible.");
      if (mountedRef.current) setTimeout(() => setSaveNotice(null), 5000);
      return false;
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (await handleSaveToOrganiser(false)) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bubble-studio fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col overflow-hidden animate-in fade-in duration-200 text-slate-100">
      {/* Top Header */}
      <header className="bubble-header h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="bubble-header-info flex items-center gap-3">
          <CustomizableButton
            buttonId="bubba1_studio_modal_btn_61"
            defaultIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>}
            onClick={() => setShowSidebar(!showSidebar)}
className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
title={uiText("components_bubba1_studio_modal.button.toggle_sidebar.title", "Toggle Sidebar")}
          />
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 px-3 py-1 rounded-lg shadow-md shadow-indigo-950/50">
            <MessageSquare className="w-4 h-4 text-white animate-pulse" />
            <span className="font-black text-xs tracking-wider text-white">
              {uiText("components_bubba1_studio_modal.span.bubba1", "BUBBLE")}<span className="text-cyan-300 font-light">{uiText("components_bubba1_studio_modal.span.studio", " STUDIO")}</span>
            </span>
          </div>

          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
            {activeName} {slices.length > 0 && activeIndex !== null ? `(#${activeIndex + 1})` : ""}
          </span>

          {saveNotice && (
            <span className="bubble-save-notice text-[11px] font-mono text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/30 px-2.5 py-0.5 rounded animate-fade-in font-bold flex items-center gap-1 shadow-sm">
              ✨ {saveNotice}
            </span>
          )}
          <CustomizableButton
            buttonId="bubble_mobile_close"
            defaultIcon={<X className="w-4 h-4" />}
            onClick={onClose}
            className="bubble-mobile-close p-1.5 text-slate-400 hover:text-white rounded-lg"
            title="Close Bubble Studio"
          />
        </div>

        {/* Slice Navigation */}
        {slices.length > 1 && onNavigateFrame && (
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_60"
              defaultIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => onNavigateFrame(Math.max(0, activeIndex - 1))}
disabled={activeIndex <= 0}
className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.previous_slice.title", "Previous Slice")}
            />
            <span className="text-xs font-mono text-slate-300 px-2">
              {activeIndex + 1} / {slices.length}
            </span>
            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_59"
              defaultIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => onNavigateFrame(Math.min(slices.length - 1, activeIndex + 1))}
disabled={activeIndex >= slices.length - 1}
className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.next_slice.title", "Next Slice")}
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="bubble-header-actions flex items-center gap-2" aria-busy={isSaving}>
          {onResendFrameToCarve && activeImageUrl && (
            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_58"
              defaultIcon={<Scissors className="w-3.5 h-3.5 text-[#10b981]" />}
              onClick={() => onResendFrameToCarve(activeImageUrl, activeName)}
className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.send_slice_to_crop_studio.title", "Send slice to Crop Studio")}
            >
                {() => (
                    <>
                      <span className="hidden sm:inline">{uiText("components_bubba1_studio_modal.span.crop", "Crop")}</span>
                    </>
                  )}
            </CustomizableButton>
          )}

          <CustomizableButton
            buttonId="bubba1_studio_modal_btn_57"
            disabled={isSaving}
            defaultIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => handleSaveToOrganiser(true)}
className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.save_as_a_new_slice_in_asset_organiser.title", "Save as a new ReelDeck frame")}
          >
              {() => (
                  <>
                    <span>{uiText("components_bubba1_studio_modal.span.new_slice", "Save as new")}</span>
                  </>
                )}
          </CustomizableButton>

          <CustomizableButton
            buttonId="bubba1_studio_modal_btn_56"
            disabled={isSaving}
            defaultIcon={<Check className="w-3.5 h-3.5" />}
            onClick={() => handleSaveToOrganiser(false)}
className="px-2.5 py-1 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.save_back_to_active_slice_in_asset_organiser.title", "Save to the current ReelDeck frame")}
          >
              {() => (
                  <>
                    <span>{uiText("components_bubba1_studio_modal.span.save", "Save")}</span>
                  </>
                )}
          </CustomizableButton>

          <CustomizableButton
            buttonId="bubba1_studio_modal_btn_55"
            disabled={isSaving}
            defaultIcon={<CheckSquare className="w-3.5 h-3.5" />}
            onClick={handleSaveAndExit}
className="px-3 py-1 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-extrabold text-xs rounded-lg shadow-lg transition flex items-center gap-1.5 cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.save_back_to_asset_organiser_and_close_bubba.title", "Save to ReelDeck and close Bubble Studio")}
          >
              {() => (
                  <>
                    <span>{uiText("components_bubba1_studio_modal.span.save_and_exit", "Save & Exit")}</span>
                  </>
                )}
          </CustomizableButton>

          <CustomizableButton
            buttonId="bubba1_studio_modal_btn_54"
            defaultIcon={<X className="w-4 h-4" />}
            onClick={onClose}
className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.close_studio.title", "Close Bubble Studio")}
          />
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="bubble-workspace flex-1 flex overflow-hidden">
        {/* Left Studio Sidebar Controls */}
        {showSidebar && (
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 text-[11px] font-bold text-slate-400">
            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_53"
              defaultIcon={<MessageSquare className="w-3.5 h-3.5" />}
              onClick={() => setActiveTab("bubbles")}
className={`flex-1 py-2.5 flex items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
                activeTab === "bubbles"
                  ? "border-purple-500 text-purple-400 bg-slate-800/50"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
                {() => (
                    <>
                      <span>{uiText("components_bubba1_studio_modal.span.presets", "Presets")}</span>
                    </>
                  )}
            </CustomizableButton>

            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_52"
              defaultIcon={<Move className="w-3.5 h-3.5" />}
              onClick={() => setActiveTab("tail")}
className={`flex-1 py-2.5 flex items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
                activeTab === "tail"
                  ? "border-purple-500 text-purple-400 bg-slate-800/50"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
                {() => (
                    <>
                      <span>{uiText("components_bubba1_studio_modal.span.tail", "Tail")}</span>
                    </>
                  )}
            </CustomizableButton>

            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_51"
              defaultIcon={<Sliders className="w-3.5 h-3.5" />}
              onClick={() => setActiveTab("transform")}
className={`flex-1 py-2.5 flex items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
                activeTab === "transform"
                  ? "border-purple-500 text-purple-400 bg-slate-800/50"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
                {() => (
                    <>
                      <span>{uiText("components_bubba1_studio_modal.span.transform", "Transform")}</span>
                    </>
                  )}
            </CustomizableButton>

            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_50"
              defaultIcon={<Palette className="w-3.5 h-3.5" />}
              onClick={() => setActiveTab("style")}
className={`flex-1 py-2.5 flex items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
                activeTab === "style"
                  ? "border-purple-500 text-purple-400 bg-slate-800/50"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
                {() => (
                    <>
                      <span>{uiText("components_bubba1_studio_modal.span.style", "Style")}</span>
                    </>
                  )}
            </CustomizableButton>

            <CustomizableButton
              buttonId="bubba1_studio_modal_btn_49"
              defaultIcon={<Layers className="w-3.5 h-3.5" />}
              onClick={() => setActiveTab("layers")}
className={`flex-1 py-2.5 flex items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
                activeTab === "layers"
                  ? "border-purple-500 text-purple-400 bg-slate-800/50"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
                {() => (
                    <>
                      <span>{uiText("components_bubba1_studio_modal.span.layers", "Layers")}</span>
                    </>
                  )}
            </CustomizableButton>
          </div>

          {/* Panel Contents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
            {/* Presets Tab */}
            {activeTab === "bubbles" && (
              <div className="space-y-4">
                {/* Actions Bar (Undo, Redo, Delete Layer) */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>{uiText("components_bubba1_studio_modal.span.preset_actions", "Preset Actions")}</span>
                    </span>
                    {selectedLayer && (
                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_48"
                        onClick={() => updateSelectedLayer({ textOnly: !selectedLayer.textOnly })}
className={`text-[10px] font-mono px-2 py-1 rounded-full font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          selectedLayer.textOnly
                            ? "bg-purple-600 border border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                            : "bg-purple-950/70 border border-purple-800/60 text-purple-300 hover:bg-purple-900"
                        }`}
title={uiText("components_bubba1_studio_modal.button.toggle_text_only_removes_bubble_and_tail.title", "Toggle Text Only (Removes Bubble and Tail)")}
                      >
                          {() => (
                              <>
                                {selectedLayer.textOnly ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              {uiText("components_bubba1_studio_modal.button.text_only", "Text Only")}
                              </>
                            )}
                      </CustomizableButton>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {/* Undo Button */}
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_47"
                      defaultIcon={<Undo2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      onClick={handleUndo}
disabled={historyStep <= 0}
className="p-2 bg-slate-800/90 hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-slate-800/90 text-slate-200 rounded-lg border border-slate-700/80 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95"
title={uiText("components_bubba1_studio_modal.button.undo_last_change_ctrl_z_cmd_z.title", "Undo last change (Ctrl+Z / Cmd+Z)")}
                    >
                        {() => (
                            <>
                              <span>{uiText("components_bubba1_studio_modal.span.undo", "Undo")}</span>
                            </>
                          )}
                    </CustomizableButton>

                    {/* Redo Button */}
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_46"
                      defaultIcon={<Redo2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      onClick={handleRedo}
disabled={historyStep >= history.length - 1}
className="p-2 bg-slate-800/90 hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-slate-800/90 text-slate-200 rounded-lg border border-slate-700/80 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95"
title={uiText("components_bubba1_studio_modal.button.redo_change_ctrl_y_cmd_shift_z.title", "Redo change (Ctrl+Y / Cmd+Shift+Z)")}
                    >
                        {() => (
                            <>
                              <span>{uiText("components_bubba1_studio_modal.span.redo", "Redo")}</span>
                            </>
                          )}
                    </CustomizableButton>

                    {/* Delete Layer Button */}
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_45"
                      defaultIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      onClick={handleDeleteSelectedLayer}
disabled={!selectedLayerId}
className="p-2 bg-rose-950/70 hover:bg-rose-900/90 disabled:opacity-30 disabled:hover:bg-rose-950/70 border border-rose-800/70 text-rose-200 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95"
title={uiText("components_bubba1_studio_modal.button.delete_selected_layer_del_backspace.title", "Delete selected layer (Del / Backspace)")}
                    >
                        {() => (
                            <>
                              <span>{uiText("components_bubba1_studio_modal.span.delete", "Delete")}</span>
                            </>
                          )}
                    </CustomizableButton>
                  </div>
                </div>

                {/* Preset Selection List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {selectedLayer ? "Replace Layer:" : "Add New Preset:"}
                    </span>
                  </div>

                  {/* P1 Accordion */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_44"
                      onClick={() => setIsP1Open(!isP1Open)}
className="w-full bg-slate-900 px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                    >
                        {() => (
                            <>
                              <span>{uiText("components_bubba1_studio_modal.span.p1_standard_presets", "P1: Standard Presets")}</span>
                            {isP1Open ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                            </>
                          )}
                    </CustomizableButton>
                    {isP1Open && (
                      <div className="p-2 grid grid-cols-1 gap-1.5 bg-slate-950/50">
                        {DEFAULT_PRESETS.map((p, idx) => (
                          <CustomizableButton
                            buttonId="bubba1_studio_modal_btn_43"
                            key={p.name}
onClick={() => handleAddPreset(idx, 'P1')}
className="p-1.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-purple-500 rounded-lg flex items-center gap-2 transition text-left cursor-pointer group"
                          >
                              {() => (
                                  <>
                                    <div className="p-1.5 bg-purple-950/60 border border-purple-800/50 rounded-md shrink-0 group-hover:scale-110 transition-transform">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            </div>
                                  <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-slate-200 flex items-center justify-between">
                                <span>{p.name}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 line-clamp-1">{p.text}</div>
                            </div>
                                  </>
                                )}
                          </CustomizableButton>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* P2 Accordion */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_42"
                      onClick={() => setIsP2Open(!isP2Open)}
className="w-full bg-slate-900 px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                    >
                        {() => (
                            <>
                              <span>{uiText("components_bubba1_studio_modal.span.p2_extended_presets", "P2: Extended Presets")}</span>
                            {isP2Open ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                            </>
                          )}
                    </CustomizableButton>
                    {isP2Open && (
                      <div className="p-2 grid grid-cols-1 gap-1.5 bg-slate-950/50">
                        {PRESETS_P2.map((p, idx) => (
                          <CustomizableButton
                            buttonId="bubba1_studio_modal_btn_41"
                            key={p.name}
onClick={() => handleAddPreset(idx, 'P2')}
className="p-1.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-purple-500 rounded-lg flex items-center gap-2 transition text-left cursor-pointer group"
                          >
                              {() => (
                                  <>
                                    <div className="p-1.5 bg-purple-950/60 border border-purple-800/50 rounded-md shrink-0 group-hover:scale-110 transition-transform">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            </div>
                                  <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-slate-200 flex items-center justify-between">
                                <span>{p.name}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 line-clamp-1">{p.text}</div>
                            </div>
                                  </>
                                )}
                          </CustomizableButton>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* P3 Accordion */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_40"
                      onClick={() => setIsP3Open(!isP3Open)}
className="w-full bg-slate-900 px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                    >
                        {() => (
                            <>
                              <span>{uiText("components_bubba1_studio_modal.span.p3_creative_extras", "P3: Creative Extras")}</span>
                            {isP3Open ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                            </>
                          )}
                    </CustomizableButton>
                    {isP3Open && (
                      <div className="p-2 grid grid-cols-1 gap-1.5 bg-slate-950/50">
                        {PRESETS_P3.map((p, idx) => (
                          <CustomizableButton
                            buttonId="bubba1_studio_modal_btn_39"
                            key={p.name}
onClick={() => handleAddPreset(idx, 'P3')}
className="p-1.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-purple-500 rounded-lg flex items-center gap-2 transition text-left cursor-pointer group"
                          >
                              {() => (
                                  <>
                                    <div className="p-1.5 bg-purple-950/60 border border-purple-800/50 rounded-md shrink-0 group-hover:scale-110 transition-transform">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            </div>
                                  <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-slate-200 flex items-center justify-between">
                                <span>{p.name}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 line-clamp-1">{p.text}</div>
                            </div>
                                  </>
                                )}
                          </CustomizableButton>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tail Transformation Panel */}
            {activeTab === "tail" && (
              <div className="space-y-4 text-xs">
                {selectedLayer ? (
                  <>
                    {/* Tail Type Selection Grid */}
                    <div className="space-y-1.5">
                      <CustomizableLabel
                        labelId="bubba1_studio_modal_item_38"
                        as="label"
                        className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block"
                      >
                          {() => (
                              <>
                                {uiText("components_bubba1_studio_modal.label.tail_connection_type", "Tail Connection Type")}
                              </>
                            )}
                      </CustomizableLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                        <CustomizableButton
                          buttonId="bubba1_studio_modal_btn_37"
                          defaultIcon={<Move className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          onClick={() => updateSelectedLayer({ tailType: "bezier" })}
className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                            selectedLayer.tailType === "bezier"
                              ? "bg-purple-950/70 border-purple-500 text-purple-200 font-bold"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                          }`}
                        >
                            {() => (
                                <>
                                  <span className="text-[11px]">{uiText("components_bubba1_studio_modal.span.curved_bezier", "Curved Bezier")}</span>
                                </>
                              )}
                        </CustomizableButton>

                        <CustomizableButton
                          buttonId="bubba1_studio_modal_btn_36"
                          defaultIcon={<Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          onClick={() => updateSelectedLayer({ tailType: "straight" })}
className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                            selectedLayer.tailType === "straight"
                              ? "bg-purple-950/70 border-purple-500 text-purple-200 font-bold"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                          }`}
                        >
                            {() => (
                                <>
                                  <span className="text-[11px]">{uiText("components_bubba1_studio_modal.span.straight_cone", "Straight Cone")}</span>
                                </>
                              )}
                        </CustomizableButton>

                        <CustomizableButton
                          buttonId="bubba1_studio_modal_btn_35"
                          defaultIcon={<CircleDot className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          onClick={() => updateSelectedLayer({ tailType: "thought_dots" })}
className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                            selectedLayer.tailType === "thought_dots"
                              ? "bg-purple-950/70 border-purple-500 text-purple-200 font-bold"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                          }`}
                        >
                            {() => (
                                <>
                                  <span className="text-[11px]">{uiText("components_bubba1_studio_modal.span.thought_dots", "Thought Dots")}</span>
                                </>
                              )}
                        </CustomizableButton>

                        <CustomizableButton
                          buttonId="bubba1_studio_modal_btn_34"
                          defaultIcon={<X className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          onClick={() => updateSelectedLayer({ tailType: "none" })}
className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                            selectedLayer.tailType === "none"
                              ? "bg-rose-950/70 border-rose-500 text-rose-200 font-bold"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                          }`}
                        >
                            {() => (
                                <>
                                  <span className="text-[11px]">{uiText("components_bubba1_studio_modal.span.no_tail", "No Tail")}</span>
                                </>
                              )}
                        </CustomizableButton>
                      </div>
                    </div>

                    {selectedLayer.tailType !== "none" && (
                      <div className="space-y-3.5 pt-2 border-t border-slate-800">
                        {/* Vector Anchor dropdown selection */}
                        <div className="space-y-1.5 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                          <CustomizableLabel
                            labelId="bubba1_studio_modal_item_33"
                            defaultIcon={<Anchor className="w-3.5 h-3.5 text-cyan-400" />}
                            as="label"
                            className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5"
                          >
                              {() => (
                                  <>
                                    <span>{uiText("components_bubba1_studio_modal.span.vector_anchor_layer", "Vector Anchor Layer")}</span>
                                  </>
                                )}
                          </CustomizableLabel>
                          <select
                            value={selectedLayer.anchorLayerId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateSelectedLayer({ anchorLayerId: val || undefined });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                          >
                            <option value="">{uiText("components_bubba1_studio_modal.option.no_anchor_manual_tail", "-- No Anchor (Manual Tail) --")}</option>
                            {characterLayers.map((cl) => (
                              <option key={cl.id} value={cl.id}>
                                {cl.name || `${cl.type === "text" ? "Text" : "Image"} Layer`} ({cl.id.slice(-4)})
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-400 leading-relaxed italic">
                            {uiText("components_bubba1_studio_modal.p.connecting_tail_to_neo_1_layers_dynamically", "Connecting tail to Neo-1 layers dynamically: moving characters automatically updates bubble tails.")}
                          </p>
                        </div>

                        {/* Tail Base Attachment Position */}
                        <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
                              {uiText("components_bubba1_studio_modal.span.base_attachment_position", "Base Attachment Position")}
                            </span>
                            <CustomizableButton
                              buttonId="bubba1_studio_modal_btn_32"
                              defaultIcon={<RotateCcw className="w-3 h-3 text-cyan-400" />}
                              onClick={() => updateSelectedLayer({ tailBaseX: 0, tailBaseY: 0 })}
className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.center_base_position.title", "Center Base Position")}
                            >
                                {() => (
                                    <>
                                      <span>{uiText("components_bubba1_studio_modal.span.center_base", "Center Base")}</span>
                                    </>
                                  )}
                            </CustomizableButton>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-300 text-[10px]">
                                <span>{uiText("components_bubba1_studio_modal.span.base_offset_x", "Base Offset X")}</span>
                                <span className="font-mono text-cyan-400">{selectedLayer.tailBaseX || 0}{uiText("components_bubba1_studio_modal.span.px", "px")}</span>
                              </div>
                              <input
                                type="range"
                                min={-200}
                                max={200}
                                value={selectedLayer.tailBaseX || 0}
                                onChange={(e) => updateSelectedLayer({ tailBaseX: Number(e.target.value) })}
                                className="w-full accent-cyan-400 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-300 text-[10px]">
                                <span>{uiText("components_bubba1_studio_modal.span.base_offset_y", "Base Offset Y")}</span>
                                <span className="font-mono text-cyan-400">{selectedLayer.tailBaseY || 0}{uiText("components_bubba1_studio_modal.span.px_2", "px")}</span>
                              </div>
                              <input
                                type="range"
                                min={-200}
                                max={200}
                                value={selectedLayer.tailBaseY || 0}
                                onChange={(e) => updateSelectedLayer({ tailBaseY: Number(e.target.value) })}
                                className="w-full accent-cyan-400 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tail Base Width */}
                        <div className="space-y-1">
                          <div className="flex justify-between font-bold text-slate-300">
                            <span>{uiText("components_bubba1_studio_modal.span.tail_attachment_base_width", "Tail Attachment Base Width")}</span>
                            <span className="font-mono text-purple-400">{selectedLayer.tailBaseWidth}{uiText("components_bubba1_studio_modal.span.px_3", "px")}</span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={100}
                            value={selectedLayer.tailBaseWidth}
                            onChange={(e) => updateSelectedLayer({ tailBaseWidth: Number(e.target.value) })}
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                        </div>

                        {/* Tail Curvature / Bend Offset */}
                        {selectedLayer.tailType === "bezier" && (
                          <div className="space-y-1">
                            <div className="flex justify-between font-bold text-slate-300">
                              <span>{uiText("components_bubba1_studio_modal.span.tail_curvature_bend_angle", "Tail Curvature / Bend Angle")}</span>
                              <span className="font-mono text-purple-400">{selectedLayer.tailCurveOffset || 0}</span>
                            </div>
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              value={selectedLayer.tailCurveOffset || 0}
                              onChange={(e) => updateSelectedLayer({ tailCurveOffset: Number(e.target.value) })}
                              className="w-full accent-purple-500 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Thought Dots Settings */}
                        {selectedLayer.tailType === "thought_dots" && (
                          <>
                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-300">
                                <span>{uiText("components_bubba1_studio_modal.span.thought_dot_count", "Thought Dot Count")}</span>
                                <span className="font-mono text-purple-400">{selectedLayer.tailDotCount || 3}</span>
                              </div>
                              <input
                                type="range"
                                min={2}
                                max={8}
                                value={selectedLayer.tailDotCount || 3}
                                onChange={(e) => updateSelectedLayer({ tailDotCount: Number(e.target.value) })}
                                className="w-full accent-purple-500 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-300">
                                <span>{uiText("components_bubba1_studio_modal.span.dot_size_falloff_ratio", "Dot Size Falloff Ratio")}</span>
                                <span className="font-mono text-purple-400">
                                  {Math.round((selectedLayer.tailDotScaleRatio || 0.65) * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0.3}
                                max={0.95}
                                step={0.05}
                                value={selectedLayer.tailDotScaleRatio || 0.65}
                                onChange={(e) => updateSelectedLayer({ tailDotScaleRatio: Number(e.target.value) })}
                                className="w-full accent-purple-500 cursor-pointer"
                              />
                            </div>
                          </>
                        )}

                        {/* Tail Tip Offset Sliders */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="space-y-1">
                            <div className="flex justify-between font-bold text-slate-300 text-[10px]">
                              <span>{uiText("components_bubba1_studio_modal.span.tip_offset_x", "Tip Offset X")}</span>
                              <span className="font-mono text-purple-400">{selectedLayer.tailX}{uiText("components_bubba1_studio_modal.span.px_4", "px")}</span>
                            </div>
                            <input
                              type="range"
                              min={-300}
                              max={300}
                              value={selectedLayer.tailX}
                              onChange={(e) => updateSelectedLayer({ tailX: Number(e.target.value) })}
                              className="w-full accent-purple-500 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between font-bold text-slate-300 text-[10px]">
                              <span>{uiText("components_bubba1_studio_modal.span.tip_offset_y", "Tip Offset Y")}</span>
                              <span className="font-mono text-purple-400">{selectedLayer.tailY}{uiText("components_bubba1_studio_modal.span.px_5", "px")}</span>
                            </div>
                            <input
                              type="range"
                              min={-300}
                              max={300}
                              value={selectedLayer.tailY}
                              onChange={(e) => updateSelectedLayer({ tailY: Number(e.target.value) })}
                              className="w-full accent-purple-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Tail Custom Colors Toggle & Pickers */}
                        <div className="pt-3 border-t border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300">{uiText("components_bubba1_studio_modal.span.custom_tail_color_override", "Custom Tail Color Override")}</span>
                            <CustomizableButton
                              buttonId="bubba1_studio_modal_btn_31"
                              onClick={() =>
                                updateSelectedLayer({ tailUseCustomColors: !selectedLayer.tailUseCustomColors })
                              }
className={`w-9 h-5 rounded-full transition p-0.5 cursor-pointer ${
                                selectedLayer.tailUseCustomColors ? "bg-purple-600" : "bg-slate-700"
                              }`}
                            >
                                {() => (
                                    <>
                                      <div
                                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                  selectedLayer.tailUseCustomColors ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                                    </>
                                  )}
                            </CustomizableButton>
                          </div>

                          {selectedLayer.tailUseCustomColors && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div className="space-y-1">
                                <CustomizableLabel
                                  labelId="bubba1_studio_modal_item_30"
                                  as="label"
                                  className="font-bold text-slate-400 text-[10px]"
                                >
                                    {() => (
                                        <>
                                          {uiText("components_bubba1_studio_modal.label.tail_fill_color", "Tail Fill Color")}
                                        </>
                                      )}
                                </CustomizableLabel>
                                <input
                                  type="color"
                                  value={selectedLayer.tailFillColor || selectedLayer.fillColor}
                                  onChange={(e) => updateSelectedLayer({ tailFillColor: e.target.value })}
                                  className="w-full h-7 bg-slate-950 rounded cursor-pointer border border-slate-700 p-0.5"
                                />
                              </div>
                              <div className="space-y-1">
                                <CustomizableLabel
                                  labelId="bubba1_studio_modal_item_29"
                                  as="label"
                                  className="font-bold text-slate-400 text-[10px]"
                                >
                                    {() => (
                                        <>
                                          {uiText("components_bubba1_studio_modal.label.tail_border_color", "Tail Border Color")}
                                        </>
                                      )}
                                </CustomizableLabel>
                                <input
                                  type="color"
                                  value={selectedLayer.tailBorderColor || selectedLayer.borderColor}
                                  onChange={(e) => updateSelectedLayer({ tailBorderColor: e.target.value })}
                                  className="w-full h-7 bg-slate-950 rounded cursor-pointer border border-slate-700 p-0.5"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-medium">{uiText("components_bubba1_studio_modal.div.select_a_bubble_on_canvas_to_edit_tail_prope", "Select a bubble on canvas to edit tail properties")}</div>
                )}
              </div>
            )}

            {/* Transform Panel */}
            {activeTab === "transform" && (
              <div className="space-y-4 text-xs">
                {selectedLayer ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_28"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.position_x", "Position X")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="number"
                          value={selectedLayer.x}
                          onChange={(e) => updateSelectedLayer({ x: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_27"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.position_y", "Position Y")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="number"
                          value={selectedLayer.y}
                          onChange={(e) => updateSelectedLayer({ y: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_26"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.width", "Width (")}
                                {selectedLayer.width}
                                {uiText("components_bubba1_studio_modal.label.px", "px)")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="range"
                          min={80}
                          max={500}
                          value={selectedLayer.width}
                          onChange={(e) => updateSelectedLayer({ width: Number(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_25"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.height", "Height (")}
                                {selectedLayer.height}
                                {uiText("components_bubba1_studio_modal.label.px_2", "px)")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="range"
                          min={40}
                          max={300}
                          value={selectedLayer.height}
                          onChange={(e) => updateSelectedLayer({ height: Number(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-300">
                        <span>{uiText("components_bubba1_studio_modal.span.rotation_angle", "Rotation Angle")}</span>
                        <span className="font-mono text-purple-400">{selectedLayer.rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={selectedLayer.rotation}
                        onChange={(e) => updateSelectedLayer({ rotation: Number(e.target.value) })}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-300">
                        <span>{uiText("components_bubba1_studio_modal.span.opacity", "Opacity")}</span>
                        <span className="font-mono text-purple-400">{Math.round(selectedLayer.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={selectedLayer.opacity}
                        onChange={(e) => updateSelectedLayer({ opacity: Number(e.target.value) })}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_24"
                        defaultIcon={<FlipHorizontal className="w-3.5 h-3.5" />}
                        onClick={() => updateSelectedLayer({ flipX: !selectedLayer.flipX })}
className={`flex-1 py-1.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          selectedLayer.flipX
                            ? "bg-purple-950/60 border-purple-500 text-purple-300"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                        }`}
                      >
                          {() => (
                              <>
                                <span>{uiText("components_bubba1_studio_modal.span.flip_h", "Flip H")}</span>
                              </>
                            )}
                      </CustomizableButton>

                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_23"
                        defaultIcon={<FlipVertical className="w-3.5 h-3.5" />}
                        onClick={() => updateSelectedLayer({ flipY: !selectedLayer.flipY })}
className={`flex-1 py-1.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          selectedLayer.flipY
                            ? "bg-purple-950/60 border-purple-500 text-purple-300"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                        }`}
                      >
                          {() => (
                              <>
                                <span>{uiText("components_bubba1_studio_modal.span.flip_v", "Flip V")}</span>
                              </>
                            )}
                      </CustomizableButton>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_22"
                        defaultIcon={<Copy className="w-3.5 h-3.5" />}
                        onClick={handleDuplicateSelectedLayer}
className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                          {() => (
                              <>
                                <span>{uiText("components_bubba1_studio_modal.span.duplicate", "Duplicate")}</span>
                              </>
                            )}
                      </CustomizableButton>

                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_21"
                        defaultIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={handleDeleteSelectedLayer}
className="flex-1 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-900/50 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                          {() => (
                              <>
                                <span>{uiText("components_bubba1_studio_modal.span.delete_2", "Delete")}</span>
                              </>
                            )}
                      </CustomizableButton>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-medium">{uiText("components_bubba1_studio_modal.div.select_a_bubble_on_canvas_to_transform", "Select a bubble on canvas to transform")}</div>
                )}
              </div>
            )}

            {/* Style Panel */}
            {activeTab === "style" && (
              <div className="space-y-4 text-xs">
                {selectedLayer ? (
                  <>
                    {/* Dialogue Text with Mic Input & Suggestive Text */}
                    <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_20"
                          defaultIcon={<MessageSquare className="w-3.5 h-3.5 text-purple-400" />}
                          as="label"
                          className="font-bold text-slate-300 flex items-center gap-1.5"
                        >
                            {() => (
                                <>
                                  <span>{uiText("components_bubba1_studio_modal.span.dialogue_text", "Dialogue Text")}</span>
                                </>
                              )}
                        </CustomizableLabel>
                        <div className="flex items-center gap-1.5">
                          {/* Mic Voice Dictation Button */}
                          <CustomizableButton
                            buttonId="bubba1_studio_modal_btn_19"
                            defaultIcon={<Mic className="w-3 h-3" />}
                            type="button"
                            disabled={!isBubbaSpeechSupported}
onClick={() => {
                              if (isBubbaListening) {
                                stopBubbaListening();
                              } else {
                                startBubbaListening((transcript) => {
                                  if (selectedLayer) {
                                    updateSelectedLayer({
                                      text: selectedLayer.text ? `${selectedLayer.text} ${transcript}` : transcript,
                                    });
                                  }
                                });
                              }
                            }}
className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer ${
                              isBubbaListening
                                ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-900/60"
                                : "bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-800/60"
                            }`}
title={!isBubbaSpeechSupported ? "Voice dictation is not supported in this browser" : isBubbaListening ? "Stop voice dictation" : "Voice dictation with microphone"}
                          >
                              {() => (
                                  <>
                                    <span>{isBubbaListening ? "Listening..." : "Mic Dictate"}</span>
                                  </>
                                )}
                          </CustomizableButton>

                          {/* Quick AI Smart Random Prompt */}
                          <CustomizableButton
                            buttonId="bubba1_studio_modal_btn_18"
                            defaultIcon={<Sparkles className="w-3 h-3 text-amber-400" />}
                            type="button"
onClick={() => {
                              const category = DIALOGUE_CATEGORIES[Math.floor(Math.random() * DIALOGUE_CATEGORIES.length)];
                              const item = category.items[Math.floor(Math.random() * category.items.length)];
                              updateSelectedLayer({ text: item.text });
                            }}
className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.generate_random_contextual_dialogue.title", "Generate random contextual dialogue")}
                          >
                              {() => (
                                  <>
                                    <span>{uiText("components_bubba1_studio_modal.span.magic", "Magic")}</span>
                                  </>
                                )}
                          </CustomizableButton>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          value={selectedLayer.text}
                          onChange={(e) => updateSelectedLayer({ text: e.target.value })}
                          rows={3}
                          className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-100 text-xs focus:outline-none resize-none font-sans transition ${
                            isBubbaListening
                              ? "border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)] ring-1 ring-rose-500"
                              : "border-slate-700 focus:border-purple-500"
                          }`}
                          placeholder={uiText("components_bubba1_studio_modal.textarea.enter_speech_or_click_mic_dictate_to_speak.placeholder", "Enter speech or click 'Mic Dictate' to speak...")}
                        />
                        {isBubbaListening && bubbaInterimTranscript && (
                          <div className="text-[10px] text-rose-300 italic px-1 pt-0.5 flex items-center gap-1">
                            <Radio className="w-2.5 h-2.5 animate-pulse text-rose-400" />
                            <span>{uiText("components_bubba1_studio_modal.span.hearing", "Hearing: \"")}{bubbaInterimTranscript}"</span>
                          </div>
                        )}
                      </div>

                      {/* Suggestive Dialogue Quick Expand Toggle */}
                      <div className="pt-1">
                        <CustomizableButton
                          buttonId="bubba1_studio_modal_btn_17"
                          type="button"
onClick={() => setShowBubbaSuggestions(!showBubbaSuggestions)}
className="w-full text-left text-[10.5px] font-bold text-slate-400 hover:text-slate-200 flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/60 border border-slate-800/80 cursor-pointer"
                        >
                            {() => (
                                <>
                                  <span className="flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-amber-400" />
                            <span>{uiText("components_bubba1_studio_modal.span.suggestive_text_banks", "Suggestive Text Banks (")}{DIALOGUE_CATEGORIES.length}{uiText("components_bubba1_studio_modal.span.genres", " Genres)")}</span>
                          </span>
                                <span className="text-[9px] text-purple-400">{showBubbaSuggestions ? "Hide ▲" : "Show ▼"}</span>
                                </>
                              )}
                        </CustomizableButton>

                        {showBubbaSuggestions && (
                          <div className="mt-1.5 space-y-2 p-2 bg-slate-950 rounded-lg border border-slate-800">
                            {/* Genre Tabs */}
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                              {DIALOGUE_CATEGORIES.map((cat) => (
                                <CustomizableButton
                                  buttonId="bubba1_studio_modal_btn_16"
                                  key={cat.id}
type="button"
onClick={() => setActiveBubbaCategory(cat.id)}
className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border transition shrink-0 cursor-pointer ${
                                    activeBubbaCategory === cat.id
                                      ? "bg-purple-900 border-purple-500 text-purple-200"
                                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                  }`}
                                >
                                    {() => (
                                        <>
                                          <span>{cat.icon}</span>
                                        <span className="ml-1">{cat.label}</span>
                                        </>
                                      )}
                                </CustomizableButton>
                              ))}
                            </div>

                            {/* Suggestion Chips */}
                            <div className="grid grid-cols-1 gap-1 max-h-[120px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-800">
                              {DIALOGUE_CATEGORIES.find((c) => c.id === activeBubbaCategory)?.items.map((item, iIdx) => (
                                <CustomizableButton
                                  buttonId="bubba1_studio_modal_btn_15"
                                  key={iIdx}
type="button"
onClick={() => updateSelectedLayer({ text: item.text })}
className="text-left text-[10.5px] p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-purple-500/40 text-slate-300 hover:text-white transition flex items-center justify-between group cursor-pointer"
                                >
                                    {() => (
                                        <>
                                          <span className="truncate flex-1">"{item.text}"</span>
                                        <span className="text-[9px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1">{uiText("components_bubba1_studio_modal.span.use", "Use →")}</span>
                                        </>
                                      )}
                                </CustomizableButton>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_14"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.font_family", "Font Family")}
                                </>
                              )}
                        </CustomizableLabel>
                        <select
                          value={selectedLayer.fontFamily}
                          onChange={(e) => updateSelectedLayer({ fontFamily: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 focus:outline-none text-xs"
                        >
                          <option value="Comic Sans MS, cursive, sans-serif">{uiText("components_bubba1_studio_modal.option.comic_sans", "Comic Sans")}</option>
                          <option value="Impact, sans-serif">{uiText("components_bubba1_studio_modal.option.impact_bold", "Impact Bold")}</option>
                          <option value="sans-serif">{uiText("components_bubba1_studio_modal.option.sans_serif", "Sans-Serif")}</option>
                          <option value="serif">{uiText("components_bubba1_studio_modal.option.serif", "Serif")}</option>
                          <option value="monospace">{uiText("components_bubba1_studio_modal.option.monospace", "Monospace")}</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_13"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.font_size", "Font Size (")}
                                {selectedLayer.fontSize}
                                {uiText("components_bubba1_studio_modal.label.px_3", "px)")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="range"
                          min={10}
                          max={50}
                          value={selectedLayer.fontSize}
                          onChange={(e) => updateSelectedLayer({ fontSize: Number(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_12"
                        onClick={() => updateSelectedLayer({ isBold: !selectedLayer.isBold })}
className={`flex-1 py-1 rounded-lg border font-bold transition cursor-pointer ${
                          selectedLayer.isBold
                            ? "bg-purple-950/60 border-purple-500 text-purple-300"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                      >
                          {() => (
                              <>
                                {uiText("components_bubba1_studio_modal.button.bold", "Bold")}
                              </>
                            )}
                      </CustomizableButton>
                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_11"
                        onClick={() => updateSelectedLayer({ isItalic: !selectedLayer.isItalic })}
className={`flex-1 py-1 rounded-lg border font-bold italic transition cursor-pointer ${
                          selectedLayer.isItalic
                            ? "bg-purple-950/60 border-purple-500 text-purple-300"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                      >
                          {() => (
                              <>
                                {uiText("components_bubba1_studio_modal.button.italic", "Italic")}
                              </>
                            )}
                      </CustomizableButton>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_10"
                          as="label"
                          className="font-bold text-slate-400 text-[10px]"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.text_color", "Text Color")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="color"
                          value={selectedLayer.textColor}
                          onChange={(e) => updateSelectedLayer({ textColor: e.target.value })}
                          className="w-full h-7 bg-slate-950 rounded cursor-pointer border border-slate-700 p-0.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_9"
                          as="label"
                          className="font-bold text-slate-400 text-[10px]"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.bubble_fill", "Bubble Fill")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="color"
                          value={selectedLayer.fillColor}
                          onChange={(e) => updateSelectedLayer({ fillColor: e.target.value })}
                          className="w-full h-7 bg-slate-950 rounded cursor-pointer border border-slate-700 p-0.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_8"
                          as="label"
                          className="font-bold text-slate-400 text-[10px]"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.border_color", "Border Color")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="color"
                          value={selectedLayer.borderColor}
                          onChange={(e) => updateSelectedLayer({ borderColor: e.target.value })}
                          className="w-full h-7 bg-slate-950 rounded cursor-pointer border border-slate-700 p-0.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_7"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.border_width", "Border Width (")}
                                {selectedLayer.borderWidth}
                                {uiText("components_bubba1_studio_modal.label.px_4", "px)")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={selectedLayer.borderWidth}
                          onChange={(e) => updateSelectedLayer({ borderWidth: Number(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <CustomizableLabel
                          labelId="bubba1_studio_modal_item_6"
                          as="label"
                          className="font-bold text-slate-400"
                        >
                            {() => (
                                <>
                                  {uiText("components_bubba1_studio_modal.label.border_radius", "Border Radius (")}
                                {selectedLayer.borderRadius}
                                {uiText("components_bubba1_studio_modal.label.px_5", "px)")}
                                </>
                              )}
                        </CustomizableLabel>
                        <input
                          type="range"
                          min={0}
                          max={50}
                          value={selectedLayer.borderRadius}
                          onChange={(e) => updateSelectedLayer({ borderRadius: Number(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-medium">{uiText("components_bubba1_studio_modal.div.select_a_bubble_on_canvas_to_style", "Select a bubble on canvas to style")}</div>
                )}
              </div>
            )}

            {/* Layers Panel */}
            {activeTab === "layers" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">{uiText("components_bubba1_studio_modal.span.layer_hierarchy", "Layer Hierarchy")}</span>
                  <div className="flex gap-1">
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_5"
                      defaultIcon={<ArrowUp className="w-3.5 h-3.5" />}
                      onClick={() => handleMoveLayerOrder("up")}
disabled={!selectedLayerId}
className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-30 cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.move_layer_up.title", "Move Layer Up")}
                    />
                    <CustomizableButton
                      buttonId="bubba1_studio_modal_btn_4"
                      defaultIcon={<ArrowDown className="w-3.5 h-3.5" />}
                      onClick={() => handleMoveLayerOrder("down")}
disabled={!selectedLayerId}
className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-30 cursor-pointer"
title={uiText("components_bubba1_studio_modal.button.move_layer_down.title", "Move Layer Down")}
                    />
                  </div>
                </div>

                {layers.map((l, idx) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLayerId(l.id)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      selectedLayerId === l.id
                        ? "bg-purple-950/40 border-purple-500 text-purple-200"
                        : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                      <span className="text-xs font-semibold truncate">
                        {l.text || l.name || `Bubble #${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers((prev) =>
                            prev.map((item) => (item.id === l.id ? { ...item, visible: !item.visible } : item))
                          );
                        }}
className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                          {() => (
                              <>
                                {l.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                              </>
                            )}
                      </CustomizableButton>

                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers((prev) =>
                            prev.map((item) => (item.id === l.id ? { ...item, locked: !item.locked } : item))
                          );
                        }}
className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                          {() => (
                              <>
                                {l.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                              </>
                            )}
                      </CustomizableButton>

                      <CustomizableButton
                        buttonId="bubba1_studio_modal_btn_1"
                        defaultIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers((prev) => prev.filter((item) => item.id !== l.id));
                          if (selectedLayerId === l.id) setSelectedLayerId(null);
                        }}
className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        )}

        {/* Center Canvas Studio Workspace */}
        <main
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedLayerId(null);
          }}
          className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
        >
          {activeImageUrl ? (
            <div
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setSelectedLayerId(null);
              }}
              className="relative border border-slate-800 rounded-xl shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center max-w-full max-h-full"
            >
              {/* Background Reference Image */}
              <img
                ref={studioImgRef}
                src={activeImageUrl}
                alt={uiText("components_bubba1_studio_modal.img.studio_slice_canvas.alt", "Studio Slice Canvas")}
                onLoad={syncImageSize}
                onPointerDown={() => setSelectedLayerId(null)}
                className="max-h-[75vh] max-w-full object-contain pointer-events-auto cursor-crosshair"
              />

              {/* Interactive Draggable Bubbles */}
              {layers.map((layer) => {
                if (!layer.visible) return null;
                const isSelected = selectedLayerId === layer.id;

                const centerX = layer.width / 2;
                const centerY = layer.height / 2;

                const baseX = centerX + (layer.tailBaseX || 0);
                const baseY = centerY + (layer.tailBaseY || 0);

                const tipX = centerX + layer.tailX;
                const tipY = centerY + layer.tailY;

                return (
                  <div
                    key={layer.id}
                    onPointerDown={(e) => handlePointerDown(e, layer.id, "layer")}
                    style={{
                      position: "absolute",
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      width: `${layer.width}px`,
                      height: `${layer.height}px`,
                      color: layer.textColor,
                      padding: `${layer.padding + layer.borderWidth}px`,
                      fontFamily: layer.fontFamily,
                      fontSize: `${layer.fontSize}px`,
                      fontWeight: layer.isBold ? "bold" : "normal",
                      fontStyle: layer.isItalic ? "italic" : "normal",
                      textAlign: layer.textAlign,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.25,
                      overflowWrap: "break-word",
                      opacity: layer.opacity,
                      transform: `rotate(${layer.rotation}deg) scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                      cursor: layer.locked ? "not-allowed" : "move",
                      boxShadow: isSelected ? "0 0 0 1px #a855f7" : "none",
                      touchAction: "none",
                    }}
                    className="flex items-center justify-center select-none group relative overflow-visible"
                  >
                    {/* Interactive Resize & Rotate Handles */}
                    {isSelected && !layer.locked && (
                      <>
                        <div onPointerDown={(e) => handlePointerDown(e, layer.id, "resize-nw")} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-purple-500 border border-slate-950 rounded-xs cursor-nwse-resize z-20" />
                        <div onPointerDown={(e) => handlePointerDown(e, layer.id, "resize-ne")} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-purple-500 border border-slate-950 rounded-xs cursor-nesw-resize z-20" />
                        <div onPointerDown={(e) => handlePointerDown(e, layer.id, "resize-sw")} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-purple-500 border border-slate-950 rounded-xs cursor-nesw-resize z-20" />
                        <div onPointerDown={(e) => handlePointerDown(e, layer.id, "resize-se")} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-purple-500 border border-slate-950 rounded-xs cursor-nwse-resize z-20" />

                        {/* Rotate Handle */}
                        <div onPointerDown={(e) => handlePointerDown(e, layer.id, "rotate")} className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-purple-500 border border-slate-950 rounded-full cursor-crosshair z-20 flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full pointer-events-none" />
                        </div>
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-4 bg-purple-500 z-10 pointer-events-none" />
                      </>
                    )}

                    {/* The same vector geometry is used in the saved image. */}
                    {!layer.textOnly && renderTailSvgDOM(layer)}
                    {!layer.textOnly && (
                      <svg aria-hidden="true" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-[1]"
                        viewBox={`0 0 ${layer.width} ${layer.height}`} preserveAspectRatio="none">
                        {layer.type === "scream" ? (
                          <polygon points={starburstPoints(layer.width, layer.height).map(([x, y]) => `${x},${y}`).join(" ")}
                            fill={layer.fillColor} stroke={layer.borderColor} strokeWidth={layer.borderWidth}
                            strokeDasharray={layer.borderStyle === "dashed" ? "8,4" : layer.borderStyle === "dotted" ? "3,3" : undefined} />
                        ) : (
                          <rect x="0" y="0" width={layer.width} height={layer.height}
                            rx={layer.type === "narration" ? 0 : Math.min(layer.borderRadius, layer.width / 2, layer.height / 2)}
                            fill={layer.fillColor} stroke={layer.borderColor} strokeWidth={layer.borderWidth}
                            strokeDasharray={layer.borderStyle === "dashed" ? "8,4" : layer.borderStyle === "dotted" ? "3,3" : undefined} />
                        )}
                      </svg>
                    )}

                    <span className="relative z-10 w-full" style={{ textShadow: layer.textOnly ? "1px 1px 4px rgba(0,0,0,0.75)" : undefined }}>{layer.text}</span>

                    {/* Interactive Tail Handles when selected (70% smaller) */}
                    {isSelected && layer.tailType !== "none" && !layer.locked && (
                      <>
                        {/* Tail Base Handle Dot */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, layer.id, "tailBase")}
                          style={{
                            position: "absolute",
                            left: `${baseX}px`,
                            top: `${baseY}px`,
                            transform: "translate(-50%, -50%)",
                            touchAction: "none",
                          }}
                          className="w-2.5 h-2.5 bg-gradient-to-r from-cyan-400 to-indigo-500 border border-slate-950 rounded-full shadow-md cursor-grab active:cursor-grabbing z-30 flex items-center justify-center hover:scale-150 transition-transform"
                          title={uiText("components_bubba1_studio_modal.div.drag_tail_base_position.title", "Drag Tail Base Position")}
                        />

                        {/* Tail Tip Handle Dot */}
                        <div
                          onPointerDown={(e) => handlePointerDown(e, layer.id, "tail")}
                          style={{
                            position: "absolute",
                            left: `${tipX}px`,
                            top: `${tipY}px`,
                            transform: "translate(-50%, -50%)",
                            touchAction: "none",
                          }}
                          className="w-3 h-3 bg-gradient-to-r from-amber-400 to-amber-500 border border-slate-950 rounded-full shadow-md cursor-grab active:cursor-grabbing z-30 flex items-center justify-center hover:scale-150 transition-transform group/tail"
                          title={uiText("components_bubba1_studio_modal.div.drag_tail_tip_handle.title", "Drag Tail Tip Handle")}
                        >
                          <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-30 pointer-events-none" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center space-y-2 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-700" />
              <p className="text-sm font-semibold">{uiText("components_bubba1_studio_modal.p.no_image_slice_loaded_in_bubba1_studio", "No image slice loaded in Bubba1 Studio")}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Bubba1StudioModal;
