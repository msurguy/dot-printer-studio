import type { EasingName } from "./easing";
import {
  DEFAULT_CONNECTION_COLOR,
  DEFAULT_CONNECTION_DURATION,
  DEFAULT_CONNECTION_STAGGER,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_DOT_COLOR,
  DEFAULT_DOT_FADE_IN,
  DEFAULT_DOT_FADE_OUT,
  DEFAULT_DOT_COLOR_TRANSITION,
  DEFAULT_DOT_COLOR_TRANSITION_EASING,
  DEFAULT_DOT_STAGGER,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_DOT_SIZE,
  DEFAULT_DOT_GAP,
  DEFAULT_DOT_SIZE,
  DEFAULT_FADE_IN_ON_START,
  DEFAULT_FADE_OUT_ON_END,
  DEFAULT_FRAME_DURATION,
  DEFAULT_GRID_SIZE,
  DEFAULT_LOOP_PLAYBACK,
  DEFAULT_CONNECTION_FADE_IN_ON_START,
  DEFAULT_CONNECTION_FADE_OUT_ON_END,
  DEFAULT_SHOW_GRID,
} from "./constants";

export type ColorRef = number;

export type Dot = {
  id: string;
  x: number;
  y: number;
  color: ColorRef;
  fadeInDuration?: number;
  fadeOutDuration?: number;
};

export type Connection = {
  id: string;
  from: string;
  to: string;
  color: ColorRef;
  order: number;
  revealDuration?: number;
};

export type GroupAnimationOverrides = {
  fadeInDuration?: number;
  fadeOutDuration?: number;
  connectionAnimationDuration?: number;
  connectionStagger?: number;
};

export type Group = {
  id: string;
  name: string;
  color: string;
  dotIds: string[];
  connectionIds: string[];
  visible: boolean;
  locked: boolean;
  animationOverrides?: GroupAnimationOverrides;
};

export type AutoConnection = {
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
};

export type Frame = {
  id: string;
  name: string;
  dots: Dot[];
  connections: Connection[];
  groups: Group[];
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
};

export type Project = {
  version: string;
  colors: string[];
  settings: {
    loopPlayback: boolean;
    fadeInOnStart: boolean;
    fadeOutOnEnd: boolean;
    connectionFadeInOnStart: boolean;
    connectionFadeOutOnEnd: boolean;
  };
  metadata: {
    created: string;
    gridSize: number;
    dotSize: number;
    dotGap: number;
    gridColor: string;
    gridDotSize: number;
    showGrid: boolean;
    backgroundColor: ColorRef;
  };
  frames: Frame[];
  autoConnections?: AutoConnection[];
};

const encodeBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const makeId = () => {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    return encodeBase64Url(bytes);
  }
  return Math.random().toString(36).slice(2, 10);
};

export const createEmptyFrame = (name: string): Frame => ({
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

const createColorMap = (values: string[]) => {
  const unique: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    if (!unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique;
};

const sanitizeColorMap = (value: unknown, fallback: string[]) => {
  if (Array.isArray(value) && value.length) {
    const fallbackColor = fallback[0] ?? DEFAULT_DOT_COLOR;
    return value.map((entry) => (typeof entry === "string" ? entry : fallbackColor));
  }
  return [...fallback];
};

const resolveColorIndex = (colors: string[], value: unknown, fallback: string) => {
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

export const ensureColorRef = (colors: string[], value: string) => {
  const existing = colors.indexOf(value);
  if (existing >= 0) {
    return { colors, ref: existing };
  }
  return { colors: [...colors, value], ref: colors.length };
};

export const resolveColor = (colors: string[], ref: ColorRef, fallback: string) => {
  if (typeof ref === "number" && ref >= 0 && ref < colors.length) {
    return colors[ref];
  }
  return fallback;
};

export const createDefaultProject = (): Project => {
  const colors = createColorMap([
    DEFAULT_CANVAS_BACKGROUND,
    DEFAULT_DOT_COLOR,
    DEFAULT_CONNECTION_COLOR,
  ]);
  const backgroundColor = resolveColorIndex(
    colors,
    DEFAULT_CANVAS_BACKGROUND,
    DEFAULT_CANVAS_BACKGROUND
  );

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
      created: new Date().toISOString(),
      gridSize: DEFAULT_GRID_SIZE,
      dotSize: DEFAULT_DOT_SIZE,
      dotGap: DEFAULT_DOT_GAP,
      gridColor: DEFAULT_GRID_COLOR,
      gridDotSize: DEFAULT_GRID_DOT_SIZE,
      showGrid: DEFAULT_SHOW_GRID,
      backgroundColor,
    },
    frames: [createEmptyFrame("Frame 1")],
  };
};

const clampNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const ensureString = (value: unknown, fallback: string) => {
  return typeof value === "string" ? value : fallback;
};

const optionalNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

export const normalizeProject = (data: unknown): Project => {
  const base = createDefaultProject();
  if (!data || typeof data !== "object") {
    return base;
  }
  const candidate = data as Partial<Project> & { colors?: unknown };
  const colors = sanitizeColorMap(candidate.colors, base.colors);

  const metadata = (candidate.metadata ?? {}) as Partial<Project["metadata"]>;
  const gridSize = clampNumber(metadata.gridSize, base.metadata.gridSize);
  const dotSize = clampNumber(metadata.dotSize, base.metadata.dotSize);
  const dotGap = clampNumber(metadata.dotGap, base.metadata.dotGap);
  const gridColor = ensureString(metadata.gridColor, base.metadata.gridColor);
  const gridDotSize = clampNumber(metadata.gridDotSize, base.metadata.gridDotSize);
  const showGrid = Boolean(metadata.showGrid ?? base.metadata.showGrid);
  const backgroundColor = resolveColorIndex(
    colors,
    metadata.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
    DEFAULT_CANVAS_BACKGROUND
  );

  const frames = Array.isArray(candidate.frames) ? candidate.frames : base.frames;
  const normalizedFrames: Frame[] = frames.map((frameLike, index) => {
    const fallback = createEmptyFrame(`Frame ${index + 1}`);
    const frame = frameLike as Partial<Frame>;
    const dots = Array.isArray(frame.dots) ? frame.dots : [];
    const connections = Array.isArray(frame.connections) ? frame.connections : [];

    const normalizedDots: Dot[] = dots
      .map((dot) => ({
        id: ensureString(dot.id, makeId()),
        x: clampNumber(dot.x, 0),
        y: clampNumber(dot.y, 0),
        color: resolveColorIndex(colors, dot.color, DEFAULT_DOT_COLOR),
        fadeInDuration: optionalNumber(dot.fadeInDuration),
        fadeOutDuration: optionalNumber(dot.fadeOutDuration),
      }))
      .filter((dot) => dot.x >= 0 && dot.y >= 0 && dot.x < gridSize && dot.y < gridSize);

    const normalizedConnections: Connection[] = connections.map((connection, orderIndex) => ({
      id: ensureString(connection.id, makeId()),
      from: ensureString(connection.from, ""),
      to: ensureString(connection.to, ""),
      color: resolveColorIndex(colors, connection.color, DEFAULT_CONNECTION_COLOR),
      order: clampNumber(connection.order, orderIndex),
      revealDuration: optionalNumber(connection.revealDuration),
    }));

    // Normalize groups (backwards compatibility - old projects won't have groups)
    const groups = Array.isArray(frame.groups) ? frame.groups : [];
    const dotIdSet = new Set(normalizedDots.map((d) => d.id));
    const connIdSet = new Set(normalizedConnections.map((c) => c.id));
    const normalizedGroups: Group[] = groups
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
      id: ensureString(frame.id, fallback.id),
      name: ensureString(frame.name, fallback.name),
      dots: normalizedDots,
      connections: normalizedConnections,
      groups: normalizedGroups,
      duration: clampNumber(frame.duration, fallback.duration),
      easing: ensureString(frame.easing, fallback.easing) as Frame["easing"],
      dotFadeInDuration: clampNumber(frame.dotFadeInDuration, fallback.dotFadeInDuration),
      dotFadeOutDuration: clampNumber(frame.dotFadeOutDuration, fallback.dotFadeOutDuration),
      dotColorTransitionDuration: clampNumber(
        frame.dotColorTransitionDuration,
        fallback.dotColorTransitionDuration
      ),
      dotColorTransitionEasing: ensureString(
        frame.dotColorTransitionEasing,
        fallback.dotColorTransitionEasing
      ) as Frame["dotColorTransitionEasing"],
      connectionAnimationDuration: clampNumber(
        frame.connectionAnimationDuration,
        fallback.connectionAnimationDuration
      ),
      connectionStagger: clampNumber(frame.connectionStagger, fallback.connectionStagger),
      dotStagger: clampNumber(frame.dotStagger, fallback.dotStagger),
      animateDots: Boolean(frame.animateDots ?? fallback.animateDots),
      animateConnections: Boolean(frame.animateConnections ?? fallback.animateConnections),
    };
  });

  // Normalize auto-connections (backwards compatibility - old projects won't have them)
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
    version: ensureString(candidate.version, base.version),
    colors: colors.length ? colors : base.colors,
    settings: {
      loopPlayback: Boolean(candidate.settings?.loopPlayback ?? base.settings.loopPlayback),
      fadeInOnStart: Boolean(candidate.settings?.fadeInOnStart ?? base.settings.fadeInOnStart),
      fadeOutOnEnd: Boolean(candidate.settings?.fadeOutOnEnd ?? base.settings.fadeOutOnEnd),
      connectionFadeInOnStart: Boolean(
        candidate.settings?.connectionFadeInOnStart ??
          candidate.settings?.fadeInOnStart ??
          base.settings.connectionFadeInOnStart
      ),
      connectionFadeOutOnEnd: Boolean(
        candidate.settings?.connectionFadeOutOnEnd ??
          candidate.settings?.fadeOutOnEnd ??
          base.settings.connectionFadeOutOnEnd
      ),
    },
    metadata: {
      created: ensureString(metadata.created, base.metadata.created),
      gridSize,
      dotSize,
      dotGap,
      gridColor,
      gridDotSize,
      showGrid,
      backgroundColor,
    },
    frames: normalizedFrames.length ? normalizedFrames : base.frames,
    autoConnections:
      normalizedAutoConnections.length > 0 ? normalizedAutoConnections : undefined,
  };
};

export const optimizeProjectColors = (project: Project): Project => {
  const colors: string[] = [];
  const indexByColor = new Map<string, number>();
  const resolveIndex = (value: string) => {
    const existing = indexByColor.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const nextIndex = colors.length;
    colors.push(value);
    indexByColor.set(value, nextIndex);
    return nextIndex;
  };
  const resolveRef = (ref: ColorRef, fallback: string) =>
    resolveColor(project.colors, ref, fallback);

  const backgroundColor = resolveIndex(
    resolveRef(project.metadata.backgroundColor, DEFAULT_CANVAS_BACKGROUND)
  );
  const frames = project.frames.map((frame) => ({
    ...frame,
    dots: frame.dots.map((dot) => ({
      ...dot,
      color: resolveIndex(resolveRef(dot.color, DEFAULT_DOT_COLOR)),
    })),
    connections: frame.connections.map((connection) => ({
      ...connection,
      color: resolveIndex(resolveRef(connection.color, DEFAULT_CONNECTION_COLOR)),
    })),
  }));

  const autoConnections = project.autoConnections?.map((ac) => ({
    ...ac,
    color: resolveIndex(resolveRef(ac.color, DEFAULT_CONNECTION_COLOR)),
  }));

  return {
    ...project,
    colors,
    metadata: {
      ...project.metadata,
      backgroundColor,
    },
    frames,
    autoConnections,
  };
};
