import {
AlignCenter,
AlignLeft,
AlignRight,
Eye,
EyeOff,
Italic,
Lock,
Plus,
Search,
Trash2,
Type,
Unlock
} from 'lucide-react';
import React,{ useEffect,useState } from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { TextLayer } from '../../types';
import { loadGoogleFont } from '../../utils/googleFonts';

interface TextEditorPanelProps {
  layer: TextLayer | null;
  onUpdateLayer: (updatedProps: Partial<TextLayer>) => void;
  onAddText: (presetStyle?: Partial<TextLayer>, customText?: string) => void;
  onDeleteLayer?: (id: string) => void;
}

const categorizedFonts = [
  {
    category: 'Cyber & Tech',
    fonts: ['Orbitron', 'Space Grotesk', 'Share Tech Mono', 'Rajdhani', 'Press Start 2P', 'Syne'],
  },
  {
    category: 'Bold & Display',
    fonts: ['Bebas Neue', 'Russo One', 'Bangers', 'Anton', 'Black Ops One', 'Righteous'],
  },
  {
    category: 'Serif & Elegance',
    fonts: ['Playfair Display', 'Cinzel', 'Cormorant Garamond', 'Merriweather', 'Bodoni Moda'],
  },
  {
    category: 'Clean & Modern',
    fonts: ['Montserrat', 'Inter', 'Poppins', 'Roboto', 'Plus Jakarta Sans', 'Oswald'],
  },
  {
    category: 'Fun & Script',
    fonts: ['Fredoka', 'Pacifico', 'Permanent Marker', 'Lobster', 'Caveat', 'Dancing Script'],
  },
  {
    category: 'Monospace',
    fonts: ['Courier Prime', 'Fira Code'],
  },
];

const allFontList = categorizedFonts.flatMap((c) => c.fonts);

export const TextEditorPanel: React.FC<TextEditorPanelProps> = ({
  layer,
  onUpdateLayer,
  onAddText,
  onDeleteLayer,
}) => {
  const [customFontInput, setCustomFontInput] = useState('');

  // Preload currently selected font and popular fonts on mount
  useEffect(() => {
    if (layer?.fontFamily) {
      loadGoogleFont(layer.fontFamily);
    }
    allFontList.slice(0, 10).forEach((f) => loadGoogleFont(f));
  }, [layer?.fontFamily]);

  if (!layer) {
    return (
      <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-3 shrink-0 select-none">
        <Type className="w-10 h-10 text-slate-600" />
        <p className="text-xs text-slate-400 font-medium">{uiText("components_neo1_app_components_panels_text_editor_panel.p.no_text_layer_selected", "No text layer selected.")}</p>
        <CustomizableButton
          buttonId="neo1-app_panels_text_editor_panel_btn_23"
          defaultIcon={<Plus className="w-4 h-4" />}
          onClick={() => onAddText()}
className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
        >
            {() => (
                <>
                  <span>{uiText("components_neo1_app_components_panels_text_editor_panel.span.add_text_layer", "Add Text Layer")}</span>
                </>
              )}
        </CustomizableButton>
      </div>
    );
  }

  const handleFontChange = (fontName: string) => {
    if (!fontName) return;
    loadGoogleFont(fontName);
    onUpdateLayer({ fontFamily: fontName });
  };

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Type className="w-5 h-5" />
          <CustomizableLabel
            labelId="neo1-app_panels_text_editor_panel_item_22"
            as="h3"
            className="text-sm font-bold text-slate-100"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_text_editor_panel.h3.typography_controls", "Typography controls")}
                  </>
                )}
          </CustomizableLabel>
        </div>
        <div className="flex items-center gap-1">
          {/* Show / Hide Layer Visibility */}
          <CustomizableButton
            buttonId="neo1-app_panels_text_editor_panel_btn_21"
            onClick={() => onUpdateLayer({ visible: !layer.visible })}
className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              layer.visible !== false
                ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
title={layer.visible !== false ? 'Hide Layer' : 'Show Layer'}
          >
              {() => (
                  <>
                    {layer.visible !== false ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4 text-rose-400" />
            )}
                  </>
                )}
          </CustomizableButton>

          {/* Lock / Unlock */}
          <CustomizableButton
            buttonId="neo1-app_panels_text_editor_panel_btn_20"
            onClick={() => onUpdateLayer({ locked: !layer.locked })}
className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              layer.locked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
          >
              {() => (
                  <>
                    {layer.locked ? (
              <Lock className="w-4 h-4 text-amber-400" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
                  </>
                )}
          </CustomizableButton>

          {onDeleteLayer && (
            <CustomizableButton
              buttonId="neo1-app_panels_text_editor_panel_btn_19"
              defaultIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => onDeleteLayer(layer.id)}
className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 rounded-lg transition-all cursor-pointer"
title={uiText("components_neo1_app_components_panels_text_editor_panel.button.delete_layer.title", "Delete Layer")}
            />
          )}
        </div>
      </div>

      {/* Text Content */}
      <div>
        <CustomizableLabel
          labelId="neo1-app_panels_text_editor_panel_item_18"
          as="label"
          className="block text-xs font-semibold text-slate-300 mb-1.5"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_text_editor_panel.label.text_content", "Text content")}
                </>
              )}
        </CustomizableLabel>
        <textarea
          value={layer.text}
          onChange={(e) => onUpdateLayer({ text: e.target.value })}
          rows={3}
          placeholder={uiText("components_neo1_app_components_panels_text_editor_panel.textarea.type_content_here.placeholder", "Type content here...")}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Font Family Selector & Search */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <CustomizableLabel
            labelId="neo1-app_panels_text_editor_panel_item_17"
            as="label"
            className="text-xs font-semibold text-slate-300"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_text_editor_panel.label.font_family", "Font family")}
                  </>
                )}
          </CustomizableLabel>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            {layer.fontFamily}
          </span>
        </div>

        {/* Dropdown with Google Fonts */}
        <select
          value={layer.fontFamily}
          onChange={(e) => handleFontChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
        >
          {categorizedFonts.map((group) => (
            <optgroup key={group.category} label={`--- ${group.category} ---`}>
              {group.fonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Search or Add Custom Google Font */}
        <div className="flex gap-1.5 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={customFontInput}
              onChange={(e) => setCustomFontInput(e.target.value)}
              placeholder={uiText("components_neo1_app_components_panels_text_editor_panel.input.load_custom_google_font.placeholder", "Load custom Google font...")}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customFontInput.trim()) {
                  handleFontChange(customFontInput.trim());
                  setCustomFontInput('');
                }
              }}
            />
          </div>
          <CustomizableButton
            buttonId="neo1-app_panels_text_editor_panel_btn_16"
            onClick={() => {
              if (customFontInput.trim()) {
                handleFontChange(customFontInput.trim());
                setCustomFontInput('');
              }
            }}
className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-700"
title={uiText("components_neo1_app_components_panels_text_editor_panel.button.load_google_font.title", "Load Google Font")}
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_text_editor_panel.button.load", "Load")}
                  </>
                )}
          </CustomizableButton>
        </div>
      </div>

      {/* Font Size & Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <CustomizableLabel
              labelId="neo1-app_panels_text_editor_panel_item_15"
              as="label"
              className="text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.label.size", "Size")}
                    </>
                  )}
            </CustomizableLabel>
            <input
              type="number"
              min={10}
              max={300}
              value={layer.fontSize}
              onChange={(e) => onUpdateLayer({ fontSize: Math.max(10, Number(e.target.value)) })}
              className="w-12 px-1 py-0.5 bg-slate-950 border border-slate-800 rounded text-right text-[11px] font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <input
            type="range"
            min={12}
            max={200}
            value={layer.fontSize}
            onChange={(e) => onUpdateLayer({ fontSize: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        <div>
          <CustomizableLabel
            labelId="neo1-app_panels_text_editor_panel_item_14"
            as="label"
            className="block text-xs font-semibold text-slate-300 mb-1"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_text_editor_panel.label.weight", "Weight")}
                  </>
                )}
          </CustomizableLabel>
          <select
            value={layer.fontWeight}
            onChange={(e) => onUpdateLayer({ fontWeight: Number(e.target.value) })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {[
              { w: 300, label: '300 - Light' },
              { w: 400, label: '400 - Regular' },
              { w: 500, label: '500 - Medium' },
              { w: 600, label: '600 - SemiBold' },
              { w: 700, label: '700 - Bold' },
              { w: 800, label: '800 - ExtraBold' },
              { w: 900, label: '900 - Black' },
            ].map(({ w, label }) => (
              <option key={w} value={w}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Letter Spacing & Line Height */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <CustomizableLabel
              labelId="neo1-app_panels_text_editor_panel_item_13"
              as="label"
              className="text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.label.spacing", "Spacing")}
                    </>
                  )}
            </CustomizableLabel>
            <span className="text-[10px] font-mono text-slate-400">{layer.letterSpacing}{uiText("components_neo1_app_components_panels_text_editor_panel.span.px", "px")}</span>
          </div>
          <input
            type="range"
            min={-5}
            max={35}
            value={layer.letterSpacing}
            onChange={(e) => onUpdateLayer({ letterSpacing: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <CustomizableLabel
              labelId="neo1-app_panels_text_editor_panel_item_12"
              as="label"
              className="text-xs font-semibold text-slate-300"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.label.line_height", "Line height")}
                    </>
                  )}
            </CustomizableLabel>
            <span className="text-[10px] font-mono text-slate-400">{layer.lineHeight}</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={2.5}
            step={0.1}
            value={layer.lineHeight}
            onChange={(e) => onUpdateLayer({ lineHeight: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Quick Text Color & Fill Controls */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <CustomizableLabel
            labelId="neo1-app_panels_text_editor_panel_item_11"
            as="label"
            className="block text-xs font-semibold text-slate-300"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_text_editor_panel.label.text_color", "Text color")}
                  </>
                )}
          </CustomizableLabel>
          <div className="flex items-center gap-1">
            <CustomizableButton
              buttonId="neo1-app_panels_text_editor_panel_btn_10"
              type="button"
onClick={() =>
                onUpdateLayer({
                  fillType: 'solid',
                  gradient: layer.gradient ? { ...layer.gradient, enabled: false } : undefined,
                })
              }
className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all border ${
                layer.fillType !== 'gradient'
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-xs'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.button.solid", "Solid")}
                    </>
                  )}
            </CustomizableButton>
            <CustomizableButton
              buttonId="neo1-app_panels_text_editor_panel_btn_9"
              type="button"
onClick={() =>
                onUpdateLayer({
                  fillType: 'gradient',
                  gradient: layer.gradient
                    ? { ...layer.gradient, enabled: true }
                    : {
                        enabled: true,
                        type: 'linear',
                        angle: 45,
                        stops: [
                          { offset: 0, color: layer.color || '#00f0ff' },
                          { offset: 1, color: '#ff007f' },
                        ],
                      },
                })
              }
className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all border ${
                layer.fillType === 'gradient'
                  ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-300 shadow-xs'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.button.gradient", "Gradient")}
                    </>
                  )}
            </CustomizableButton>
          </div>
        </div>

        {layer.fillType !== 'gradient' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <input
                type="color"
                value={layer.color && layer.color.startsWith('#') && layer.color.length === 7 ? layer.color : '#ffffff'}
                onChange={(e) =>
                  onUpdateLayer({
                    color: e.target.value,
                    fillType: 'solid',
                    gradient: layer.gradient ? { ...layer.gradient, enabled: false } : undefined,
                  })
                }
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 shrink-0"
              />
              <input
                type="text"
                value={layer.color || '#ffffff'}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateLayer({
                    color: val,
                    fillType: 'solid',
                    gradient: layer.gradient ? { ...layer.gradient, enabled: false } : undefined,
                  });
                }}
                className="w-20 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-cyan-400 uppercase focus:outline-none focus:border-cyan-400"
                placeholder="#ffffff"
              />
              <div className="flex gap-1 flex-wrap flex-1 justify-end">
                {['#ffffff', '#00f0ff', '#ff007f', '#facc15', '#10b981', '#f97316', '#a855f7', '#000000'].map((hex) => (
                  <CustomizableButton
                    buttonId="neo1-app_panels_text_editor_panel_btn_8"
                    key={hex}
type="button"
onClick={() =>
                      onUpdateLayer({
                        color: hex,
                        fillType: 'solid',
                        gradient: layer.gradient ? { ...layer.gradient, enabled: false } : undefined,
                      })
                    }
className="w-4 h-4 rounded border border-slate-700/80 cursor-pointer hover:scale-110 transition-transform"
style={{ backgroundColor: hex }}
title={`Apply ${hex}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                <input
                  type="color"
                  value={layer.gradient?.stops?.[0]?.color || '#00f0ff'}
                  onChange={(e) => {
                    const stops = [...(layer.gradient?.stops || [
                      { offset: 0, color: '#00f0ff' },
                      { offset: 1, color: '#ff007f' },
                    ])];
                    stops[0] = { offset: 0, color: e.target.value };
                    onUpdateLayer({
                      gradient: { ...layer.gradient, enabled: true, stops },
                    });
                  }}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 shrink-0"
                />
                <span className="text-[10px] font-mono text-slate-300">{uiText("components_neo1_app_components_panels_text_editor_panel.span.start", "Start")}</span>
                <span className="text-[9px] font-mono text-cyan-400 ml-auto truncate max-w-[48px]">
                  {layer.gradient?.stops?.[0]?.color || '#00f0ff'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                {(() => {
                  const stops = layer.gradient?.stops || [];
                  const lastIdx = Math.max(1, stops.length - 1);
                  const endColor = stops[lastIdx]?.color || '#ff007f';
                  return (
                    <>
                      <input
                        type="color"
                        value={endColor}
                        onChange={(e) => {
                          const newStops = [...(layer.gradient?.stops || [
                            { offset: 0, color: '#00f0ff' },
                            { offset: 1, color: '#ff007f' },
                          ])];
                          const idx = Math.max(1, newStops.length - 1);
                          newStops[idx] = { offset: 1, color: e.target.value };
                          onUpdateLayer({
                            gradient: { ...layer.gradient, enabled: true, stops: newStops },
                          });
                        }}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 shrink-0"
                      />
                      <span className="text-[10px] font-mono text-slate-300">{uiText("components_neo1_app_components_panels_text_editor_panel.span.end", "End")}</span>
                      <span className="text-[9px] font-mono text-fuchsia-400 ml-auto truncate max-w-[48px]">
                        {endColor}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Gradient Angle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">{uiText("components_neo1_app_components_panels_text_editor_panel.span.angle", "Angle")}</span>
              <span className="text-[10px] font-mono text-slate-300 font-bold">
                {layer.gradient?.angle ?? 45}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={layer.gradient?.angle ?? 45}
              onChange={(e) =>
                onUpdateLayer({
                  gradient: { ...layer.gradient, angle: Number(e.target.value) },
                })
              }
              className="w-full accent-fuchsia-500 cursor-pointer h-1 bg-slate-800 rounded"
            />
          </div>
        )}
      </div>

      {/* Alignment, Italic & Text Transform */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <CustomizableLabel
          labelId="neo1-app_panels_text_editor_panel_item_7"
          as="label"
          className="block text-xs font-semibold text-slate-300"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_text_editor_panel.label.formatting_and_case", "Formatting & case")}
                </>
              )}
        </CustomizableLabel>
        <div className="flex items-center justify-between gap-2">
          {/* Alignment Buttons */}
          <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
            {(['left', 'center', 'right'] as const).map((align) => (
              <CustomizableButton
                buttonId="neo1-app_panels_text_editor_panel_btn_6"
                key={align}
onClick={() => onUpdateLayer({ textAlign: align })}
className={`p-1.5 rounded transition-colors cursor-pointer ${
                  layer.textAlign === align
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
title={`Align ${align}`}
              >
                  {() => (
                      <>
                        {align === 'left' && <AlignLeft className="w-4 h-4" />}
                      {align === 'center' && <AlignCenter className="w-4 h-4" />}
                      {align === 'right' && <AlignRight className="w-4 h-4" />}
                      </>
                    )}
              </CustomizableButton>
            ))}
          </div>

          {/* Italic Toggle */}
          <CustomizableButton
            buttonId="neo1-app_panels_text_editor_panel_btn_5"
            defaultIcon={<Italic className="w-4 h-4" />}
            onClick={() =>
              onUpdateLayer({
                fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic',
              })
            }
className={`p-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center ${
              layer.fontStyle === 'italic'
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
title={uiText("components_neo1_app_components_panels_text_editor_panel.button.italic_style.title", "Italic Style")}
          />

          {/* Text Transform Buttons */}
          <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 gap-1">
            <CustomizableButton
              buttonId="neo1-app_panels_text_editor_panel_btn_4"
              onClick={() => onUpdateLayer({ textTransform: 'none' })}
className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                !layer.textTransform || layer.textTransform === 'none'
                  ? 'bg-slate-800 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
title={uiText("components_neo1_app_components_panels_text_editor_panel.button.original_case.title", "Original Case")}
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.button.aa", "Aa")}
                    </>
                  )}
            </CustomizableButton>
            <CustomizableButton
              buttonId="neo1-app_panels_text_editor_panel_btn_3"
              onClick={() => onUpdateLayer({ textTransform: 'uppercase' })}
className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                layer.textTransform === 'uppercase'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
title={uiText("components_neo1_app_components_panels_text_editor_panel.button.uppercase.title", "UPPERCASE")}
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.button.aa_2", "AA")}
                    </>
                  )}
            </CustomizableButton>
            <CustomizableButton
              buttonId="neo1-app_panels_text_editor_panel_btn_2"
              onClick={() => onUpdateLayer({ textTransform: 'lowercase' })}
className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                layer.textTransform === 'lowercase'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
title={uiText("components_neo1_app_components_panels_text_editor_panel.button.lowercase.title", "lowercase")}
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_panels_text_editor_panel.button.aa_3", "aa")}
                    </>
                  )}
            </CustomizableButton>
          </div>
        </div>
      </div>

      {/* Layer Opacity */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <CustomizableLabel
            labelId="neo1-app_panels_text_editor_panel_item_1"
            as="label"
            className="text-xs font-semibold text-slate-300"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_text_editor_panel.label.layer_opacity", "Layer opacity")}
                  </>
                )}
          </CustomizableLabel>
          <span className="text-[10px] font-mono text-slate-400">
            {Math.round((layer.opacity ?? 1) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={layer.opacity ?? 1}
          onChange={(e) => onUpdateLayer({ opacity: Number(e.target.value) })}
          className="w-full accent-cyan-500 cursor-pointer"
        />
      </div>
    </div>
  );
};
