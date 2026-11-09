import {
ChevronDown,
ChevronUp,
Copy,
Eye,
EyeOff,
Image as ImageIcon,
Layers as LayersIcon,
Lock,
Plus,
Trash2,
Type,
Unlock
} from 'lucide-react';
import React from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { Layer } from '../../types';

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updatedProps: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onAddText: () => void;
  showLayerLabels?: boolean;
  onToggleLayerLabels?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
  onAddText,
  showLayerLabels = true,
  onToggleLayerLabels,
}) => {
  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-slate-300">
          <LayersIcon className="w-5 h-5 text-cyan-400" />
          <CustomizableLabel
            labelId="neo1-app_panels_layers_panel_item_9"
            defaultLabel={")"}
            as="h3"
            className="text-sm font-bold text-slate-100"
          >
              {(ibcProps) => (
                  <>
                    {uiText("components_neo1_app_components_panels_layers_panel.h3.layer_stack", "Layer stack (")}
                  {layers.length}
                  {!ibcProps.isTextHidden ? ibcProps.label : null}
                  </>
                )}
          </CustomizableLabel>
        </div>
        <div className="flex items-center gap-1.5">
          {onToggleLayerLabels && (
            <CustomizableButton
              buttonId="neo1-app_panels_layers_panel_btn_8"
              onClick={onToggleLayerLabels}
className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                Boolean(showLayerLabels)
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
title={
                Boolean(showLayerLabels)
                  ? 'Click to Hide Subtitle / Layer Label Badges on Canvas (Shortcut: L)'
                  : 'Click to Show Subtitle / Layer Label Badges on Canvas (Shortcut: L)'
              }
            >
                {() => (
                    <>
                      {Boolean(showLayerLabels) ? (
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              )}
                    <span>{Boolean(showLayerLabels) ? 'Badges On' : 'Badges Off'}</span>
                    </>
                  )}
            </CustomizableButton>
          )}
          <CustomizableButton
            buttonId="neo1-app_panels_layers_panel_btn_7"
            defaultIcon={<Plus className="w-4 h-4" />}
            onClick={onAddText}
className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer"
title={uiText("components_neo1_app_components_panels_layers_panel.button.add_text_layer.title", "Add Text Layer")}
          />
        </div>
      </div>

      {layers.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">{uiText("components_neo1_app_components_panels_layers_panel.p.no_layers_added_yet", "No layers added yet.")}</p>
      ) : (
        <div className="space-y-2">
          {/* Stack rendered top to bottom (reverse index order) */}
          {[...layers].reverse().map((layer) => {
            const isSelected = selectedLayerId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/60 shadow-md'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {layer.type === 'text' ? (
                    <Type className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-200 truncate">{layer.name}</span>
                </div>

                {/* Layer Control Icons */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Visibility */}
                  <CustomizableButton
                    buttonId="neo1-app_panels_layers_panel_btn_6"
                    onClick={() => onUpdateLayer(layer.id, { visible: !layer.visible })}
className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                      {() => (
                          <>
                            {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
                          </>
                        )}
                  </CustomizableButton>

                  {/* Lock */}
                  <CustomizableButton
                    buttonId="neo1-app_panels_layers_panel_btn_5"
                    onClick={() => onUpdateLayer(layer.id, { locked: !layer.locked })}
className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                      {() => (
                          <>
                            {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                          </>
                        )}
                  </CustomizableButton>

                  {/* Move Up/Down */}
                  <CustomizableButton
                    buttonId="neo1-app_panels_layers_panel_btn_4"
                    defaultIcon={<ChevronUp className="w-3.5 h-3.5" />}
                    onClick={() => onMoveLayer(layer.id, 'up')}
className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
title={uiText("components_neo1_app_components_panels_layers_panel.button.move_up.title", "Move Up")}
                  />
                  <CustomizableButton
                    buttonId="neo1-app_panels_layers_panel_btn_3"
                    defaultIcon={<ChevronDown className="w-3.5 h-3.5" />}
                    onClick={() => onMoveLayer(layer.id, 'down')}
className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
title={uiText("components_neo1_app_components_panels_layers_panel.button.move_down.title", "Move Down")}
                  />

                  {/* Duplicate */}
                  <CustomizableButton
                    buttonId="neo1-app_panels_layers_panel_btn_2"
                    defaultIcon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() => onDuplicateLayer(layer.id)}
className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
title={uiText("components_neo1_app_components_panels_layers_panel.button.duplicate_layer.title", "Duplicate Layer")}
                  />

                  {/* Delete */}
                  <CustomizableButton
                    buttonId="neo1-app_panels_layers_panel_btn_1"
                    defaultIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/40 rounded transition-all cursor-pointer"
title={uiText("components_neo1_app_components_panels_layers_panel.button.delete_layer.title", "Delete Layer")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
