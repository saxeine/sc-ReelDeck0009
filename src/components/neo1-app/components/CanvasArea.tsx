import {
Copy,
Eye,
EyeOff,
Image as ImageIcon,
Lock,
RotateCw,
Trash2,
Type,
X
} from 'lucide-react';
import React,{ useCallback,useEffect,useRef,useState } from 'react';
import { uiText } from "../../../hooks/useUIConfig";
import { CustomizableButton } from '../../CustomizableButton';
import {
CanvasState,
ImageLayer,
Layer,
TextLayer,
} from '../types';
import { preloadImage,renderCanvasToContext } from '../utils/canvasRender';
import { loadGoogleFont } from '../utils/googleFonts';

interface CanvasAreaProps {
  canvasState: CanvasState;
  setCanvasState?: React.Dispatch<React.SetStateAction<CanvasState>>;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updatedProps: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onToggleLayerLabels?: () => void;
}

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'tc' | 'bc' | 'lc' | 'rc' | 'rot';

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  canvasState,
  setCanvasState,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleLayerLabels,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(canvasState.zoom || 0.65);
  const [isDraggingLayer, setIsDraggingLayer] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialLayerPos, setInitialLayerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-fit calculation for canvas
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pad = 64;
    const availW = Math.max(100, rect.width - pad);
    const availH = Math.max(100, rect.height - pad);
    const scale = Math.min(availW / canvasState.width, availH / canvasState.height);
    setZoom(Math.max(0.15, Math.min(2, Math.round(scale * 100) / 100)));
  }, [canvasState.width, canvasState.height]);

  useEffect(() => {
    handleFitToScreen();
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(handleFitToScreen);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [handleFitToScreen]);

  // Interactive Handle State
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [transformStart, setTransformStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    skewX: number;
    skewY: number;
    fontSize: number;
  }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    fontSize: 40,
  });
  const [liveTooltip, setLiveTooltip] = useState<string | null>(null);

  // Render Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCanvasToContext(ctx, canvasState, layers);
  }, [canvasState, layers]);

  // Preload background image, layer images, and Google fonts
  useEffect(() => {
    let cancelled = false;
    const redrawCurrent = () => { if (!cancelled) draw(); };
    if (canvasState.background.imageUrl) {
      preloadImage(canvasState.background.imageUrl).then(redrawCurrent).catch(() => {});
    }
    layers.forEach((l) => {
      if (l.type === 'image' && (l as ImageLayer).src) {
        preloadImage((l as ImageLayer).src).then(redrawCurrent).catch(() => {});
      } else if (l.type === 'text') {
        const textLayer = l as TextLayer;
        if (textLayer.fontFamily) {
          loadGoogleFont(textLayer.fontFamily, {
            weight: textLayer.fontWeight,
            style: textLayer.fontStyle,
            text: textLayer.text,
          }).then(redrawCurrent);
        }
      }
    });

    const handleFontLoaded = redrawCurrent;

    window.addEventListener('neo1-font-loaded', handleFontLoaded);
    if ('fonts' in document) {
      document.fonts.ready.then(redrawCurrent);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('neo1-font-loaded', handleFontLoaded);
    };
  }, [canvasState.background.imageUrl, layers, draw]);

  useEffect(() => {
    let animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [draw]);

  // Canvas Mouse Down for Layer Selection & Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || activeHandle) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasState.width / rect.width;

    const clickX = (e.clientX - rect.left) * scale;
    const clickY = (e.clientY - rect.top) * scale;

    // Check hit test in reverse order (top layer first)
    let hitId: string | null = null;
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;

      const dx = Math.abs(clickX - layer.x);
      const dy = Math.abs(clickY - layer.y);
      const halfW = layer.width / 2;
      const halfH = layer.height / 2;

      if (dx <= halfW && dy <= halfH) {
        hitId = layer.id;
        break;
      }
    }

    onSelectLayer(hitId);

    if (hitId) {
      const targetLayer = layers.find((l) => l.id === hitId);
      if (targetLayer && !targetLayer.locked) {
        setIsDraggingLayer(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialLayerPos({ x: targetLayer.x, y: targetLayer.y });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLayer || !selectedLayerId || !canvasRef.current || activeHandle) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasState.width / rect.width;

    const dx = (e.clientX - dragStart.x) * scale;
    const dy = (e.clientY - dragStart.y) * scale;

    onUpdateLayer(selectedLayerId, {
      x: Math.round(initialLayerPos.x + dx),
      y: Math.round(initialLayerPos.y + dy),
    });
  };

  const handlePointerUp = () => {
    setIsDraggingLayer(false);
  };

  // Handle pointer down for interactive handles
  const startHandleTransform = (e: React.PointerEvent, handle: HandleType) => {
    e.stopPropagation();
    e.preventDefault();
    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (!selectedLayer || selectedLayer.locked) return;

    setActiveHandle(handle);
    setTransformStart({ x: e.clientX, y: e.clientY });
    setInitialTransform({
      x: selectedLayer.x,
      y: selectedLayer.y,
      width: selectedLayer.width,
      height: selectedLayer.height,
      rotation: selectedLayer.rotation || 0,
      skewX: selectedLayer.skewX || 0,
      skewY: selectedLayer.skewY || 0,
      fontSize: (selectedLayer as TextLayer).fontSize || 40,
    });
  };

  // Global Mouse Listener for Active Handle Transformation
  useEffect(() => {
    if (!activeHandle || !selectedLayerId || !canvasRef.current) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      const selectedLayer = layers.find((l) => l.id === selectedLayerId);
      if (!selectedLayer || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scale = canvasState.width / rect.width;

      const screenDx = e.clientX - transformStart.x;
      const screenDy = e.clientY - transformStart.y;
      const dx = screenDx * scale;
      const dy = screenDy * scale;

      const rotRad = (initialTransform.rotation * Math.PI) / 180;
      // Convert screen deltas into layer's unrotated coordinate system
      const localDx = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
      const localDy = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);

      if (activeHandle === 'rot') {
        // Rotation Handle Logic
        const centerX = rect.left + (selectedLayer.x / canvasState.width) * rect.width;
        const centerY = rect.top + (selectedLayer.y / canvasState.height) * rect.height;

        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDeg = Math.round((angleRad * 180) / Math.PI) + 90;
        angleDeg = ((angleDeg % 360) + 360) % 360;
        if (angleDeg > 180) angleDeg -= 360;

        onUpdateLayer(selectedLayerId, { rotation: angleDeg });
        setLiveTooltip(`Rotation: ${angleDeg}°`);
      } else if (['tl', 'tr', 'bl', 'br'].includes(activeHandle)) {
        // Corner Resizing Logic
        let w = initialTransform.width;
        let h = initialTransform.height;

        if (activeHandle === 'br') {
          w += localDx * 2;
          h += localDy * 2;
        } else if (activeHandle === 'bl') {
          w -= localDx * 2;
          h += localDy * 2;
        } else if (activeHandle === 'tr') {
          w += localDx * 2;
          h -= localDy * 2;
        } else if (activeHandle === 'tl') {
          w -= localDx * 2;
          h -= localDy * 2;
        }

        w = Math.max(40, Math.round(w));
        h = Math.max(20, Math.round(h));

        const updates: Partial<Layer> = { width: w, height: h };

        if (selectedLayer.type === 'text') {
          const ratio = w / initialTransform.width;
          const newFontSize = Math.max(12, Math.round(initialTransform.fontSize * ratio));
          (updates as Partial<TextLayer>).fontSize = newFontSize;
          setLiveTooltip(`Size: ${w} × ${h}px | Font: ${newFontSize}px`);
        } else {
          setLiveTooltip(`Size: ${w} × ${h}px`);
        }

        onUpdateLayer(selectedLayerId, updates);
      } else if (['tc', 'bc', 'lc', 'rc'].includes(activeHandle)) {
        // Side Edge Stretch or Skew (Shift key)
        if (e.shiftKey) {
          if (['lc', 'rc'].includes(activeHandle)) {
            const newSkewX = Math.min(60, Math.max(-60, Math.round(initialTransform.skewX + localDx * 0.4)));
            onUpdateLayer(selectedLayerId, { skewX: newSkewX });
            setLiveTooltip(`Skew X: ${newSkewX}°`);
          } else {
            const newSkewY = Math.min(60, Math.max(-60, Math.round(initialTransform.skewY + localDy * 0.4)));
            onUpdateLayer(selectedLayerId, { skewY: newSkewY });
            setLiveTooltip(`Skew Y: ${newSkewY}°`);
          }
        } else {
          let w = initialTransform.width;
          let h = initialTransform.height;

          if (activeHandle === 'rc') w += localDx * 2;
          if (activeHandle === 'lc') w -= localDx * 2;
          if (activeHandle === 'bc') h += localDy * 2;
          if (activeHandle === 'tc') h -= localDy * 2;

          w = Math.max(30, Math.round(w));
          h = Math.max(20, Math.round(h));

          onUpdateLayer(selectedLayerId, { width: w, height: h });
          setLiveTooltip(`Size: ${w} × ${h}px`);
        }
      }
    };

    const handleGlobalPointerUp = () => {
      setActiveHandle(null);
      setLiveTooltip(null);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [activeHandle, selectedLayerId, canvasState, transformStart, initialTransform, layers, onUpdateLayer]);

  return (
    <div
      ref={containerRef}
      className="neo1-canvas flex-1 bg-slate-950 relative overflow-auto flex items-center justify-center p-8 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Canvas Wrapper Box */}
      <div
        className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800 transition-transform duration-75"
        style={{
          width: canvasState.width * zoom,
          height: canvasState.height * zoom,
        }}
        onPointerDown={handlePointerDown}
      >
        <canvas
          ref={canvasRef}
          width={canvasState.width}
          height={canvasState.height}
          className="w-full h-full block bg-slate-900"
        />

        {/* Optional Canvas Grid Overlay */}
        {canvasState.showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)',
              backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
            }}
          />
        )}

        {/* Layer Bounding Boxes & Selection Handles for All Visible Layers */}
        {layers.map((layer) => {
          if (!layer.visible) return null;
          const isSelected = layer.id === selectedLayerId;

          const leftPercent = ((layer.x - layer.width / 2) / canvasState.width) * 100;
          const topPercent = ((layer.y - layer.height / 2) / canvasState.height) * 100;
          const widthPercent = (layer.width / canvasState.width) * 100;
          const heightPercent = (layer.height / canvasState.height) * 100;

          if (!isSelected) {
            return (
              <div
                key={layer.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectLayer(layer.id);
                  if (!layer.locked) {
                    setIsDraggingLayer(true);
                    setDragStart({ x: e.clientX, y: e.clientY });
                    setInitialLayerPos({ x: layer.x, y: layer.y });
                  }
                }}
                className="absolute border border-dashed border-slate-700/50 hover:border-cyan-400 hover:bg-cyan-400/5 rounded transition-all group pointer-events-auto cursor-pointer z-10"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${heightPercent}%`,
                  transform: `rotate(${layer.rotation || 0}deg)`,
                }}
                title={`Click to select ${layer.name || layer.type}`}
              >
                {/* Selection Handle Badge: Placed strictly outside the bounding box (above or below) so it NEVER obscures layer text */}
                {Boolean(canvasState.showLayerLabels) && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onSelectLayer(layer.id);
                    }}
                    className={`absolute left-0 ${
                      topPercent < 4 ? 'top-full mt-2' : 'bottom-full mb-2'
                    } bg-slate-900/95 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 border border-slate-700/90 hover:border-cyan-400 font-sans font-bold text-[10px] px-2 py-0.5 rounded-md shadow-lg backdrop-blur-md flex items-center gap-1.5 cursor-pointer pointer-events-auto transition-all group-hover:scale-105 whitespace-nowrap z-20`}
                  >
                    {layer.type === 'text' ? (
                      <Type className="w-3 h-3 text-amber-400 group-hover:text-slate-950 shrink-0" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-cyan-400 group-hover:text-slate-950 shrink-0" />
                    )}
                    <span className="truncate max-w-[140px]">
                      {layer.name || (layer.type === 'text' ? (layer as TextLayer).text.slice(0, 15) : 'Image')}
                    </span>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={layer.id}
              className="absolute border-2 border-rose-500 rounded pointer-events-none transition-all z-20"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                transform: `rotate(${layer.rotation || 0}deg)`,
              }}
            >
              {/* Selected Layer Badge: Placed strictly outside the bounding box (above or below) so it NEVER obscures layer text */}
              {Boolean(canvasState.showLayerLabels) && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`absolute left-0 ${
                    topPercent < 4 ? 'top-full mt-2' : 'bottom-full mb-2'
                  } bg-rose-500 text-white font-sans font-bold text-[10px] px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1.5 z-30 pointer-events-auto whitespace-nowrap`}
                >
                  {layer.type === 'text' ? <Type className="w-3 h-3 shrink-0" /> : <ImageIcon className="w-3 h-3 shrink-0" />}
                  <span className="truncate max-w-[150px]">
                    {layer.name || (layer.type === 'text' ? (layer as TextLayer).text.slice(0, 15) : 'Image')}
                  </span>
                </div>
              )}

              {/* Live Tooltip Indicator */}
              {liveTooltip && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-rose-500/50 text-rose-400 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full shadow-2xl backdrop-blur-md whitespace-nowrap z-30 pointer-events-none animate-in fade-in duration-100">
                  {liveTooltip}
                </div>
              )}

              {/* Quick Layer Floating Action Bar at Bottom (Toggled with 'B' or Toolbar) */}
              {!activeHandle && Boolean(canvasState.showQuickToolbar) && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700/80 rounded-lg px-2.5 py-1 flex items-center gap-2 shadow-xl backdrop-blur-md pointer-events-auto z-20 whitespace-nowrap"
                >
                  <CustomizableButton
                    buttonId="neo1_layer_duplicate"
                    defaultLabel="Duplicate"
                    defaultIcon={<Copy className="w-3 h-3" />}
                    onPointerDown={(e: any) => e.stopPropagation()}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDuplicateLayer(layer.id);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium whitespace-nowrap bg-transparent border-0 shadow-none"
                    title="Duplicate Layer"
                  />
                  <div className="w-px h-3 bg-slate-700" />
                  <CustomizableButton
                    buttonId="neo1_toggle_badges_quick"
                    defaultLabel={Boolean(canvasState.showLayerLabels) ? 'Hide badges' : 'Show badges'}
                    defaultIcon={Boolean(canvasState.showLayerLabels) ? <EyeOff className="w-3 h-3 text-cyan-400 shrink-0" /> : <Eye className="w-3 h-3 text-slate-400 shrink-0" />}
                    onPointerDown={(e: any) => e.stopPropagation()}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (setCanvasState) {
                        setCanvasState((prev) => ({
                          ...prev,
                          showLayerLabels: !prev.showLayerLabels,
                        }));
                      } else if (onToggleLayerLabels) {
                        onToggleLayerLabels();
                      }
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium whitespace-nowrap bg-transparent border-0 shadow-none"
                    title="Toggle Show/Hide Subtitle / Layer Label Badges (L)"
                  />
                  <div className="w-px h-3 bg-slate-700" />
                  <CustomizableButton
                    buttonId="neo1_layer_lock_toggle"
                    defaultLabel={layer.locked ? 'Unlock' : 'Lock'}
                    defaultIcon={<Lock className={`w-3 h-3 ${layer.locked ? 'text-amber-400' : ''}`} />}
                    onPointerDown={(e: any) => e.stopPropagation()}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onUpdateLayer(layer.id, { locked: !layer.locked });
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium whitespace-nowrap bg-transparent border-0 shadow-none"
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  />
                  <div className="w-px h-3 bg-slate-700" />
                  <CustomizableButton
                    buttonId="neo1_action_bar_close"
                    defaultLabel="Close"
                    forceZeroText={true}
                    defaultIcon={<X className="w-3 h-3" />}
                    onPointerDown={(e: any) => e.stopPropagation()}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (setCanvasState) {
                        setCanvasState((prev) => ({
                          ...prev,
                          showQuickToolbar: false,
                        }));
                      }
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer flex items-center text-[11px] bg-transparent border-0 shadow-none"
                    title="Hide this Action Bar (Press 'B' to show again)"
                  />
                </div>
              )}

              {/* Quick Delete Handle on Bounding Box Edge */}
              <CustomizableButton
                buttonId="neo1_layer_delete"
                defaultLabel="Delete layer"
                forceZeroText={true}
                defaultIcon={<Trash2 className="w-3 h-3" />}
                onPointerDown={(e: any) => e.stopPropagation()}
                onClick={(e: any) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDeleteLayer(layer.id);
                }}
                className="absolute -top-3 left-[75%] -translate-x-1/2 w-6 h-6 bg-rose-600 text-white border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-500 hover:scale-125 transition-transform pointer-events-auto z-20 cursor-pointer"
                title="Delete Layer"
              />

              {/* Rotation Stem & Top Knob */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-20">
                <CustomizableButton
                  buttonId="neo1-app_canvas_area_btn_1"
                  defaultIcon={<RotateCw className="w-3 h-3" />}
                  onPointerDown={(e) => startHandleTransform(e, 'rot')}
className="w-6 h-6 bg-rose-500 text-white border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:scale-125 transition-transform cursor-grab active:cursor-grabbing"
title={uiText("components_neo1_app_components_canvas_area.button.drag_to_rotate.title", "Drag to Rotate")}
                />
                <div className="w-0.5 h-2 bg-rose-500" />
              </div>

              {/* Corner Handles (Resize) */}
              <div
                onPointerDown={(e) => startHandleTransform(e, 'tl')}
                className="absolute -top-2 -left-2 w-4 h-4 bg-rose-500 border-2 border-white rounded-full shadow-md hover:scale-130 transition-transform cursor-nwse-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.resize_top_left.title", "Resize Top-Left")}
              />
              <div
                onPointerDown={(e) => startHandleTransform(e, 'tr')}
                className="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 border-2 border-white rounded-full shadow-md hover:scale-130 transition-transform cursor-nesw-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.resize_top_right.title", "Resize Top-Right")}
              />
              <div
                onPointerDown={(e) => startHandleTransform(e, 'bl')}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-rose-500 border-2 border-white rounded-full shadow-md hover:scale-130 transition-transform cursor-nesw-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.resize_bottom_left.title", "Resize Bottom-Left")}
              />
              <div
                onPointerDown={(e) => startHandleTransform(e, 'br')}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-rose-500 border-2 border-white rounded-full shadow-md hover:scale-130 transition-transform cursor-nwse-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.resize_bottom_right.title", "Resize Bottom-Right")}
              />

              {/* Side Edge Handles (Stretch / Skew with Shift) */}
              <div
                onPointerDown={(e) => startHandleTransform(e, 'tc')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-cyan-400 border border-slate-950 rounded-sm shadow-sm hover:scale-125 transition-transform cursor-ns-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.stretch_height_hold_shift_to_skew_y.title", "Stretch Height (Hold Shift to Skew Y)")}
              />
              <div
                onPointerDown={(e) => startHandleTransform(e, 'bc')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-cyan-400 border border-slate-950 rounded-sm shadow-sm hover:scale-125 transition-transform cursor-ns-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.stretch_height_hold_shift_to_skew_y.title_2", "Stretch Height (Hold Shift to Skew Y)")}
              />
              <div
                onPointerDown={(e) => startHandleTransform(e, 'lc')}
                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-5 bg-cyan-400 border border-slate-950 rounded-sm shadow-sm hover:scale-125 transition-transform cursor-ew-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.stretch_width_hold_shift_to_skew_x.title", "Stretch Width (Hold Shift to Skew X)")}
              />
              <div
                onPointerDown={(e) => startHandleTransform(e, 'rc')}
                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-5 bg-cyan-400 border border-slate-950 rounded-sm shadow-sm hover:scale-125 transition-transform cursor-ew-resize pointer-events-auto z-20"
                title={uiText("components_neo1_app_components_canvas_area.div.stretch_width_hold_shift_to_skew_x.title_2", "Stretch Width (Hold Shift to Skew X)")}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
