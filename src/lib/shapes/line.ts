import type { Point, ShapeResult } from "./types";

export const generateLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): ShapeResult => {
  const dots: Point[] = [];
  let dx = Math.abs(x2 - x1);
  let dy = Math.abs(y2 - y1);
  let sx = x1 < x2 ? 1 : -1;
  let sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1;
  let y = y1;

  while (true) {
    dots.push({ x, y });
    if (x === x2 && y === y2) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  const suggestedConnections: Array<{ fromIndex: number; toIndex: number }> = [];
  for (let i = 0; i < dots.length - 1; i++) {
    suggestedConnections.push({ fromIndex: i, toIndex: i + 1 });
  }

  return { dots, suggestedConnections };
};
