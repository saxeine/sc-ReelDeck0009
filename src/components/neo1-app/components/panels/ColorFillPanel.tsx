import { Palette } from 'lucide-react';
import React from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { TextLayer } from '../../types';

interface ColorFillPanelProps {
  layer: TextLayer | null;
  onUpdateLayer: (updatedProps: Partial<TextLayer>) => void;
}

const colorPresets = [
  '#ffffff',
  '#00f0ff',
  '#ff007f',
  '#a855f7',
  '#facc15',
  '#10b981',
  '#f97316',
  '#06b6d4',
  '#3b82f6',
  '#ec4899',
  '#0f172a',
  '#000000',
];

export const ColorFillPanel: React.FC<ColorFillPanelProps> = ({ layer, onUpdateLayer }) => {
  if (!layer) {
    return (
      <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-3 shrink-0 select-none">
        <Palette className="w-10 h-10 text-slate-600" />
        <p className="text-xs text-slate-400 font-medium">{uiText("components_neo1_app_components_panels_color_fill_panel.p.no_text_layer_selected_for_color_fill", "No text layer selected for color fill.")}</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 select-none">
      <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-800 pb-3">
        <Palette className="w-5 h-5" />
        <CustomizableLabel
          labelId="neo1-app_panels_color_fill_panel_item_7"
          as="h3"
          className="text-sm font-bold text-slate-100"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_color_fill_panel.h3.color_and_gradient_fill", "Color & gradient fill")}
                </>
              )}
        </CustomizableLabel>
      </div>

      {/* Fill Type */}
      <div>
        <CustomizableLabel
          labelId="neo1-app_panels_color_fill_panel_item_6"
          as="label"
          className="block text-xs font-semibold text-slate-300 mb-2"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_color_fill_panel.label.fill_type", "Fill type")}
                </>
              )}
        </CustomizableLabel>
        <div className="grid grid-cols-2 gap-2">
          {(['solid', 'gradient'] as const).map((type) => (
            <CustomizableButton
              buttonId="neo1-app_panels_color_fill_panel_btn_5"
              key={type}
onClick={() =>
                onUpdateLayer({
                  fillType: type,
                  gradient: layer.gradient
                    ? { ...layer.gradient, enabled: type === 'gradient' }
                    : type === 'gradient'
                    ? {
                        enabled: true,
                        type: 'linear',
                        angle: 45,
                        stops: [
                          { offset: 0, color: layer.color || '#00f0ff' },
                          { offset: 1, color: '#ff007f' },
                        ],
                      }
                    : undefined,
                })
              }
className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border cursor-pointer ${
                layer.fillType === type
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
                {() => (
                    <>
                      {type}
                    </>
                  )}
            </CustomizableButton>
          ))}
        </div>
      </div>

      {/* Solid Color Picker */}
      {layer.fillType === 'solid' && (
        <div className="space-y-3">
          <CustomizableLabel
            labelId="neo1-app_panels_color_fill_panel_item_4"
            as="label"
            className="block text-xs font-semibold text-slate-300"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_color_fill_panel.label.solid_color", "Solid color")}
                  </>
                )}
          </CustomizableLabel>
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <input
              type="color"
              value={layer.color || '#ffffff'}
              onChange={(e) =>
                onUpdateLayer({
                  color: e.target.value,
                  fillType: 'solid',
                  gradient: layer.gradient ? { ...layer.gradient, enabled: false } : undefined,
                })
              }
              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs font-mono text-slate-200 uppercase">{layer.color || '#ffffff'}</span>
          </div>

          <div className="grid grid-cols-6 gap-2 pt-1">
            {colorPresets.map((hex) => (
              <CustomizableButton
                buttonId="neo1-app_panels_color_fill_panel_btn_3"
                key={hex}
onClick={() =>
                  onUpdateLayer({
                    color: hex,
                    fillType: 'solid',
                    gradient: layer.gradient ? { ...layer.gradient, enabled: false } : undefined,
                  })
                }
className="w-8 h-8 rounded-lg border border-slate-700/80 hover:scale-110 transition-transform cursor-pointer"
style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gradient Controls */}
      {layer.fillType === 'gradient' && (
        <div className="space-y-3">
          <CustomizableLabel
            labelId="neo1-app_panels_color_fill_panel_item_2"
            as="label"
            className="block text-xs font-semibold text-slate-300"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_color_fill_panel.label.gradient_colors", "Gradient colors")}
                  </>
                )}
          </CustomizableLabel>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
              <input
                type="color"
                value={layer.gradient?.stops?.[0]?.color || '#00f0ff'}
                onChange={(e) => {
                  const stops = [...(layer.gradient?.stops || [])];
                  stops[0] = { offset: 0, color: e.target.value };
                  onUpdateLayer({
                    gradient: { ...layer.gradient, enabled: true, stops },
                  });
                }}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-[10px] font-mono text-slate-300">{uiText("components_neo1_app_components_panels_color_fill_panel.span.start", "Start")}</span>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
              <input
                type="color"
                value={
                  layer.gradient?.stops && layer.gradient.stops.length > 0
                    ? layer.gradient.stops[layer.gradient.stops.length - 1].color || '#ff007f'
                    : '#ff007f'
                }
                onChange={(e) => {
                  const stops = [...(layer.gradient?.stops || [
                    { offset: 0, color: '#00f0ff' },
                    { offset: 1, color: '#ff007f' },
                  ])];
                  const lastIdx = Math.max(1, stops.length - 1);
                  stops[lastIdx] = { offset: 1, color: e.target.value };
                  onUpdateLayer({
                    gradient: { ...layer.gradient, enabled: true, stops },
                  });
                }}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-[10px] font-mono text-slate-300">{uiText("components_neo1_app_components_panels_color_fill_panel.span.end", "End")}</span>
            </div>
          </div>

          <div>
            <CustomizableLabel
              labelId="neo1-app_panels_color_fill_panel_item_1"
              defaultLabel={"°"}
              as="label"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
                {(ibcProps) => (
                    <>
                      {uiText("components_neo1_app_components_panels_color_fill_panel.label.angle", "Angle: ")}
                    {layer.gradient?.angle || 45}
                    {!ibcProps.isTextHidden ? ibcProps.label : null}
                    </>
                  )}
            </CustomizableLabel>
            <input
              type="range"
              min={0}
              max={360}
              value={layer.gradient?.angle || 45}
              onChange={(e) =>
                onUpdateLayer({
                  gradient: { ...layer.gradient, angle: Number(e.target.value) },
                })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
