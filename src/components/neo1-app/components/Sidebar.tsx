import {
Image as ImageIcon,
Layers,
Layout,
Palette,
PanelLeftClose,
Sliders,
Sparkles,
Type,
Wand2,
} from 'lucide-react';
import React from 'react';
import { CustomizableButton } from '../../CustomizableButton';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onTogglePanel?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onTogglePanel }) => {
  const tabs = [
    { id: 'presets', buttonId: 'neo1_tab_presets', label: 'Presets', icon: Sparkles, color: 'text-amber-400' },
    { id: 'text', buttonId: 'neo1_tab_text', label: 'Text editor', icon: Type, color: 'text-cyan-400' },
    { id: 'image', buttonId: 'neo1_tab_image', label: 'Image', icon: ImageIcon, color: 'text-purple-400' },
    { id: 'warp', buttonId: 'neo1_tab_warp', label: 'Warp & arch', icon: Wand2, color: 'text-rose-400' },
    { id: 'color', buttonId: 'neo1_tab_color', label: 'Color fill', icon: Palette, color: 'text-emerald-400' },
    { id: 'effects', buttonId: 'neo1_tab_effects', label: '3D & fx', icon: Sliders, color: 'text-blue-400' },
    { id: 'background', buttonId: 'neo1_tab_background', label: 'Canvas', icon: Layout, color: 'text-indigo-400' },
    { id: 'layers', buttonId: 'neo1_tab_layers', label: 'Layers', icon: Layers, color: 'text-slate-300' },
  ];

  return (
    <aside className="w-16 bg-slate-900/90 border-r border-slate-800 flex flex-col items-center py-3 gap-2 shrink-0 z-20 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <CustomizableButton
            key={tab.id}
            buttonId={tab.buttonId}
            defaultLabel={tab.label}
            defaultIcon={<Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-slate-400'}`} />}
            onClick={() => setActiveTab(tab.id)}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative group ${
              isActive
                ? 'bg-slate-800 border border-slate-700 shadow-md'
                : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            {({ label, isTextHidden }) => (
              <>
                {!isTextHidden && (
                  <span
                    className={`text-[9px] font-medium leading-none truncate max-w-[42px] ${
                      isActive ? 'text-slate-100 font-bold' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </span>
                )}
                {isActive && (
                  <div className="absolute right-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-l-full shadow-sm shadow-cyan-400" />
                )}
              </>
            )}
          </CustomizableButton>
        );
      })}
      {onTogglePanel && (
        <div className="mt-auto pt-2 border-t border-slate-800/80 w-full flex justify-center">
          <CustomizableButton
            buttonId="neo1_sidebar_toggle_panel"
            defaultLabel="Hide sidebar panel"
            forceZeroText={true}
            defaultIcon={<PanelLeftClose className="w-5 h-5" />}
            onClick={onTogglePanel}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Hide Left Tool Panel"
          />
        </div>
      )}
    </aside>
  );
};
