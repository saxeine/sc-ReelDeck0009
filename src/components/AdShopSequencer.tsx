import { useEffect, useRef, useState, type ReactNode } from "react";
import { SequencerPanel, type SequencerSource } from "./SequencerPanel";
import { StudioDialog } from "./StudioDialog";
import type { useAdShopAnimation } from "./useAdShopAnimation";

export function AdShopSequencer({ animation, sources, boxImages, onAddSource, onDeleteSource, onClose,
  onOpenPainter, onOpenChoreographer, onOpenGrid, gridConfigurator }: {
  animation: ReturnType<typeof useAdShopAnimation>;
  sources: SequencerSource[];
  boxImages: Record<number, string>;
  onAddSource: (source: SequencerSource) => void;
  onDeleteSource: (id: string) => void;
  onClose: () => void;
  onOpenPainter: () => void;
  onOpenChoreographer: () => void;
  onOpenGrid: () => void;
  gridConfigurator?: ReactNode;
}) {
  const sourceUploadRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("Changes to this route are shared live with AdShop and the wall studio.");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[data-editor-container="sequencer_preset_studio_modal"], [data-editor-container="sequencer_more_warps_popup"], [data-editor-container="grid_configuration_studio_modal"]')) return;
      closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const fill = () => {
    if (animation.sequence.locked) { setMessage("Unlock the Sequencer before changing panel artwork."); return; }
    if (!sources.length) { setMessage("Add an image source first."); return; }
    animation.setSequence((old) => {
      const secondaryImages = { ...old.secondaryImages };
      old.activeSlots.forEach((slot, index) => { secondaryImages[slot] = sources[index % sources.length].url; });
      return { ...old, secondaryImages };
    });
    setMessage("The active panels are filled with the current sources.");
  };
  return <StudioDialog title="AdShop Sequencer">
    <div className="as-sequencer-shell">
      <header className="as-sequencer-header">
        <div><span>ADSHOP / CONTROL DECK</span><h2>Sequencer</h2></div>
        <div className="as-sequencer-actions">
          <button type="button" onClick={animation.toggleRoute}>
            {animation.sequence.playing && !animation.sequence.bypassed ? "Pause sequence" : "Play sequence"}
          </button>
          <button type="button" onClick={onOpenGrid}>Panel arrangement</button>
          <button type="button" onClick={onOpenChoreographer}>Choreographer</button>
          <button type="button" onClick={onClose} aria-label="Close Sequencer">Close</button>
        </div>
      </header>
      <p className="as-sequencer-notice" role="status">{message}</p>
      <div className="as-sequencer-body">
        <SequencerPanel totalSlots={16} sources={sources} boxImages={boxImages} gridRegions={animation.regions}
          state={animation.sequence} setState={animation.setSequence} onActiveSlotsChange={animation.onActiveSlotsChange}
          sourceUploadRef={sourceUploadRef} onAddSource={onAddSource} onDeleteSource={onDeleteSource}
          onToggleLock={() => animation.setSequence((old) => ({ ...old, locked: !old.locked }))}
          onRequestFill={fill} onOpenFlipMe={onOpenPainter} showToast={setMessage} />
      </div>
      {gridConfigurator}
    </div>
  </StudioDialog>;
}
