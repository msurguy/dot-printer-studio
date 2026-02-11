import type { Command, HistoryState, DotSnapshot } from "./types";
import { makeId, type Dot } from "../project";
import { snapshotDot, restoreDot } from "./types";

export type TransformType = "flip_h" | "flip_v" | "rotate_90_cw" | "rotate_90_ccw" | "rotate_180" | "translate";

export interface TransformData {
  type: TransformType;
  angle?: number;
  deltaX?: number;
  deltaY?: number;
}

export class TransformDotsCommand implements Command {
  readonly id: string;
  readonly type = "TRANSFORM_DOTS";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly beforeDots: DotSnapshot[];
  readonly afterDots: DotSnapshot[];
  readonly removedDotIds: string[];

  constructor(
    frameIndex: number,
    beforeDots: Dot[],
    afterDots: Dot[],
    removedDotIds: string[] = [],
    label?: string
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.beforeDots = beforeDots.map(snapshotDot);
    this.afterDots = afterDots.map(snapshotDot);
    this.removedDotIds = removedDotIds;
    this.label = label ?? "Transform";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const beforeIds = new Set(this.beforeDots.map((d) => d.id));
    const afterMap = new Map(this.afterDots.map((d) => [d.id, restoreDot(d)]));

    frame.dots = frame.dots.map((dot) => {
      if (beforeIds.has(dot.id)) {
        const updated = afterMap.get(dot.id);
        return updated ?? dot;
      }
      return dot;
    });

    if (this.removedDotIds.length > 0) {
      const removedSet = new Set(this.removedDotIds);
      frame.dots = frame.dots.filter((d) => !removedSet.has(d.id));
      frame.connections = frame.connections.filter(
        (c) => !removedSet.has(c.from) && !removedSet.has(c.to)
      );
    }

    frames[this.frameIndex] = frame;
    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const afterIds = new Set(this.afterDots.map((d) => d.id));
    const beforeMap = new Map(this.beforeDots.map((d) => [d.id, restoreDot(d)]));

    frame.dots = frame.dots.map((dot) => {
      if (afterIds.has(dot.id)) {
        const original = beforeMap.get(dot.id);
        return original ?? dot;
      }
      return dot;
    });

    if (this.removedDotIds.length > 0) {
      const restoredDots = this.beforeDots
        .filter((d) => this.removedDotIds.includes(d.id))
        .map(restoreDot);
      frame.dots = [...frame.dots, ...restoredDots];
    }

    frames[this.frameIndex] = frame;
    return { ...state, project: { ...project, frames } };
  }
}
