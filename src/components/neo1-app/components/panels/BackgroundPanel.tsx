import {
AlertCircle,
Check,
FolderPlus,
Grid,
Image as ImageIcon,
Layers,
Layout,
Link as LinkIcon,
Maximize,
Minimize,
Palette,
Plus,
Repeat,
RotateCcw,
Sliders,
Sparkles,
Trash2,
Upload,
X,
} from 'lucide-react';
import React,{ useCallback,useRef,useState } from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { BackgroundImageItem,CanvasState,ImageLayer } from '../../types';

interface BackgroundPanelProps {
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  selectedImageLayer: ImageLayer | null;
  customBackgrounds: BackgroundImageItem[];
  onAddCustomBackground: (url: string, name: string) => { isDuplicate: boolean; item: BackgroundImageItem };
  onRemoveCustomBackground: (id: string) => void;
  onClearCustomBackgrounds?: () => void;
  onSelectBackground?: (url: string) => void;
  onCommitBackgroundChange?: (canvas: CanvasState) => void;
  projectFrames?: string[];
}

const samplePresets: BackgroundImageItem[] = [
  {
    id: 'preset-cyber-1',
    name: 'Cyber Neon City',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80',
    category: 'cyberpunk',
  },
  {
    id: 'preset-abstract-1',
    name: 'Dark Abstract Wave',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    category: 'abstract',
  },
  {
    id: 'preset-space-1',
    name: 'Purple Nebula Space',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80',
    category: 'abstract',
  },
  {
    id: 'preset-minimal-1',
    name: 'Geometric Grid Matrix',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80',
    category: 'minimal',
  },
  {
    id: 'preset-cyber-2',
    name: 'Vaporwave Sunset Horizon',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    category: 'cyberpunk',
  },
  {
    id: 'preset-minimal-2',
    name: 'Dark Obsidian Texture',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80',
    category: 'minimal',
  },
];

const colorSwatches = [
  { name: 'Obsidian Black', hex: '#000000' },
  { name: 'Dark Slate', hex: '#0f172a' },
  { name: 'Deep Charcoal', hex: '#1e293b' },
  { name: 'Midnight Navy', hex: '#0a192f' },
  { name: 'Cyber Cyan', hex: '#00f0ff' },
  { name: 'Electric Purple', hex: '#8b5cf6' },
  { name: 'Neon Pink', hex: '#ff007f' },
  { name: 'Emerald Night', hex: '#064e3b' },
  { name: 'Crimson Wine', hex: '#881337' },
  { name: 'Deep Indigo', hex: '#312e81' },
  { name: 'Warm Amber', hex: '#78350f' },
  { name: 'Pure White', hex: '#ffffff' },
];

const gradientPresets = [
  { name: 'Cyber Neon', color1: '#00f0ff', color2: '#ff007f', angle: 45, type: 'linear' as const },
  { name: 'Synthwave', color1: '#8b5cf6', color2: '#ec4899', angle: 135, type: 'linear' as const },
  { name: 'Deep Sea', color1: '#0f172a', color2: '#0284c7', angle: 180, type: 'linear' as const },
  { name: 'Twilight Purple', color1: '#1e1b4b', color2: '#6b21a8', angle: 90, type: 'linear' as const },
  { name: 'Emerald Aura', color1: '#022c22', color2: '#10b981', angle: 120, type: 'linear' as const },
  { name: 'Fire & Ice', color1: '#00f0ff', color2: '#f97316', angle: 60, type: 'linear' as const },
  { name: 'Radial Nebula', color1: '#a855f7', color2: '#0f172a', angle: 0, type: 'radial' as const },
  { name: 'Dark Obsidian', color1: '#18181b', color2: '#09090b', angle: 180, type: 'linear' as const },
];

export const BackgroundPanel: React.FC<BackgroundPanelProps> = ({
  canvasState,
  setCanvasState,
  customBackgrounds,
  onAddCustomBackground,
  onRemoveCustomBackground,
  onClearCustomBackgrounds,
  onSelectBackground,
  onCommitBackgroundChange,
  projectFrames,
}) => {
  const bg = canvasState.background;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlInputError, setUrlInputError] = useState<string | null>(null);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Category filter for presets
  const [presetCategory, setPresetCategory] = useState<'all' | 'custom' | 'frames' | 'cyberpunk' | 'abstract' | 'minimal'>('all');

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Handle File Upload via Drop or Picker
  const handleProcessFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (.png, .jpg, .webp, .svg, .gif).', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const baseName = file.name.replace(/\.[^/.]+$/, '') || 'Custom Background';
        const result = onAddCustomBackground(dataUrl, baseName);

        if (result.isDuplicate) {
          showToast(`Background already in library — applied "${result.item.name}" to canvas!`, 'info');
        } else {
          showToast(`"${result.item.name}" uploaded and applied to canvas!`, 'success');
        }
      };
      reader.readAsDataURL(file);
    },
    [onAddCustomBackground]
  );

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // URL Input Submit
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlInputError('Please enter a valid image URL');
      return;
    }

    setUrlInputError(null);

    // Extract name from URL
    let name = 'Custom Background';
    try {
      const parsedUrl = new URL(trimmed);
      const pathname = parsedUrl.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      if (fileName && fileName.length < 30) {
        name = fileName.replace(/\.[^/.]+$/, '') || name;
      }
    } catch {
      // Data URI or simple path
      name = `Custom BG ${customBackgrounds.length + 1}`;
    }

    const result = onAddCustomBackground(trimmed, name);
    setUrlInput('');

    if (result.isDuplicate) {
      showToast(`URL already exists in library — applied "${result.item.name}" to canvas!`, 'info');
    } else {
      showToast(`"${result.item.name}" added and applied to canvas!`, 'success');
    }
  };

  // Apply Background Selection
  const handleApplyBackground = (url: string) => {
    if (onSelectBackground) {
      onSelectBackground(url);
    } else {
      setCanvasState((prev) => {
        const next = {
          ...prev,
          background: {
            ...prev.background,
            type: 'image' as const,
            imageUrl: url,
          },
        };
        if (onCommitBackgroundChange) onCommitBackgroundChange(next);
        return next;
      });
    }
  };

  // Update Background config helper
  const updateBg = (updates: Partial<typeof bg>, commit = false) => {
    setCanvasState((prev) => {
      const next = {
        ...prev,
        background: {
          ...prev.background,
          ...updates,
        },
      };
      if (commit && onCommitBackgroundChange) onCommitBackgroundChange(next);
      return next;
    });
  };

  // Filtered preset list
  const filteredPresets = samplePresets.filter((p) => {
    if (presetCategory === 'all') return true;
    return p.category === presetCategory;
  });

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 select-none scrollbar-thin scrollbar-thumb-slate-800">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-indigo-400">
          <Layout className="w-5 h-5" />
          <CustomizableLabel
            labelId="neo1-app_panels_background_panel_item_25"
            as="h3"
            className="text-sm font-bold text-slate-100"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_background_panel.h3.canvas_and_background", "Canvas & background")}
                  </>
                )}
          </CustomizableLabel>
        </div>
        {bg.type === 'image' && bg.imageUrl && (
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-medium">
            {uiText("components_neo1_app_components_panels_background_panel.span.image_bg_active", "Image BG Active")}
          </span>
        )}
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border animate-in fade-in slide-in-from-top-1 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
              : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : toastMessage.type === 'warning' ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
          )}
          <span className="flex-1 leading-tight">{toastMessage.text}</span>
          <CustomizableButton
            buttonId="neo1-app_panels_background_panel_btn_24"
            defaultIcon={<X className="w-3.5 h-3.5" />}
            onClick={() => setToastMessage(null)}
className="text-slate-400 hover:text-slate-200 cursor-pointer"
          />
        </div>
      )}

      {/* Canvas Dimensions Presets */}
      <div className="space-y-2">
        <CustomizableLabel
          labelId="neo1-app_panels_background_panel_item_23"
          as="label"
          className="block text-xs font-semibold text-slate-300"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_background_panel.label.canvas_aspect_ratio", "Canvas aspect ratio")}
                </>
              )}
        </CustomizableLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: '1:1 Square', w: 1080, h: 1080, id: 'square' },
            { label: '16:9 Landscape', w: 1920, h: 1080, id: 'landscape' },
            { label: '9:16 Story', w: 1080, h: 1920, id: 'portrait' },
          ].map((preset) => {
            const isMatch = canvasState.width === preset.w && canvasState.height === preset.h;
            return (
              <CustomizableButton
                buttonId="neo1-app_panels_background_panel_btn_22"
                key={preset.id}
onClick={() =>
                  setCanvasState((prev) => ({
                    ...prev,
                    width: preset.w,
                    height: preset.h,
                    activePreset: preset.id,
                  }))
                }
className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                  isMatch
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                  {() => (
                      <>
                        <div>{preset.label}</div>
                      <div className="text-[9px] opacity-70 font-mono font-normal">
                  {preset.w}×{preset.h}
                </div>
                      </>
                    )}
              </CustomizableButton>
            );
          })}
        </div>
      </div>

      {/* Background Type Segmented Switcher */}
      <div>
        <CustomizableLabel
          labelId="neo1-app_panels_background_panel_item_21"
          as="label"
          className="block text-xs font-semibold text-slate-300 mb-2"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_background_panel.label.background_fill_type", "Background fill type")}
                </>
              )}
        </CustomizableLabel>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {[
            { id: 'image', label: 'Image', icon: ImageIcon },
            { id: 'gradient', label: 'Gradient', icon: Sparkles },
            { id: 'color', label: 'Color', icon: Palette },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = bg.type === item.id;
            return (
              <CustomizableButton
                buttonId="neo1-app_panels_background_panel_btn_20"
                key={item.id}
onClick={() => updateBg({ type: item.id as any }, true)}
className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                  {() => (
                      <>
                        <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                      </>
                    )}
              </CustomizableButton>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. IMAGE BACKGROUND TAB */}
      {/* ========================================================================= */}
      {bg.type === 'image' && (
        <div className="space-y-4">
          {/* A. Upload & Drag-and-Drop Dropzone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <CustomizableLabel
                labelId="neo1-app_panels_background_panel_item_19"
                defaultIcon={<Upload className="w-3.5 h-3.5 text-cyan-400" />}
                as="label"
                className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                  {() => (
                      <>
                        <span>{uiText("components_neo1_app_components_panels_background_panel.span.upload_custom_background", "Upload custom background")}</span>
                      </>
                    )}
              </CustomizableLabel>
              <span className="text-[10px] text-slate-400">{uiText("components_neo1_app_components_panels_background_panel.span.png_jpg_webp_svg_gif", "PNG, JPG, WEBP, SVG, GIF")}</span>
            </div>

            {/* Dropzone Container */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group ${
                isDraggingOver
                  ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20 scale-[1.01]'
                  : 'border-slate-800 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessFile(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />

              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 group-hover:border-cyan-500/50 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors shadow-inner">
                <FolderPlus className="w-5 h-5" />
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {isDraggingOver ? 'Drop Image Here!' : 'Drop Image or Click to Browse'}
                </p>
                <p className="text-[10px] text-slate-400">{uiText("components_neo1_app_components_panels_background_panel.p.auto_saved_to_local_library_with_duplicate_p", "Auto-saved to local library with duplicate protection")}</p>
              </div>
            </div>

            {/* Direct Image URL Input */}
            <div className="space-y-1 pt-1">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlInputError) setUrlInputError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddUrl();
                    }}
                    placeholder={uiText("components_neo1_app_components_panels_background_panel.input.paste_image_url.placeholder", "Paste Image URL...")}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <CustomizableButton
                  buttonId="neo1-app_panels_background_panel_btn_18"
                  defaultIcon={<Plus className="w-3.5 h-3.5" />}
                  type="button"
onClick={handleAddUrl}
disabled={!urlInput.trim()}
className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    urlInput.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                    {() => (
                        <>
                          <span>{uiText("components_neo1_app_components_panels_background_panel.span.add_url", "Add URL")}</span>
                        </>
                      )}
                </CustomizableButton>
              </div>
              {urlInputError && <p className="text-[10px] text-rose-400 pl-1">{urlInputError}</p>}
            </div>
          </div>

          {/* B. Custom Library Shelf (persisted in the database-backed store) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  {uiText("components_neo1_app_components_panels_background_panel.span.my_custom_library", "My Custom Library (")}{customBackgrounds.length})
                </span>
              </div>
              {customBackgrounds.length > 0 && onClearCustomBackgrounds && (
                <CustomizableButton
                  buttonId="neo1-app_panels_background_panel_btn_17"
                  onClick={() => {
                    if (window.confirm('Clear all custom backgrounds from library?')) {
                      onClearCustomBackgrounds();
                      showToast('Custom background library cleared.', 'info');
                    }
                  }}
className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                    {() => (
                        <>
                          {uiText("components_neo1_app_components_panels_background_panel.button.clear_all", "Clear All")}
                        </>
                      )}
                </CustomizableButton>
              )}
            </div>

            {customBackgrounds.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-[11px] text-slate-400 space-y-1">
                <p>{uiText("components_neo1_app_components_panels_background_panel.p.no_custom_backgrounds_uploaded_yet", "No custom backgrounds uploaded yet.")}</p>
                <p className="text-[10px] text-slate-500">{uiText("components_neo1_app_components_panels_background_panel.p.drop_an_image_above_or_paste_a_url_to_save_h", "Drop an image above or paste a URL to save here permanently.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
                {customBackgrounds.map((item) => {
                  const isActive = bg.imageUrl === item.url;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleApplyBackground(item.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border transition-all cursor-pointer group ${
                        isActive
                          ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-md shadow-cyan-500/20'
                          : 'border-slate-800 hover:border-indigo-500/70'
                      }`}
                    >
                      <img src={item.thumbnail || item.url} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end justify-between p-1.5">
                        <span className="text-[10px] font-bold text-slate-100 truncate max-w-[80px]" title={item.name}>
                          {item.name}
                        </span>
                        {isActive && (
                          <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Individual Delete Button */}
                      <CustomizableButton
                        buttonId="neo1-app_panels_background_panel_btn_16"
                        defaultIcon={<Trash2 className="w-3 h-3" />}
                        type="button"
onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCustomBackground(item.id);
                          showToast(`Removed "${item.name}" from library.`, 'info');
                        }}
className="absolute top-1 right-1 w-5 h-5 rounded bg-slate-950/80 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow"
title={uiText("components_neo1_app_components_panels_background_panel.button.delete_from_library.title", "Delete from Library")}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* C. Project Frame Selection (if available) */}
          {projectFrames && projectFrames.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">
                    {uiText("components_neo1_app_components_panels_background_panel.span.project_storyboard_frames", "Project Storyboard Frames (")}{projectFrames.length})
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
                {projectFrames.map((frameUrl, idx) => {
                  const isActive = bg.imageUrl === frameUrl;
                  return (
                    <CustomizableButton
                      buttonId="neo1-app_panels_background_panel_btn_15"
                      key={`frame-${idx}`}
onClick={() => handleApplyBackground(frameUrl)}
className={`relative aspect-video rounded-lg overflow-hidden border transition-all cursor-pointer group ${
                        isActive
                          ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                          : 'border-slate-800 hover:border-indigo-500'
                      }`}
title={`Use Frame #${idx + 1} as background`}
                    >
                        {() => (
                            <>
                              <img src={frameUrl} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/10 flex items-end p-1">
                        <span className="text-[9px] font-mono font-bold text-slate-200">#{idx + 1}</span>
                      </div>
                            {isActive && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      )}
                            </>
                          )}
                    </CustomizableButton>
                  );
                })}
              </div>
            </div>
          )}

          {/* D. Preset Backgrounds Showcase */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <CustomizableLabel
                labelId="neo1-app_panels_background_panel_item_14"
                as="label"
                className="text-xs font-semibold text-slate-200"
              >
                  {() => (
                      <>
                        {uiText("components_neo1_app_components_panels_background_panel.label.studio_curated_presets", "Studio curated presets")}
                      </>
                    )}
              </CustomizableLabel>
              {/* Category Pills */}
              <div className="flex gap-1">
                {(['all', 'cyberpunk', 'abstract', 'minimal'] as const).map((cat) => (
                  <CustomizableButton
                    buttonId="neo1-app_panels_background_panel_btn_13"
                    key={cat}
onClick={() => setPresetCategory(cat)}
className={`px-1.5 py-0.5 rounded text-[9px] font-bold capitalize transition-colors cursor-pointer ${
                      presetCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                      {() => (
                          <>
                            {cat}
                          </>
                        )}
                  </CustomizableButton>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredPresets.map((bgItem) => {
                const isActive = bg.imageUrl === bgItem.url;
                return (
                  <CustomizableButton
                    buttonId="neo1-app_panels_background_panel_btn_12"
                    key={bgItem.id}
onClick={() => handleApplyBackground(bgItem.url)}
className={`relative aspect-video rounded-lg overflow-hidden border transition-all cursor-pointer group ${
                      isActive
                        ? 'border-indigo-400 ring-2 ring-indigo-400/40 shadow-md'
                        : 'border-slate-800 hover:border-indigo-500'
                    }`}
                  >
                      {() => (
                          <>
                            <img src={bgItem.thumbnail || bgItem.url} alt={bgItem.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end justify-between p-1.5">
                      <span className="text-[10px] font-bold text-slate-100 truncate max-w-[90px]">{bgItem.name}</span>
                      {isActive && (
                        <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                          </>
                        )}
                  </CustomizableButton>
                );
              })}
            </div>
          </div>

          {/* E. Full Image Controls & Adjustments */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-400">
                <Sliders className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-slate-200">{uiText("components_neo1_app_components_panels_background_panel.span.image_background_adjustments", "Image background adjustments")}</span>
              </div>
              <CustomizableButton
                buttonId="neo1-app_panels_background_panel_btn_11"
                defaultIcon={<RotateCcw className="w-2.5 h-2.5" />}
                onClick={() =>
                  updateBg(
                    {
                      imageOpacity: 0.85,
                      imageBlur: 0,
                      imageBrightness: 100,
                      imageFit: 'cover',
                    },
                    true
                  )
                }
className="text-[10px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
title={uiText("components_neo1_app_components_panels_background_panel.button.reset_adjustments_to_default.title", "Reset adjustments to default")}
              >
                  {() => (
                      <>
                        <span>{uiText("components_neo1_app_components_panels_background_panel.span.reset", "Reset")}</span>
                      </>
                    )}
              </CustomizableButton>
            </div>

            {/* Image Fit Selector */}
            <div className="space-y-1">
              <CustomizableLabel
                labelId="neo1-app_panels_background_panel_item_10"
                as="label"
                className="block text-[11px] font-semibold text-slate-300"
              >
                  {() => (
                      <>
                        {uiText("components_neo1_app_components_panels_background_panel.label.image_fit_mode", "Image fit mode")}
                      </>
                    )}
              </CustomizableLabel>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'cover', label: 'Cover', icon: Maximize },
                  { id: 'contain', label: 'Contain', icon: Minimize },
                  { id: 'stretch', label: 'Stretch', icon: Grid },
                  { id: 'tile', label: 'Tile', icon: Repeat },
                ].map((fitItem) => {
                  const Icon = fitItem.icon;
                  const isSelected = (bg.imageFit || 'cover') === fitItem.id;
                  return (
                    <CustomizableButton
                      buttonId="neo1-app_panels_background_panel_btn_9"
                      key={fitItem.id}
onClick={() => updateBg({ imageFit: fitItem.id as any }, true)}
className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                        {() => (
                            <>
                              <Icon className="w-3.5 h-3.5" />
                            <span>{fitItem.label}</span>
                            </>
                          )}
                    </CustomizableButton>
                  );
                })}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_background_panel.span.opacity", "Opacity")}</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {Math.round((bg.imageOpacity ?? 0.85) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={bg.imageOpacity ?? 0.85}
                onChange={(e) => updateBg({ imageOpacity: Number(e.target.value) })}
                onMouseUp={() => updateBg({}, true)}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Blur Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_background_panel.span.blur", "Blur")}</span>
                <span className="font-mono text-indigo-300 font-bold">{bg.imageBlur ?? 0}{uiText("components_neo1_app_components_panels_background_panel.span.px", "px")}</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={bg.imageBlur ?? 0}
                onChange={(e) => updateBg({ imageBlur: Number(e.target.value) })}
                onMouseUp={() => updateBg({}, true)}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Brightness Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_background_panel.span.brightness", "Brightness")}</span>
                <span className="font-mono text-indigo-300 font-bold">{bg.imageBrightness ?? 100}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                step={2}
                value={bg.imageBrightness ?? 100}
                onChange={(e) => updateBg({ imageBrightness: Number(e.target.value) })}
                onMouseUp={() => updateBg({}, true)}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SOLID COLOR BACKGROUND TAB */}
      {/* ========================================================================= */}
      {bg.type === 'color' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <CustomizableLabel
              labelId="neo1-app_panels_background_panel_item_8"
              as="label"
              className="block text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_background_panel.label.custom_color_picker", "Custom color picker")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <input
                type="color"
                value={bg.color || '#0f172a'}
                onChange={(e) => updateBg({ color: e.target.value }, true)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold text-slate-100 uppercase">{bg.color || '#0f172a'}</span>
                <span className="text-[10px] text-slate-400">{uiText("components_neo1_app_components_panels_background_panel.span.click_swatch_to_pick_color", "Click swatch to pick color")}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <CustomizableLabel
              labelId="neo1-app_panels_background_panel_item_7"
              as="label"
              className="block text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_background_panel.label.studio_palette_swatches", "Studio palette swatches")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="grid grid-cols-4 gap-2">
              {colorSwatches.map((swatch) => (
                <CustomizableButton
                  buttonId="neo1-app_panels_background_panel_btn_6"
                  key={swatch.hex}
onClick={() => updateBg({ color: swatch.hex }, true)}
className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer group ${
                    bg.color === swatch.hex
                      ? 'border-indigo-400 ring-2 ring-indigo-400/40 bg-slate-950'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
title={swatch.name}
                >
                    {() => (
                        <>
                          <div
                    className="w-7 h-7 rounded-lg border border-slate-700 shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: swatch.hex }}
                  >
                    {bg.color === swatch.hex && (
                      <Check
                        className={`w-3.5 h-3.5 ${
                          swatch.hex === '#ffffff' || swatch.hex === '#00f0ff' ? 'text-black' : 'text-white'
                        }`}
                      />
                    )}
                  </div>
                        <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">
                    {swatch.name}
                  </span>
                        </>
                      )}
                </CustomizableButton>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GRADIENT BACKGROUND TAB */}
      {/* ========================================================================= */}
      {bg.type === 'gradient' && (
        <div className="space-y-4">
          {/* Gradient Type */}
          <div className="space-y-2">
            <CustomizableLabel
              labelId="neo1-app_panels_background_panel_item_5"
              as="label"
              className="block text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_background_panel.label.gradient_type_and_direction", "Gradient type & direction")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="grid grid-cols-2 gap-2">
              {(['linear', 'radial'] as const).map((gradType) => (
                <CustomizableButton
                  buttonId="neo1-app_panels_background_panel_btn_4"
                  key={gradType}
onClick={() =>
                    updateBg(
                      {
                        gradient: {
                          ...bg.gradient,
                          type: gradType,
                        },
                      },
                      true
                    )
                  }
className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border cursor-pointer ${
                    bg.gradient.type === gradType
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                    {() => (
                        <>
                          {gradType}
                        </>
                      )}
                </CustomizableButton>
              ))}
            </div>

            {/* Angle Slider for linear */}
            {bg.gradient.type !== 'radial' && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_background_panel.span.linear_angle", "Linear angle")}</span>
                  <span className="font-mono text-indigo-300 font-bold">{bg.gradient.angle || 0}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={5}
                  value={bg.gradient.angle || 0}
                  onChange={(e) =>
                    updateBg({
                      gradient: {
                        ...bg.gradient,
                        angle: Number(e.target.value),
                      },
                    })
                  }
                  onMouseUp={() => updateBg({}, true)}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            )}
          </div>

          {/* Color 1 & Color 2 Pickers */}
          <div className="space-y-2">
            <CustomizableLabel
              labelId="neo1-app_panels_background_panel_item_3"
              as="label"
              className="block text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_background_panel.label.gradient_colors", "Gradient colors")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">{uiText("components_neo1_app_components_panels_background_panel.span.color_1_start", "Color 1 (Start)")}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bg.gradient.color1 || '#0f172a'}
                    onChange={(e) =>
                      updateBg(
                        {
                          gradient: {
                            ...bg.gradient,
                            color1: e.target.value,
                          },
                        },
                        true
                      )
                    }
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[11px] font-mono text-slate-200">{bg.gradient.color1 || '#0f172a'}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">{uiText("components_neo1_app_components_panels_background_panel.span.color_2_end", "Color 2 (End)")}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bg.gradient.color2 || '#3b82f6'}
                    onChange={(e) =>
                      updateBg(
                        {
                          gradient: {
                            ...bg.gradient,
                            color2: e.target.value,
                          },
                        },
                        true
                      )
                    }
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[11px] font-mono text-slate-200">{bg.gradient.color2 || '#3b82f6'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gradient Presets */}
          <div className="space-y-2">
            <CustomizableLabel
              labelId="neo1-app_panels_background_panel_item_2"
              as="label"
              className="block text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_background_panel.label.gradient_presets", "Gradient presets")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="grid grid-cols-2 gap-2">
              {gradientPresets.map((gp) => {
                const isMatch =
                  bg.gradient.color1 === gp.color1 &&
                  bg.gradient.color2 === gp.color2 &&
                  bg.gradient.type === gp.type;
                return (
                  <CustomizableButton
                    buttonId="neo1-app_panels_background_panel_btn_1"
                    key={gp.name}
onClick={() =>
                      updateBg(
                        {
                          gradient: {
                            type: gp.type,
                            angle: gp.angle,
                            color1: gp.color1,
                            color2: gp.color2,
                          },
                        },
                        true
                      )
                    }
className={`h-12 rounded-xl border overflow-hidden relative group cursor-pointer transition-all ${
                      isMatch
                        ? 'border-indigo-400 ring-2 ring-indigo-400/40 shadow-md'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
style={{
                      background:
                        gp.type === 'radial'
                          ? `radial-gradient(circle, ${gp.color1} 0%, ${gp.color2} 100%)`
                          : `linear-gradient(${gp.angle}deg, ${gp.color1} 0%, ${gp.color2} 100%)`,
                    }}
                  >
                      {() => (
                          <>
                            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/10 flex items-end p-1.5">
                      <span className="text-[10px] font-bold text-white shadow-sm drop-shadow">{gp.name}</span>
                    </div>
                          </>
                        )}
                  </CustomizableButton>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
