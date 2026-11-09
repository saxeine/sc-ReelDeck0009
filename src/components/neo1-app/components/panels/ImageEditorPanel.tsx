import {
Check,
ChevronDown,
ChevronUp,
Eye,
EyeOff,
FlipHorizontal,
FlipVertical,
Image as ImageIcon,
PanelLeftClose,
PanelLeftOpen,
Pipette,
RefreshCw,
RotateCw,
Sliders,
Sparkles,
Trash2,
Upload,
Wand2
} from 'lucide-react';
import React,{ useRef,useState } from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { ChromaKeyConfig,ImageLayer,WarpConfig } from '../../types';

interface ImageEditorPanelProps {
  layer: ImageLayer | null;
  onUpdateLayer: (updatedProps: Partial<ImageLayer>) => void;
  onAddToBackgroundLibrary: (url: string, name: string) => void;
  onOpenWarpTab?: () => void;
  onUploadImage: (file: File) => void;
  onDeleteLayer?: (id: string) => void;
  onTogglePanel?: () => void;
}

export const ImageEditorPanel: React.FC<ImageEditorPanelProps> = ({
  layer,
  onUpdateLayer,
  onAddToBackgroundLibrary,
  onUploadImage,
  onDeleteLayer,
  onTogglePanel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Panel show/hide collapse state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Transformers fold up/down state - DEFAULT IS ALL UP (COLLAPSED / FALSE)
  const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>({
    basic: false,
    transformers: false,
    chroma: false,
  });

  const toggleFolder = (key: string) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [isSavedToBg, setIsSavedToBg] = useState(false);

  const handleSaveToBackgrounds = () => {
    if (!layer) return;
    onAddToBackgroundLibrary(layer.src, layer.name);
    setIsSavedToBg(true);
    setTimeout(() => setIsSavedToBg(false), 2000);
  };

  if (isPanelCollapsed) {
    return (
      <div className="w-12 bg-slate-900 border-r border-slate-800 py-4 flex flex-col items-center gap-4 shrink-0 select-none">
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_26"
          defaultIcon={<PanelLeftOpen className="w-5 h-5" />}
          onClick={() => setIsPanelCollapsed(false)}
className="p-2 hover:bg-slate-800 text-purple-400 rounded-xl transition-all cursor-pointer"
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.show_image_layer_controls.title", "Show Image Layer Controls")}
        />
        <div className="w-8 h-px bg-slate-800" />
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_25"
          defaultIcon={<Sliders className="w-4 h-4" />}
          onClick={() => setIsPanelCollapsed(false)}
className="p-2 hover:bg-slate-800 text-slate-400 hover:text-purple-300 rounded-xl transition-all cursor-pointer"
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.expand_controls.title", "Expand Controls")}
        />
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_24"
          defaultIcon={<Wand2 className="w-4 h-4" />}
          onClick={() => setIsPanelCollapsed(false)}
className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-300 rounded-xl transition-all cursor-pointer"
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.expand_transformers.title", "Expand Transformers")}
        />
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_23"
          defaultIcon={<Sparkles className="w-4 h-4" />}
          onClick={() => setIsPanelCollapsed(false)}
className="p-2 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 rounded-xl transition-all cursor-pointer"
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.expand_chroma_key.title", "Expand Chroma Key")}
        />
      </div>
    );
  }

  if (!layer) {
    return (
      <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-3 shrink-0 select-none">
        <ImageIcon className="w-10 h-10 text-slate-600" />
        <p className="text-xs text-slate-400 font-medium">{uiText("components_neo1_app_components_panels_image_editor_panel.p.no_image_layer_selected", "No image layer selected.")}</p>
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_22"
          defaultIcon={<Upload className="w-4 h-4" />}
          onClick={() => fileInputRef.current?.click()}
className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
        >
            {() => (
                <>
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.upload_image", "Upload Image")}</span>
                </>
              )}
        </CustomizableButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadImage(f);
          }}
          className="hidden"
        />
      </div>
    );
  }

  // Active layer warp and chroma defaults
  const warpConfig: WarpConfig = layer.warp || {
    style: 'none',
    bend: 0,
    horizontalDistortion: 0,
    verticalDistortion: 0,
  };

  const chromaConfig: ChromaKeyConfig = layer.chromaKey || {
    enabled: false,
    keyColor: '#00ff00',
    tolerance: 30,
    smoothness: 10,
    spillSuppression: 50,
    invert: false,
  };

  const handlePickEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          onUpdateLayer({
            chromaKey: {
              ...chromaConfig,
              keyColor: result.sRGBHex,
              enabled: true,
            },
          });
        }
      } catch (err) {
        console.warn('Eyedropper cancelled or failed', err);
      }
    }
  };

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto space-y-3 shrink-0 select-none scrollbar-thin scrollbar-thumb-slate-800">
      {/* Top Header Bar with Panel Show/Hide Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-purple-400">
          <ImageIcon className="w-5 h-5 shrink-0" />
          <div className="flex flex-col">
            <CustomizableLabel
              labelId="neo1-app_panels_image_editor_panel_item_21"
              as="h3"
              className="text-sm font-bold text-slate-100 leading-none"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_image_editor_panel.h3.image_controls", "Image controls")}
                    </>
                  )}
            </CustomizableLabel>
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]" title={layer.name}>
              {layer.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Hide Panel Toggle Button */}
          <CustomizableButton
            buttonId="neo1-app_panels_image_editor_panel_btn_20"
            defaultIcon={<PanelLeftClose className="w-4 h-4" />}
            onClick={() => {
              if (onTogglePanel) {
                onTogglePanel();
              } else {
                setIsPanelCollapsed(true);
              }
            }}
className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.hide_panel.title", "Hide Panel")}
          />

          {onDeleteLayer && (
            <CustomizableButton
              buttonId="neo1-app_panels_image_editor_panel_btn_19"
              defaultIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => onDeleteLayer(layer.id)}
className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 rounded-lg transition-all cursor-pointer"
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.delete_layer.title", "Delete Layer")}
            />
          )}
        </div>
      </div>

      {/* Layer Visibility & Quick Actions */}
      <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <CustomizableButton
            buttonId="neo1-app_panels_image_editor_panel_btn_18"
            onClick={() => onUpdateLayer({ visible: !layer.visible })}
className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              layer.visible
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.toggle_layer_visibility.title", "Toggle Layer Visibility")}
          >
              {() => (
                  <>
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{layer.visible ? 'Visible' : 'Hidden'}</span>
                  </>
                )}
          </CustomizableButton>
        </div>

        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_17"
          onClick={handleSaveToBackgrounds}
className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
            isSavedToBg
              ? 'bg-emerald-600/90 text-white border border-emerald-500'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
            {() => (
                <>
                  {isSavedToBg ? (
            <>
              <Check className="w-3 h-3 text-white" />
              <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.saved", "Saved!")}</span>
            </>
          ) : (
            <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.save_to_backgrounds", "Save to Backgrounds")}</span>
          )}
                </>
              )}
        </CustomizableButton>
      </div>

      {/* FOLDER 1: BASIC TRANSFORM & ADJUSTMENTS (DEFAULT UP / COLLAPSED) */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_16"
          onClick={() => toggleFolder('basic')}
className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 transition-colors cursor-pointer"
        >
            {() => (
                <>
                  <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.1_dimensions_and_adjustments", "1. Dimensions & Adjustments")}</span>
          </div>
                {openFolders.basic ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
                </>
              )}
        </CustomizableButton>

        {openFolders.basic && (
          <div className="p-3 space-y-3.5 border-t border-slate-800/80 text-xs animate-in fade-in duration-150">
            {/* Width & Height */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <CustomizableLabel
                  labelId="neo1-app_panels_image_editor_panel_item_15"
                  as="label"
                  className="block text-[11px] font-semibold text-slate-300 mb-1"
                >
                    {() => (
                        <>
                          {uiText("components_neo1_app_components_panels_image_editor_panel.label.width", "Width: ")}
                        <span className="text-purple-400 font-mono">{layer.width}{uiText("components_neo1_app_components_panels_image_editor_panel.span.px", "px")}</span>
                        </>
                      )}
                </CustomizableLabel>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  value={layer.width}
                  onChange={(e) => onUpdateLayer({ width: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <CustomizableLabel
                  labelId="neo1-app_panels_image_editor_panel_item_14"
                  as="label"
                  className="block text-[11px] font-semibold text-slate-300 mb-1"
                >
                    {() => (
                        <>
                          {uiText("components_neo1_app_components_panels_image_editor_panel.label.height", "Height: ")}
                        <span className="text-purple-400 font-mono">{layer.height}{uiText("components_neo1_app_components_panels_image_editor_panel.span.px_2", "px")}</span>
                        </>
                      )}
                </CustomizableLabel>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  value={layer.height}
                  onChange={(e) => onUpdateLayer({ height: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Rotation & Flip Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.rotation_and_flips", "Rotation & Flips")}</span>
                <span className="text-purple-400 font-mono">{layer.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={layer.rotation || 0}
                onChange={(e) => onUpdateLayer({ rotation: Number(e.target.value) })}
                className="w-full accent-purple-500 cursor-pointer"
              />

              <div className="flex items-center gap-1.5 pt-1">
                <CustomizableButton
                  buttonId="neo1-app_panels_image_editor_panel_btn_13"
                  defaultIcon={<RotateCw className="w-3 h-3 text-purple-400" />}
                  onClick={() => onUpdateLayer({ rotation: ((layer.rotation || 0) + 90) % 360 })}
className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                    {() => (
                        <>
                          <span>+90°</span>
                        </>
                      )}
                </CustomizableButton>
                <CustomizableButton
                  buttonId="neo1-app_panels_image_editor_panel_btn_12"
                  defaultIcon={<FlipHorizontal className="w-3 h-3" />}
                  onClick={() => onUpdateLayer({ flipX: !layer.flipX })}
className={`flex-1 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    layer.flipX ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                    {() => (
                        <>
                          <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.flip_h", "Flip H")}</span>
                        </>
                      )}
                </CustomizableButton>
                <CustomizableButton
                  buttonId="neo1-app_panels_image_editor_panel_btn_11"
                  defaultIcon={<FlipVertical className="w-3 h-3" />}
                  onClick={() => onUpdateLayer({ flipY: !layer.flipY })}
className={`flex-1 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    layer.flipY ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                    {() => (
                        <>
                          <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.flip_v", "Flip V")}</span>
                        </>
                      )}
                </CustomizableButton>
              </div>
            </div>

            {/* Opacity & Blend Mode */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/60">
              <div>
                <CustomizableLabel
                  labelId="neo1-app_panels_image_editor_panel_item_10"
                  as="label"
                  className="block text-[11px] text-slate-300 mb-1"
                >
                    {() => (
                        <>
                          {uiText("components_neo1_app_components_panels_image_editor_panel.label.opacity", "Opacity: ")}
                        <span className="text-purple-400 font-mono">{Math.round((layer.opacity ?? 1) * 100)}%</span>
                        </>
                      )}
                </CustomizableLabel>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((layer.opacity ?? 1) * 100)}
                  onChange={(e) => onUpdateLayer({ opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <CustomizableLabel
                  labelId="neo1-app_panels_image_editor_panel_item_9"
                  as="label"
                  className="block text-[11px] text-slate-300 mb-1"
                >
                    {() => (
                        <>
                          {uiText("components_neo1_app_components_panels_image_editor_panel.label.blend_mode", "Blend mode")}
                        </>
                      )}
                </CustomizableLabel>
                <select
                  value={layer.blendMode || 'normal'}
                  onChange={(e) => onUpdateLayer({ blendMode: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-200 px-2 py-1.5 focus:outline-none focus:border-purple-500"
                >
                  <option value="normal">{uiText("components_neo1_app_components_panels_image_editor_panel.option.normal", "Normal")}</option>
                  <option value="multiply">{uiText("components_neo1_app_components_panels_image_editor_panel.option.multiply", "Multiply")}</option>
                  <option value="screen">{uiText("components_neo1_app_components_panels_image_editor_panel.option.screen", "Screen")}</option>
                  <option value="overlay">{uiText("components_neo1_app_components_panels_image_editor_panel.option.overlay", "Overlay")}</option>
                  <option value="darken">{uiText("components_neo1_app_components_panels_image_editor_panel.option.darken", "Darken")}</option>
                  <option value="lighten">{uiText("components_neo1_app_components_panels_image_editor_panel.option.lighten", "Lighten")}</option>
                  <option value="color-dodge">{uiText("components_neo1_app_components_panels_image_editor_panel.option.color_dodge", "Color Dodge")}</option>
                  <option value="difference">{uiText("components_neo1_app_components_panels_image_editor_panel.option.difference", "Difference")}</option>
                </select>
              </div>
            </div>

            {/* Color Filters */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
              <span className="block text-[11px] font-bold text-slate-200">{uiText("components_neo1_app_components_panels_image_editor_panel.span.color_adjustments", "Color Adjustments")}</span>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.brightness", "Brightness")}</span>
                  <span className="font-mono text-purple-400">{layer.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={layer.brightness}
                  onChange={(e) => onUpdateLayer({ brightness: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.contrast", "Contrast")}</span>
                  <span className="font-mono text-purple-400">{layer.contrast}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={layer.contrast}
                  onChange={(e) => onUpdateLayer({ contrast: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.saturation", "Saturation")}</span>
                  <span className="font-mono text-purple-400">{layer.saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={layer.saturation}
                  onChange={(e) => onUpdateLayer({ saturation: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.blur_radius", "Blur Radius")}</span>
                  <span className="font-mono text-purple-400">{layer.blur}{uiText("components_neo1_app_components_panels_image_editor_panel.span.px_3", "px")}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={layer.blur}
                  onChange={(e) => onUpdateLayer({ blur: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOLDER 2: TRANSFORMERS (SKEW, WARP, PERSPECTIVE) (DEFAULT UP / COLLAPSED) */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_8"
          onClick={() => toggleFolder('transformers')}
className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 transition-colors cursor-pointer"
        >
            {() => (
                <>
                  <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-rose-400" />
            <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.2_transformers_skew_warp_and_perspective", "2. Transformers (Skew, Warp & Perspective)")}</span>
          </div>
                {openFolders.transformers ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
                </>
              )}
        </CustomizableButton>

        {openFolders.transformers && (
          <div className="p-3 space-y-3.5 border-t border-slate-800/80 text-xs animate-in fade-in duration-150">
            {/* Skew Controls */}
            <div className="space-y-2">
              <span className="block text-[11px] font-bold text-slate-200">{uiText("components_neo1_app_components_panels_image_editor_panel.span.skew_distortion", "Skew Distortion")}</span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.skew_x", "Skew X")}</span>
                    <span className="font-mono text-rose-400">{layer.skewX || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    value={layer.skewX || 0}
                    onChange={(e) => onUpdateLayer({ skewX: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.skew_y", "Skew Y")}</span>
                    <span className="font-mono text-rose-400">{layer.skewY || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    value={layer.skewY || 0}
                    onChange={(e) => onUpdateLayer({ skewY: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Warp Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <span className="block text-[11px] font-bold text-slate-200">{uiText("components_neo1_app_components_panels_image_editor_panel.span.warp_and_curve_presets", "Warp & Curve Presets")}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'arc', label: 'Arc' },
                  { id: 'arch', label: 'Arch' },
                  { id: 'wave', label: 'Wave' },
                  { id: 'bulge', label: 'Bulge' },
                  { id: 'flag', label: 'Flag' },
                ].map((wStyle) => (
                  <CustomizableButton
                    buttonId="neo1-app_panels_image_editor_panel_btn_7"
                    key={wStyle.id}
onClick={() =>
                      onUpdateLayer({
                        warp: {
                          ...warpConfig,
                          style: wStyle.id as any,
                          bend: wStyle.id !== 'none' && warpConfig.bend === 0 ? 40 : warpConfig.bend,
                        },
                      })
                    }
className={`py-1.5 px-2 rounded-lg border text-[10px] font-semibold transition-all text-center cursor-pointer ${
                      warpConfig.style === wStyle.id
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                      {() => (
                          <>
                            {wStyle.label}
                          </>
                        )}
                  </CustomizableButton>
                ))}
              </div>

              {warpConfig.style !== 'none' && (
                <div className="space-y-2.5 pt-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.bend_amount", "Bend Amount")}</span>
                      <span className="font-mono text-rose-400">{warpConfig.bend}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={warpConfig.bend}
                      onChange={(e) =>
                        onUpdateLayer({
                          warp: { ...warpConfig, bend: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.horizontal_distortion", "Horizontal Distortion")}</span>
                      <span className="font-mono text-rose-400">{warpConfig.horizontalDistortion || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={warpConfig.horizontalDistortion || 0}
                      onChange={(e) =>
                        onUpdateLayer({
                          warp: { ...warpConfig, horizontalDistortion: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.vertical_distortion", "Vertical Distortion")}</span>
                      <span className="font-mono text-rose-400">{warpConfig.verticalDistortion || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={warpConfig.verticalDistortion || 0}
                      onChange={(e) =>
                        onUpdateLayer({
                          warp: { ...warpConfig, verticalDistortion: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3D Perspective Tilt */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <span className="block text-[11px] font-bold text-slate-200">{uiText("components_neo1_app_components_panels_image_editor_panel.span.3d_perspective_and_tilt", "3D Perspective & Tilt")}</span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.tilt_x", "Tilt X")}</span>
                    <span className="font-mono text-rose-400">{layer.perspectiveX || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={layer.perspectiveX || 0}
                    onChange={(e) => onUpdateLayer({ perspectiveX: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.tilt_y", "Tilt Y")}</span>
                    <span className="font-mono text-rose-400">{layer.perspectiveY || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={layer.perspectiveY || 0}
                    onChange={(e) => onUpdateLayer({ perspectiveY: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Reset Transforms */}
            <CustomizableButton
              buttonId="neo1-app_panels_image_editor_panel_btn_6"
              defaultIcon={<RefreshCw className="w-3 h-3" />}
              onClick={() =>
                onUpdateLayer({
                  skewX: 0,
                  skewY: 0,
                  perspectiveX: 0,
                  perspectiveY: 0,
                  warp: { style: 'none', bend: 0, horizontalDistortion: 0, verticalDistortion: 0 },
                })
              }
className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
                {() => (
                    <>
                      <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.reset_all_transformers", "Reset All Transformers")}</span>
                    </>
                  )}
            </CustomizableButton>
          </div>
        )}
      </div>

      {/* FOLDER 3: CHROMA KEY TOOLS (DEFAULT UP / COLLAPSED) */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <CustomizableButton
          buttonId="neo1-app_panels_image_editor_panel_btn_5"
          onClick={() => toggleFolder('chroma')}
className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 transition-colors cursor-pointer"
        >
            {() => (
                <>
                  <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.3_chroma_key_tools", "3. Chroma Key Tools")}</span>
            {chromaConfig.enabled && (
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-mono">
                {uiText("components_neo1_app_components_panels_image_editor_panel.span.active", "ACTIVE")}
              </span>
            )}
          </div>
                {openFolders.chroma ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
                </>
              )}
        </CustomizableButton>

        {openFolders.chroma && (
          <div className="p-3 space-y-3.5 border-t border-slate-800/80 text-xs animate-in fade-in duration-150">
            {/* Enable Toggle Switch */}
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-200">{uiText("components_neo1_app_components_panels_image_editor_panel.span.enable_chroma_key", "Enable Chroma Key")}</span>
              <CustomizableButton
                buttonId="neo1-app_panels_image_editor_panel_btn_4"
                onClick={() =>
                  onUpdateLayer({
                    chromaKey: {
                      ...chromaConfig,
                      enabled: !chromaConfig.enabled,
                    },
                  })
                }
className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                  chromaConfig.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                  {() => (
                      <>
                        <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    chromaConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
                      </>
                    )}
              </CustomizableButton>
            </div>

            {/* Key Color Picker & Presets */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_image_editor_panel.span.key_color", "Key Color")}</span>
                <div className="flex items-center gap-1.5">
                  {'EyeDropper' in window && (
                    <CustomizableButton
                      buttonId="neo1-app_panels_image_editor_panel_btn_3"
                      defaultIcon={<Pipette className="w-3 h-3 text-emerald-400" />}
                      onClick={handlePickEyedropper}
className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
title={uiText("components_neo1_app_components_panels_image_editor_panel.button.sample_color_with_eyedropper.title", "Sample color with Eyedropper")}
                    >
                        {() => (
                            <>
                              <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.sample", "Sample")}</span>
                            </>
                          )}
                    </CustomizableButton>
                  )}
                  <input
                    type="color"
                    value={chromaConfig.keyColor}
                    onChange={(e) =>
                      onUpdateLayer({
                        chromaKey: { ...chromaConfig, keyColor: e.target.value, enabled: true },
                      })
                    }
                    className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                </div>
              </div>

              {/* Color Preset Pills */}
              <div className="flex items-center gap-2">
                {[
                  { name: 'Green', color: '#00ff00' },
                  { name: 'Blue', color: '#0000ff' },
                  { name: 'Black', color: '#000000' },
                  { name: 'White', color: '#ffffff' },
                ].map((preset) => (
                  <CustomizableButton
                    buttonId="neo1-app_panels_image_editor_panel_btn_2"
                    key={preset.name}
onClick={() =>
                      onUpdateLayer({
                        chromaKey: { ...chromaConfig, keyColor: preset.color, enabled: true },
                      })
                    }
className={`flex-1 py-1 px-1 rounded-lg border text-[10px] font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      chromaConfig.keyColor.toLowerCase() === preset.color
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                      {() => (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full border border-slate-600" style={{ backgroundColor: preset.color }} />
                          <span>{preset.name}</span>
                          </>
                        )}
                  </CustomizableButton>
                ))}
              </div>
            </div>

            {/* Chroma Sliders */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.tolerance_cutoff", "Tolerance / Cutoff")}</span>
                  <span className="font-mono text-emerald-400">{chromaConfig.tolerance}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={chromaConfig.tolerance}
                  onChange={(e) =>
                    onUpdateLayer({
                      chromaKey: { ...chromaConfig, tolerance: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.smoothness_feather", "Smoothness / Feather")}</span>
                  <span className="font-mono text-emerald-400">{chromaConfig.smoothness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={chromaConfig.smoothness}
                  onChange={(e) =>
                    onUpdateLayer({
                      chromaKey: { ...chromaConfig, smoothness: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{uiText("components_neo1_app_components_panels_image_editor_panel.span.spill_suppression", "Spill Suppression")}</span>
                  <span className="font-mono text-emerald-400">{chromaConfig.spillSuppression}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={chromaConfig.spillSuppression}
                  onChange={(e) =>
                    onUpdateLayer({
                      chromaKey: { ...chromaConfig, spillSuppression: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Invert Alpha Key Option */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_image_editor_panel.span.invert_key_mask", "Invert Key Mask")}</span>
              <CustomizableButton
                buttonId="neo1-app_panels_image_editor_panel_btn_1"
                onClick={() =>
                  onUpdateLayer({
                    chromaKey: { ...chromaConfig, invert: !chromaConfig.invert },
                  })
                }
className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors ${
                  chromaConfig.invert
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                  {() => (
                      <>
                        {chromaConfig.invert ? 'Inverted' : 'Normal'}
                      </>
                    )}
              </CustomizableButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
