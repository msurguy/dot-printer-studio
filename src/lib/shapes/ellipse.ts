import type { ShapeParams, ShapeResult, Point } from "./types";

export const generateEllipse = (params: ShapeParams): ShapeResult => {
  const { startX, startY, endX, endY, filled } = params;
  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  const radiusX = Math.abs(endX - startX) / 2;
  const radiusY = Math.abs(endY - startY) / 2;

  if (radiusX === 0 && radiusY === 0) {
    return { dots: [{ x: Math.round(centerX), y: Math.round(centerY) }] };
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

  if (filled) {
    const minX = Math.floor(centerX - radiusX);
    const maxX = Math.ceil(centerX + radiusX);
    const minY = Math.floor(centerY - radiusY);
    const maxY = Math.ceil(centerY + radiusY);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dx = (x - centerX) / (radiusX || 1);
        const dy = (y - centerY) / (radiusY || 1);
        if (dx * dx + dy * dy <= 1) {
          addPoint(x, y);
        }
      }
    }
  } else {
    const steps = Math.max(60, Math.round(2 * Math.PI * Math.max(radiusX, radiusY)));
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);
      addPoint(x, y);
    }
  }

  return { dots };
};
