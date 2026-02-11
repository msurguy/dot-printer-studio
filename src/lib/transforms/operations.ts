import type { Dot } from "../project";
import { calculateBounds, clampToGrid, isWithinGrid } from "./utils";

export interface TransformResult {
  dots: Dot[];
  clippedIds: string[];
}

export const flipHorizontal = (
  dots: Dot[],
  gridSize: number,
  customCenter?: number
): TransformResult => {
  const bounds = calculateBounds(dots);
  if (!bounds) return { dots: [], clippedIds: [] };

  const centerX = customCenter ?? bounds.centerX;
  const clippedIds: string[] = [];

  const transformed = dots
    .map((dot) => {
      const newX = Math.round(2 * centerX - dot.x);
      if (!isWithinGrid(newX, dot.y, gridSize)) {
        clippedIds.push(dot.id);
        return null;
      }
      return { ...dot, x: clampToGrid(newX, gridSize) };
    })
    .filter((d): d is Dot => d !== null);

  return { dots: transformed, clippedIds };
};

export const flipVertical = (
  dots: Dot[],
  gridSize: number,
  customCenter?: number
): TransformResult => {
  const bounds = calculateBounds(dots);
  if (!bounds) return { dots: [], clippedIds: [] };

  const centerY = customCenter ?? bounds.centerY;
  const clippedIds: string[] = [];

  const transformed = dots
    .map((dot) => {
      const newY = Math.round(2 * centerY - dot.y);
      if (!isWithinGrid(dot.x, newY, gridSize)) {
        clippedIds.push(dot.id);
        return null;
      }
      return { ...dot, y: clampToGrid(newY, gridSize) };
    })
    .filter((d): d is Dot => d !== null);

  return { dots: transformed, clippedIds };
};

export const rotate = (
  dots: Dot[],
  angleDegrees: number,
  gridSize: number,
  customCenter?: { x: number; y: number }
): TransformResult => {
  const bounds = calculateBounds(dots);
  if (!bounds) return { dots: [], clippedIds: [] };

  const centerX = customCenter?.x ?? bounds.centerX;
  const centerY = customCenter?.y ?? bounds.centerY;

  const angleRad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const clippedIds: string[] = [];

  const transformed = dots
    .map((dot) => {
      const dx = dot.x - centerX;
      const dy = dot.y - centerY;
      const newX = Math.round(centerX + dx * cos - dy * sin);
      const newY = Math.round(centerY + dx * sin + dy * cos);

      if (!isWithinGrid(newX, newY, gridSize)) {
        clippedIds.push(dot.id);
        return null;
      }

      return {
        ...dot,
        x: clampToGrid(newX, gridSize),
        y: clampToGrid(newY, gridSize),
      };
    })
    .filter((d): d is Dot => d !== null);

  return { dots: transformed, clippedIds };
};

export const rotate90CW = (dots: Dot[], gridSize: number): TransformResult => {
  return rotate(dots, 90, gridSize);
};

export const rotate90CCW = (dots: Dot[], gridSize: number): TransformResult => {
  return rotate(dots, -90, gridSize);
};

export const rotate180 = (dots: Dot[], gridSize: number): TransformResult => {
  return rotate(dots, 180, gridSize);
};

export const translateDots = (
  dots: Dot[],
  deltaX: number,
  deltaY: number,
  gridSize: number
): TransformResult => {
  const clippedIds: string[] = [];

  const transformed = dots
    .map((dot) => {
      const newX = dot.x + deltaX;
      const newY = dot.y + deltaY;

      if (!isWithinGrid(newX, newY, gridSize)) {
        clippedIds.push(dot.id);
        return null;
      }

      return {
        ...dot,
        x: clampToGrid(newX, gridSize),
        y: clampToGrid(newY, gridSize),
      };
    })
    .filter((d): d is Dot => d !== null);

  return { dots: transformed, clippedIds };
};
