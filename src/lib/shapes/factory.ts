import type { ShapeType, ShapeParams, ShapeResult } from "./types";
import { generateRectangle } from "./rectangle";
import { generateCircle } from "./circle";
import { generateEllipse } from "./ellipse";
import { generateLine } from "./line";
import { generateTriangle } from "./triangle";
import { generatePolygon } from "./polygon";
import { generateStar } from "./star";
import { generateArrow } from "./arrow";
import { generateBezier } from "./bezier";

const generators: Record<ShapeType, (params: ShapeParams) => ShapeResult> = {
  rectangle: generateRectangle,
  circle: generateCircle,
  ellipse: generateEllipse,
  line: (params) => generateLine(params.startX, params.startY, params.endX, params.endY),
  triangle: generateTriangle,
  polygon: generatePolygon,
  star: generateStar,
  arrow: generateArrow,
  bezier: generateBezier,
};

export const createShape = (type: ShapeType, params: ShapeParams): ShapeResult => {
  const generator = generators[type];
  if (!generator) {
    throw new Error(`Unknown shape type: ${type}`);
  }
  return generator(params);
};

export const isShapeTool = (tool: string): tool is ShapeType => {
  return tool in generators;
};
