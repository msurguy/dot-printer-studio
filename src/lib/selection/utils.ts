import type { Dot, Connection, ColorRef } from "../project";
import type { Point, MarqueeRect } from "./types";
import { pointInPolygon, normalizeRect, pointInRect } from "./geometry";

export const selectDotsInRect = (dots: Dot[], rect: MarqueeRect): string[] => {
  const { minX, maxX, minY, maxY } = normalizeRect(
    rect.startX,
    rect.startY,
    rect.endX,
    rect.endY
  );

  return dots
    .filter((dot) => pointInRect(dot, minX, minY, maxX, maxY))
    .map((dot) => dot.id);
};

export const selectDotsInLasso = (dots: Dot[], lassoPath: Point[]): string[] => {
  if (lassoPath.length < 3) return [];

  return dots.filter((dot) => pointInPolygon(dot, lassoPath)).map((dot) => dot.id);
};

export const selectConnectedDots = (
  startDotIds: string[],
  connections: Connection[]
): string[] => {
  const visited = new Set<string>(startDotIds);
  const queue = [...startDotIds];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const conn of connections) {
      let neighbor: string | null = null;
      if (conn.from === current && !visited.has(conn.to)) {
        neighbor = conn.to;
      } else if (conn.to === current && !visited.has(conn.from)) {
        neighbor = conn.from;
      }

      if (neighbor) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return Array.from(visited);
};

export const selectByColor = (dots: Dot[], colorRef: ColorRef): string[] => {
  return dots.filter((dot) => dot.color === colorRef).map((dot) => dot.id);
};

export const selectAllDotsInRegion = (
  dots: Dot[],
  connections: Connection[],
  rect: { minX: number; maxX: number; minY: number; maxY: number }
): { dotIds: string[]; connectionIds: string[] } => {
  const dotIds = dots
    .filter((dot) => pointInRect(dot, rect.minX, rect.minY, rect.maxX, rect.maxY))
    .map((dot) => dot.id);

  const dotIdSet = new Set(dotIds);
  const connectionIds = connections
    .filter((conn) => dotIdSet.has(conn.from) && dotIdSet.has(conn.to))
    .map((conn) => conn.id);

  return { dotIds, connectionIds };
};

export const getConnectionsForDots = (
  dotIds: string[],
  connections: Connection[]
): string[] => {
  const dotIdSet = new Set(dotIds);
  return connections
    .filter((conn) => dotIdSet.has(conn.from) && dotIdSet.has(conn.to))
    .map((conn) => conn.id);
};

export const invertSelection = (
  allDotIds: string[],
  selectedDotIds: string[]
): string[] => {
  const selectedSet = new Set(selectedDotIds);
  return allDotIds.filter((id) => !selectedSet.has(id));
};

export const selectAll = (dots: Dot[]): string[] => {
  return dots.map((dot) => dot.id);
};

export const getSelectionBounds = (
  dots: Dot[]
): { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number } | null => {
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
