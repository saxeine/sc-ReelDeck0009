import { Command,X } from 'lucide-react';
import React from 'react';
import { uiText } from "../../../hooks/useUIConfig";
import { CustomizableButton } from '../../CustomizableButton';
import { CustomizableLabel } from "../../CustomizableLabel";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + Z / Cmd + Z', action: 'Undo last change' },
    { key: 'Ctrl + Y / Cmd + Shift + Z', action: 'Redo change' },
    { key: 'Ctrl + D / Cmd + D', action: 'Duplicate selected layer' },
    { key: 'Delete / Backspace', action: 'Delete selected layer' },
    { key: 'L', action: 'Toggle show/hide subtitle and layer badges on canvas' },
    { key: 'B', action: 'Toggle show/hide floating layer action bar' },
    { key: 'Arrow Keys', action: 'Nudge layer (1px)' },
    { key: 'Shift + Arrow Keys', action: 'Fast nudge layer (10px)' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <Command className="w-5 h-5" />
            <CustomizableLabel
              labelId="neo1-app_shortcuts_modal_item_1"
              as="h2"
              className="text-base font-bold text-slate-100"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_shortcuts_modal.h2.keyboard_shortcuts", "Keyboard shortcuts")}
                    </>
                  )}
            </CustomizableLabel>
          </div>
          <CustomizableButton
            buttonId="neo1_shortcuts_btn_close_x"
            defaultLabel="Close"
            forceZeroText={true}
            defaultIcon={<X className="w-5 h-5" />}
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Close shortcuts dialog"
          />
        </div>

        <div className="space-y-2">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80"
            >
              <span className="text-xs font-mono font-bold text-cyan-400">{sc.key}</span>
              <span className="text-xs text-slate-300">{sc.action}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <CustomizableButton
            buttonId="neo1_shortcuts_btn_close"
            defaultLabel="Got it"
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
            title="Acknowledge and close shortcuts modal"
          />
        </div>
      </div>
    </div>
  );
};
