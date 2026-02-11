import type { ShapeParams, ShapeResult, Point } from "./types";
import { generateLine } from "./line";

export const generateArrow = (params: ShapeParams): ShapeResult => {
  const { startX, startY, endX, endY, arrowHeadSize = 5 } = params;

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

  const mainLine = generateLine(startX, startY, endX, endY);
  mainLine.dots.forEach((d) => addPoint(d.x, d.y));

  const angle = Math.atan2(endY - startY, endX - startX);
  const headAngle1 = angle + Math.PI * 0.8;
  const headAngle2 = angle - Math.PI * 0.8;

  const head1X = endX + arrowHeadSize * Math.cos(headAngle1);
  const head1Y = endY + arrowHeadSize * Math.sin(headAngle1);
  const head2X = endX + arrowHeadSize * Math.cos(headAngle2);
  const head2Y = endY + arrowHeadSize * Math.sin(headAngle2);

  const headLine1 = generateLine(endX, endY, Math.round(head1X), Math.round(head1Y));
  const headLine2 = generateLine(endX, endY, Math.round(head2X), Math.round(head2Y));

  headLine1.dots.forEach((d) => addPoint(d.x, d.y));
  headLine2.dots.forEach((d) => addPoint(d.x, d.y));

  const suggestedConnections: Array<{ fromIndex: number; toIndex: number }> = [];
  for (let i = 0; i < dots.length - 1; i++) {
    const dx = Math.abs(dots[i + 1].x - dots[i].x);
    const dy = Math.abs(dots[i + 1].y - dots[i].y);
    if (dx <= 1 && dy <= 1) {
      suggestedConnections.push({ fromIndex: i, toIndex: i + 1 });
    }
  }

  return { dots, suggestedConnections };
};
