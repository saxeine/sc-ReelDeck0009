import React,{ useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { AddTextModal } from './components/AddTextModal';
import { CanvasArea } from './components/CanvasArea';
import { ExportModal } from './components/ExportModal';
import { Navbar } from './components/Navbar';
import { BackgroundPanel } from './components/panels/BackgroundPanel';
import { ColorFillPanel } from './components/panels/ColorFillPanel';
import { EffectsPanel } from './components/panels/EffectsPanel';
import { ImageEditorPanel } from './components/panels/ImageEditorPanel';
import { LayersPanel } from './components/panels/LayersPanel';
import { PresetsPanel } from './components/panels/PresetsPanel';
import { TextEditorPanel } from './components/panels/TextEditorPanel';
import { WarpPanel } from './components/panels/WarpPanel';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Sidebar } from './components/Sidebar';

import { Check } from 'lucide-react';
import { remoteStore } from "../../services/remoteKeyValueStore";
import { exportNeo1ToPsd,importPsdFile } from '../../utils/psdExportImport';
import { BackgroundImageItem,CanvasState,ImageLayer,Layer,TextLayer } from './types';
import { preloadCanvasAssets,preloadImage,renderCanvasToContext } from './utils/canvasRender';
import { loadGoogleFont, preloadTextFonts } from './utils/googleFonts';

// Sample initial layers for Neo1 Studio
const initialLayers: Layer[] = [
  {
    id: 'layer-1',
    name: 'Neo1 Main Title',
    type: 'text',
    text: 'NEO1 STUDIO',
    x: 540,
    y: 460,
    width: 650,
    height: 140,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    fontFamily: 'Orbitron',
    fontSize: 64,
    fontWeight: 900,
    fontStyle: 'normal',
    lineHeight: 1.1,
    letterSpacing: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
    verticalAlign: 'middle',
    textDecoration: 'none',
    fillType: 'gradient',
    color: '#00f0ff',
    gradient: {
      enabled: true,
      type: 'linear',
      angle: 45,
      stops: [
        { offset: 0, color: '#00f0ff' },
        { offset: 0.5, color: '#a855f7' },
        { offset: 1, color: '#ff007f' },
      ],
    },
    strokes: [
      {
        enabled: true,
        color: '#ffffff',
        width: 2,
        position: 'outer',
        style: 'solid',
      },
    ],
    shadows: [
      {
        enabled: true,
        color: '#ff007f',
        blur: 25,
        offsetX: 4,
        offsetY: 4,
      },
    ],
    glow: {
      enabled: true,
      color: '#00f0ff',
      blur: 35,
      spread: 10,
    },
    extrusion: {
      enabled: true,
      depth: 14,
      angle: 135,
      color: '#0f172a',
      shadowColor: 'rgba(0,0,0,0.8)',
      lightingAngle: 45,
    },
    bgBox: {
      enabled: false,
      color: '#000000',
      opacity: 0.8,
      paddingX: 20,
      paddingY: 10,
      borderRadius: 8,
      borderWidth: 0,
      borderColor: '#ffffff',
      shape: 'rectangle',
    },
    warp: {
      style: 'none',
      bend: 0,
      horizontalDistortion: 0,
      verticalDistortion: 0,
    },
    circlePath: {
      enabled: false,
      radius: 150,
      startAngle: 0,
      reverse: false,
      spacing: 0,
    },
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
  },
  {
    id: 'layer-2',
    name: 'Subtitle Badge',
    type: 'text',
    text: 'NEXT-GEN GRAPHICS & TYPOGRAPHY',
    x: 540,
    y: 590,
    width: 550,
    height: 45,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    fontFamily: 'Space Grotesk',
    fontSize: 22,
    fontWeight: 700,
    fontStyle: 'normal',
    lineHeight: 1.2,
    letterSpacing: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
    verticalAlign: 'middle',
    textDecoration: 'none',
    fillType: 'solid',
    color: '#ffffff',
    gradient: {
      enabled: false,
      type: 'linear',
      angle: 0,
      stops: [],
    },
    strokes: [],
    shadows: [],
    glow: {
      enabled: false,
      color: '#ffffff',
      blur: 0,
      spread: 0,
    },
    extrusion: {
      enabled: false,
      depth: 0,
      angle: 0,
      color: '#000',
      shadowColor: 'transparent',
      lightingAngle: 0,
    },
    bgBox: {
      enabled: true,
      color: 'rgba(15, 23, 42, 0.85)',
      opacity: 0.9,
      paddingX: 22,
      paddingY: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: '#00f0ff',
      shape: 'pill',
    },
    warp: {
      style: 'none',
      bend: 0,
      horizontalDistortion: 0,
      verticalDistortion: 0,
    },
    circlePath: {
      enabled: false,
      radius: 150,
      startAngle: 0,
      reverse: false,
      spacing: 0,
    },
    opacity: 1,
    blendMode: 'normal',
    visible: false, // Disabled by default as requested
    locked: false,
  },
];

export interface Neo1AppProps {
  initialImage?: string;
  initialWidth?: number;
  initialHeight?: number;
  nextImage?: string;
  prevImage?: string;
  allFrames?: string[];
  slices?: { name: string; url: string }[];
  sliceIndex?: number | null;
  sliceName?: string;
  initialLayers?: Layer[];
  initialCanvasState?: CanvasState;
  onSaveToAssetOrganiser?: (dataUrl: string, sliceIndex?: number | null, sliceName?: string, layers?: Layer[], canvas?: CanvasState) => void;
  onSelectedTextLayerChange?: (layer: TextLayer | null) => void;
  onNavigateFrame?: (index: number) => void;
  onRegisterActions?: (actions: {
    loadProject: (e: any) => void;
    saveProject: () => void;
    openShortcuts: () => void;
    importPSD?: (file: File) => void;
    exportPSD?: () => void;
  }) => void;
}

export function Neo1App({
  initialImage,
  initialWidth,
  initialHeight,
  nextImage,
  allFrames,
  slices,
  sliceIndex,
  sliceName,
  initialLayers: initialLayersProp,
  initialCanvasState,
  onSaveToAssetOrganiser,
  onSelectedTextLayerChange,
  onNavigateFrame,
  onRegisterActions,
}: Neo1AppProps) {
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isSavingComposition, setIsSavingComposition] = useState(false);
  const savingCompositionRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [currentIndex, setCurrentIndex] = useState(sliceIndex || 0);
  const [frames, setFrames] = useState<string[]>(() => {
    if (allFrames && allFrames.length > 0) return allFrames;
    if (slices && slices.length > 0) return slices.map((s) => s.url);
    if (initialImage) return [initialImage];
    return [];
  });
  const [activeImage, setActiveImage] = useState<string | undefined>(() => {
    if (allFrames && allFrames.length > 0) return allFrames[sliceIndex || 0] || allFrames[0];
    if (slices && slices.length > 0) return slices[sliceIndex || 0]?.url || slices[0]?.url;
    return initialImage;
  });

  const [canvasState, setCanvasState] = useState<CanvasState>(() => initialCanvasState ?? ({
    // Frame editing starts at the original image size, not the source app's square preset.
    width: initialWidth || 1080,
    height: initialHeight || 1080,
    zoom: 0.65,
    panX: 0,
    panY: 0,
    background: {
      type: 'image',
      color: initialImage ? 'rgba(0,0,0,0)' : '#0f172a',
      gradient: {
        type: 'linear',
        angle: 135,
        color1: '#0f172a',
        color2: '#3b82f6',
      },
      imageUrl: activeImage || 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
      imageFit: 'cover',
      imageOpacity: 1,
      imageBlur: 0,
      imageBrightness: 100,
    },
    showGrid: false,
    showRulers: true,
    showLayerLabels: (() => {
      try {
        const v = remoteStore.getItem('neo1_show_layer_labels');
        if (v !== null) return v === 'true';
      } catch {}
      return false; // Subtitle badges on canvas disabled by default
    })(),
    showQuickToolbar: (() => {
      try {
        const v = remoteStore.getItem('neo1_show_quick_toolbar');
        if (v !== null) return v === 'true';
      } catch {}
      return false; // Floating layer action toolbar hidden by default as requested
    })(),
    snapToGuides: true,
    activePreset: 'insta-square',
  }));

  // Persist showLayerLabels and showQuickToolbar preferences
  useEffect(() => {
    try {
      remoteStore.setItem('neo1_show_layer_labels', String(Boolean(canvasState.showLayerLabels)));
      remoteStore.setItem('neo1_show_quick_toolbar', String(Boolean(canvasState.showQuickToolbar)));
    } catch {}
  }, [canvasState.showLayerLabels, canvasState.showQuickToolbar]);

  const [layers, setLayers] = useState<Layer[]>(() => {
    if (initialLayersProp) return initialLayersProp;
    return initialImage ? [] : initialLayers;
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() => {
    if (initialLayersProp) return initialLayersProp[0]?.id || null;
    return initialImage ? null : 'layer-1';
  });
  const [activeTab, setActiveTab] = useState<string>('text');

  // Active Preset Preview State (Temporary live preview until applied)
  const [previewPresetStyle, setPreviewPresetStyle] = useState<{
    layerId: string;
    style: Partial<TextLayer>;
    presetId: string;
  } | null>(null);

  // Custom User Background Library (persisted through the database-backed KV store)
  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundImageItem[]>(() => {
    try {
      const saved = remoteStore.getItem('neo1_custom_backgrounds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn('Failed to load neo1_custom_backgrounds from the database-backed store:', err);
    }
    return [];
  });

  // Persist Custom Backgrounds through the database-backed KV store
  useEffect(() => {
    try {
      remoteStore.setItem('neo1_custom_backgrounds', JSON.stringify(customBackgrounds));
    } catch (err) {
      console.warn('Failed to save neo1_custom_backgrounds to the database-backed store:', err);
    }
  }, [customBackgrounds]);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<{ layers: Layer[]; canvas: CanvasState }[]>(() => {
    const initialL = initialLayersProp ?? (initialImage ? [] : initialLayers);
    return [{ layers: initialL, canvas: canvasState }];
  });
  const [historyIndex, setHistoryIndex] = useState(0);

  // Synchronize layers when initialLayers prop changes
  useEffect(() => {
    if (initialLayersProp && initialLayersProp.length > 0) {
      setLayers(initialLayersProp);
      setHistory([{ layers: initialLayersProp, canvas: canvasState }]);
      setHistoryIndex(0);
      setSelectedLayerId(initialLayersProp[0].id);
    } else {
      // Do not overwrite with default preset layers if editing an existing slice
      // unless we are opening for the first time without layers.
    }
  }, [initialLayersProp]);

  // Panel Visibility
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);

  // Modals
  const [isAddTextModalOpen, setIsAddTextModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Synchronize frames when allFrames or slices props change
  useEffect(() => {
    if (allFrames && allFrames.length > 0) {
      setFrames(allFrames);
    } else if (slices && slices.length > 0) {
      setFrames(slices.map((s) => s.url));
    }
  }, [allFrames, slices]);

  // Synchronize index when sliceIndex prop changes
  useEffect(() => {
    if (sliceIndex !== null && sliceIndex !== undefined) {
      setCurrentIndex(sliceIndex);
    }
  }, [sliceIndex]);

  // Update initial background if initialImage changes
  useEffect(() => {
    if (initialImage) {
      setActiveImage(initialImage);
    }
  }, [initialImage]);

  // Update initial background if activeImage changes
  useEffect(() => {
    if (activeImage) {
      setCanvasState((prev) => ({
        ...prev,
        background: { ...prev.background, imageUrl: activeImage },
      }));
    }
  }, [activeImage]);

  // Frame layers cache to preserve annotations across frame navigation
  const frameLayersCache = useRef<Record<string | number, Layer[]>>({});

  const handleNavigate = useCallback(
    (index: number) => {
      if (index >= 0 && index < frames.length) {
        // Cache current layers
        frameLayersCache.current[currentIndex] = layers;
        if (activeImage) {
          frameLayersCache.current[activeImage] = layers;
        }

        const nextUrl = frames[index];
        setCurrentIndex(index);
        setActiveImage(nextUrl);

        // Restore cached layers if available
        const cached = frameLayersCache.current[index] || (nextUrl ? frameLayersCache.current[nextUrl] : null);
        if (cached && cached.length > 0) {
          setLayers(cached);
          setSelectedLayerId(cached[0]?.id || null);
        }

        setCanvasState((prev) => ({
          ...prev,
          background: { ...prev.background, imageUrl: nextUrl },
        }));

        if (onNavigateFrame) {
          onNavigateFrame(index);
        }
      }
    },
    [frames, currentIndex, layers, activeImage, onNavigateFrame]
  );

  // Keyboard shortcut for cycling frames: Alt+Left / Alt+Right or PageUp / PageDown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if ((e.key === "ArrowLeft" && e.altKey) || e.key === "PageUp") {
        e.preventDefault();
        handleNavigate(Math.max(0, currentIndex - 1));
      } else if ((e.key === "ArrowRight" && e.altKey) || e.key === "PageDown") {
        e.preventDefault();
        handleNavigate(Math.min(frames.length - 1, currentIndex + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNavigate, currentIndex, frames.length]);

  // Preload initial fonts & background image
  useEffect(() => {
    loadGoogleFont('Orbitron');
    loadGoogleFont('Space Grotesk');
    loadGoogleFont('Montserrat');
    loadGoogleFont('Bebas Neue');
    loadGoogleFont('Playfair Display');
    if (initialImage) preloadImage(initialImage).catch(() => {});
    else if (!initialCanvasState) preloadImage('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80').catch(() => {});
    if (nextImage) preloadImage(nextImage).catch(() => {});
  }, [initialImage, nextImage]);

  // Save State to History
  const saveStateToHistory = useCallback(
    (newLayers: Layer[], newCanvas: CanvasState) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { layers: newLayers, canvas: newCanvas }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const state = history[prevIndex];
      setLayers(state.layers);
      setCanvasState(state.canvas);
      setHistoryIndex(prevIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      setLayers(state.layers);
      setCanvasState(state.canvas);
      setHistoryIndex(nextIndex);
    }
  };

  // Add Text Layer with Custom Text Input & Ensure Text Editor Panel Focus
  const handleAddText = (presetStyle?: Partial<TextLayer>, customText?: string) => {
    const newId = `layer-${Date.now()}`;
    const defaultText = customText !== undefined ? customText : presetStyle?.text || 'NEO1 STUDIO';

    const newTextLayer: TextLayer = {
      id: newId,
      name: defaultText.slice(0, 15) || `Text ${layers.length + 1}`,
      type: 'text',
      text: defaultText,
      x: canvasState.width / 2,
      y: canvasState.height / 2 + (layers.length % 4) * 30 - 30,
      width: 450,
      height: 90,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      fontFamily: 'Montserrat',
      fontSize: 70,
      fontWeight: 800,
      fontStyle: 'normal',
      lineHeight: 1.2,
      letterSpacing: 2,
      textTransform: 'none',
      textAlign: 'center',
      verticalAlign: 'middle',
      textDecoration: 'none',
      fillType: 'solid',
      color: '#ffffff',
      gradient: {
        enabled: false,
        type: 'linear',
        angle: 45,
        stops: [
          { offset: 0, color: '#00f0ff' },
          { offset: 1, color: '#f43f5e' },
        ],
      },
      strokes: [],
      shadows: [
        {
          enabled: true,
          color: 'rgba(0,0,0,0.6)',
          blur: 10,
          offsetX: 4,
          offsetY: 4,
        },
      ],
      glow: { enabled: false, color: '#00f0ff', blur: 20, spread: 5 },
      extrusion: {
        enabled: false,
        depth: 10,
        angle: 135,
        color: '#1e293b',
        shadowColor: 'rgba(0,0,0,0.5)',
        lightingAngle: 45,
      },
      bgBox: {
        enabled: false,
        color: '#111827',
        opacity: 0.9,
        paddingX: 20,
        paddingY: 10,
        borderRadius: 8,
        borderWidth: 0,
        borderColor: '#ffffff',
        shape: 'rectangle',
      },
      warp: {
        style: 'none',
        bend: 0,
        horizontalDistortion: 0,
        verticalDistortion: 0,
      },
      circlePath: {
        enabled: false,
        radius: 150,
        startAngle: 0,
        reverse: false,
        spacing: 0,
      },
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      ...presetStyle,
    };

    if (presetStyle?.fontFamily) {
      loadGoogleFont(presetStyle.fontFamily);
    }

    const nextLayers = [...layers, newTextLayer];
    setLayers(nextLayers);
    setSelectedLayerId(newId);
    if (activeTab !== 'presets') setActiveTab('text');
    saveStateToHistory(nextLayers, canvasState);
  };

  // Import Photoshop PSD file with preserved layers
  const handleImportPSD = async (file: File) => {
    try {
      const result = await importPsdFile(file);
      if (!result.layers || result.layers.length === 0) {
        alert('No layers found in the PSD file.');
        return;
      }

      // Preload layer images
      await Promise.all(result.layers.map((l) => preloadImage(l.src)));

      const newCanvasState: CanvasState = {
        ...canvasState,
        width: result.width,
        height: result.height,
        // The PSD already includes its background as a layer. Keeping the
        // previous frame beneath it would double-composite translucent pixels.
        background: { ...canvasState.background, type: 'color', color: 'transparent', imageUrl: '' },
      };

      setCanvasState(newCanvasState);
      setLayers(result.layers);
      setSelectedLayerId(result.layers[result.layers.length - 1]?.id || null);
      saveStateToHistory(result.layers, newCanvasState);
      setSaveToast(`✓ Imported ${result.layers.length} layers from "${file.name}"!`);
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err) {
      console.error('Failed to import PSD:', err);
      alert('Failed to import PSD file. Please verify it is a valid Photoshop document.');
    }
  };

  // Export current Neo1 workspace to multi-layer PSD file
  const handleExportPSD = async () => {
    try {
      const activeProjectName = slices?.[currentIndex]?.name || sliceName || `neo1-design-${Date.now()}`;
      await exportNeo1ToPsd(canvasState, layers, activeProjectName);
      setSaveToast(`✓ Exported multi-layer PSD "${activeProjectName}.psd"!`);
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err) {
      console.error('Failed to export PSD:', err);
      alert('Failed to export PSD file.');
    }
  };

  // Upload Image Layer
  const handleUploadImage = (file: File) => {
    if (file.name.toLowerCase().endsWith('.psd') || file.type === 'image/vnd.adobe.photoshop') {
      handleImportPSD(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (!url) return;

      preloadImage(url);
      const newId = `image-${Date.now()}`;
      const imageName = file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Image';

      const newImageLayer: ImageLayer = {
        id: newId,
        name: imageName,
        type: 'image',
        src: url,
        x: canvasState.width / 2,
        y: canvasState.height / 2,
        width: 450,
        height: 450,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        sepia: 0,
        grayscale: 0,
        hueRotate: 0,
        vignette: 0,
        keepAspectRatio: true,
        warp: {
          style: 'none',
          bend: 0,
          horizontalDistortion: 0,
          verticalDistortion: 0,
        },
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: false,
      };

      const nextLayers = [...layers, newImageLayer];
      setLayers(nextLayers);
      setSelectedLayerId(newId);
      setActiveTab('image');
      saveStateToHistory(nextLayers, canvasState);
    };
    reader.readAsDataURL(file);
  };

  // Add Custom Background with Duplicate Prevention, Auto-Selection, Preloading, and Undo/Redo tracking
  const handleAddCustomBackground = (url: string, name: string): { isDuplicate: boolean; item: BackgroundImageItem } => {
    const trimmedUrl = url.trim();
    preloadImage(trimmedUrl).catch(() => {});

    // Check for duplicates
    const existing = customBackgrounds.find((b) => b.url === trimmedUrl);

    const nextCanvasState: CanvasState = {
      ...canvasState,
      background: {
        ...canvasState.background,
        type: 'image',
        imageUrl: trimmedUrl,
      },
    };

    setCanvasState(nextCanvasState);
    saveStateToHistory(layers, nextCanvasState);

    if (existing) {
      return { isDuplicate: true, item: existing };
    }

    const newItem: BackgroundImageItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || 'Custom Background',
      url: trimmedUrl,
      thumbnail: trimmedUrl,
      category: 'custom',
      isCustom: true,
      createdAt: Date.now(),
    };

    setCustomBackgrounds((prev) => [newItem, ...prev]);
    return { isDuplicate: false, item: newItem };
  };

  // Remove from Custom Background Library
  const handleRemoveCustomBackground = (id: string) => {
    setCustomBackgrounds((prev) => prev.filter((b) => b.id !== id));
  };

  // Clear all custom backgrounds from library
  const handleClearCustomBackgrounds = () => {
    setCustomBackgrounds([]);
    try {
      remoteStore.removeItem('neo1_custom_backgrounds');
    } catch (e) {}
  };

  // Select any background image with preloading and history tracking
  const handleSelectBackground = (url: string) => {
    const trimmedUrl = url.trim();
    preloadImage(trimmedUrl).catch(() => {});

    const nextCanvasState: CanvasState = {
      ...canvasState,
      background: {
        ...canvasState.background,
        type: 'image',
        imageUrl: trimmedUrl,
      },
    };

    setCanvasState(nextCanvasState);
    saveStateToHistory(layers, nextCanvasState);
  };

  // Commit background property change to undo/redo history
  const handleCommitBackgroundChange = (newCanvas: CanvasState) => {
    saveStateToHistory(layers, newCanvas);
  };

  // Update Layer
  const handleUpdateLayer = (id: string, updatedProps: Partial<Layer>) => {
    if (previewPresetStyle) {
      setPreviewPresetStyle(null);
    }
    const nextLayers = layers.map((l) => (l.id === id ? ({ ...l, ...updatedProps } as Layer) : l));
    setLayers(nextLayers);
  };

  // Delete Layer
  const handleDeleteLayer = (id: string) => {
    const nextLayers = layers.filter((l) => l.id !== id);
    setLayers(nextLayers);
    if (selectedLayerId === id) {
      setSelectedLayerId(nextLayers.length > 0 ? nextLayers[nextLayers.length - 1].id : null);
    }
    saveStateToHistory(nextLayers, canvasState);
  };

  // Duplicate Layer
  const handleDuplicateLayer = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;

    const newId = `${target.type}-${Date.now()}`;
    const duplicated: Layer = {
      ...target,
      id: newId,
      name: `${target.name} Copy`,
      x: target.x + 25,
      y: target.y + 25,
    };

    const nextLayers = [...layers, duplicated];
    setLayers(nextLayers);
    setSelectedLayerId(newId);
    saveStateToHistory(nextLayers, canvasState);
  };

  // Move Layer Order
  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    const nextLayers = [...layers];
    const [moved] = nextLayers.splice(index, 1);
    nextLayers.splice(newIndex, 0, moved);

    setLayers(nextLayers);
    saveStateToHistory(nextLayers, canvasState);
  };

  // Save Project JSON
  const handleSaveProjectJSON = () => {
    const projectData = {
      app: 'Neo1 Studio',
      version: '1.0',
      timestamp: Date.now(),
      canvasState,
      layers,
      customBackgrounds,
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neo1-project-${Date.now()}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      } catch {}
    }, 1500);
  };

  // Load Saved JSON Project
  const handleLoadProjectJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.canvasState && Array.isArray(parsed.layers)) {
          setCanvasState(parsed.canvasState);
          setLayers(parsed.layers);
          if (Array.isArray(parsed.customBackgrounds)) {
            setCustomBackgrounds(parsed.customBackgrounds);
          }
          if (parsed.layers.length > 0) {
            setSelectedLayerId(parsed.layers[0].id);
          }
          saveStateToHistory(parsed.layers, parsed.canvasState);
        }
      } catch (err) {
        alert('Invalid Neo1 project JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Prop registration callback for parent modal to trigger load, save, shortcuts, and PSD actions
  useEffect(() => {
    if (onRegisterActions) {
      onRegisterActions({
        loadProject: handleLoadProjectJSON,
        saveProject: handleSaveProjectJSON,
        openShortcuts: () => setIsShortcutsModalOpen(true),
        importPSD: handleImportPSD,
        exportPSD: handleExportPSD,
      });
    }
  }, [onRegisterActions, handleLoadProjectJSON, handleSaveProjectJSON, handleImportPSD, handleExportPSD]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input, textarea, [contenteditable="true"]'))
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedLayerId) {
          handleDuplicateLayer(selectedLayerId);
          e.preventDefault();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLayerId) {
          handleDeleteLayer(selectedLayerId);
          e.preventDefault();
        }
      } else if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setCanvasState((prev) => ({
          ...prev,
          showLayerLabels: !prev.showLayerLabels,
        }));
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setCanvasState((prev) => ({
          ...prev,
          showQuickToolbar: !prev.showQuickToolbar,
        }));
        e.preventDefault();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedLayerId) {
          const step = e.shiftKey ? 10 : 1;
          const current = layers.find((l) => l.id === selectedLayerId);
          if (current) {
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowUp') dy = -step;
            if (e.key === 'ArrowDown') dy = step;
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;

            handleUpdateLayer(selectedLayerId, { x: current.x + dx, y: current.y + dy });
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, layers, historyIndex, history]);

  const displayLayers = useMemo(() => {
    if (!previewPresetStyle || !selectedLayerId) return layers;
    return layers.map((layer) => {
      if (layer.id === previewPresetStyle.layerId && layer.type === 'text') {
        return {
          ...layer,
          ...previewPresetStyle.style,
        } as TextLayer;
      }
      return layer;
    });
  }, [layers, previewPresetStyle, selectedLayerId]);

  const selectedLayer = displayLayers.find((l) => l.id === selectedLayerId);
  const selectedTextLayer = selectedLayer && selectedLayer.type === 'text' ? (selectedLayer as TextLayer) : null;
  const selectedImageLayer = selectedLayer && selectedLayer.type === 'image' ? (selectedLayer as ImageLayer) : null;

  useEffect(() => {
    if (onSelectedTextLayerChange) {
      onSelectedTextLayerChange(selectedTextLayer);
    }
  }, [selectedTextLayer, onSelectedTextLayerChange]);

  const handleSavePreset = useCallback((presetName: string) => {
    if (!selectedTextLayer) return;
    const newPreset = {
      id: `custom_${Date.now()}`,
      name: presetName.trim() || selectedTextLayer.text.slice(0, 15) || 'My Custom Style',
      style: {
        fontFamily: selectedTextLayer.fontFamily,
        fontSize: selectedTextLayer.fontSize,
        fontWeight: selectedTextLayer.fontWeight,
        fontStyle: selectedTextLayer.fontStyle,
        lineHeight: selectedTextLayer.lineHeight,
        letterSpacing: selectedTextLayer.letterSpacing,
        textTransform: selectedTextLayer.textTransform,
        textAlign: selectedTextLayer.textAlign,
        verticalAlign: selectedTextLayer.verticalAlign,
        textDecoration: selectedTextLayer.textDecoration,
        fillType: selectedTextLayer.fillType,
        color: selectedTextLayer.color,
        gradient: selectedTextLayer.gradient,
        strokes: selectedTextLayer.strokes,
        shadows: selectedTextLayer.shadows,
        glow: selectedTextLayer.glow,
        extrusion: selectedTextLayer.extrusion,
        bgBox: selectedTextLayer.bgBox,
        warp: selectedTextLayer.warp,
        circlePath: selectedTextLayer.circlePath,
      },
      isCustom: true,
    };

    try {
      const saved = remoteStore.getItem('neo1_custom_typography_presets');
      const currentPresets = saved ? JSON.parse(saved) : [];
      const updatedPresets = [newPreset, ...currentPresets];
      remoteStore.setItem('neo1_custom_typography_presets', JSON.stringify(updatedPresets));

      // Dispatch custom event to notify PresetsPanel
      window.dispatchEvent(new Event('neo1_presets_updated'));
    } catch (e) {
      console.error('Failed to save preset', e);
    }
  }, [selectedTextLayer]);

  // The original editor renders through a shared image cache. Await every
  // visible image before saving so an early click can never replace a frame
  // with an empty background or missing image layer.
  const renderComposition = useCallback(async () => {
    await Promise.all([
      preloadCanvasAssets(canvasState, displayLayers),
      preloadTextFonts(displayLayers),
    ]);
    const offCanvas = document.createElement('canvas');
    offCanvas.width = canvasState.width;
    offCanvas.height = canvasState.height;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable.');
    renderCanvasToContext(ctx, canvasState, displayLayers);
    const result = offCanvas.toDataURL('image/png');
    if (!result.startsWith('data:image/png;base64,')) throw new Error('Canvas is too large to export.');
    return result;
  }, [canvasState, displayLayers]);

  const handleBurnToStoryboard = useCallback(async () => {
    if (savingCompositionRef.current) return;
    savingCompositionRef.current = true;
    setIsSavingComposition(true);
    try {
      const dataUrl = await renderComposition();
      if (!mountedRef.current) return;
      if (onSaveToAssetOrganiser) {
        const currentName = slices?.[currentIndex]?.name || sliceName || `Frame ${currentIndex + 1}`;
        onSaveToAssetOrganiser(dataUrl, currentIndex, currentName, displayLayers, canvasState);
        setSaveToast(`Saved to ReelDeck: ${currentName}!`);
      } else {
        const a = document.createElement('a');
        a.download = `burned-storyboard-${currentIndex + 1}.png`;
        a.href = dataUrl;
        a.click();
        setSaveToast('Composition downloaded.');
      }
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error('Failed to save composition:', err);
      if (mountedRef.current) {
        setSaveToast('Could not save. Check that all images are loaded and accessible.');
        setTimeout(() => setSaveToast(null), 5000);
      }
    } finally {
      savingCompositionRef.current = false;
      if (mountedRef.current) setIsSavingComposition(false);
    }
  }, [renderComposition, onSaveToAssetOrganiser, currentIndex, slices, sliceName, displayLayers, canvasState]);

  const handleSaveToOrganiser = handleBurnToStoryboard;

  const handleSaveAsNewToOrganiser = useCallback(async () => {
    if (savingCompositionRef.current) return;
    savingCompositionRef.current = true;
    setIsSavingComposition(true);
    try {
      const dataUrl = await renderComposition();
      if (!mountedRef.current) return;
      if (onSaveToAssetOrganiser) {
        const currentName = slices?.[currentIndex]?.name || sliceName || `Frame ${currentIndex + 1}`;
        const newName = `${currentName} (Neo1)`;
        onSaveToAssetOrganiser(dataUrl, null, newName, displayLayers, canvasState);
        setSaveToast(`Saved as a new ReelDeck frame: ${newName}!`);
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save composition:', err);
      if (mountedRef.current) {
        setSaveToast('Could not save. Check that all images are loaded and accessible.');
        setTimeout(() => setSaveToast(null), 5000);
      }
    } finally {
      savingCompositionRef.current = false;
      if (mountedRef.current) setIsSavingComposition(false);
    }
  }, [renderComposition, onSaveToAssetOrganiser, currentIndex, slices, sliceName, displayLayers, canvasState]);

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 font-sans overflow-hidden text-slate-100 relative">
      {saveToast && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-500 text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddText={handleAddText}
        onOpenAddTextModal={() => setIsAddTextModalOpen(true)}
        onUploadImage={handleUploadImage}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onSaveProject={handleSaveProjectJSON}
        onLoadProject={handleLoadProjectJSON}
        onBurnToStoryboard={handleBurnToStoryboard}
        isSavingComposition={isSavingComposition}
        onSaveToAssetOrganiser={onSaveToAssetOrganiser ? handleSaveToOrganiser : undefined}
        onSaveAsNewToOrganiser={onSaveToAssetOrganiser ? handleSaveAsNewToOrganiser : undefined}
        onImportPSD={handleImportPSD}
        onExportPSD={handleExportPSD}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        layerCount={layers.length}
        currentIndex={currentIndex}
        allFramesCount={frames.length}
        onNavigate={handleNavigate}
        isLeftPanelVisible={isLeftPanelVisible}
        onToggleLeftPanel={() => setIsLeftPanelVisible((prev) => !prev)}
        selectedTextLayer={selectedTextLayer}
        onSavePreset={handleSavePreset}
        sliceName={slices?.[currentIndex]?.name || sliceName || `Frame ${currentIndex + 1}`}
      />

      {/* Main Workspace Layout */}
      <div className={`neo1-workspace flex-1 flex overflow-hidden relative ${isLeftPanelVisible ? "" : "panel-hidden"}`}>
        {/* Left Vertical Tool Sidebar & Active Control Panel */}
        {isLeftPanelVisible && (
          <>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                if (tab !== 'presets') {
                  setPreviewPresetStyle(null);
                }
                setActiveTab(tab);
              }}
              onTogglePanel={() => setIsLeftPanelVisible(false)}
            />

            {/* Active Tool Sidebar Panel */}
            {activeTab === 'presets' && (
              <PresetsPanel
                onApplyPreset={(preset) => {
                  if (selectedLayerId) {
                    const nextLayers = layers.map((l) => (l.id === selectedLayerId ? ({ ...l, ...preset } as Layer) : l));
                    setLayers(nextLayers);
                    saveStateToHistory(nextLayers, canvasState);
                  }
                }}
                onPreviewPreset={(style, presetId) => {
                  if (selectedLayerId && style && presetId) {
                    setPreviewPresetStyle({ layerId: selectedLayerId, style, presetId });
                  } else {
                    setPreviewPresetStyle(null);
                  }
                }}
                onAddTextWithPreset={handleAddText}
                selectedTextLayer={selectedTextLayer}
                activePreviewPresetId={previewPresetStyle?.presetId || null}
              />
            )}

            {activeTab === 'text' && (
              <TextEditorPanel
                layer={selectedTextLayer}
                onUpdateLayer={(updated) => selectedLayerId && handleUpdateLayer(selectedLayerId, updated)}
                onAddText={handleAddText}
                onDeleteLayer={handleDeleteLayer}
              />
            )}

            {activeTab === 'image' && (
              <ImageEditorPanel
                layer={selectedImageLayer}
                onUpdateLayer={(updated) => selectedLayerId && handleUpdateLayer(selectedLayerId, updated)}
                onAddToBackgroundLibrary={handleAddCustomBackground}
                onOpenWarpTab={() => setActiveTab('warp')}
                onUploadImage={handleUploadImage}
                onDeleteLayer={handleDeleteLayer}
                onTogglePanel={() => setIsLeftPanelVisible(false)}
              />
            )}

            {activeTab === 'warp' && (
              <WarpPanel
                layer={selectedLayer || null}
                onUpdateLayer={(updated) => selectedLayerId && handleUpdateLayer(selectedLayerId, updated)}
              />
            )}

            {activeTab === 'color' && (
              <ColorFillPanel
                layer={selectedTextLayer}
                onUpdateLayer={(updated) => selectedLayerId && handleUpdateLayer(selectedLayerId, updated)}
              />
            )}

            {activeTab === 'effects' && (
              <EffectsPanel
                layer={selectedTextLayer}
                onUpdateLayer={(updated) => selectedLayerId && handleUpdateLayer(selectedLayerId, updated)}
              />
            )}

            {activeTab === 'background' && (
              <BackgroundPanel
                canvasState={canvasState}
                setCanvasState={setCanvasState}
                selectedImageLayer={selectedImageLayer}
                customBackgrounds={customBackgrounds}
                onAddCustomBackground={handleAddCustomBackground}
                onRemoveCustomBackground={handleRemoveCustomBackground}
                onClearCustomBackgrounds={handleClearCustomBackgrounds}
                onSelectBackground={handleSelectBackground}
                onCommitBackgroundChange={handleCommitBackgroundChange}
                projectFrames={allFrames || frames}
              />
            )}

            {activeTab === 'layers' && (
              <LayersPanel
                layers={layers}
                selectedLayerId={selectedLayerId}
                onSelectLayer={(id) => {
                  setSelectedLayerId(id);
                  const target = layers.find((l) => l.id === id);
                  if (target && target.type === 'text') setActiveTab('text');
                  if (target && target.type === 'image') setActiveTab('image');
                }}
                onUpdateLayer={handleUpdateLayer}
                onDeleteLayer={handleDeleteLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onMoveLayer={handleMoveLayer}
                onAddText={handleAddText}
                showLayerLabels={Boolean(canvasState.showLayerLabels)}
                onToggleLayerLabels={() =>
                  setCanvasState((prev) => ({
                    ...prev,
                    showLayerLabels: !prev.showLayerLabels,
                  }))
                }
              />
            )}
          </>
        )}

        {/* Interactive Canvas Workspace */}
        <CanvasArea
          canvasState={canvasState}
          setCanvasState={setCanvasState}
          layers={displayLayers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={(id) => {
            setSelectedLayerId(id);
            if (id) {
              const target = layers.find((l) => l.id === id);
              if (target && target.type === 'image' && activeTab === 'text') {
                setActiveTab('image');
              } else if (target && target.type === 'text' && activeTab === 'image') {
                setActiveTab('text');
              }
            }
          }}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onMoveLayer={handleMoveLayer}
          onToggleLayerLabels={() =>
            setCanvasState((prev) => ({
              ...prev,
              showLayerLabels: !prev.showLayerLabels,
            }))
          }
        />
      </div>

      {/* Add Text Dialog Modal with Prompt Input */}
      <AddTextModal
        isOpen={isAddTextModalOpen}
        onClose={() => setIsAddTextModalOpen(false)}
        onAddText={handleAddText}
      />

      {/* Export & Shortcuts Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        canvasState={canvasState}
        layers={layers}
        onSaveProjectJSON={handleSaveProjectJSON}
        onBurnToStoryboard={handleBurnToStoryboard}
        onExportPSD={handleExportPSD}
        projectName={slices?.[currentIndex]?.name || sliceName || 'neo1-design'}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export default Neo1App;
