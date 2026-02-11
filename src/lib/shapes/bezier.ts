import type { ShapeParams, ShapeResult, Point } from "./types";

const deCasteljau = (points: Point[], t: number): Point => {
  if (points.length === 1) return points[0];

  const newPoints: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    newPoints.push({
      x: (1 - t) * points[i].x + t * points[i + 1].x,
      y: (1 - t) * points[i].y + t * points[i + 1].y,
    });
  }

  return deCasteljau(newPoints, t);
};

export const generateBezier = (params: ShapeParams): ShapeResult => {
  const { startX, startY, endX, endY, controlPoints = [] } = params;

  const allPoints: Point[] = [
    { x: startX, y: startY },
    ...controlPoints,
    { x: endX, y: endY },
  ];

  if (allPoints.length < 2) {
    return { dots: [{ x: startX, y: startY }] };
  }

  const dots: Point[] = [];
  const seen = new Set<string>();

  const addPoint = (x: number, y: number) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const key = `${rx}:${ry}`;
    if (!seen.has(key)) {
      seen.add(key);
      dots.push({ x: rx, y: ry });
    }
  };

  const curveLength = allPoints.reduce((sum, p, i) => {
    if (i === 0) return 0;
    return sum + Math.hypot(p.x - allPoints[i - 1].x, p.y - allPoints[i - 1].y);
  }, 0);

  const steps = Math.max(50, Math.round(curveLength));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = deCasteljau(allPoints, t);
    addPoint(point.x, point.y);
  }

  const suggestedConnections: Array<{ fromIndex: number; toIndex: number }> = [];
  for (let i = 0; i < dots.length - 1; i++) {
    suggestedConnections.push({ fromIndex: i, toIndex: i + 1 });
  }

  return { dots, suggestedConnections };
};
