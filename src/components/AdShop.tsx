import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type ReactNode, type RefObject } from "react";
import campaign from "../assets/adshop-campaign.jpg";
import type { AdShopHandoff, AdShopImage } from "../types";
import { Icon } from "./Icon";
import { AdShopSequencer } from "./AdShopSequencer";
import { GridConfigurationStudio } from "./GridConfigurationStudio";
import { SEQUENCER_SOURCE_IMAGES, type SequencerSource } from "./SequencerPanel";
import { LedStudioModal } from "./ledStudio/LedStudioModal";
import { describeAiringScene } from "./ledStudio/frontPageTransport";
import type { LedStudioProgram } from "./ledStudio/integration";
import type { AdShopWallPreview } from "./ledStudio/AdShopWallContext";
import type { AdvertAsset } from "./ledStudio/types";
import { useAdShopAnimation } from "./useAdShopAnimation";
import {
  AdShopGrid,
  DEFAULT_DISPLAY_TRANSFORM,
  DISPLAY_SHAPES,
  type DisplayShape,
  type DisplayTransform,
} from "./AdShopGrid";
import { THEME_OPTIONS, type ThemeKey } from "../lib/theme";
import { CustomizableContainer } from "./CustomizableContainer";
import { cn } from "../utils/cn";
import "./AdShop.css";

interface DisplaySource {
  src: string;
  name: string;
  origin: "demo" | "upload" | "deck";
}

type DisplayMode = "single" | "tiles";

interface DisplaySnapshot {
  source: DisplaySource;
  uploadedSource: DisplaySource | null;
  deckImages: AdShopImage[];
  deckIndex: number;
  deckPage: number;
  displayMode: DisplayMode;
  transform: DisplayTransform;
}

const TILES_PER_PAGE = 16;

const DEMO_SOURCE: DisplaySource = {
  src: campaign,
  name: "Demo campaign",
  origin: "demo",
};

const deckSource = (image: AdShopImage): DisplaySource => ({
  src: image.src,
  name: image.name,
  origin: "deck",
});

function releaseSnapshotUploads(snapshot: DisplaySnapshot, keep: string | null) {
  const urls = new Set([
    snapshot.source.origin === "upload" ? snapshot.source.src : null,
    snapshot.uploadedSource?.src ?? null,
  ]);
  for (const url of urls) {
    if (url && url !== keep) URL.revokeObjectURL(url);
  }
}

type StudioKind = "sequencer" | "choreographer" | "painter";
type SettingsSection = "image" | "display" | "deck" | "appearance";

const SETTINGS_SECTIONS: Record<SettingsSection, { title: string; description: string; icon: string; eyebrow: string }> = {
  image: { title: "Your image", description: "Upload or choose ReelDeck artwork", icon: "image", eyebrow: "IMAGE SOURCE" },
  display: { title: "Display controls", description: "Shape, spacing, fit and rotation", icon: "sliders", eyebrow: "MAKE IT YOURS" },
  deck: { title: "Live Control Deck", description: "Sequences, choreography and panels", icon: "layers", eyebrow: "CREATIVE TOOLS" },
  appearance: { title: "Appearance & theme", description: "Workspace palette and styling", icon: "palette", eyebrow: "Look & feel" },
};

interface PreparedStudio {
  sources: SequencerSource[];
  assets: AdvertAsset[];
  wall: AdShopWallPreview;
  boxImages: Record<number, string>;
}

/** Copy session blob URLs before handing them to an editor/program that may outlive the upload. */
async function stableArtwork(src: string): Promise<string> {
  if (!src.startsWith("blob:")) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error("The selected image is no longer available.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not prepare the selected image."));
    reader.readAsDataURL(blob);
  });
}

/** A native modal keeps the settings separate from the live display. */
function SettingsDialog({ section, onClose, children }: { section: SettingsSection; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const details = SETTINGS_SECTIONS[section];

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="as-settings-dialog"
      aria-labelledby="as-settings-dialog-title"
      aria-describedby="as-settings-dialog-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled):not([type="hidden"]):not([hidden]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.getClientRects().length > 0 && !element.closest("[hidden], [inert]"));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) onClose();
      }}
    >
      <header className="as-settings-dialog-header">
        <div>
          <span className="as-settings-eyebrow"><i /> {details.eyebrow}</span>
          <h2 id="as-settings-dialog-title">{details.title}</h2>
          <p id="as-settings-dialog-description">{details.description}</p>
        </div>
        <button type="button" className="as-settings-close" onClick={() => onClose()} aria-label={`Close ${details.title}`} title="Close" autoFocus>
          <Icon name="x" size={17} />
        </button>
      </header>
      <div className="as-settings-dialog-body">{children}</div>
    </dialog>
  );
}

function RangeControl({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="as-range-control">
      <span className="as-control-label">
        <span>{label}</span>
        <span className="as-control-value">{value} <span>px</span></span>
      </span>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--as-progress": `${(value / max) * 100}%` } as CSSProperties}
      />
    </label>
  );
}

export function AdShop({
  onOpenReelDeck,
  onLoadReelDeck,
  reelDeckCount,
  handoff,
  stageRef,
  commitButtonRef,
  onCommitAndReturn,
  onOpenLibrary,
  theme,
  onTheme,
}: {
  onOpenSlice: () => void;
  onOpenReelDeck: () => void;
  onLoadReelDeck: () => void;
  reelDeckCount: number;
  handoff: AdShopHandoff | null;
  stageRef: RefObject<HTMLElement | null>;
  commitButtonRef: RefObject<HTMLButtonElement | null>;
  onCommitAndReturn: () => void;
  onOpenLibrary: () => void;
  theme?: ThemeKey;
  onTheme?: (key: ThemeKey) => void;
}) {
  const [source, setSource] = useState<DisplaySource>(DEMO_SOURCE);
  const [uploadedSource, setUploadedSource] = useState<DisplaySource | null>(null);
  const [deckImages, setDeckImages] = useState<AdShopImage[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [deckPage, setDeckPage] = useState(0);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("single");
  const [transform, setTransform] = useState<DisplayTransform>(DEFAULT_DISPLAY_TRANSFORM);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewPending, setPreviewPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const animation = useAdShopAnimation();
  const [studio, setStudio] = useState<StudioKind | null>(null);
  const [returnToSequencer, setReturnToSequencer] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [preparingStudio, setPreparingStudio] = useState(false);
  const [preparedStudio, setPreparedStudio] = useState<PreparedStudio | null>(null);
  const [extraSources, setExtraSources] = useState<SequencerSource[]>([]);
  const [removedSources, setRemovedSources] = useState<string[]>([]);
  const studioToken = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null); // Always mounted for the header shortcut.
  const settingsInputRef = useRef<HTMLInputElement>(null); // Outside controls are inert while a dialog is open.
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const objectUrl = useRef<string | null>(null);
  const beforePreview = useRef<DisplaySnapshot | null>(null);
  const loadToken = useRef(0);

  useEffect(() => {
    if (!settingsMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!settingsMenuRef.current?.contains(event.target as Node)) setSettingsMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSettingsMenuOpen(false);
        settingsButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsMenuOpen]);

  const focusSettingsButton = useCallback(() => {
    window.requestAnimationFrame(() => settingsButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  const closeSettings = useCallback((restoreFocus = true) => {
    // If a studio is still preparing artwork, dismissing settings cancels that
    // pending launch instead of opening an editor after the user has left.
    studioToken.current += 1;
    setPreparingStudio(false);
    setSettingsSection(null);
    if (restoreFocus) focusSettingsButton();
  }, [focusSettingsButton]);

  // Only a new handoff starts a draft; editing a draft must not re-apply it.
  useLayoutEffect(() => {
    if (!handoff?.images.length) return;
    if (!beforePreview.current) {
      beforePreview.current = { source, uploadedSource, deckImages, deckIndex, deckPage, displayMode, transform };
      setPreviewPending(true);
    }
    loadToken.current += 1;
    setLoading(false);
    setDragging(false);
    setError("");
    setNotice("");
    setDeckImages(handoff.images);
    setDeckIndex(0);
    setDeckPage(0);
    setSource(deckSource(handoff.images[0]));
    setDisplayMode(handoff.images.length > 1 ? "tiles" : "single");
  }, [handoff]);

  useEffect(() => () => {
    loadToken.current += 1;
    studioToken.current += 1;
    if (beforePreview.current) releaseSnapshotUploads(beforePreview.current, objectUrl.current);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  const cancelPreview = (stayInAdShop = true) => {
    const snapshot = beforePreview.current;
    if (!snapshot) return;
    loadToken.current += 1;
    setLoading(false);
    setDragging(false);
    const restoredUpload = snapshot.uploadedSource?.src ?? (snapshot.source.origin === "upload" ? snapshot.source.src : null);
    if (objectUrl.current && objectUrl.current !== restoredUpload) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = restoredUpload;
    setSource(snapshot.source);
    setUploadedSource(snapshot.uploadedSource);
    setDeckImages(snapshot.deckImages);
    setDeckIndex(snapshot.deckIndex);
    setDeckPage(snapshot.deckPage);
    setDisplayMode(snapshot.displayMode);
    setTransform(snapshot.transform);
    setError("");
    setNotice(stayInAdShop ? "Preview canceled. Your previous display is restored." : "");
    beforePreview.current = null;
    setPreviewPending(false);
    if (stayInAdShop) window.requestAnimationFrame(() => {
      const stage = stageRef.current;
      stage?.closest(".as-root")?.scrollTo({ top: 0, behavior: "auto" });
      stage?.focus({ preventScroll: true });
    });
  };

  const commitPreview = (destination: "reeldeck" | "adshop" | "stay") => {
    const snapshot = beforePreview.current;
    if (!snapshot) return;
    loadToken.current += 1;
    setLoading(false);
    releaseSnapshotUploads(snapshot, objectUrl.current);
    beforePreview.current = null;
    setPreviewPending(false);
    setError("");
    // A committed handoff becomes the new base rather than being hidden by
    // panel artwork from an earlier route submission.
    animation.clearPanelPrograms();
    if (destination === "reeldeck") onCommitAndReturn();
    else {
      setNotice("Display committed. Your changes are saved for this session.");
      window.requestAnimationFrame(() => {
        const stage = stageRef.current;
        if (destination === "adshop") stage?.closest(".as-root")?.scrollTo({ top: 0, behavior: "auto" });
        stage?.focus({ preventScroll: true });
      });
    }
  };

  const navigateAway = (navigate: () => void) => {
    studioToken.current += 1;
    setPreparingStudio(false);
    setSettingsMenuOpen(false);
    setSettingsSection(null);
    cancelPreview(false);
    navigate();
  };

  useLayoutEffect(() => {
    if (thumbnailStripRef.current) thumbnailStripRef.current.scrollLeft = 0;
  }, [deckPage, handoff]);

  const updateTransform = (patch: Partial<DisplayTransform>) => {
    setTransform((current) => ({ ...current, ...patch }));
  };

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    const token = ++loadToken.current;
    setError("");
    if (file.type && !file.type.startsWith("image/")) {
      setLoading(false);
      setError("Please choose an image file.");
      return;
    }
    setLoading(true);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (token !== loadToken.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const snapshot = beforePreview.current;
      const isBackedUp = objectUrl.current && (
        snapshot?.uploadedSource?.src === objectUrl.current ||
        (snapshot?.source.origin === "upload" && snapshot.source.src === objectUrl.current)
      );
      if (objectUrl.current && !isBackedUp) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;
      const uploaded: DisplaySource = { src: url, name: file.name || "Uploaded image", origin: "upload" };
      setUploadedSource(uploaded);
      if (!previewPending) animation.clearPanelPrograms();
      setSource(uploaded);
      setDisplayMode("single");
      setLoading(false);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      if (token !== loadToken.current) return;
      setLoading(false);
      setError("That image couldn't be opened. Please try another file.");
    };
    image.src = url;
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    loadFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const cancelPendingLoad = () => {
    loadToken.current += 1;
    setError("");
    setLoading(false);
  };

  const useDemo = () => {
    cancelPendingLoad();
    if (!previewPending) animation.clearPanelPrograms();
    setSource(DEMO_SOURCE);
    setDisplayMode("single");
  };

  const useUploaded = () => {
    if (!uploadedSource) return;
    cancelPendingLoad();
    if (!previewPending) animation.clearPanelPrograms();
    setSource(uploadedSource);
    setDisplayMode("single");
  };

  const selectDeckImage = (index: number) => {
    const image = deckImages[index];
    if (!image) return;
    cancelPendingLoad();
    if (!previewPending) animation.clearPanelPrograms();
    setDeckIndex(index);
    setDeckPage(Math.floor(index / TILES_PER_PAGE));
    setSource(deckSource(image));
    setDisplayMode("single");
  };

  const changeDisplayMode = (mode: DisplayMode) => {
    if (!deckImages.length || mode === displayMode) return;
    cancelPendingLoad();
    if (!previewPending) animation.clearPanelPrograms();
    setSource(deckSource(deckImages[deckIndex] ?? deckImages[0]));
    setDisplayMode(mode);
  };

  const pageCount = Math.max(1, Math.ceil(deckImages.length / TILES_PER_PAGE));
  const pageStart = deckPage * TILES_PER_PAGE;
  const pageImages = deckImages.slice(pageStart, pageStart + TILES_PER_PAGE);
  const isTileMode = displayMode === "tiles" && deckImages.length > 0;
  const returnToReelDeck = handoff?.returnTo === "reeldeck";

  const changeDeckPage = (page: number) => {
    if (page < 0 || page >= pageCount) return;
    cancelPendingLoad();
    if (!previewPending) animation.clearPanelPrograms();
    const index = page * TILES_PER_PAGE;
    setDeckPage(page);
    setDeckIndex(index);
    if (source.origin === "deck" || isTileMode) setSource(deckSource(deckImages[index]));
  };

  const clearDeckImages = () => {
    cancelPendingLoad();
    if (!previewPending && (source.origin === "deck" || isTileMode)) animation.clearPanelPrograms();
    setDeckImages([]);
    setDeckIndex(0);
    setDeckPage(0);
    if (source.origin === "deck" || isTileMode) {
      setSource(DEMO_SOURCE);
      setDisplayMode("single");
    }
  };

  const loadAllFromReelDeck = () => {
    // Return to the display so the handoff's commit/cancel bar is reachable.
    closeSettings(false);
    onLoadReelDeck();
    window.requestAnimationFrame(() => {
      stageRef.current?.closest(".as-root")?.scrollTo({ top: 0, behavior: "auto" });
      (commitButtonRef.current ?? stageRef.current)?.focus({ preventScroll: true });
    });
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    loadFile(event.dataTransfer.files[0]);
  };

  const openStudio = useCallback(async (kind: StudioKind, returnToSequence = false) => {
    if (previewPending || preparingStudio) return;
    const token = ++studioToken.current;
    setPreparingStudio(true);
    setError("");
    try {
      const items = [
        { id: "adshop-current", name: source.name, url: source.src },
        ...deckImages.map((image) => ({ id: `deck-${image.id}`, name: image.name, url: image.src })),
        ...extraSources,
        ...(animation.lastProgram?.pool ?? []),
      ];
      const stable = new Map<string, string>();
      await Promise.all(Array.from(new Set(items.map((item) => item.url))).map(async (url) => {
        stable.set(url, await stableArtwork(url));
      }));
      if (token !== studioToken.current) return;
      const seen = new Set<string>();
      const saved = items.flatMap((item) => {
        const url = stable.get(item.url) ?? item.url;
        if (!url || seen.has(url)) return [];
        seen.add(url);
        return [{ id: item.id, name: item.name, url, timestamp: "" }];
      });
      const builtins = SEQUENCER_SOURCE_IMAGES.map((url, index) => ({
        id: `built-in-${index + 1}`, name: `Creative source ${String(index + 1).padStart(2, "0")}`, url, timestamp: "",
      }));
      const currentArtwork = stable.get(source.src) ?? source.src;
      const page = deckImages.slice(deckPage * TILES_PER_PAGE, (deckPage + 1) * TILES_PER_PAGE);
      const tileArtworks = isTileMode ? Array.from({ length: 16 }, (_, index) => {
        const url = page[index]?.src;
        return url ? stable.get(url) ?? url : undefined;
      }) : undefined;
      const panelArtworks: Record<number, string> = {};
      Object.entries(animation.panelPrograms ?? {}).forEach(([key, panel]) => {
        const index = animation.rotationIndices[Number(key)] ?? 0;
        const value = panel.rotating && panel.rotation.length > 1 ? panel.rotation[index % panel.rotation.length] : panel.artwork || panel.source;
        if (value) panelArtworks[Number(key)] = value;
      });
      const boxImages = Object.fromEntries(Array.from({ length: 16 }, (_, index) => [index + 1,
        panelArtworks[index + 1] || tileArtworks?.[index] || currentArtwork]));
      const gridBox = stageRef.current?.querySelector(".as-grid")?.getBoundingClientRect();
      const cellSize = gridBox ? {
        width: Math.max(1, (gridBox.width - transform.gap * 3) / 4),
        height: Math.max(1, (gridBox.height - transform.gap * 3) / 4),
      } : { width: DISPLAY_SHAPES[transform.shape].ratio, height: 1 };
      setPreparedStudio({
        sources: [...saved, ...builtins],
        assets: saved.map((item) => ({ id: item.id, name: item.name, url: item.url, source: "upload" as const })),
        wall: { artwork: currentArtwork, tileArtworks, panelArtworks, transform, cellSize },
        boxImages,
      });
      setReturnToSequencer(returnToSequence);
      // Native settings dialogs sit in the top layer; close them before the
      // full-screen studio opens so they cannot obscure or trap its focus.
      setSettingsSection(null);
      setStudio(kind);
    } catch (failure) {
      if (token === studioToken.current) setError(failure instanceof Error ? failure.message : "Could not prepare the studio artwork.");
    } finally {
      if (token === studioToken.current) setPreparingStudio(false);
    }
  }, [previewPending, preparingStudio, source, deckImages, deckPage, isTileMode, extraSources, animation.lastProgram,
    animation.panelPrograms, animation.rotationIndices, transform]);

  // Closing while a blob snapshot is still being prepared must not reopen a
  // studio after the user has already dismissed it.
  const closeStudio = useCallback((returnToSequence = false) => {
    studioToken.current += 1;
    setPreparingStudio(false);
    setStudio(returnToSequence ? "sequencer" : null);
    if (!returnToSequence) focusSettingsButton();
  }, [focusSettingsButton]);

  const sequenceSources = useMemo(() => {
    const seen = new Set<string>();
    return [...(preparedStudio?.sources ?? []), ...extraSources].filter((item) => {
      if (removedSources.includes(item.id) || seen.has(item.url)) return false;
      seen.add(item.url); return true;
    });
  }, [preparedStudio, extraSources, removedSources]);
  const addSequenceSource = useCallback((item: SequencerSource) => {
    setExtraSources((old) => [item, ...old]);
    setRemovedSources((old) => old.filter((id) => id !== item.id));
  }, []);
  const removeSequenceSource = useCallback((id: string) => {
    setExtraSources((old) => old.filter((item) => item.id !== id));
    setRemovedSources((old) => [...old, id]);
  }, []);
  const applyStudioProgram = useCallback(async (program: LedStudioProgram) => {
    await animation.submit(program);
    setNotice(program.mode === "show" ? "Choreography submitted to the display." : "Route and panel artwork submitted to the display.");
  }, [animation.submit]);

  const gridConfigurator = gridOpen ? <GridConfigurationStudio mode="4x4" regions={animation.regions}
    activeSlots={animation.sequence.activeSlots} onApply={(_mode, _slots, regions) => animation.applyRegions(regions)}
    onClose={() => {
      setGridOpen(false);
      if (!studio) focusSettingsButton();
    }} /> : null;

  const ratio = DISPLAY_SHAPES[transform.shape].ratio;
  const stageStyle = {
    "--as-height-fit": `max(200px, calc(${ratio * 100}vh - ${ratio * (previewPending ? 295 : 210)}px))`,
  } as CSSProperties;
  const pageEnd = Math.min(pageStart + TILES_PER_PAGE, deckImages.length);
  const displayName = isTileMode ? `${deckImages.length} ReelDeck images` : source.name;
  const displayThumbnail = isTileMode ? pageImages[0]?.src ?? source.src : source.src;
  const sourceStatus = loading ? "Opening image" : isTileMode
    ? `${deckImages.length} ReelDeck images received; showing images ${pageStart + 1} through ${pageEnd} in the tiles.`
    : `${source.name} is on the display`;
  const sourceType = isTileMode ? "REELDECK HANDOFF" : source.origin === "deck" ? "REELDECK IMAGE" : source.origin === "upload" ? "UPLOADED IMAGE" : "DEMO IMAGE";
  const sourcePosition = isTileMode
    ? `${pageStart + 1}–${pageEnd} / ${deckImages.length}`
    : source.origin === "deck" ? `${deckIndex + 1} / ${deckImages.length}` : "01 / 01";

  return (
    <div className="as-root">
      <div className={`as-app${previewPending ? " has-preview" : ""}`}>
        <header className="as-header">
          <div className="as-brand" aria-label="AdShop home">
            <span className="as-brand-icon"><Icon name="bolt" size={21} strokeWidth={2.6} /></span>
            <span className="as-brand-copy">
              <span className="as-brand-name">AdShop<span className="as-brand-period">.</span></span>
            </span>
          </div>

          <nav className="as-workflow" aria-label="Creative workspace">
            <span className="as-workflow-active" aria-current="page">
              <Icon name="grid" size={16} /> <span>AdShop</span>
            </span>
            <Icon className="as-workflow-arrow" name="right" size={12} />
            <button type="button" onClick={() => navigateAway(onOpenReelDeck)} title="Open ReelDeck">
              <Icon name="film" size={16} /> <span>ReelDeck</span>
            </button>
          </nav>

          <div className="as-header-actions">
            <button
              type="button"
              className="as-header-upload"
              onClick={() => inputRef.current?.click()}
              aria-label="Upload an image to the display"
              title="Upload an image"
            >
              <Icon name="upload" size={17} />
            </button>
            <div className="as-settings-wrap" ref={settingsMenuRef} onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSettingsMenuOpen(false);
            }}>
              <button
                ref={settingsButtonRef}
                type="button"
                className={`as-header-settings${settingsMenuOpen ? " is-open" : ""}`}
                aria-label="Settings"
                aria-expanded={settingsMenuOpen}
                aria-controls={settingsMenuOpen ? "adshop-settings-menu" : undefined}
                onClick={() => setSettingsMenuOpen((open) => !open)}
                title="Settings"
              >
                <Icon name="settings" size={19} />
              </button>
              {settingsMenuOpen && <div id="adshop-settings-menu" className="as-settings-menu" role="group" aria-label="Settings">
                <div className="as-settings-menu-heading"><span>SETTINGS</span><small>Customize your display</small></div>
                {(Object.keys(SETTINGS_SECTIONS) as SettingsSection[]).map((section) => {
                  const item = SETTINGS_SECTIONS[section];
                  return <Fragment key={section}>
                    <button type="button" className="as-settings-menu-item" onClick={() => {
                      setSettingsMenuOpen(false);
                      setSettingsSection(section);
                    }}>
                      <span className="as-settings-item-icon"><Icon name={item.icon} size={17} /></span>
                      <span><strong>{item.title}</strong><small>{item.description}</small></span>
                      <Icon name="right" size={14} />
                    </button>
                    {section === "deck" && <button type="button" className="as-settings-menu-item" disabled={previewPending || preparingStudio} onClick={() => {
                      setSettingsMenuOpen(false);
                      void openStudio("sequencer");
                    }}>
                      <span className="as-settings-item-icon"><Icon name="sliders" size={17} /></span>
                      <span><strong>Sequencer</strong><small>Route sequencer — paths &amp; timing</small></span>
                      <Icon name="right" size={14} />
                    </button>}
                  </Fragment>;
                })}
              </div>}
            </div>
          </div>
        </header>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleUploadChange}
        />

        {previewPending && (
          <div className="as-commit-bar" role="region" aria-label="ReelDeck preview actions">
            <div className="as-commit-message" role="status">
              <span className="as-commit-icon"><Icon name="film" size={17} /></span>
              <div><strong>ReelDeck preview · not committed</strong><p>Leaving without committing discards this preview.</p></div>
            </div>
            <div className={`as-commit-actions${returnToReelDeck ? "" : " is-returning-to-adshop"}`}>
              <button ref={commitButtonRef} type="button" className="as-commit-primary" onClick={() => commitPreview(returnToReelDeck ? "reeldeck" : "adshop")} disabled={loading}>
                <Icon name="check" size={15} /> Commit &amp; return to {returnToReelDeck ? "ReelDeck" : "AdShop"}
              </button>
              {returnToReelDeck && <button type="button" className="as-commit-secondary" onClick={() => commitPreview("stay")} disabled={loading}>Commit &amp; stay</button>}
              <button type="button" className="as-commit-cancel" onClick={() => cancelPreview()}>Cancel preview</button>
            </div>
          </div>
        )}
        {notice && !previewPending && <div className="as-commit-notice" role="status">
          <span><Icon name="check" size={15} /> {notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss confirmation"><Icon name="x" size={14} /></button>
        </div>}

        <main className="as-main">
          <section ref={stageRef} tabIndex={-1} className={`as-stage as-stage--${transform.shape}`} style={stageStyle} aria-label="Display preview">
            <div
              className={`as-grid-frame as-grid-frame--${transform.shape}${dragging ? " is-dragging" : ""}`}
              style={{ aspectRatio: String(ratio) }}
              onDragOver={handleDragOver}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
              }}
              onDrop={handleDrop}
            >
              <AdShopGrid
                src={source.src}
                sourceName={isTileMode ? `${deckImages.length} ReelDeck images, showing ${pageStart + 1} through ${pageEnd}` : source.name}
                tileImages={isTileMode ? pageImages : undefined}
                transform={transform}
                regions={animation.regions}
                sequence={previewPending ? undefined : animation.sequence}
                panelPrograms={previewPending ? null : animation.panelPrograms}
                rotationIndices={animation.rotationIndices}
                show={previewPending ? undefined : animation.show}
                onSceneChange={animation.setScene}
                onShowComplete={animation.completeShow}
              />
              {dragging && <div className="as-drop-overlay"><Icon name="upload" size={26} /><strong>Drop your image here</strong></div>}
            </div>
          </section>
        </main>

        {settingsSection && <SettingsDialog key={settingsSection} section={settingsSection} onClose={closeSettings}>
          <span className="as-sr-only" aria-live="polite">{sourceStatus}</span>
          {error && <p className="as-error" role="alert">{error}</p>}
          {settingsSection === "image" && <section className="as-sources" aria-label="Image sources">
            <div className="as-source-section">
              <div className="as-section-heading">
                <span>{isTileMode ? "YOUR IMAGES" : "YOUR IMAGE"}</span><span>{sourcePosition}</span>
              </div>
              <div className="as-source-card">
                <img src={displayThumbnail} alt="" />
                <div className="as-source-copy">
                  <span>{sourceType}</span>
                  <strong title={displayName}>{displayName}</strong>
                </div>
                <Icon name="image" size={16} />
              </div>
              <button className="as-upload-button" type="button" onClick={() => settingsInputRef.current?.click()}>
                <Icon name="upload" size={16} />
                <span>{loading ? "Opening image…" : "Upload an image"}</span>
                <Icon name="arrow" size={15} />
              </button>
              <input
                ref={settingsInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleUploadChange}
              />
              <button
                type="button"
                className="as-deck-action"
                onClick={loadAllFromReelDeck}
                disabled={!reelDeckCount || previewPending}
                title={previewPending ? "Commit or cancel the current preview first" : reelDeckCount ? "Preview all current ReelDeck frames before committing" : "Add images in ReelDeck first"}
              >
                <Icon name="film" size={15} />
                <span>{reelDeckCount ? "Load all from ReelDeck" : "No ReelDeck images yet"}</span>
                <strong>{reelDeckCount}</strong>
              </button>

              {deckImages.length > 0 && (
                <section className="as-deck-library" aria-label="Images handed off from ReelDeck">
                  <div className="as-deck-library-heading">
                    <div><span className="as-deck-library-icon"><Icon name="film" size={14} /></span><span><strong>From ReelDeck</strong><small>{deckImages.length} image{deckImages.length === 1 ? "" : "s"} received</small></span></div>
                    <button type="button" onClick={clearDeckImages} title="Remove the handoff from AdShop; the ReelDeck board is unchanged">Clear</button>
                  </div>
                  <div className="as-deck-modes" role="group" aria-label="ReelDeck display mode">
                    <button type="button" className={!isTileMode ? "is-active" : ""} aria-pressed={!isTileMode} onClick={() => changeDisplayMode("single")}>One image</button>
                    <button type="button" className={isTileMode ? "is-active" : ""} aria-pressed={isTileMode} onClick={() => changeDisplayMode("tiles")}>Image tiles</button>
                  </div>
                  <div ref={thumbnailStripRef} className="as-deck-thumbnails" role="group" aria-label="Choose a ReelDeck image">
                    {pageImages.map((image, index) => {
                      const absoluteIndex = pageStart + index;
                      const active = !isTileMode && source.origin === "deck" && deckIndex === absoluteIndex;
                      return (
                        <button
                          type="button"
                          key={image.id}
                          className={`as-deck-thumbnail${active ? " is-active" : ""}`}
                          onClick={() => selectDeckImage(absoluteIndex)}
                          aria-label={`Show ${image.name} across the grid`}
                          aria-pressed={active}
                          title={`Show ${image.name} across the grid`}
                        >
                          <img src={image.src} alt="" loading="lazy" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="as-deck-library-footer">
                    <span>{pageStart + 1}–{pageEnd} of {deckImages.length}</span>
                    {pageCount > 1 && (
                      <div className="as-deck-pagination" aria-label="ReelDeck image pages">
                        <button type="button" aria-label="Previous 16 ReelDeck images" disabled={deckPage === 0} onClick={() => changeDeckPage(deckPage - 1)}><Icon name="left" size={13} /></button>
                        <span>{deckPage + 1} / {pageCount}</span>
                        <button type="button" aria-label="Next 16 ReelDeck images" disabled={deckPage === pageCount - 1} onClick={() => changeDeckPage(deckPage + 1)}><Icon name="right" size={13} /></button>
                      </div>
                    )}
                  </div>
                  <p className="as-deck-hint">{pageImages.length > 4 ? "Scroll to browse. " : ""}{isTileMode ? "Choose a thumbnail to show one image across the grid." : "Choose an image, or fill the tiles with the collection."} Load or send again to update this snapshot.</p>
                </section>
              )}

              <p className="as-source-hint">Drag an image onto the canvas or upload one. Images stay in this session.</p>
              {(source.origin !== "demo" || uploadedSource) && (
                <div className="as-source-links">
                  {source.origin !== "demo" && <button type="button" className="as-text-button" onClick={useDemo}>Restore demo image</button>}
                  {uploadedSource && source.origin !== "upload" && <button type="button" className="as-text-button" onClick={useUploaded}>Use uploaded image</button>}
                </div>
              )}
            </div>
          </section>}

          {settingsSection === "display" && <div className="as-control-panel">
            <div className="as-panel-heading"><span><i /> TRANSFORM</span><button type="button" onClick={() => setTransform({ ...DEFAULT_DISPLAY_TRANSFORM })}>RESET</button></div>

            <div className="as-shape-control">
              <div className="as-control-label"><span>Canvas shape</span></div>
              <div className="as-shape-options" role="group" aria-label="Canvas shape">
                {(Object.keys(DISPLAY_SHAPES) as DisplayShape[]).map((shape) => (
                  <button
                    type="button"
                    key={shape}
                    className={transform.shape === shape ? "is-active" : ""}
                    aria-pressed={transform.shape === shape}
                    onClick={() => updateTransform({ shape })}
                  >
                    <span className={`as-shape-icon as-shape-icon-${shape}`} />
                    <span>{DISPLAY_SHAPES[shape].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <RangeControl label="Tile spacing" value={transform.gap} max={28} onChange={(gap) => updateTransform({ gap })} />
            <RangeControl label="Corner radius" value={transform.radius} max={32} onChange={(radius) => updateTransform({ radius })} />

            <div className="as-fit-control">
              <div className="as-control-label"><span>Image fit</span></div>
              <div className="as-segment" role="group" aria-label="Image fit">
                <button type="button" className={transform.fit === "cover" ? "is-active" : ""} aria-pressed={transform.fit === "cover"} onClick={() => updateTransform({ fit: "cover" })}>Fill</button>
                <button type="button" className={transform.fit === "contain" ? "is-active" : ""} aria-pressed={transform.fit === "contain"} onClick={() => updateTransform({ fit: "contain" })}>Fit</button>
              </div>
            </div>

            <div className="as-quick-controls">
              <button type="button" onClick={() => updateTransform({ rotation: (transform.rotation + 90) % 360 })} title="Rotate image clockwise">
                <span className="as-quick-icon"><Icon name="refresh" size={16} /></span>
                <span><strong>Rotate</strong><small>{transform.rotation}°</small></span>
              </button>
              <button type="button" className={transform.showNumbers ? "is-active" : ""} aria-pressed={transform.showNumbers} onClick={() => updateTransform({ showNumbers: !transform.showNumbers })} title="Toggle tile numbers">
                <span className="as-quick-icon"><Icon name="eye" size={16} /></span>
                <span><strong>Numbers</strong><small>{transform.showNumbers ? "On" : "Off"}</small></span>
              </button>
              <button type="button" onClick={() => setTransform({ ...DEFAULT_DISPLAY_TRANSFORM })} title="Reset display view and transform">
                <span className="as-quick-icon"><Icon name="refresh" size={16} /></span>
                <span><strong>Reset view</strong><small>Default</small></span>
              </button>
            </div>
          </div>}

          {settingsSection === "deck" && <div className="as-animation-panel">
            <div className="as-panel-heading"><span><i /> STUDIOS &amp; PANELS</span><span className="as-tools-live">READY</span></div>
            <div className="as-live-transport" style={{ width: "100%", marginTop: 0 }} role="group" aria-label="Display animation transport">
              <div><i className={animation.running && !previewPending ? "is-playing" : ""} />
                <span>{previewPending ? "DRAFT · ANIMATIONS HIDDEN" : animation.mode === "show" && animation.show.program
                  ? describeAiringScene(animation.show.program, animation.scene, animation.show.visible) ?? "SHOW STOPPED"
                  : `SEQUENCE · ${animation.sequence.playing && !animation.sequence.bypassed ? `STEP ${animation.sequence.currentStep}` : "READY"}`}</span>
              </div>
              <button type="button" onClick={animation.toggleTransport} disabled={previewPending}
                aria-label={animation.running ? "Stop display animation" : `Play ${animation.mode === "show" && animation.show.program ? "show" : "sequence"}`}>
                {animation.running ? "Stop" : "Play"}
              </button>
              {animation.mode === "route" && animation.show.program && <button type="button" onClick={animation.resumeShow} disabled={previewPending}>Play show</button>}
            </div>
            <button type="button" className="as-tool-card" disabled={previewPending || preparingStudio}
              onClick={() => openStudio("sequencer")}>
              <span className="as-tool-icon"><Icon name="sliders" size={17} /></span>
              <span><strong>Sequencer</strong><small>Paths, timing &amp; artwork</small></span><Icon name="right" size={14} />
            </button>
            <button type="button" className="as-tool-card" disabled={previewPending || preparingStudio}
              onClick={() => openStudio("choreographer")}>
              <span className="as-tool-icon as-tool-icon-purple"><Icon name="layers" size={17} /></span>
              <span><strong>Perimeter Choreographer</strong><small>Scenes, formations &amp; motion</small></span><Icon name="right" size={14} />
            </button>
            <button type="button" className="as-tool-card" disabled={previewPending || preparingStudio}
              onClick={() => { setSettingsSection(null); setGridOpen(true); }}>
              <span className="as-tool-icon"><Icon name="grid" size={17} /></span>
              <span><strong>Panel arrangement</strong><small>Merge, split &amp; activate panels</small></span><Icon name="right" size={14} />
            </button>
            <p>{previewPending ? "Commit or cancel the ReelDeck preview to edit the live display." : preparingStudio ? "Preparing artwork…" : "Both studios share this display’s route and panel layout."}</p>
          </div>}

          {settingsSection === "appearance" && (
            <CustomizableContainer
              ibcId="adshop_settings_appearance_panel"
              componentType="panel"
              defaultTitle="Appearance & theme"
              className="as-control-panel"
            >
              <div className="as-panel-heading">
                <span><i /> Theme &amp; palette</span>
                <span>{THEME_OPTIONS.find((t) => t.key === (theme ?? "dark"))?.label ?? "Darkroom"}</span>
              </div>
              <div className="space-y-2 mt-3">
                {THEME_OPTIONS.map((t) => {
                  const on = (theme ?? "dark") === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => onTheme?.(t.key)}
                      className={cn(
                        "as-theme-option flex w-full items-center gap-3 p-3 rounded-xl border text-left transition-all",
                        on
                          ? "border-amber/60 bg-amber/15 shadow-[0_0_12px_rgba(255,171,31,0.15)]"
                          : "border-slate-800 bg-[#0d1927] hover:border-slate-600 hover:bg-[#112235]"
                      )}
                    >
                      <span
                        className="flex h-8 w-11 shrink-0 items-end gap-[2px] overflow-hidden rounded-[4px] p-1 border border-slate-700/60"
                        style={{ background: t.swatch.bg }}
                      >
                        <span className="h-3 flex-1 rounded-[1px]" style={{ background: t.swatch.panel }} />
                        <span className="h-4 flex-1 rounded-[1px]" style={{ background: t.swatch.accent }} />
                        <span className="h-2 flex-1 rounded-[1px]" style={{ background: t.swatch.ink }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-xs font-semibold", on ? "text-amber" : "text-slate-100")}>
                            {t.label}
                          </span>
                          {t.key === "dark" && (
                            <span className="text-[10px] text-slate-400 font-mono">(Default)</span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400 mt-0.5">{t.hint}</span>
                      </div>
                      {on && <Icon name="check" size={16} className="text-amber shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </CustomizableContainer>
          )}
        </SettingsDialog>}
        {error && !settingsSection && <div className="as-error-notice" role="alert">
          <span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><Icon name="x" size={14} /></button>
        </div>}
        {!settingsSection && <span className="as-sr-only" aria-live="polite">{sourceStatus}</span>}

        {studio === "sequencer" && preparedStudio && <AdShopSequencer animation={animation} sources={sequenceSources}
          boxImages={preparedStudio.boxImages} onAddSource={addSequenceSource} onDeleteSource={removeSequenceSource}
          onClose={() => closeStudio()} onOpenGrid={() => setGridOpen(true)} gridConfigurator={gridConfigurator}
          onOpenLibrary={onOpenLibrary}
          onOpenPainter={() => openStudio("painter", true)} onOpenChoreographer={() => openStudio("choreographer", true)} />}
        {(studio === "choreographer" || studio === "painter") && preparedStudio && <LedStudioModal isOpen
          onClose={() => closeStudio(returnToSequencer)} onCloseToFrontPage={() => closeStudio()}
          onSubmitToFrontPage={applyStudioProgram} route={animation.route} onRouteChange={animation.onRouteChange}
          panelCount={16} lastProgram={animation.lastProgram} gridRegionCount={animation.regions.length}
          onOpenGridConfigurator={() => setGridOpen(true)} gridConfigurator={gridConfigurator}
          wallPreview={preparedStudio.wall} initialAssets={preparedStudio.assets}
          secondaryImages={animation.sequence.secondaryImages} initialDesk initialMode={studio === "painter" ? "route" : "show"} />}
        {!studio && gridConfigurator}
      </div>
    </div>
  );
}
