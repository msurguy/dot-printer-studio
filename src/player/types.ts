import type { EasingName } from "../lib/easing";

// ============================================================================
// Data Types - Animation structure
// ============================================================================

export type ColorRef = number;

export interface DotPlayerDot {
  id: string;
  x: number;
  y: number;
  color: ColorRef;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export interface DotPlayerConnection {
  id: string;
  from: string;
  to: string;
  color: ColorRef;
  order: number;
  revealDuration?: number;
}

export interface AutoConnection {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: ColorRef;
  traceInDuration: number;
  traceOutDuration?: number;
  traceInReverse: boolean;
  traceOutReverse: boolean;
  stayDuration?: number;
  startTime: number;
}

export interface DotPlayerGroupAnimationOverrides {
  fadeInDuration?: number;
  fadeOutDuration?: number;
  connectionAnimationDuration?: number;
  connectionStagger?: number;
}

export interface DotPlayerGroup {
  id: string;
  name: string;
  color: string;
  dotIds: string[];
  connectionIds: string[];
  visible: boolean;
  locked: boolean;
  animationOverrides?: DotPlayerGroupAnimationOverrides;
}

export interface DotPlayerFrame {
  id: string;
  name: string;
  dots: DotPlayerDot[];
  connections: DotPlayerConnection[];
  groups: DotPlayerGroup[];
  duration: number;
  easing: EasingName;
  dotFadeInDuration: number;
  dotFadeOutDuration: number;
  dotColorTransitionDuration: number;
  dotColorTransitionEasing: EasingName;
  connectionAnimationDuration: number;
  connectionStagger: number;
  dotStagger: number;
  animateDots: boolean;
  animateConnections: boolean;
}

export interface DotPlayerSettings {
  loopPlayback: boolean;
  fadeInOnStart: boolean;
  fadeOutOnEnd: boolean;
  connectionFadeInOnStart: boolean;
  connectionFadeOutOnEnd: boolean;
}

export interface DotPlayerMetadata {
  gridSize: number;
  dotSize: number;
  dotGap: number;
  gridColor: string;
  gridDotSize: number;
  showGrid: boolean;
  backgroundColor: ColorRef;
}

export interface DotPlayerData {
  version: string;
  colors: string[];
  settings: DotPlayerSettings;
  metadata: DotPlayerMetadata;
  frames: DotPlayerFrame[];
  autoConnections?: AutoConnection[];
}

// ============================================================================
// Player Options
// ============================================================================

export interface DotPlayerRendererSettings {
  showGrid?: boolean;
  backgroundColor?: string;
}

export interface DotPlayerOptions {
  container: HTMLElement;
  data: DotPlayerData;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  zoom?: number;
  rendererSettings?: DotPlayerRendererSettings;
}

// ============================================================================
// Player State
// ============================================================================

export interface DotPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;
  playhead: number;
  frameProgress: number;
  speed: number;
  loop: boolean;
}

// ============================================================================
// Events
// ============================================================================

export type DotPlayerEventType =
  | "ready"
  | "play"
  | "pause"
  | "stop"
  | "complete"
  | "loopComplete"
  | "frameChange"
  | "enterFrame"
  | "destroy";

export interface DotPlayerFrameChangeEvent {
  frameIndex: number;
  frameName: string;
}

export interface DotPlayerEnterFrameEvent {
  frameIndex: number;
  playhead: number;
  progress: number;
}

export interface DotPlayerEventMap {
  ready: undefined;
  play: undefined;
  pause: undefined;
  stop: undefined;
  complete: undefined;
  loopComplete: undefined;
  frameChange: DotPlayerFrameChangeEvent;
  enterFrame: DotPlayerEnterFrameEvent;
  destroy: undefined;
}

// ============================================================================
// Internal Types (used by renderer and animation)
// ============================================================================

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ConnectionSegment {
  connection: DotPlayerConnection;
  from: DotPlayerDot;
  to: DotPlayerDot;
  key: string;
  length: number;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvasSize: number;
  gridOffset: number;
  dotGap: number;
  dotRadius: number;
  gridSize: number;
  gridColor: string;
  gridDotSize: number;
  showGrid: boolean;
  colors: string[];
  connectionStrokeScale: number;
  penTipRadiusOffset: number;
  penTipShadowBlur: number;
  penTipColor: string;
}

export interface FrameRenderState {
  frame: DotPlayerFrame;
  frameIndex: number;
  totalFrames: number;
  playhead: number;
  settings: DotPlayerSettings;
  frames: DotPlayerFrame[];
}
