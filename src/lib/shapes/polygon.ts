import type { ShapeParams, ShapeResult, Point } from "./types";
import { generateLine } from "./line";

const pointInPolygon = (point: Point, vertices: Point[]): boolean => {
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
};

export const generatePolygon = (params: ShapeParams): ShapeResult => {
  const { startX, startY, endX, endY, filled, sides = 6 } = params;
  const centerX = startX;
  const centerY = startY;
  const radius = Math.hypot(endX - startX, endY - startY);

  if (radius === 0 || sides < 3) {
    return { dots: [{ x: centerX, y: centerY }] };
  }

  const vertices: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    vertices.push({
      x: Math.round(centerX + radius * Math.cos(angle)),
      y: Math.round(centerY + radius * Math.sin(angle)),
    });
  }

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
    const minX = Math.min(...vertices.map((v) => v.x));
    const maxX = Math.max(...vertices.map((v) => v.x));
    const minY = Math.min(...vertices.map((v) => v.y));
    const maxY = Math.max(...vertices.map((v) => v.y));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (pointInPolygon({ x, y }, vertices)) {
          addPoint(x, y);
        }
      }
    }
  } else {
    for (let i = 0; i < vertices.length; i++) {
      const from = vertices[i];
      const to = vertices[(i + 1) % vertices.length];
      const lineResult = generateLine(from.x, from.y, to.x, to.y);
      lineResult.dots.forEach((d) => addPoint(d.x, d.y));
    }
  }

  return { dots };
};
