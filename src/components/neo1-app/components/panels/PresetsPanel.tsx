import { Check,ChevronDown,ChevronRight,Eye,Folder,FolderOpen,Plus,Sparkles,Trash2 } from 'lucide-react';
import React,{ useEffect,useState } from 'react';
import { uiText } from "../../../../hooks/useUIConfig";
import { remoteStore } from "../../../../services/remoteKeyValueStore";
import { CustomizableButton } from "../../../CustomizableButton";
import { CustomizableLabel } from "../../../CustomizableLabel";
import { TextLayer } from '../../types';
import { loadGoogleFont } from '../../utils/googleFonts';

interface CustomPreset {
  id: string;
  name: string;
  category?: string;
  style: Partial<TextLayer>;
}

interface PresetsPanelProps {
  onApplyPreset: (preset: Partial<TextLayer>) => void;
  onPreviewPreset: (preset: Partial<TextLayer> | null, presetId: string | null) => void;
  onAddTextWithPreset: (presetStyle?: Partial<TextLayer>, customText?: string) => void;
  selectedTextLayer: TextLayer | null;
  activePreviewPresetId: string | null;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({
  onApplyPreset,
  onPreviewPreset,
  onAddTextWithPreset,
  selectedTextLayer,
  activePreviewPresetId,
}) => {
  const searchQuery = '';
  const selectedCategory = 'All';
  const [appliedPresetIdx, setAppliedPresetIdx] = useState<string | null>(null);

  // Folders collapsible state (closed by default)
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    Custom: false,
    Cyber: false,
    Bold: false,
    '3D': false,
    Minimal: false,
  });

  // Custom user presets from localStorage
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    try {
      const saved = remoteStore.getItem('neo1_custom_typography_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handlePresetsUpdated = () => {
      try {
        const saved = remoteStore.getItem('neo1_custom_typography_presets');
        if (saved) {
          setCustomPresets(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to parse updated custom presets', e);
      }
    };
    window.addEventListener('neo1_presets_updated', handlePresetsUpdated);
    return () => window.removeEventListener('neo1_presets_updated', handlePresetsUpdated);
  }, []);

  useEffect(() => {
    try {
      remoteStore.setItem('neo1_custom_typography_presets', JSON.stringify(customPresets));
    } catch (e) {
      console.warn('Failed to save custom presets', e);
    }
  }, [customPresets]);

  const defaultPresets = [
    {
      id: 'p1',
      name: 'Cyberpunk Neon',
      category: 'Cyber',
      style: {
        fontFamily: 'Orbitron',
        fontSize: 80,
        fontWeight: 900,
        color: '#00f0ff',
        fillType: 'solid' as const,
        glow: { enabled: true, color: '#00f0ff', blur: 30, spread: 10 },
        shadows: [{ enabled: true, color: '#ff007f', blur: 20, offsetX: 4, offsetY: 4 }],
      },
    },
    {
      id: 'p2',
      name: 'Retro Synthwave',
      category: '3D',
      style: {
        fontFamily: 'Bebas Neue',
        fontSize: 90,
        fontWeight: 800,
        color: '#ff007f',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 90,
          stops: [
            { offset: 0, color: '#ff007f' },
            { offset: 1, color: '#00f0ff' },
          ],
        },
        extrusion: {
          enabled: true,
          depth: 12,
          angle: 135,
          color: '#1e1b4b',
          shadowColor: 'rgba(0,0,0,0.8)',
          lightingAngle: 45,
        },
      },
    },
    {
      id: 'p3',
      name: 'Luxury Serif',
      category: 'Minimal',
      style: {
        fontFamily: 'Playfair Display',
        fontSize: 75,
        fontWeight: 700,
        fontStyle: 'italic' as const,
        color: '#ffffff',
        fillType: 'solid' as const,
        glow: { enabled: false, color: '#ffffff', blur: 0, spread: 0 },
        bgBox: {
          enabled: true,
          color: 'rgba(15, 23, 42, 0.9)',
          opacity: 0.9,
          paddingX: 25,
          paddingY: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#d97706',
          shape: 'rectangle' as const,
        },
      },
    },
    {
      id: 'p4',
      name: 'Comic Badge',
      category: 'Bold',
      style: {
        fontFamily: 'Fredoka',
        fontSize: 65,
        fontWeight: 900,
        color: '#facc15',
        fillType: 'solid' as const,
        strokes: [{ enabled: true, color: '#000000', width: 6, position: 'outer' as const, style: 'solid' as const }],
        shadows: [{ enabled: true, color: '#000000', blur: 0, offsetX: 6, offsetY: 6 }],
      },
    },
    {
      id: 'p5',
      name: 'Glitch Matrix',
      category: 'Cyber',
      style: {
        fontFamily: 'Share Tech Mono',
        fontSize: 75,
        fontWeight: 700,
        color: '#00ff66',
        fillType: 'solid' as const,
        glow: { enabled: true, color: '#00ff66', blur: 25, spread: 8 },
        strokes: [{ enabled: true, color: '#052e16', width: 3, position: 'outer' as const, style: 'solid' as const }],
        shadows: [{ enabled: true, color: '#001a00', blur: 10, offsetX: 5, offsetY: 5 }],
      },
    },
    {
      id: 'p6',
      name: 'Gold Elegance',
      category: 'Minimal',
      style: {
        fontFamily: 'Cinzel',
        fontSize: 70,
        fontWeight: 800,
        color: '#FFE57F',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 45,
          stops: [
            { offset: 0, color: '#FFE57F' },
            { offset: 0.5, color: '#D4AF37' },
            { offset: 1, color: '#AA771C' },
          ],
        },
        shadows: [{ enabled: true, color: 'rgba(0,0,0,0.9)', blur: 12, offsetX: 3, offsetY: 5 }],
        bgBox: {
          enabled: true,
          color: 'rgba(10, 10, 15, 0.95)',
          opacity: 0.95,
          paddingX: 30,
          paddingY: 15,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: '#D4AF37',
          shape: 'rectangle' as const,
        },
      },
    },
    {
      id: 'p7',
      name: 'Chrome 3D',
      category: '3D',
      style: {
        fontFamily: 'Russo One',
        fontSize: 85,
        fontWeight: 900,
        color: '#F8FAFC',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 180,
          stops: [
            { offset: 0, color: '#FFFFFF' },
            { offset: 0.5, color: '#94A3B8' },
            { offset: 1, color: '#334155' },
          ],
        },
        extrusion: {
          enabled: true,
          depth: 14,
          angle: 120,
          color: '#0F172A',
          shadowColor: 'rgba(0,0,0,0.9)',
          lightingAngle: 60,
        },
        strokes: [{ enabled: true, color: '#38BDF8', width: 2, position: 'outer' as const, style: 'solid' as const }],
      },
    },
    {
      id: 'p8',
      name: 'Vaporwave Sunset',
      category: 'Cyber',
      style: {
        fontFamily: 'Pacifico',
        fontSize: 75,
        fontWeight: 400,
        color: '#FF70A6',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 90,
          stops: [
            { offset: 0, color: '#FF70A6' },
            { offset: 0.5, color: '#FF9770' },
            { offset: 1, color: '#70D6FF' },
          ],
        },
        glow: { enabled: true, color: '#FF70A6', blur: 20, spread: 5 },
        shadows: [{ enabled: true, color: '#3A0CA3', blur: 10, offsetX: 4, offsetY: 6 }],
      },
    },
    {
      id: 'p9',
      name: 'Bold Impact Box',
      category: 'Bold',
      style: {
        fontFamily: 'Bebas Neue',
        fontSize: 95,
        fontWeight: 900,
        color: '#FACC15',
        fillType: 'solid' as const,
        strokes: [{ enabled: true, color: '#000000', width: 8, position: 'outer' as const, style: 'solid' as const }],
        bgBox: {
          enabled: true,
          color: '#000000',
          opacity: 1,
          paddingX: 28,
          paddingY: 10,
          borderRadius: 12,
          borderWidth: 3,
          borderColor: '#FACC15',
          shape: 'rectangle' as const,
        },
      },
    },
    {
      id: 'p10',
      name: 'Kawaii Bubble',
      category: 'Bold',
      style: {
        fontFamily: 'Fredoka',
        fontSize: 70,
        fontWeight: 700,
        color: '#FF85A1',
        fillType: 'solid' as const,
        strokes: [{ enabled: true, color: '#FFFFFF', width: 8, position: 'outer' as const, style: 'solid' as const }],
        glow: { enabled: true, color: '#FFB5A7', blur: 15, spread: 5 },
        shadows: [{ enabled: true, color: '#7209B7', blur: 0, offsetX: 5, offsetY: 5 }],
      },
    },
    {
      id: 'p11',
      name: 'Gothic Crimson',
      category: '3D',
      style: {
        fontFamily: 'Cinzel',
        fontSize: 80,
        fontWeight: 900,
        color: '#E11D48',
        fillType: 'solid' as const,
        strokes: [{ enabled: true, color: '#000000', width: 4, position: 'outer' as const, style: 'solid' as const }],
        extrusion: {
          enabled: true,
          depth: 10,
          angle: 135,
          color: '#450A0A',
          shadowColor: 'rgba(0,0,0,0.95)',
          lightingAngle: 45,
        },
      },
    },
    {
      id: 'p12',
      name: 'Minimal Dark Pill',
      category: 'Minimal',
      style: {
        fontFamily: 'Montserrat',
        fontSize: 65,
        fontWeight: 800,
        letterSpacing: 4,
        color: '#FFFFFF',
        fillType: 'solid' as const,
        bgBox: {
          enabled: true,
          color: '#0F172A',
          opacity: 0.9,
          paddingX: 30,
          paddingY: 14,
          borderRadius: 50,
          borderWidth: 1,
          borderColor: '#38BDF8',
          shape: 'pill' as const,
        },
      },
    },
    {
      id: 'p13',
      name: 'Fire Burn',
      category: 'Bold',
      style: {
        fontFamily: 'Bangers',
        fontSize: 90,
        fontWeight: 900,
        color: '#FF5722',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 0,
          stops: [
            { offset: 0, color: '#FFEB3B' },
            { offset: 0.5, color: '#FF9800' },
            { offset: 1, color: '#D50000' },
          ],
        },
        glow: { enabled: true, color: '#FF5722', blur: 30, spread: 10 },
        strokes: [{ enabled: true, color: '#000000', width: 6, position: 'outer' as const, style: 'solid' as const }],
      },
    },
    {
      id: 'p14',
      name: 'Holographic Glow',
      category: 'Cyber',
      style: {
        fontFamily: 'Syne',
        fontSize: 80,
        fontWeight: 800,
        color: '#A855F7',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 135,
          stops: [
            { offset: 0, color: '#C084FC' },
            { offset: 0.5, color: '#38BDF8' },
            { offset: 1, color: '#34D399' },
          ],
        },
        glow: { enabled: true, color: '#38BDF8', blur: 25, spread: 8 },
        strokes: [{ enabled: true, color: '#FFFFFF', width: 2, position: 'outer' as const, style: 'solid' as const }],
      },
    },
    {
      id: 'p15',
      name: 'Emerald Matrix',
      category: 'Cyber',
      style: {
        fontFamily: 'Orbitron',
        fontSize: 75,
        fontWeight: 900,
        color: '#10B981',
        fillType: 'solid' as const,
        glow: { enabled: true, color: '#10B981', blur: 25, spread: 8 },
        bgBox: {
          enabled: true,
          color: '#022C22',
          opacity: 0.95,
          paddingX: 24,
          paddingY: 12,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: '#10B981',
          shape: 'rectangle' as const,
        },
      },
    },
    {
      id: 'p16',
      name: 'Vintage Press',
      category: 'Minimal',
      style: {
        fontFamily: 'Playfair Display',
        fontSize: 80,
        fontWeight: 800,
        fontStyle: 'italic' as const,
        color: '#FEF3C7',
        fillType: 'solid' as const,
        shadows: [{ enabled: true, color: '#78350F', blur: 0, offsetX: 4, offsetY: 4 }],
        strokes: [{ enabled: true, color: '#451A03', width: 2, position: 'outer' as const, style: 'solid' as const }],
      },
    },
    {
      id: 'p17',
      name: 'Arcade 8-Bit',
      category: 'Bold',
      style: {
        fontFamily: 'Russo One',
        fontSize: 85,
        fontWeight: 900,
        color: '#22D3EE',
        fillType: 'solid' as const,
        strokes: [{ enabled: true, color: '#000000', width: 6, position: 'outer' as const, style: 'solid' as const }],
        shadows: [{ enabled: true, color: '#E11D48', blur: 0, offsetX: 8, offsetY: 8 }],
      },
    },
    {
      id: 'p18',
      name: 'Royal Velvet',
      category: 'Minimal',
      style: {
        fontFamily: 'Cinzel',
        fontSize: 75,
        fontWeight: 800,
        color: '#E9D5FF',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 90,
          stops: [
            { offset: 0, color: '#E9D5FF' },
            { offset: 0.5, color: '#C084FC' },
            { offset: 1, color: '#7E22CE' },
          ],
        },
        strokes: [{ enabled: true, color: '#F59E0B', width: 2, position: 'outer' as const, style: 'solid' as const }],
        shadows: [{ enabled: true, color: '#3B0764', blur: 15, offsetX: 0, offsetY: 8 }],
      },
    },
    {
      id: 'p19',
      name: 'Magma Lava',
      category: '3D',
      style: {
        fontFamily: 'Bangers',
        fontSize: 95,
        fontWeight: 900,
        color: '#F97316',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 180,
          stops: [
            { offset: 0, color: '#FACC15' },
            { offset: 0.5, color: '#FB923C' },
            { offset: 1, color: '#DC2626' },
          ],
        },
        extrusion: {
          enabled: true,
          depth: 16,
          angle: 135,
          color: '#7F1D1D',
          shadowColor: 'rgba(0,0,0,0.9)',
          lightingAngle: 45,
        },
      },
    },
    {
      id: 'p20',
      name: 'Frost Ice',
      category: 'Minimal',
      style: {
        fontFamily: 'Montserrat',
        fontSize: 70,
        fontWeight: 900,
        color: '#E0F2FE',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 180,
          stops: [
            { offset: 0, color: '#FFFFFF' },
            { offset: 1, color: '#7DD3FC' },
          ],
        },
        glow: { enabled: true, color: '#38BDF8', blur: 20, spread: 6 },
        strokes: [{ enabled: true, color: '#0284C7', width: 2, position: 'outer' as const, style: 'solid' as const }],
      },
    },
    {
      id: 'p21',
      name: 'Graffiti Lime',
      category: 'Bold',
      style: {
        fontFamily: 'Fredoka',
        fontSize: 80,
        fontWeight: 900,
        color: '#A3E635',
        fillType: 'solid' as const,
        strokes: [{ enabled: true, color: '#09090B', width: 8, position: 'outer' as const, style: 'solid' as const }],
        shadows: [{ enabled: true, color: '#15803D', blur: 0, offsetX: 6, offsetY: 6 }],
      },
    },
    {
      id: 'p22',
      name: 'Cosmic Nebula',
      category: 'Cyber',
      style: {
        fontFamily: 'Syne',
        fontSize: 85,
        fontWeight: 800,
        color: '#F472B6',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 45,
          stops: [
            { offset: 0, color: '#F472B6' },
            { offset: 0.5, color: '#818CF8' },
            { offset: 1, color: '#38BDF8' },
          ],
        },
        glow: { enabled: true, color: '#C084FC', blur: 30, spread: 10 },
      },
    },
    {
      id: 'p23',
      name: 'Golden Champion',
      category: '3D',
      style: {
        fontFamily: 'Bebas Neue',
        fontSize: 100,
        fontWeight: 900,
        color: '#FBBF24',
        fillType: 'solid' as const,
        extrusion: {
          enabled: true,
          depth: 14,
          angle: 120,
          color: '#78350F',
          shadowColor: 'rgba(0,0,0,0.85)',
          lightingAngle: 60,
        },
        strokes: [{ enabled: true, color: '#78350F', width: 3, position: 'outer' as const, style: 'solid' as const }],
      },
    },
    {
      id: 'p24',
      name: 'Neon Candy',
      category: 'Bold',
      style: {
        fontFamily: 'Pacifico',
        fontSize: 75,
        fontWeight: 400,
        color: '#EC4899',
        fillType: 'gradient' as const,
        gradient: {
          enabled: true,
          type: 'linear' as const,
          angle: 90,
          stops: [
            { offset: 0, color: '#EC4899' },
            { offset: 1, color: '#FACC15' },
          ],
        },
        glow: { enabled: true, color: '#F472B6', blur: 20, spread: 6 },
        shadows: [{ enabled: true, color: '#831843', blur: 8, offsetX: 3, offsetY: 5 }],
      },
    },
  ];

  // Load fonts when presets rendered
  useEffect(() => {
    defaultPresets.forEach((p) => {
      if (p.style.fontFamily) loadGoogleFont(p.style.fontFamily);
    });
  }, []);

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    if (activePreviewPresetId === id) {
      onPreviewPreset(null, null);
    }
  };

  const handlePreview = (id: string, style: Partial<TextLayer>) => {
    if (style.fontFamily) loadGoogleFont(style.fontFamily);
    // Preview preset without committing permanently
    onPreviewPreset(style, id);
  };

  const handleConfirmApply = (id: string, style: Partial<TextLayer>) => {
    if (style.fontFamily) loadGoogleFont(style.fontFamily);
    onApplyPreset(style);
    onPreviewPreset(null, null); // Reset preview state after apply
    setAppliedPresetIdx(id);
    setTimeout(() => setAppliedPresetIdx(null), 1500);
  };

  const handleAdd = (style: Partial<TextLayer>, name: string) => {
    if (style.fontFamily) loadGoogleFont(style.fontFamily);
    onAddTextWithPreset(style, name.toUpperCase());
    onPreviewPreset(null, null);
  };

  const allPresets = [
    ...customPresets.map((cp) => ({ ...cp, isCustom: true })),
    ...defaultPresets.map((dp) => ({ ...dp, isCustom: false })),
  ];

  const filteredPresets = allPresets.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Custom'
        ? p.isCustom
        : p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.style.fontFamily && p.style.fontFamily.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 p-2.5 overflow-y-auto space-y-2.5 shrink-0 select-none flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-1.5 text-amber-400">
          <Sparkles className="w-4 h-4" />
          <CustomizableLabel
            labelId="neo1-app_panels_presets_panel_item_6"
            as="h3"
            className="text-xs font-bold text-slate-100"
          >
              {() => (
                  <>
                    {uiText("components_neo1_app_components_panels_presets_panel.h3.typography_presets", "Typography presets")}
                  </>
                )}
          </CustomizableLabel>
        </div>
        <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20">
          {filteredPresets.length}{uiText("components_neo1_app_components_panels_presets_panel.span.styles", " styles")}
        </span>
      </div>

      {/* Category Folders List (Foldable, closed by default) */}
      <div className="space-y-2 flex-1">
        {filteredPresets.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">{uiText("components_neo1_app_components_panels_presets_panel.div.no_presets_found_matching_criteria", "No presets found matching criteria")}</div>
        ) : (
          (selectedCategory === 'All' ? ['Custom', 'Cyber', 'Bold', '3D', 'Minimal'] : [selectedCategory]).map((cat) => {
            const folderPresets = filteredPresets.filter((p) => {
              if (cat === 'Custom') return p.isCustom;
              return p.category === cat && !p.isCustom;
            });

            // Do not render empty folders during search
            if (folderPresets.length === 0) return null;

            const isFolderOpen = !!openFolders[cat];

            const getCategoryInfo = (category: string) => {
              switch (category) {
                case 'Custom':
                  return {
                    label: 'My Saved Styles',
                    desc: 'Your personal custom style templates',
                    color: 'text-cyan-400',
                  };
                case 'Cyber':
                  return {
                    label: 'Cyber & Neon Styles',
                    desc: 'Futuristic sci-fi glowing typography',
                    color: 'text-fuchsia-400',
                  };
                case 'Bold':
                  return {
                    label: 'Comic & Bold Styles',
                    desc: 'Heavy outlines and cartoon banners',
                    color: 'text-amber-400',
                  };
                case '3D':
                  return {
                    label: '3D Extrusion Styles',
                    desc: 'Durable retro 3D depth and extrusion',
                    color: 'text-rose-400',
                  };
                case 'Minimal':
                  return {
                    label: 'Minimal & Elegant Styles',
                    desc: 'Clean, modern typography formats',
                    color: 'text-emerald-400',
                  };
                default:
                  return {
                    label: category,
                    desc: 'Typography style group',
                    color: 'text-slate-400',
                  };
              }
            };

            const info = getCategoryInfo(cat);

            return (
              <div key={cat} className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/40">
                {/* Folder Toggle Button */}
                <CustomizableButton
                  buttonId="neo1-app_panels_presets_panel_btn_5"
                  type="button"
onClick={() => setOpenFolders((prev) => ({ ...prev, [cat]: !prev[cat] }))}
className="w-full flex items-center justify-between py-1.5 px-2 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
                >
                    {() => (
                        <>
                          <div className="flex items-center gap-2">
                    {isFolderOpen ? (
                      <FolderOpen className={`w-3.5 h-3.5 ${info.color}`} />
                    ) : (
                      <Folder className={`w-3.5 h-3.5 ${info.color}`} />
                    )}
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-200 leading-none">{info.label}</span>
                      <span className="text-[8px] text-slate-500 leading-none mt-0.5">{info.desc}</span>
                    </div>
                  </div>
                        <div className="flex items-center gap-1.5">
                    <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-mono font-bold px-1.5 py-0.2 rounded-full">
                      {folderPresets.length}
                    </span>
                    {isFolderOpen ? (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                        </>
                      )}
                </CustomizableButton>

                {/* Collapsible Folder Presets */}
                {isFolderOpen && (
                  <div className="p-1.5 pt-0 space-y-1.5 border-t border-slate-900/40 bg-slate-950/20 max-h-96 overflow-y-auto">
                    {folderPresets.map((preset) => {
                      const isApplied = appliedPresetIdx === preset.id;
                      const isPreviewing = activePreviewPresetId === preset.id;

                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            if (selectedTextLayer) {
                              handlePreview(preset.id, preset.style);
                            }
                          }}
                          className={`p-2 bg-slate-950 border rounded-lg transition-all space-y-1 group relative cursor-pointer ${
                            isPreviewing
                              ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10'
                              : preset.isCustom
                              ? 'border-cyan-500/30 hover:border-cyan-400'
                              : 'border-slate-800 hover:border-amber-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-200 leading-tight">{preset.name}</span>
                              {preset.isCustom && (
                                <span className="text-[7.5px] bg-cyan-500/20 text-cyan-300 font-bold px-1 py-0.1 rounded border border-cyan-500/30">
                                  {uiText("components_neo1_app_components_panels_presets_panel.span.custom", "CUSTOM")}
                                </span>
                              )}
                              {isPreviewing && (
                                <span className="text-[7.5px] bg-amber-500/20 text-amber-300 font-bold px-1 py-0.1 rounded border border-amber-500/40 flex items-center gap-0.5 animate-pulse">
                                  <Eye className="w-2 h-2" />{uiText("components_neo1_app_components_panels_presets_panel.span.preview", " PREVIEW")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[8.5px] font-mono text-slate-500">{preset.style.fontFamily}</span>
                              {preset.isCustom && (
                                <CustomizableButton
                                  buttonId="neo1-app_panels_presets_panel_btn_4"
                                  defaultIcon={<Trash2 className="w-3 h-3" />}
                                  type="button"
onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer rounded ml-0.5"
title={uiText("components_neo1_app_components_panels_presets_panel.button.delete_custom_preset.title", "Delete Custom Preset")}
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <CustomizableButton
                              buttonId="neo1-app_panels_presets_panel_btn_3"
                              defaultIcon={<Plus className="w-3 h-3 text-amber-400" />}
                              type="button"
onClick={() => handleAdd(preset.style, preset.name)}
className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[10px] rounded-md transition-colors cursor-pointer flex items-center justify-center gap-0.5"
                            >
                                {() => (
                                    <>
                                      <span>{uiText("components_neo1_app_components_panels_presets_panel.span.add_layer", "Add Layer")}</span>
                                    </>
                                  )}
                            </CustomizableButton>

                            {selectedTextLayer && (
                              isPreviewing ? (
                                <CustomizableButton
                                  buttonId="neo1-app_panels_presets_panel_btn_2"
                                  defaultIcon={<Check className="w-3 h-3" />}
                                  type="button"
onClick={() => handleConfirmApply(preset.id, preset.style)}
className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-md transition-all shadow-md shadow-amber-500/20 flex items-center gap-0.5 cursor-pointer"
                                >
                                    {() => (
                                        <>
                                          <span>{uiText("components_neo1_app_components_panels_presets_panel.span.apply", "Apply")}</span>
                                        </>
                                      )}
                                </CustomizableButton>
                              ) : (
                                <CustomizableButton
                                  buttonId="neo1-app_panels_presets_panel_btn_1"
                                  type="button"
onClick={() => handlePreview(preset.id, preset.style)}
className={`px-2 py-1 border font-semibold text-[10px] rounded-md transition-all cursor-pointer flex items-center gap-0.5 ${
                                    isApplied
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  }`}
                                >
                                    {() => (
                                        <>
                                          {isApplied ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>{uiText("components_neo1_app_components_panels_presets_panel.span.applied", "Applied!")}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3" />
                                      <span>{uiText("components_neo1_app_components_panels_presets_panel.span.preview_2", "Preview")}</span>
                                    </>
                                  )}
                                        </>
                                      )}
                                </CustomizableButton>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
