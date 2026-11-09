import {
BookmarkPlus,
Check,
Download,
Eye,
EyeOff,
FileUp,
Film,
Flame,
FolderPlus,
Grid,
Image as ImageIcon,
Layers,
PanelLeftClose,
PanelLeftOpen,
Redo,
Sliders,
Type,
Undo
} from 'lucide-react';
import React,{ useState } from 'react';
import { uiText } from "../../../hooks/useUIConfig";
import { CustomizableButton } from '../../CustomizableButton';
import { CustomizableLabel } from '../../CustomizableLabel';
import { CanvasState } from '../types';

interface NavbarProps {
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddText: (presetStyle?: any, text?: string) => void;
  onOpenAddTextModal: () => void;
  onUploadImage: (file: File) => void;
  onOpenExportModal: () => void;
  onOpenShortcutsModal: () => void;
  onSaveProject: () => void;
  onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBurnToStoryboard?: () => void;
  onSaveToAssetOrganiser?: () => void;
  onSaveAsNewToOrganiser?: () => void;
  isSavingComposition?: boolean;
  onImportPSD?: (file: File) => void;
  onExportPSD?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  layerCount: number;
  currentIndex: number;
  allFramesCount: number;
  onNavigate: (index: number) => void;
  isLeftPanelVisible?: boolean;
  onToggleLeftPanel?: () => void;
  selectedTextLayer?: any | null;
  onSavePreset?: (presetName: string) => void;
  sliceName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  canvasState,
  setCanvasState,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenAddTextModal,
  onUploadImage,
  onOpenExportModal,
  onBurnToStoryboard,
  onSaveToAssetOrganiser,
  onSaveAsNewToOrganiser,
  isSavingComposition = false,
  onImportPSD,
  onExportPSD,
  activeTab,
  setActiveTab,
  layerCount,
  isLeftPanelVisible = true,
  onToggleLeftPanel,
  selectedTextLayer,
  onSavePreset,
  sliceName,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const psdInputRef = React.useRef<HTMLInputElement>(null);

  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.psd') && onImportPSD) {
        onImportPSD(file);
      } else {
        onUploadImage(file);
      }
      e.target.value = '';
    }
  };

  const handlePsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onImportPSD) {
        onImportPSD(file);
      } else {
        onUploadImage(file);
      }
      e.target.value = '';
    }
  };

  return (
    <header className="neo1-navbar h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Left: Navigation & Panel Toggle */}
      <div className="flex items-center gap-2.5">
        {onToggleLeftPanel && (
          <CustomizableButton
            buttonId="neo1_toggle_left_panel"
            defaultLabel="Toggle left panel"
            forceZeroText={true}
            defaultIcon={isLeftPanelVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            onClick={onToggleLeftPanel}
            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
              isLeftPanelVisible
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/30 hover:bg-slate-700 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-slate-900'
            }`}
            title={isLeftPanelVisible ? "Hide Left Tool Control Panel" : "Show Left Tool Control Panel"}
          />
        )}

        {/* Save Style as Preset - Compact & Contrasting Radiant Amber/Gold */}
        {selectedTextLayer && (
          <div className="flex items-center gap-1 shrink-0">
            {!isSavingPreset ? (
              <CustomizableButton
                buttonId="neo1_save_preset"
                defaultLabel="Save style as preset"
                defaultIcon={<BookmarkPlus className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
                onClick={() => {
                  setIsSavingPreset(true);
                  setNewPresetName(selectedTextLayer.text.slice(0, 15) || 'My Custom Style');
                }}
                className="h-6 px-1.5 py-0 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-[10px] rounded border border-amber-200 transition-all shadow-sm shadow-amber-500/40 flex items-center gap-1 cursor-pointer shrink-0"
                title="Save style as preset"
              />
            ) : (
              <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={uiText("components_neo1_app_components_navbar.input.preset_name.placeholder", "Preset Name")}
                  className="w-20 bg-slate-950 border border-slate-800 px-1 py-0.5 text-slate-100 text-[10px] rounded focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
                <CustomizableButton
                  buttonId="neo1_preset_save_confirm"
                  defaultLabel="Save"
                  type="button"
                  onClick={() => {
                    if (onSavePreset) onSavePreset(newPresetName);
                    setIsSavingPreset(false);
                    setNewPresetName('');
                    setShowSavedToast(true);
                    setTimeout(() => setShowSavedToast(false), 2000);
                  }}
                  className="px-1.5 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[9px] rounded cursor-pointer"
                  title="Confirm and save style preset"
                />
                <CustomizableButton
                  buttonId="neo1_preset_save_cancel"
                  defaultLabel="Cancel"
                  forceZeroText={true}
                  defaultIcon={<span className="text-[9px]">✕</span>}
                  type="button"
                  onClick={() => setIsSavingPreset(false)}
                  className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[9px] rounded cursor-pointer"
                  title="Cancel preset saving"
                />
              </div>
            )}
            {showSavedToast && (
              <span className="text-[9px] text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/40 px-1 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                <Check className="w-2.5 h-2.5" />{uiText("components_neo1_app_components_navbar.span.saved", " Saved!")}
              </span>
            )}
          </div>
        )}

        {/* Show/Hide Layer Labels (Badges) Toggle - Compact & Contrasting Emerald/Mint */}
        <CustomizableButton
          buttonId="neo1_toggle_badges"
          defaultLabel={Boolean(canvasState.showLayerLabels) ? 'Hide badges' : 'Show badges'}
          defaultIcon={Boolean(canvasState.showLayerLabels) ? <Eye className="w-2.5 h-2.5 text-slate-950 shrink-0 stroke-[2.5]" /> : <EyeOff className="w-2.5 h-2.5 text-emerald-400 shrink-0 stroke-[2.5]" />}
          onClick={() =>
            setCanvasState((prev) => ({
              ...prev,
              showLayerLabels: !prev.showLayerLabels,
            }))
          }
          className={`h-6 px-1.5 py-0 rounded text-[10px] font-black border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
            Boolean(canvasState.showLayerLabels)
              ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-sm shadow-emerald-500/30 hover:bg-emerald-300'
              : 'bg-slate-900 border-emerald-500/70 text-emerald-300 hover:bg-emerald-950/80 hover:text-emerald-100 hover:border-emerald-400'
          }`}
          title={
            Boolean(canvasState.showLayerLabels)
              ? 'Click to hide subtitle / layer label badges on canvas (Shortcut: L)'
              : 'Click to show subtitle / layer label badges on canvas (Shortcut: L)'
          }
        >
          <span className="text-[8.5px] font-mono px-1 py-0 rounded bg-black/40 text-current border border-current/20">
            {uiText("components_neo1_app_components_navbar.span.l", "L")}
          </span>
        </CustomizableButton>

        {/* Show/Hide Layer Floating Action Bar Toggle - Compact & Contrasting Fuchsia/Neon */}
        <CustomizableButton
          buttonId="neo1_toggle_action_bar"
          defaultLabel={Boolean(canvasState.showQuickToolbar) ? 'Hide action bar' : 'Action bar'}
          defaultIcon={<Sliders className="w-2.5 h-2.5 text-current shrink-0 stroke-[2.5]" />}
          onClick={() =>
            setCanvasState((prev) => ({
              ...prev,
              showQuickToolbar: !prev.showQuickToolbar,
            }))
          }
          className={`h-6 px-1.5 py-0 rounded text-[10px] font-black border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
            Boolean(canvasState.showQuickToolbar)
              ? 'bg-fuchsia-500 text-slate-950 border-fuchsia-300 shadow-sm shadow-fuchsia-500/30 hover:bg-fuchsia-400'
              : 'bg-slate-900 border-fuchsia-500/70 text-fuchsia-300 hover:bg-fuchsia-950/80 hover:text-fuchsia-100 hover:border-fuchsia-400'
          }`}
          title={
            Boolean(canvasState.showQuickToolbar)
              ? 'Click to hide layer floating action bar (Shortcut: B)'
              : 'Click to show layer floating action bar (Shortcut: B)'
          }
        >
          <span className="text-[8.5px] font-mono px-1 py-0 rounded bg-black/40 text-current border border-current/20">
            {uiText("components_neo1_app_components_navbar.span.b", "B")}
          </span>
        </CustomizableButton>
      </div>

      {/* Center Controls: Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Add Text */}
        <CustomizableButton
          buttonId="neo1_add_text"
          defaultLabel="Add text"
          forceZeroText={true}
          defaultIcon={<Type className="w-4 h-4" />}
          onClick={onOpenAddTextModal}
          className="p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
          title="Add Text"
        />

        {/* Upload Image */}
        <CustomizableButton
          buttonId="neo1_add_image"
          defaultLabel="Add image"
          forceZeroText={true}
          defaultIcon={<ImageIcon className="w-4 h-4 text-purple-400" />}
          onClick={() => fileInputRef.current?.click()}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all border border-slate-700 cursor-pointer"
          title="Add Image"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.psd"
          onChange={handleImageChange}
          className="hidden"
        />

        {/* Import PSD */}
        <CustomizableButton
          buttonId="neo1_import_psd"
          defaultLabel="Import psd"
          forceZeroText={true}
          defaultIcon={<FileUp className="w-4 h-4 text-purple-400" />}
          onClick={() => psdInputRef.current?.click()}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all border border-slate-700 cursor-pointer"
          title="Import PSD file with preserved layers"
        />
        <input
          ref={psdInputRef}
          type="file"
          accept=".psd,image/vnd.adobe.photoshop"
          onChange={handlePsdChange}
          className="hidden"
        />

        {/* Grid Toggle */}
        <CustomizableButton
          buttonId="neo1_canvas_grid_toggle"
          defaultLabel="Toggle grid"
          forceZeroText={true}
          defaultIcon={<Grid className="w-4 h-4" />}
          onClick={() =>
            setCanvasState((prev) => ({ ...prev, showGrid: !prev.showGrid }))
          }
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            canvasState.showGrid
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Canvas Grid"
        />

        {/* Layers Counter */}
        <CustomizableButton
          buttonId="neo1_tab_layers"
          defaultLabel={`${layerCount} Layers`}
          defaultIcon={<Layers className="w-3.5 h-3.5" />}
          onClick={() => setActiveTab('layers')}
          className={`h-7 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
        />

        {/* Active Slice Name Status Panel */}
        {sliceName && (
          <div className="flex items-center gap-1 text-[10px] text-slate-300 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-normal select-none">
            {(
              <>
                <CustomizableLabel
                  labelId="neo1_label_editing"
                  defaultLabel="Editing frame"
                  defaultIcon={<Film className="w-2.5 h-2.5 text-slate-400" />}
                  className="text-[10px] text-slate-400"
                />
                <span className="font-semibold text-slate-200">: </span>
              </>
            )}
            <span className="font-semibold text-slate-200">{sliceName}</span>
          </div>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800">
          <CustomizableButton
            buttonId="neo1_undo"
            defaultLabel="Undo"
            forceZeroText={true}
            defaultIcon={<Undo className="w-4 h-4" />}
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded text-xs transition-colors ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          />
          <CustomizableButton
            buttonId="neo1_redo"
            defaultLabel="Redo"
            forceZeroText={true}
            defaultIcon={<Redo className="w-4 h-4" />}
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded text-xs transition-colors ${
              canRedo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          />
        </div>
      </div>

      {/* Right Controls: Save / Load / Export */}
      <div className="flex items-center gap-1.5">
        {/* Burn to Storyboard Image Button */}
        {onBurnToStoryboard && (
          <CustomizableButton
            buttonId="neo1_burn_to_storyboard"
              disabled={isSavingComposition}
            defaultLabel="Burn to storyboard image"
            defaultIcon={<Flame className="w-4 h-4 text-amber-300" />}
            onClick={onBurnToStoryboard}
            className="h-8 px-2.5 py-0 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md shadow-orange-500/25 flex items-center gap-1.5 cursor-pointer shrink-0 border border-amber-400/50"
            title="Burn flattened composition directly into active storyboard frame"
          />
        )}

        {/* Save to Asset Organiser Buttons */}
        {onSaveToAssetOrganiser && (
          <div className="flex items-center gap-1.5">
            <CustomizableButton
              buttonId="neo1_save_to_organiser"
              disabled={isSavingComposition}
              defaultLabel="Save to ReelDeck"
              defaultIcon={<Check className="w-4 h-4" />}
              onClick={onSaveToAssetOrganiser}
              className="p-2 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20 cursor-pointer whitespace-nowrap"
              title="Save to the current ReelDeck frame"
            />

            {onSaveAsNewToOrganiser && (
              <CustomizableButton
                buttonId="neo1_save_as_new_slice"
              disabled={isSavingComposition}
                defaultLabel="Save as new"
                defaultIcon={<FolderPlus className="w-4 h-4" />}
                onClick={onSaveAsNewToOrganiser}
                className="p-2 gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-500/20 cursor-pointer whitespace-nowrap"
                title="Save as a new ReelDeck frame"
              />
            )}
          </div>
        )}

        {/* Export Multi-layer PSD */}
        {onExportPSD && (
          <CustomizableButton
            buttonId="neo1_export_psd"
            defaultLabel="Export psd"
            forceZeroText={true}
            defaultIcon={<Layers className="w-4 h-4" />}
            onClick={onExportPSD}
            className="p-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-lg transition-all shadow-md shadow-purple-500/20 cursor-pointer"
            title="Export Multi-Layer PSD"
          />
        )}

        {/* Export Button */}
        <CustomizableButton
          buttonId="neo1_export_modal"
          defaultLabel="Export image"
          forceZeroText={true}
          defaultIcon={<Download className="w-4 h-4" />}
          onClick={onOpenExportModal}
          className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all shadow-md shadow-purple-500/20 cursor-pointer"
          title="Export Image"
        />
      </div>
    </header>
  );
};
