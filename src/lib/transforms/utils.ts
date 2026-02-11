import type { Dot } from "../project";

export interface TransformBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

export const calculateBounds = (dots: Dot[]): TransformBounds | null => {
  if (dots.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const dot of dots) {
    minX = Math.min(minX, dot.x);
    maxX = Math.max(maxX, dot.x);
    minY = Math.min(minY, dot.y);
    maxY = Math.max(maxY, dot.y);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

export const clampToGrid = (
  value: number,
  gridSize: number
): number => {
  return Math.max(0, Math.min(gridSize - 1, Math.round(value)));
};

export const isWithinGrid = (
  x: number,
  y: number,
  gridSize: number
): boolean => {
  return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
};
