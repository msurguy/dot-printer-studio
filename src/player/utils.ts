import type {
  AutoConnection,
  ColorRef,
  ConnectionSegment,
  DotPlayerConnection,
  DotPlayerData,
  DotPlayerDot,
  DotPlayerFrame,
  DotPlayerGroup,
  RgbaColor,
} from "./types";
import {
  DEFAULT_CONNECTION_COLOR,
  DEFAULT_CONNECTION_DURATION,
  DEFAULT_CONNECTION_STAGGER,
  DEFAULT_DOT_COLOR,
  DEFAULT_DOT_COLOR_TRANSITION,
  DEFAULT_DOT_COLOR_TRANSITION_EASING,
  DEFAULT_DOT_FADE_IN,
  DEFAULT_DOT_FADE_OUT,
  DEFAULT_DOT_GAP,
  DEFAULT_DOT_SIZE,
  DEFAULT_DOT_STAGGER,
  DEFAULT_FRAME_DURATION,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_DOT_SIZE,
  DEFAULT_GRID_SIZE,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_SHOW_GRID,
  DEFAULT_LOOP_PLAYBACK,
  DEFAULT_FADE_IN_ON_START,
  DEFAULT_FADE_OUT_ON_END,
  DEFAULT_CONNECTION_FADE_IN_ON_START,
  DEFAULT_CONNECTION_FADE_OUT_ON_END,
} from "../lib/constants";
import type { EasingName } from "../lib/easing";

// ============================================================================
// Math Utilities
// ============================================================================

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// ============================================================================
// Position Utilities
// ============================================================================

export const createPositionKey = (x: number, y: number): string => `${x}:${y}`;

export const deriveDotMap = (
  dots: DotPlayerDot[]
): Map<string, DotPlayerDot> => {
  const map = new Map<string, DotPlayerDot>();
  for (const dot of dots) {
    map.set(dot.id, dot);
  }
  return map;
};

export const deriveDotPositionSet = (dots: DotPlayerDot[]): Set<string> => {
  const set = new Set<string>();
  for (const dot of dots) {
    set.add(createPositionKey(dot.x, dot.y));
  }
  return set;
};

export const deriveDotColorMap = (
  frame: DotPlayerFrame | undefined
): Map<string, number> => {
  const map = new Map<string, number>();
  if (!frame) {
    return map;
  }
  for (const dot of frame.dots) {
    map.set(createPositionKey(dot.x, dot.y), dot.color);
  }
  return map;
};

// ============================================================================
// Connection Utilities
// ============================================================================

const isSamePoint = (a: DotPlayerDot, b: DotPlayerDot): boolean =>
  a.x === b.x && a.y === b.y;

export const deriveConnectionKey = (
  from: DotPlayerDot,
  to: DotPlayerDot
): string => {
  const a = createPositionKey(from.x, from.y);
  const b = createPositionKey(to.x, to.y);
  return a < b ? `${a}-${b}` : `${b}-${a}`;
};

export const deriveConnectionKeySet = (
  frame: DotPlayerFrame | undefined
): Set<string> => {
  if (!frame) {
    return new Set<string>();
  }
  const dotMap = deriveDotMap(frame.dots);
  const keys = new Set<string>();
  for (const connection of frame.connections) {
    const from = dotMap.get(connection.from);
    const to = dotMap.get(connection.to);
    if (!from || !to) {
      continue;
    }
    keys.add(deriveConnectionKey(from, to));
  }
  return keys;
};

export const ensureFrameOrder = (
  connections: DotPlayerConnection[]
): DotPlayerConnection[] => {
  return connections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((connection, index) => ({ ...connection, order: index }));
};

export const buildConnectionPaths = (
  connections: DotPlayerConnection[],
  dotMap: Map<string, DotPlayerDot>
): ConnectionSegment[][] => {
  const ordered = ensureFrameOrder(connections);
  const paths: ConnectionSegment[][] = [];
  let currentPath: ConnectionSegment[] = [];

  const pushPath = () => {
    if (currentPath.length) {
      paths.push(currentPath);
      currentPath = [];
    }
  };

  for (const connection of ordered) {
    const from = dotMap.get(connection.from);
    const to = dotMap.get(connection.to);
    if (!from || !to) {
      continue;
    }
    const segment: ConnectionSegment = {
      connection,
      from,
      to,
      key: deriveConnectionKey(from, to),
      length: Math.hypot(to.x - from.x, to.y - from.y),
    };

    if (!currentPath.length) {
      currentPath.push(segment);
      continue;
    }

    const last = currentPath[currentPath.length - 1];
    const sharesEndpoint =
      isSamePoint(last.from, segment.from) ||
      isSamePoint(last.from, segment.to) ||
      isSamePoint(last.to, segment.from) ||
      isSamePoint(last.to, segment.to);

    if (sharesEndpoint) {
      currentPath.push(segment);
    } else {
      pushPath();
      currentPath.push(segment);
    }
  }

  pushPath();
  return paths;
};

// ============================================================================
// Color Utilities
// ============================================================================

const colorCache = new Map<string, RgbaColor>();

const parseHexColor = (value: string): RgbaColor | null => {
  const hex = value.trim().slice(1);
  if (![3, 4, 6, 8].includes(hex.length)) {
    return null;
  }
  const read = (start: number, length: number) =>
    Number.parseInt(hex.slice(start, start + length), 16);
  if (hex.length === 3 || hex.length === 4) {
    const r = read(0, 1);
    const g = read(1, 1);
    const b = read(2, 1);
    const a = hex.length === 4 ? read(3, 1) / 255 : 1;
    if ([r, g, b, a].some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return {
      r: r * 17,
      g: g * 17,
      b: b * 17,
      a: clamp(a, 0, 1),
    };
  }
  const r = read(0, 2);
  const g = read(2, 2);
  const b = read(4, 2);
  const a = hex.length === 8 ? read(6, 2) / 255 : 1;
  if ([r, g, b, a].some((channel) => Number.isNaN(channel))) {
    return null;
  }
  return { r, g, b, a: clamp(a, 0, 1) };
};

const parseRgbColor = (value: string): RgbaColor | null => {
  const match = value.trim().match(/^rgba?\((.+)\)$/i);
  if (!match) {
    return null;
  }
  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts.length > 3 ? Number(parts[3]) : 1;
  if (![r, g, b, a].every((channel) => Number.isFinite(channel))) {
    return null;
  }
  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255)),
    a: clamp(a, 0, 1),
  };
};

export const parseColor = (value: string): RgbaColor | null => {
  const trimmed = value.trim();
  const cached = colorCache.get(trimmed);
  if (cached) {
    return cached;
  }
  const parsed = trimmed.startsWith("#")
    ? parseHexColor(trimmed)
    : parseRgbColor(trimmed);
  if (parsed) {
    colorCache.set(trimmed, parsed);
  }
  return parsed;
};

export const mixColors = (
  from: string,
  to: string,
  amount: number
): string | null => {
  const fromColor = parseColor(from);
  const toColor = parseColor(to);
  if (!fromColor || !toColor) {
    return null;
  }
  const t = clamp(amount, 0, 1);
  const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * t);
  const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * t);
  const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * t);
  const a =
    Math.round((fromColor.a + (toColor.a - fromColor.a) * t) * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export const resolveColor = (
  colors: string[],
  ref: ColorRef,
  fallback: string
): string => {
  if (typeof ref === "number" && ref >= 0 && ref < colors.length) {
    return colors[ref];
  }
  return fallback;
};

// ============================================================================
// Canvas Utilities
// ============================================================================

export const setupCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D | null => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
};

// ============================================================================
// Data Validation
// ============================================================================

const clampNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const ensureString = (value: unknown, fallback: string): string => {
  return typeof value === "string" ? value : fallback;
};

const optionalNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

const sanitizeColorArray = (value: unknown, fallback: string[]): string[] => {
  if (Array.isArray(value) && value.length) {
    const fallbackColor = fallback[0] ?? DEFAULT_DOT_COLOR;
    return value.map((entry) =>
      typeof entry === "string" ? entry : fallbackColor
    );
  }
  return [...fallback];
};

const resolveColorIndex = (
  colors: string[],
  value: unknown,
  fallback: string
): number => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    if (value < colors.length) {
      return value;
    }
  }
  if (typeof value === "string") {
    const existing = colors.indexOf(value);
    if (existing >= 0) {
      return existing;
    }
    colors.push(value);
    return colors.length - 1;
  }
  const fallbackIndex = colors.indexOf(fallback);
  if (fallbackIndex >= 0) {
    return fallbackIndex;
  }
  colors.push(fallback);
  return colors.length - 1;
};

const makeId = (): string => {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return Math.random().toString(36).slice(2, 10);
};

export const validatePlayerData = (data: unknown): DotPlayerData => {
  const defaultColors = [DEFAULT_CANVAS_BACKGROUND, DEFAULT_DOT_COLOR, DEFAULT_CONNECTION_COLOR];

  if (!data || typeof data !== "object") {
    return createDefaultPlayerData();
  }

  const candidate = data as Partial<DotPlayerData> & { colors?: unknown };
  const colors = sanitizeColorArray(candidate.colors, defaultColors);

  const metadata = (candidate.metadata ?? {}) as Partial<DotPlayerData["metadata"]>;
  const gridSize = clampNumber(metadata.gridSize, DEFAULT_GRID_SIZE);
  const dotSize = clampNumber(metadata.dotSize, DEFAULT_DOT_SIZE);
  const dotGap = clampNumber(metadata.dotGap, DEFAULT_DOT_GAP);
  const gridColor = ensureString(metadata.gridColor, DEFAULT_GRID_COLOR);
  const gridDotSize = clampNumber(metadata.gridDotSize, DEFAULT_GRID_DOT_SIZE);
  const showGrid = Boolean(metadata.showGrid ?? DEFAULT_SHOW_GRID);
  const backgroundColor = resolveColorIndex(
    colors,
    metadata.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
    DEFAULT_CANVAS_BACKGROUND
  );

  const frames = Array.isArray(candidate.frames) ? candidate.frames : [];
  const normalizedFrames: DotPlayerFrame[] = frames.map((frameLike, index) => {
    const frame = frameLike as Partial<DotPlayerFrame>;
    const dots = Array.isArray(frame.dots) ? frame.dots : [];
    const connections = Array.isArray(frame.connections) ? frame.connections : [];

    const normalizedDots: DotPlayerDot[] = dots
      .map((dot) => ({
        id: ensureString(dot.id, makeId()),
        x: clampNumber(dot.x, 0),
        y: clampNumber(dot.y, 0),
        color: resolveColorIndex(colors, dot.color, DEFAULT_DOT_COLOR),
        fadeInDuration: optionalNumber(dot.fadeInDuration),
        fadeOutDuration: optionalNumber(dot.fadeOutDuration),
      }))
      .filter(
        (dot) =>
          dot.x >= 0 && dot.y >= 0 && dot.x < gridSize && dot.y < gridSize
      );

    const normalizedConnections: DotPlayerConnection[] = connections.map(
      (connection, orderIndex) => ({
        id: ensureString(connection.id, makeId()),
        from: ensureString(connection.from, ""),
        to: ensureString(connection.to, ""),
        color: resolveColorIndex(colors, connection.color, DEFAULT_CONNECTION_COLOR),
        order: clampNumber(connection.order, orderIndex),
        revealDuration: optionalNumber(connection.revealDuration),
      })
    );

    // Normalize groups (backwards compatibility - old data won't have groups)
    const groups = Array.isArray(frame.groups) ? frame.groups : [];
    const dotIdSet = new Set(normalizedDots.map((d) => d.id));
    const connIdSet = new Set(normalizedConnections.map((c) => c.id));
    const normalizedGroups: DotPlayerGroup[] = groups
      .filter((g) => g && typeof g === "object")
      .map((group) => ({
        id: ensureString(group.id, makeId()),
        name: ensureString(group.name, "Group"),
        color: ensureString(group.color, "#FF6B6B"),
        dotIds: Array.isArray(group.dotIds)
          ? group.dotIds.filter((id: unknown) => typeof id === "string" && dotIdSet.has(id))
          : [],
        connectionIds: Array.isArray(group.connectionIds)
          ? group.connectionIds.filter((id: unknown) => typeof id === "string" && connIdSet.has(id))
          : [],
        visible: group.visible !== false,
        locked: group.locked === true,
        animationOverrides: group.animationOverrides
          ? {
              fadeInDuration: optionalNumber(group.animationOverrides.fadeInDuration),
              fadeOutDuration: optionalNumber(group.animationOverrides.fadeOutDuration),
              connectionAnimationDuration: optionalNumber(
                group.animationOverrides.connectionAnimationDuration
              ),
              connectionStagger: optionalNumber(group.animationOverrides.connectionStagger),
            }
          : undefined,
      }));

    return {
      id: ensureString(frame.id, makeId()),
      name: ensureString(frame.name, `Frame ${index + 1}`),
      dots: normalizedDots,
      connections: normalizedConnections,
      groups: normalizedGroups,
      duration: clampNumber(frame.duration, DEFAULT_FRAME_DURATION),
      easing: ensureString(frame.easing, "easeInOut") as EasingName,
      dotFadeInDuration: clampNumber(frame.dotFadeInDuration, DEFAULT_DOT_FADE_IN),
      dotFadeOutDuration: clampNumber(frame.dotFadeOutDuration, DEFAULT_DOT_FADE_OUT),
      dotColorTransitionDuration: clampNumber(
        frame.dotColorTransitionDuration,
        DEFAULT_DOT_COLOR_TRANSITION
      ),
      dotColorTransitionEasing: ensureString(
        frame.dotColorTransitionEasing,
        DEFAULT_DOT_COLOR_TRANSITION_EASING
      ) as EasingName,
      connectionAnimationDuration: clampNumber(
        frame.connectionAnimationDuration,
        DEFAULT_CONNECTION_DURATION
      ),
      connectionStagger: clampNumber(frame.connectionStagger, DEFAULT_CONNECTION_STAGGER),
      dotStagger: clampNumber(frame.dotStagger, DEFAULT_DOT_STAGGER),
      animateDots: Boolean(frame.animateDots ?? true),
      animateConnections: Boolean(frame.animateConnections ?? true),
    };
  });

  // Normalize auto-connections (backwards compatibility - old data won't have them)
  const autoConnectionsRaw = Array.isArray(candidate.autoConnections)
    ? candidate.autoConnections
    : [];
  const normalizedAutoConnections: AutoConnection[] = autoConnectionsRaw
    .filter((ac) => ac && typeof ac === "object")
    .map((ac) => ({
      id: ensureString(ac.id, makeId()),
      fromX: clampNumber(ac.fromX, 0),
      fromY: clampNumber(ac.fromY, 0),
      toX: clampNumber(ac.toX, 0),
      toY: clampNumber(ac.toY, 0),
      color: resolveColorIndex(colors, ac.color, DEFAULT_CONNECTION_COLOR),
      traceInDuration: clampNumber(ac.traceInDuration, 500),
      traceOutDuration: optionalNumber(ac.traceOutDuration),
      traceInReverse: Boolean(ac.traceInReverse),
      traceOutReverse: Boolean(ac.traceOutReverse),
      stayDuration: optionalNumber(ac.stayDuration),
      startTime: clampNumber(ac.startTime, 0),
    }))
    .filter(
      (ac) =>
        ac.fromX >= 0 &&
        ac.fromY >= 0 &&
        ac.toX >= 0 &&
        ac.toY >= 0 &&
        ac.fromX < gridSize &&
        ac.fromY < gridSize &&
        ac.toX < gridSize &&
        ac.toY < gridSize
    );

  return {
    version: ensureString(candidate.version, "1.0"),
    colors: colors.length ? colors : defaultColors,
    settings: {
      loopPlayback: Boolean(candidate.settings?.loopPlayback ?? DEFAULT_LOOP_PLAYBACK),
      fadeInOnStart: Boolean(candidate.settings?.fadeInOnStart ?? DEFAULT_FADE_IN_ON_START),
      fadeOutOnEnd: Boolean(candidate.settings?.fadeOutOnEnd ?? DEFAULT_FADE_OUT_ON_END),
      connectionFadeInOnStart: Boolean(
        candidate.settings?.connectionFadeInOnStart ?? DEFAULT_CONNECTION_FADE_IN_ON_START
      ),
      connectionFadeOutOnEnd: Boolean(
        candidate.settings?.connectionFadeOutOnEnd ?? DEFAULT_CONNECTION_FADE_OUT_ON_END
      ),
    },
    metadata: {
      gridSize,
      dotSize,
      dotGap,
      gridColor,
      gridDotSize,
      showGrid,
      backgroundColor,
    },
    frames: normalizedFrames.length ? normalizedFrames : [createDefaultFrame("Frame 1")],
    autoConnections: normalizedAutoConnections.length > 0 ? normalizedAutoConnections : undefined,
  };
};

const createDefaultFrame = (name: string): DotPlayerFrame => ({
  id: makeId(),
  name,
  dots: [],
  connections: [],
  groups: [],
  duration: DEFAULT_FRAME_DURATION,
  easing: "easeInOut",
  dotFadeInDuration: DEFAULT_DOT_FADE_IN,
  dotFadeOutDuration: DEFAULT_DOT_FADE_OUT,
  dotColorTransitionDuration: DEFAULT_DOT_COLOR_TRANSITION,
  dotColorTransitionEasing: DEFAULT_DOT_COLOR_TRANSITION_EASING as EasingName,
  connectionAnimationDuration: DEFAULT_CONNECTION_DURATION,
  connectionStagger: DEFAULT_CONNECTION_STAGGER,
  dotStagger: DEFAULT_DOT_STAGGER,
  animateDots: true,
  animateConnections: true,
});

const createDefaultPlayerData = (): DotPlayerData => {
  const colors = [DEFAULT_CANVAS_BACKGROUND, DEFAULT_DOT_COLOR, DEFAULT_CONNECTION_COLOR];
  return {
    version: "1.0",
    colors,
    settings: {
      loopPlayback: DEFAULT_LOOP_PLAYBACK,
      fadeInOnStart: DEFAULT_FADE_IN_ON_START,
      fadeOutOnEnd: DEFAULT_FADE_OUT_ON_END,
      connectionFadeInOnStart: DEFAULT_CONNECTION_FADE_IN_ON_START,
      connectionFadeOutOnEnd: DEFAULT_CONNECTION_FADE_OUT_ON_END,
    },
    metadata: {
      gridSize: DEFAULT_GRID_SIZE,
      dotSize: DEFAULT_DOT_SIZE,
      dotGap: DEFAULT_DOT_GAP,
      gridColor: DEFAULT_GRID_COLOR,
      gridDotSize: DEFAULT_GRID_DOT_SIZE,
      showGrid: DEFAULT_SHOW_GRID,
      backgroundColor: 0,
    },
    frames: [createDefaultFrame("Frame 1")],
  };
};
