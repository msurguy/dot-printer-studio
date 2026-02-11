import type { Dot, Group } from "../project";
import { getGroupBounds } from "./utils";

export interface BoundingBoxRenderOptions {
  padding: number;
  lineWidth: number;
  selectedLineWidth: number;
  dashPattern: number[];
  fontSize: number;
  labelOffset: number;
}

const defaultOptions: BoundingBoxRenderOptions = {
  padding: 8,
  lineWidth: 1,
  selectedLineWidth: 2,
  dashPattern: [4, 4],
  fontSize: 10,
  labelOffset: 4,
};

/**
 * Render bounding boxes for all visible groups
 */
export const renderGroupBoundingBoxes = (
  ctx: CanvasRenderingContext2D,
  groups: Group[],
  dots: Dot[],
  dotGap: number,
  selectedGroupIds: string[],
  options: Partial<BoundingBoxRenderOptions> = {}
): void => {
  const opts = { ...defaultOptions, ...options };
  const selectedSet = new Set(selectedGroupIds);

  for (const group of groups) {
    if (!group.visible) continue;

    const bounds = getGroupBounds(group, dots);
    if (!bounds) continue;

    const isSelected = selectedSet.has(group.id);

    ctx.save();

    // Calculate pixel coordinates
    const x = bounds.minX * dotGap - opts.padding;
    const y = bounds.minY * dotGap - opts.padding;
    const width = (bounds.maxX - bounds.minX) * dotGap + opts.padding * 2;
    const height = (bounds.maxY - bounds.minY) * dotGap + opts.padding * 2;

    // Set styles
    ctx.strokeStyle = group.color;
    ctx.lineWidth = isSelected ? opts.selectedLineWidth : opts.lineWidth;
    ctx.globalAlpha = isSelected ? 1 : 0.6;

    if (!isSelected) {
      ctx.setLineDash(opts.dashPattern);
    }

    // Draw bounding box
    ctx.strokeRect(x, y, width, height);

    // Draw group name label
    ctx.font = `${opts.fontSize}px sans-serif`;
    ctx.fillStyle = group.color;
    ctx.textBaseline = "bottom";
    ctx.fillText(group.name, x, y - opts.labelOffset);

    // Draw lock indicator if locked
    if (group.locked) {
      const lockSize = opts.fontSize;
      const lockX = x + width - lockSize - 2;
      const lockY = y - lockSize - opts.labelOffset;

      ctx.fillStyle = group.color;
      ctx.globalAlpha = 0.8;

      // Simple lock icon (rectangle with arc on top)
      ctx.beginPath();
      ctx.arc(lockX + lockSize / 2, lockY + lockSize * 0.3, lockSize * 0.25, Math.PI, 0);
      ctx.stroke();
      ctx.fillRect(lockX + lockSize * 0.15, lockY + lockSize * 0.3, lockSize * 0.7, lockSize * 0.6);
    }

    ctx.restore();
  }
};

/**
 * Check if a point is within a group's bounding box (for click detection)
 */
export const isPointInGroupBounds = (
  x: number,
  y: number,
  group: Group,
  dots: Dot[],
  dotGap: number,
  padding: number = defaultOptions.padding
): boolean => {
  const bounds = getGroupBounds(group, dots);
  if (!bounds) return false;

  const minX = bounds.minX * dotGap - padding;
  const minY = bounds.minY * dotGap - padding;
  const maxX = bounds.maxX * dotGap + padding;
  const maxY = bounds.maxY * dotGap + padding;

  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

/**
 * Find the topmost group at a given point
 */
export const findGroupAtPoint = (
  x: number,
  y: number,
  groups: Group[],
  dots: Dot[],
  dotGap: number,
  padding: number = defaultOptions.padding
): Group | undefined => {
  // Check in reverse order (topmost groups are rendered last)
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (!group.visible) continue;
    if (isPointInGroupBounds(x, y, group, dots, dotGap, padding)) {
      return group;
    }
  }
  return undefined;
};
