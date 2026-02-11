import type { ShapeParams, ShapeResult, Point } from "./types";

export const generateRectangle = (params: ShapeParams): ShapeResult => {
  const { startX, startY, endX, endY, filled } = params;
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);

  const dots: Point[] = [];
  const seen = new Set<string>();

  const addPoint = (x: number, y: number) => {
    const key = `${x}:${y}`;
    if (!seen.has(key)) {
      seen.add(key);
      dots.push({ x, y });
    }
  };

  if (filled) {
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        addPoint(x, y);
      }
    }
  } else {
    for (let x = minX; x <= maxX; x++) {
      addPoint(x, minY);
      if (maxY !== minY) addPoint(x, maxY);
    }
    for (let y = minY + 1; y < maxY; y++) {
      addPoint(minX, y);
      if (maxX !== minX) addPoint(maxX, y);
    }
  }

  return { dots };
};
