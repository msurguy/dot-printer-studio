export interface Point {
  x: number;
  y: number;
}

export type ShapeType =
  | "rectangle"
  | "circle"
  | "ellipse"
  | "line"
  | "triangle"
  | "polygon"
  | "star"
  | "arrow"
  | "bezier";

export interface ShapeParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  filled: boolean;
  sides?: number;
  points?: number;
  controlPoints?: Point[];
  arrowHeadSize?: number;
}

export interface ShapeResult {
  dots: Point[];
  suggestedConnections?: Array<{ fromIndex: number; toIndex: number }>;
}
