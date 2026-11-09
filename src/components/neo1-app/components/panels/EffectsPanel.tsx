import { Sliders } from 'lucide-react';
import React from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { TextLayer } from '../../types';

interface EffectsPanelProps {
  layer: TextLayer | null;
  onUpdateLayer: (updatedProps: Partial<TextLayer>) => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ layer, onUpdateLayer }) => {
  if (!layer) {
    return (
      <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-3 shrink-0 select-none">
        <Sliders className="w-10 h-10 text-slate-600" />
        <p className="text-xs text-slate-400 font-medium">{uiText("components_neo1_app_components_panels_effects_panel.p.no_text_layer_selected_for_effects", "No text layer selected for effects.")}</p>
      </div>
    );
  }

  const glow = layer.glow || { enabled: false, color: '#00f0ff', blur: 20, spread: 5 };
  const extrusion = layer.extrusion || { enabled: false, depth: 10, angle: 135, color: '#0f172a', shadowColor: 'rgba(0,0,0,0.5)', lightingAngle: 45 };
  const bgBox = layer.bgBox || { enabled: false, color: '#000000', opacity: 0.8, paddingX: 20, paddingY: 10, borderRadius: 8, borderWidth: 0, borderColor: '#ffffff', shape: 'rectangle' };

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto space-y-5 shrink-0 select-none">
      <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3">
        <Sliders className="w-5 h-5" />
        <CustomizableLabel
          labelId="neo1-app_panels_effects_panel_item_2"
          as="h3"
          className="text-sm font-bold text-slate-100"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_effects_panel.h3.3d_extrusion_glow_and_badge", "3D extrusion, glow & badge")}
                </>
              )}
        </CustomizableLabel>
      </div>

      {/* Glow Effect Toggle */}
      <div className="space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">{uiText("components_neo1_app_components_panels_effects_panel.span.neon_glow", "Neon glow")}</span>
          <input
            type="checkbox"
            checked={glow.enabled}
            onChange={(e) =>
              onUpdateLayer({
                glow: { ...glow, enabled: e.target.checked },
              })
            }
            className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {glow.enabled && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{uiText("components_neo1_app_components_panels_effects_panel.span.glow_color", "Glow color")}</span>
              <input
                type="color"
                value={glow.color}
                onChange={(e) =>
                  onUpdateLayer({
                    glow: { ...glow, color: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-400">{uiText("components_neo1_app_components_panels_effects_panel.span.blur", "Blur: ")}{glow.blur}{uiText("components_neo1_app_components_panels_effects_panel.span.px", "px")}</span>
              <input
                type="range"
                min={5}
                max={50}
                value={glow.blur}
                onChange={(e) =>
                  onUpdateLayer({
                    glow: { ...glow, blur: Number(e.target.value) },
                  })
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3D Extrusion */}
      <div className="space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">{uiText("components_neo1_app_components_panels_effects_panel.span.3d_extrusion_depth", "3D Extrusion Depth")}</span>
          <input
            type="checkbox"
            checked={extrusion.enabled}
            onChange={(e) =>
              onUpdateLayer({
                extrusion: { ...extrusion, enabled: e.target.checked },
              })
            }
            className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
          />
        </div>

        {extrusion.enabled && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-[11px] text-slate-400">{uiText("components_neo1_app_components_panels_effects_panel.span.depth", "Depth: ")}{extrusion.depth}{uiText("components_neo1_app_components_panels_effects_panel.span.px_2", "px")}</span>
              <input
                type="range"
                min={1}
                max={40}
                value={extrusion.depth}
                onChange={(e) =>
                  onUpdateLayer({
                    extrusion: { ...extrusion, depth: Number(e.target.value) },
                  })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{uiText("components_neo1_app_components_panels_effects_panel.span.3d_color", "3D Color")}</span>
              <input
                type="color"
                value={extrusion.color}
                onChange={(e) =>
                  onUpdateLayer({
                    extrusion: { ...extrusion, color: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Background Badge Box */}
      <div className="space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">{uiText("components_neo1_app_components_panels_effects_panel.span.background_badge_box", "Background Badge Box")}</span>
          <input
            type="checkbox"
            checked={bgBox.enabled}
            onChange={(e) =>
              onUpdateLayer({
                bgBox: { ...bgBox, enabled: e.target.checked },
              })
            }
            className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
          />
        </div>

        {bgBox.enabled && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="grid grid-cols-2 gap-2">
              {(['rectangle', 'pill'] as const).map((sh) => (
                <CustomizableButton
                  buttonId="neo1-app_panels_effects_panel_btn_1"
                  key={sh}
onClick={() =>
                    onUpdateLayer({
                      bgBox: { ...bgBox, shape: sh },
                    })
                  }
className={`py-1.5 rounded-lg text-xs font-bold capitalize border cursor-pointer ${
                    bgBox.shape === sh
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                    {() => (
                        <>
                          {sh}
                        </>
                      )}
                </CustomizableButton>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{uiText("components_neo1_app_components_panels_effects_panel.span.badge_color", "Badge Color")}</span>
              <input
                type="color"
                value={bgBox.color}
                onChange={(e) =>
                  onUpdateLayer({
                    bgBox: { ...bgBox, color: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
