export interface Point {
  x: number;
  y: number;
}

export interface MarqueeRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type SelectionMode = "replace" | "add" | "subtract" | "toggle";

export const getSelectionMode = (event: {
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): SelectionMode => {
  if (event.shiftKey) return "add";
  if (event.altKey) return "subtract";
  if (event.metaKey || event.ctrlKey) return "toggle";
  return "replace";
};
