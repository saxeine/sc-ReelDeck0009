import { Type,X } from 'lucide-react';
import React,{ useState } from 'react';
import { uiText } from "../../../hooks/useUIConfig";
import { CustomizableButton } from '../../CustomizableButton';
import { CustomizableLabel } from "../../CustomizableLabel";
import { TextLayer } from '../types';

interface AddTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddText: (presetStyle?: Partial<TextLayer>, text?: string) => void;
}

export const AddTextModal: React.FC<AddTextModalProps> = ({ isOpen, onClose, onAddText }) => {
  const [textInput, setTextInput] = useState('NEO1 STUDIO');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onAddText(undefined, textInput.trim());
      onClose();
    }
  };

  const quickPresets = [
    { label: 'CYBERPUNK TITLE', font: 'Orbitron', color: '#00f0ff' },
    { label: 'RETRO SYNTHWAVE', font: 'Bebas Neue', color: '#ff007f' },
    { label: 'ELEGANT SERIF', font: 'Playfair Display', color: '#ffffff' },
    { label: 'MODERN BOLD', font: 'Montserrat', color: '#a855f7' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <Type className="w-5 h-5" />
            <CustomizableLabel
              labelId="neo1-app_add_text_modal_item_4"
              as="h2"
              className="text-base font-bold text-slate-100"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_add_text_modal.h2.add_text_layer", "Add text layer")}
                    </>
                  )}
            </CustomizableLabel>
          </div>
          <CustomizableButton
            buttonId="neo1_addtext_btn_close_x"
            defaultLabel="Close"
            forceZeroText={true}
            defaultIcon={<X className="w-5 h-5" />}
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Close text modal"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <CustomizableLabel
              labelId="neo1-app_add_text_modal_item_3"
              as="label"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_add_text_modal.label.enter_your_text_headline", "Enter your text / headline")}
                    </>
                  )}
            </CustomizableLabel>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={uiText("components_neo1_app_components_add_text_modal.input.e_g_neo1_studio.placeholder", "e.g. Neo1 Studio")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <CustomizableLabel
              labelId="neo1-app_add_text_modal_item_2"
              as="label"
              className="block text-xs font-semibold text-slate-400 mb-2"
            >
                {() => (
                    <>
                      {uiText("components_neo1_app_components_add_text_modal.label.or_select_preset_style", "Or select preset style")}
                    </>
                  )}
            </CustomizableLabel>
            <div className="grid grid-cols-2 gap-2">
              {quickPresets.map((preset, idx) => (
                <CustomizableButton
                  buttonId="neo1-app_add_text_modal_btn_1"
                  key={idx}
type="button"
onClick={() => {
                    onAddText({ fontFamily: preset.font, color: preset.color }, textInput || preset.label);
                    onClose();
                  }}
className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-left transition-all cursor-pointer group"
                >
                    {() => (
                        <>
                          <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 truncate">
                    {preset.label}
                  </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{preset.font}</p>
                        </>
                      )}
                </CustomizableButton>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <CustomizableButton
              buttonId="neo1_addtext_btn_cancel"
              defaultLabel="Cancel"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              title="Cancel text creation"
            />
            <CustomizableButton
              buttonId="neo1_addtext_btn_create"
              defaultLabel="Create text"
              type="submit"
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              title="Confirm and create new text layer"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
