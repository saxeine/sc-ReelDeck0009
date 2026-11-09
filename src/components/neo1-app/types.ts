export type LayerType = 'text' | 'image';

export interface GradientStop {
  offset: number; // 0 to 1
  color: string;
}

export interface GradientConfig {
  enabled?: boolean;
  type: 'linear' | 'radial';
  angle: number; // for linear
  stops?: GradientStop[];
  color1?: string;
  color2?: string;
}

export interface StrokeConfig {
  enabled: boolean;
  color: string;
  width: number;
  position: 'outer' | 'inner' | 'center';
  style: 'solid' | 'dashed' | 'dotted';
}

export interface ShadowConfig {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface GlowConfig {
  enabled: boolean;
  color: string;
  blur: number;
  spread: number;
}

export interface ExtrusionConfig {
  enabled: boolean;
  depth: number;
  angle: number;
  color: string;
  shadowColor: string;
  lightingAngle: number;
}

export interface BgBoxConfig {
  enabled: boolean;
  color: string;
  opacity: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  shape: 'rectangle' | 'pill' | 'circle';
}

export interface WarpConfig {
  style: 'none' | 'arc' | 'wave' | 'bulge' | 'skew' | 'arch' | 'flag';
  bend: number; // -100 to 100
  horizontalDistortion: number; // -100 to 100
  verticalDistortion: number; // -100 to 100
}

export interface CirclePathConfig {
  enabled: boolean;
  radius: number;
  startAngle: number;
  reverse: boolean;
  spacing: number;
}

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'difference';
  visible: boolean;
  locked: boolean;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle: 'normal' | 'italic' | 'oblique';
  lineHeight: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
  textDecoration: 'none' | 'underline' | 'line-through';
  fillType: 'solid' | 'gradient' | 'image' | 'transparent';
  color: string;
  gradient: GradientConfig;
  strokes: StrokeConfig[];
  shadows: ShadowConfig[];
  glow: GlowConfig;
  extrusion: ExtrusionConfig;
  bgBox: BgBoxConfig;
  warp: WarpConfig;
  circlePath: CirclePathConfig;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  keyColor: string;
  tolerance: number; // 0 to 100
  smoothness: number; // 0 to 100
  spillSuppression: number; // 0 to 100
  invert: boolean;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  brightness: number; // 0 to 200
  contrast: number; // 0 to 200
  saturation: number; // 0 to 200
  blur: number; // 0 to 50
  sepia: number; // 0 to 100
  grayscale: number; // 0 to 100
  hueRotate: number; // 0 to 360
  vignette: number; // 0 to 100
  keepAspectRatio: boolean;
  warp: WarpConfig;
  chromaKey?: ChromaKeyConfig;
  perspectiveX?: number; // -100 to 100
  perspectiveY?: number; // -100 to 100
}

export type Layer = TextLayer | ImageLayer;

export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image';
  color: string;
  gradient: {
    type: 'linear' | 'radial';
    angle: number;
    color1: string;
    color2: string;
  };
  imageUrl: string;
  imageFit: 'cover' | 'contain' | 'stretch' | 'tile';
  imageOpacity: number;
  imageBlur: number;
  imageBrightness?: number;
}

export interface CanvasState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  background: BackgroundConfig;
  showGrid: boolean;
  showRulers: boolean;
  showLayerLabels?: boolean;
  showQuickToolbar?: boolean;
  snapToGuides: boolean;
  activePreset: string;
}

export interface BackgroundImageItem {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  category: 'cyberpunk' | 'abstract' | 'gradient' | 'minimal' | 'custom' | 'frames';
  isCustom?: boolean;
  createdAt?: number;
}
