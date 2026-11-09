import { ChevronLeft,ChevronRight,FileUp,FolderOpen,HelpCircle,Layers,Save,Sparkles,X } from 'lucide-react';
import React,{ useEffect,useMemo,useRef,useState } from 'react';
import { CustomizableButton } from './CustomizableButton';
import { CustomizableLabel } from './CustomizableLabel';
import { Neo1App } from './neo1-app/Neo1App';
import type { CanvasState, Layer } from './neo1-app/types';

interface Neo1StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  nextImageUrl?: string;
  prevImageUrl?: string;
  allFrames?: string[];
  slices?: { name: string; url: string }[];
  sliceIndex?: number | null;
  sliceName?: string;
  initialLayers?: Layer[];
  initialCanvasState?: CanvasState;
  onSaveToAssetOrganiser?: (dataUrl: string, sliceIndex?: number | null, sliceName?: string, layers?: Layer[], canvas?: CanvasState) => void;
  onNavigateFrame?: (index: number) => void;
}

export const Neo1StudioModal: React.FC<Neo1StudioModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageWidth,
  imageHeight,
  nextImageUrl,
  prevImageUrl,
  allFrames,
  slices,
  sliceIndex,
  sliceName,
  initialLayers,
  initialCanvasState,
  onSaveToAssetOrganiser,
  onNavigateFrame,
}) => {
  // Resolve frames list
  const resolvedFrames = useMemo(() => {
    if (allFrames && allFrames.length > 0) return allFrames;
    if (slices && slices.length > 0) return slices.map((s) => s.url);
    if (imageUrl) return [imageUrl];
    return [];
  }, [allFrames, slices, imageUrl]);

  const [activeIndex, setActiveIndex] = useState<number>(sliceIndex ?? 0);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const psdInputRef = useRef<HTMLInputElement>(null);

  // Register actions in a ref. Updating parent state here would create a
  // render loop because the source editor refreshes its callbacks on edits.
  const appActions = useRef<{
    loadProject?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    saveProject?: () => void;
    openShortcuts?: () => void;
    importPSD?: (file: File) => void;
    exportPSD?: () => void;
  } | null>(null);

  useEffect(() => {
    if (sliceIndex !== undefined && sliceIndex !== null) {
      setActiveIndex(sliceIndex);
    }
  }, [sliceIndex]);

  const currentSlice = slices?.[activeIndex];
  const activeSliceName =
    currentSlice?.name ||
    sliceName ||
    `Frame ${activeIndex + 1}`;

  const handleNavigate = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= resolvedFrames.length) return;
    setActiveIndex(newIdx);
    if (onNavigateFrame) {
      onNavigateFrame(newIdx);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="neo1-studio fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Modal Top Bar */}
      <div className="relative h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CustomizableLabel
              labelId="neo1_label_title"
              defaultLabel="Neo1 studio"
              defaultIcon={<Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
              className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5"
            />
          </div>
        </div>

        {/* Quick Header Frame Navigation (Centred absolutely in top bar) */}
        {resolvedFrames.length > 1 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            <CustomizableButton
              buttonId="neo1_modal_prev_frame"
              defaultLabel="Previous slice"
              defaultIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              forceZeroText={true}
              onClick={() => handleNavigate(Math.max(0, activeIndex - 1))}
              disabled={activeIndex <= 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
              title="Previous Slice (Alt+Left Arrow)"
            />
            <span className="text-[11px] font-mono text-cyan-400 px-1 font-semibold">
              {activeIndex + 1} / {resolvedFrames.length}
            </span>
            <CustomizableButton
              buttonId="neo1_modal_next_frame"
              defaultLabel="Next slice"
              defaultIcon={<ChevronRight className="w-3.5 h-3.5" />}
              forceZeroText={true}
              onClick={() => handleNavigate(Math.min(resolvedFrames.length - 1, activeIndex + 1))}
              disabled={activeIndex >= resolvedFrames.length - 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
              title="Next Slice (Alt+Right Arrow)"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto mr-2">
          {/* Load Project JSON */}
          <CustomizableButton
            buttonId="neo1_load_project"
            defaultLabel="Load project json"
            forceZeroText={true}
            defaultIcon={<FolderOpen className="w-4 h-4 text-slate-300" />}
            onClick={() => jsonInputRef.current?.click()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            title="Load Project JSON"
          />
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={(e) => appActions.current?.loadProject?.(e)}
            className="hidden"
          />

          {/* Import PSD */}
          <CustomizableButton
            buttonId="neo1_import_psd"
            defaultLabel="Import psd"
            forceZeroText={true}
            defaultIcon={<FileUp className="w-4 h-4 text-purple-300" />}
            onClick={() => psdInputRef.current?.click()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            title="Import Photoshop PSD File"
          />
          <input
            ref={psdInputRef}
            type="file"
            accept=".psd,image/vnd.adobe.photoshop"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && appActions.current?.importPSD) {
                appActions.current.importPSD(file);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          {/* Save Project JSON */}
          <CustomizableButton
            buttonId="neo1_save_project"
            defaultLabel="Save project json"
            forceZeroText={true}
            defaultIcon={<Save className="w-4 h-4 text-slate-300" />}
            onClick={() => appActions.current?.saveProject?.()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            title="Save Project JSON"
          />

          {/* Export Multi-layer PSD */}
          <CustomizableButton
            buttonId="neo1_export_psd"
            defaultLabel="Export psd"
            forceZeroText={true}
            defaultIcon={<Layers className="w-4 h-4 text-purple-300" />}
            onClick={() => appActions.current?.exportPSD?.()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            title="Export Multi-Layer PSD"
          />

          {/* Shortcuts Modal Button */}
          <CustomizableButton
            buttonId="neo1_shortcuts"
            defaultLabel="Shortcuts"
            forceZeroText={true}
            defaultIcon={<HelpCircle className="w-4 h-4 text-slate-300" />}
            onClick={() => appActions.current?.openShortcuts?.()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            title="Keyboard Shortcuts"
          />
        </div>

        <CustomizableButton
          buttonId="neo1_modal_close"
          defaultLabel="Close studio"
          defaultIcon={<X className="w-4 h-4" />}
          forceZeroText={true}
          onClick={onClose}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Close Neo1 Studio"
        />
      </div>

      {/* Embedded Studio */}
      <div className="flex-1 overflow-hidden relative">
        <Neo1App
          initialImage={resolvedFrames[activeIndex] || imageUrl}
          initialWidth={imageWidth}
          initialHeight={imageHeight}
          nextImage={nextImageUrl}
          prevImage={prevImageUrl}
          sliceIndex={activeIndex}
          allFrames={resolvedFrames}
          slices={slices}
          sliceName={activeSliceName}
          initialLayers={initialLayers}
          initialCanvasState={initialCanvasState}
          onSaveToAssetOrganiser={onSaveToAssetOrganiser}
          onNavigateFrame={handleNavigate}
          onRegisterActions={(actions) => { appActions.current = actions; }}
        />
      </div>
    </div>
  );
};

export default Neo1StudioModal;
