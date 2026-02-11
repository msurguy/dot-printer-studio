import type { Point } from "./types";

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  if (polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
};

export const normalizeRect = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { minX: number; maxX: number; minY: number; maxY: number } => {
  return {
    minX: Math.min(startX, endX),
    maxX: Math.max(startX, endX),
    minY: Math.min(startY, endY),
    maxY: Math.max(startY, endY),
  };
};

export const pointInRect = (
  point: Point,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean => {
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
};

export const distance = (p1: Point, p2: Point): number => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

export const simplifyPath = (path: Point[], tolerance: number = 1): Point[] => {
  if (path.length <= 2) return path;

  const result: Point[] = [path[0]];
  let lastPoint = path[0];

  for (let i = 1; i < path.length - 1; i++) {
    if (distance(lastPoint, path[i]) >= tolerance) {
      result.push(path[i]);
      lastPoint = path[i];
    }
  }

  result.push(path[path.length - 1]);
  return result;
};
