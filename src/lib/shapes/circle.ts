import type { ShapeParams, ShapeResult, Point } from "./types";

export const generateCircle = (params: ShapeParams): ShapeResult => {
  const { startX, startY, endX, endY, filled } = params;
  const centerX = startX;
  const centerY = startY;
  const radius = Math.round(Math.hypot(endX - startX, endY - startY));

  if (radius === 0) {
    return { dots: [{ x: centerX, y: centerY }] };
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
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const dist = Math.hypot(x - centerX, y - centerY);
        if (dist <= radius) {
          addPoint(x, y);
        }
      }
    }
  } else {
    let x = radius;
    let y = 0;
    let radiusError = 1 - x;

    while (x >= y) {
      addPoint(centerX + x, centerY + y);
      addPoint(centerX - x, centerY + y);
      addPoint(centerX + x, centerY - y);
      addPoint(centerX - x, centerY - y);
      addPoint(centerX + y, centerY + x);
      addPoint(centerX - y, centerY + x);
      addPoint(centerX + y, centerY - x);
      addPoint(centerX - y, centerY - x);

      y++;
      if (radiusError < 0) {
        radiusError += 2 * y + 1;
      } else {
        x--;
        radiusError += 2 * (y - x + 1);
      }
    }
  }

  return { dots };
};
