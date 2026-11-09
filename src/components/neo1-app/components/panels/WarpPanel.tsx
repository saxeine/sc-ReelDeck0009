import { RotateCw,Sliders,Wand2 } from 'lucide-react';
import React from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { Layer } from '../../types';

interface WarpPanelProps {
  layer: Layer | null;
  onUpdateLayer: (updatedProps: Partial<Layer>) => void;
}

export const WarpPanel: React.FC<WarpPanelProps> = ({ layer, onUpdateLayer }) => {
  if (!layer) {
    return (
      <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-3 shrink-0 select-none">
        <Wand2 className="w-10 h-10 text-slate-600" />
        <p className="text-xs text-slate-400 font-medium">{uiText("components_neo1_app_components_panels_warp_panel.p.no_layer_selected_for_warp_and_arch", "No layer selected for warp & arch.")}</p>
      </div>
    );
  }

  const warpStyles = [
    { id: 'none', label: 'None' },
    { id: 'arc', label: 'Arc / Curve' },
    { id: 'arch', label: 'Arch' },
    { id: 'wave', label: 'Wave' },
    { id: 'bulge', label: 'Bulge' },
    { id: 'flag', label: 'Flag' },
    { id: 'skew', label: 'Skew / Slant' },
  ];

  const warpConfig = layer.warp || { style: 'none', bend: 0, horizontalDistortion: 0, verticalDistortion: 0 };

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 select-none">
      <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
        <Wand2 className="w-5 h-5" />
        <CustomizableLabel
          labelId="neo1-app_panels_warp_panel_item_3"
          as="h3"
          className="text-sm font-bold text-slate-100"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_warp_panel.h3.warp_and_deform_studio", "Warp & deform studio")}
                </>
              )}
        </CustomizableLabel>
      </div>

      {/* Warp Preset Selection */}
      <div>
        <CustomizableLabel
          labelId="neo1-app_panels_warp_panel_item_2"
          as="label"
          className="block text-xs font-semibold text-slate-300 mb-2"
        >
            {() => (
                <>
                  {uiText("components_neo1_app_components_panels_warp_panel.label.warp_style", "Warp style")}
                </>
              )}
        </CustomizableLabel>
        <div className="grid grid-cols-2 gap-2">
          {warpStyles.map((ws) => (
            <CustomizableButton
              buttonId="neo1-app_panels_warp_panel_btn_1"
              key={ws.id}
onClick={() =>
                onUpdateLayer({
                  warp: {
                    ...warpConfig,
                    style: ws.id as any,
                    bend: ws.id !== 'none' && warpConfig.bend === 0 ? 50 : warpConfig.bend,
                  },
                })
              }
className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer ${
                warpConfig.style === ws.id
                  ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
                {() => (
                    <>
                      {ws.label}
                    </>
                  )}
            </CustomizableButton>
          ))}
        </div>
      </div>

      {/* Bend Slider */}
      {warpConfig.style !== 'none' && (
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_warp_panel.span.bend_curve", "Bend Curve")}</span>
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
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_warp_panel.span.horizontal_distortion", "Horizontal Distortion")}</span>
              <span className="font-mono text-rose-400">{warpConfig.horizontalDistortion}%</span>
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
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-300">{uiText("components_neo1_app_components_panels_warp_panel.span.vertical_distortion", "Vertical Distortion")}</span>
              <span className="font-mono text-rose-400">{warpConfig.verticalDistortion}%</span>
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

      {/* Skew & Deform Controls */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-rose-400" />
          <span>{uiText("components_neo1_app_components_panels_warp_panel.span.perspective_and_skew_deform", "Perspective & Skew Deform")}</span>
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">{uiText("components_neo1_app_components_panels_warp_panel.span.skew_x_horizontal_slant", "Skew X (Horizontal Slant)")}</span>
            <span className="font-mono text-rose-400">{layer.skewX || 0}°</span>
          </div>
          <input
            type="range"
            min={-60}
            max={60}
            value={layer.skewX || 0}
            onChange={(e) => onUpdateLayer({ skewX: Number(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">{uiText("components_neo1_app_components_panels_warp_panel.span.skew_y_vertical_slant", "Skew Y (Vertical Slant)")}</span>
            <span className="font-mono text-rose-400">{layer.skewY || 0}°</span>
          </div>
          <input
            type="range"
            min={-60}
            max={60}
            value={layer.skewY || 0}
            onChange={(e) => onUpdateLayer({ skewY: Number(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Rotation & Opacity */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <RotateCw className="w-3.5 h-3.5 text-rose-400" />
          <span>{uiText("components_neo1_app_components_panels_warp_panel.span.rotation_and_opacity", "Rotation & Opacity")}</span>
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">{uiText("components_neo1_app_components_panels_warp_panel.span.rotation", "Rotation")}</span>
            <span className="font-mono text-rose-400">{layer.rotation || 0}°</span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            value={layer.rotation || 0}
            onChange={(e) => onUpdateLayer({ rotation: Number(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">{uiText("components_neo1_app_components_panels_warp_panel.span.opacity", "Opacity")}</span>
            <span className="font-mono text-rose-400">{Math.round((layer.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.opacity ?? 1}
            onChange={(e) => onUpdateLayer({ opacity: Number(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
