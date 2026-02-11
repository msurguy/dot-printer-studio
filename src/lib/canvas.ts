import type { Dot } from "./project";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createPositionKey = (x: number, y: number) => `${x}:${y}`;

export const deriveDotMap = (dots: Dot[]) => {
  const map = new Map<string, Dot>();
  for (const dot of dots) {
    map.set(dot.id, dot);
  }
  return map;
};

export const derivePositionMap = (dots: Dot[]) => {
  const map = new Map<string, Dot>();
  for (const dot of dots) {
    map.set(createPositionKey(dot.x, dot.y), dot);
  }
  return map;
};

export const deriveDotPositionSet = (dots: Dot[]) => {
  const set = new Set<string>();
  for (const dot of dots) {
    set.add(createPositionKey(dot.x, dot.y));
  }
  return set;
};

export interface CanvasMetrics {
  gridSpan: number;
  canvasSize: number;
  gridOffset: number;
}

export const getGridSpan = (gridSize: number, dotGap: number): number => {
  const safeSize = Math.max(1, gridSize);
  return Math.max(0, (safeSize - 1) * dotGap);
};

export const getCanvasMetrics = (
  gridSize: number,
  dotGap: number,
  padding: number
): CanvasMetrics => {
  const safePadding = Math.max(0, padding);
  const gridSpan = getGridSpan(gridSize, dotGap);
  return {
    gridSpan,
    canvasSize: gridSpan + safePadding * 2,
    gridOffset: safePadding,
  };
};

export const useCanvasSetup = (
  canvas: HTMLCanvasElement | null,
  width: number,
  height: number
) => {
  if (!canvas) {
    return null;
  }
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
