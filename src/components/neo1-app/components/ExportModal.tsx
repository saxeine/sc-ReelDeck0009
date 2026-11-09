import { Download,FileJson,Flame,Layers,X } from 'lucide-react';
import React,{ useState } from 'react';
import { uiText } from "../../../hooks/useUIConfig";
import { exportNeo1ToPsd } from '../../../utils/psdExportImport';
import { CustomizableButton } from '../../CustomizableButton';
import { CustomizableLabel } from "../../CustomizableLabel";
import { CanvasState,Layer } from '../types';
import { preloadCanvasAssets, renderCanvasToContext } from '../utils/canvasRender';
import { preloadTextFonts } from '../utils/googleFonts';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasState: CanvasState;
  layers: Layer[];
  onSaveProjectJSON: () => void;
  onBurnToStoryboard?: () => void;
  onExportPSD?: () => void;
  projectName?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasState,
  layers,
  onSaveProjectJSON,
  onBurnToStoryboard,
  onExportPSD,
  projectName,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const quality = 0.92;
  const [scale, setScale] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExportPSD = async () => {
    setIsExporting(true);
    try {
      if (onExportPSD) {
        await onExportPSD();
      } else {
        await exportNeo1ToPsd(canvasState, layers, projectName || 'neo1-design');
      }
      onClose();
    } catch (err) {
      console.error('PSD export failed:', err);
      alert('Failed to export PSD file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      await Promise.all([preloadCanvasAssets(canvasState, layers), preloadTextFonts(layers)]);
      const offCanvas = document.createElement('canvas');
      offCanvas.width = canvasState.width * scale;
      offCanvas.height = canvasState.height * scale;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is unavailable.');
      ctx.scale(scale, scale);
      renderCanvasToContext(ctx, canvasState, layers);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = offCanvas.toDataURL(mimeType, quality);
      if (!dataUrl.startsWith(`data:${mimeType};`)) throw new Error('Canvas is too large to export.');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `neo1-export-${Date.now()}.${format}`;
      a.click();
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Could not export. Check that the images are loaded and the canvas is not too large.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400">
            <Download className="w-5 h-5" />
            <CustomizableLabel
              labelId="neo1-app_export_modal_item_3"
              as="h2"
              className="text-base font-bold text-slate-100"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_export_modal.h2.export_graphics", "Export graphics")}
                    </>
                  )}
            </CustomizableLabel>
          </div>
          <CustomizableButton
            buttonId="neo1_export_btn_close"
            defaultLabel="Close export"
            forceZeroText={true}
            defaultIcon={<X className="w-5 h-5" />}
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          />
        </div>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <CustomizableLabel
              labelId="neo1-app_export_modal_item_2"
              as="label"
              className="block text-xs font-semibold text-slate-300 mb-2"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_export_modal.label.image_format", "Image format")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                { fmt: 'png' as const, buttonId: 'neo1_export_fmt_png', label: 'PNG format' },
                { fmt: 'jpeg' as const, buttonId: 'neo1_export_fmt_jpeg', label: 'JPEG format' },
                { fmt: 'webp' as const, buttonId: 'neo1_export_fmt_webp', label: 'WEBP format' },
              ].map(({ fmt, buttonId, label }) => (
                <CustomizableButton
                  key={fmt}
                  buttonId={buttonId}
                  defaultLabel={label}
                  onClick={() => setFormat(fmt)}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border cursor-pointer ${
                    format === fmt
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Scale Resolution */}
          <div>
            <CustomizableLabel
              labelId="neo1-app_export_modal_item_1"
              defaultLabel={"×"}
              as="label"
              className="block text-xs font-semibold text-slate-300 mb-2"
            >
                {(ibcProps) => (
                    <>
                      {uiText("components_neo1_app_components_export_modal.label.resolution_multiplier", "Resolution multiplier: ")}
                    {scale}
                    {uiText("components_neo1_app_components_export_modal.label.x", "x (")}
                    {canvasState.width * scale}
                    {!ibcProps.isTextHidden ? ibcProps.label : null}
                    {canvasState.height * scale}
                    {uiText("components_neo1_app_components_export_modal.label.px", " px)")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                { s: 1, buttonId: 'neo1_export_res_1x', label: '1x resolution' },
                { s: 2, buttonId: 'neo1_export_res_2x', label: '2x resolution' },
                { s: 3, buttonId: 'neo1_export_res_3x', label: '3x resolution' },
              ].map(({ s, buttonId }) => (
                <CustomizableButton
                  key={s}
                  buttonId={buttonId}
                  defaultLabel={`${s}x (${s * 100}%)`}
                  onClick={() => setScale(s)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    scale === s
                      ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Burn Directly into Storyboard */}
          {onBurnToStoryboard && (
            <div className="p-3 bg-gradient-to-r from-amber-950/60 to-rose-950/60 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-200">{uiText("components_neo1_app_components_export_modal.p.burn_to_storyboard_image", "Burn to storyboard image")}</p>
                <p className="text-[10px] text-slate-400">{uiText("components_neo1_app_components_export_modal.p.save_flattened_frame_directly_into_current_s", "Save flattened frame directly into current storyboard slot")}</p>
              </div>
              <CustomizableButton
                buttonId="neo1_export_btn_burn"
                defaultLabel="Burn to storyboard"
                defaultIcon={<Flame className="w-4 h-4 text-amber-300" />}
                onClick={() => {
                  onBurnToStoryboard();
                  onClose();
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                title="Burn directly into active storyboard frame"
              />
            </div>
          )}

          {/* Multi-Layer PSD Export Option */}
          <div className="p-3 bg-slate-950/80 border border-purple-500/30 rounded-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-purple-300">{uiText("components_neo1_app_components_export_modal.p.export_multi_layer_psd", "Export multi-layer psd")}</p>
              <p className="text-[10px] text-slate-400">{uiText("components_neo1_app_components_export_modal.p.photoshop_psd_preserving_layer_order_opacity", "Photoshop .psd preserving layer order, opacity, and names")}</p>
            </div>
            <CustomizableButton
              buttonId="neo1_export_btn_psd"
              defaultLabel={isExporting ? 'Exporting...' : 'Export psd'}
              defaultIcon={<Layers className="w-4 h-4 text-purple-300" />}
              onClick={handleExportPSD}
              disabled={isExporting}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              title="Export complete composition as multi-layer PSD file"
            />
          </div>

          {/* Save Project JSON Option */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-200">{uiText("components_neo1_app_components_export_modal.p.save_editable_project", "Save editable project")}</p>
              <p className="text-[10px] text-slate-400">{uiText("components_neo1_app_components_export_modal.p.download_json_state_with_all_layers", "Download .json state with all layers")}</p>
            </div>
            <CustomizableButton
              buttonId="neo1_export_btn_save_json"
              defaultLabel="Save project json"
              defaultIcon={<FileJson className="w-4 h-4" />}
              onClick={onSaveProjectJSON}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <CustomizableButton
            buttonId="neo1_export_btn_close"
            defaultLabel="Cancel"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          />
          <CustomizableButton
            buttonId="neo1_export_btn_download"
            defaultLabel={isExporting ? 'Exporting...' : 'Export image'}
            defaultIcon={<Download className="w-4 h-4" />}
            onClick={handleExportImage}
            disabled={isExporting}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-500/20 cursor-pointer flex items-center gap-1.5"
          />
        </div>
      </div>
    </div>
  );
};
