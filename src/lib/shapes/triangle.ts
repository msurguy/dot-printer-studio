import type { ShapeParams, ShapeResult, Point } from "./types";
import { generateLine } from "./line";

export const generateTriangle = (params: ShapeParams): ShapeResult => {
  const { startX, startY, endX, endY, filled } = params;

  const baseWidth = Math.abs(endX - startX);
  const height = Math.round((baseWidth * Math.sqrt(3)) / 2);

  const p1: Point = { x: startX, y: startY };
  const p2: Point = { x: endX, y: startY };
  const p3: Point = { x: Math.round((startX + endX) / 2), y: startY - height };

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
    const minY = Math.min(p1.y, p2.y, p3.y);
    const maxY = Math.max(p1.y, p2.y, p3.y);
    const edges: [Point, Point][] = [
      [p1, p2],
      [p2, p3],
      [p3, p1],
    ];

    for (let y = minY; y <= maxY; y++) {
      const intersections: number[] = [];

      for (const [a, b] of edges) {
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          const x = a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
          intersections.push(Math.round(x));
        }
      }

      intersections.sort((a, b) => a - b);

      for (let i = 0; i < intersections.length; i += 2) {
        const startXFill = intersections[i];
        const endXFill = intersections[i + 1] ?? intersections[i];
        for (let x = startXFill; x <= endXFill; x++) {
          addPoint(x, y);
        }
      }
    }
  } else {
    const line1 = generateLine(p1.x, p1.y, p2.x, p2.y);
    const line2 = generateLine(p2.x, p2.y, p3.x, p3.y);
    const line3 = generateLine(p3.x, p3.y, p1.x, p1.y);

    line1.dots.forEach((d) => addPoint(d.x, d.y));
    line2.dots.forEach((d) => addPoint(d.x, d.y));
    line3.dots.forEach((d) => addPoint(d.x, d.y));
  }

  return { dots };
};
