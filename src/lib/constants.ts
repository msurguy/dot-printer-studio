export const PRESET_COLORS = [
  "#0f1f1c",
  "#1b998b",
  "#f97316",
  "#e11d48",
  "#facc15",
  "#0ea5e9",
  "#334155",
  "#f1f5f9",
] as const;

export const DEFAULT_DOT_COLOR = PRESET_COLORS[0];
export const DEFAULT_CONNECTION_COLOR = PRESET_COLORS[2];
export const SELECTION_STROKE_COLOR = PRESET_COLORS[5];
export const PLAYER_PEN_TIP_COLOR = "rgba(255, 255, 255, 0.6)";
export const DEFAULT_CANVAS_BACKGROUND = "#c5c5c5ff";

export const DEFAULT_TEXT = "CONNECT";
export const DEFAULT_TOOL_ID = "dot";
export const DEFAULT_ZOOM = 1;

export const DEFAULT_GRID_SIZE = 60;
export const DEFAULT_DOT_SIZE = 2.6;
export const DEFAULT_DOT_GAP = 8;
export const DEFAULT_GRID_COLOR = "#f5f5f5";
export const DEFAULT_GRID_DOT_SIZE = 1.2;
export const DEFAULT_SHOW_GRID = true;

export const DEFAULT_FRAME_DURATION = 1600;
export const DEFAULT_DOT_FADE_IN = 240;
export const DEFAULT_DOT_FADE_OUT = 240;
export const DEFAULT_DOT_COLOR_TRANSITION = 240;
export const DEFAULT_DOT_COLOR_TRANSITION_EASING = "easeInOut";
export const DEFAULT_DOT_STAGGER = 18;
export const DEFAULT_CONNECTION_DURATION = 500;
export const DEFAULT_CONNECTION_STAGGER = 50;

export const DEFAULT_LOOP_PLAYBACK = true;
export const DEFAULT_FADE_IN_ON_START = true;
export const DEFAULT_FADE_OUT_ON_END = true;
export const DEFAULT_CONNECTION_FADE_IN_ON_START = true;
export const DEFAULT_CONNECTION_FADE_OUT_ON_END = true;

export const UI_LIMITS = {
  gridSize: { min: 10, max: 200 },
  zoom: { min: 0.5, max: 6, step: 0.1 },
  dotSize: { min: 1, max: 6, step: 0.2 },
  dotGap: { min: 1, max: 20, step: 0.5 },
  gridDotSize: { min: 0.6, max: 4, step: 0.1 },
  frameDuration: { min: 100, max: 12000 },
  dotFade: { min: 0, max: 8000 },
  dotColorTransition: { min: 0, max: 8000 },
  connectionDuration: { min: 100, max: 8000 },
  connectionStagger: { min: 0, max: 2000 },
  dotStagger: { min: 0, max: 500 },
  connectionOverrideMin: 0,
} as const;

export const CANVAS_RENDERING = {
  editorRingWidth: 2,
  editorRingPadding: 3,
  editorConnectionStrokeScale: 0.7,
  playerConnectionStrokeScale: 0.9,
  playerPenTipRadiusOffset: 2,
  playerPenTipShadowBlur: 12,
} as const;

export const DEFAULT_GROUP_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
] as const;
