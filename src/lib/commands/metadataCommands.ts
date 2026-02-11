import type { Command, HistoryState, DotSnapshot, ConnectionSnapshot } from "./types";
import { makeId, type Dot, type Connection } from "../project";
import { snapshotDot, snapshotConnection, restoreDot, restoreConnection } from "./types";
import { snapshotGroup, restoreGroup, type GroupSnapshot } from "../groups/types";

export class ChangeGridSizeCommand implements Command {
  readonly id: string;
  readonly type = "CHANGE_GRID_SIZE";
  readonly label: string;
  readonly timestamp: number;
  readonly previousGridSize: number;
  readonly newGridSize: number;
  readonly removedDots: Map<number, DotSnapshot[]>; // frameIndex -> removed dots
  readonly removedConnections: Map<number, ConnectionSnapshot[]>; // frameIndex -> removed connections
  readonly previousGroups: Map<number, GroupSnapshot[]>; // frameIndex -> previous groups

  constructor(
    previousGridSize: number,
    newGridSize: number,
    removedDots: Map<number, Dot[]>,
    removedConnections: Map<number, Connection[]>,
    previousGroups: Map<number, GroupSnapshot[]>
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.previousGridSize = previousGridSize;
    this.newGridSize = newGridSize;
    this.label = `Change grid size: ${previousGridSize} → ${newGridSize}`;

    // Snapshot removed dots and connections
    this.removedDots = new Map();
    removedDots.forEach((dots, frameIndex) => {
      this.removedDots.set(frameIndex, dots.map(snapshotDot));
    });

    this.removedConnections = new Map();
    removedConnections.forEach((connections, frameIndex) => {
      this.removedConnections.set(frameIndex, connections.map(snapshotConnection));
    });

    this.previousGroups = previousGroups;
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];

    // Update grid size
    project.metadata = {
      ...project.metadata,
      gridSize: this.newGridSize,
    };

    // Remove dots and connections that are outside the new grid bounds
    this.removedDots.forEach((dots, frameIndex) => {
      if (frameIndex >= frames.length) return;

      const frame = { ...frames[frameIndex] };
      const removedDotIds = new Set(dots.map((d) => d.id));
      const removedConnIds = new Set(
        (this.removedConnections.get(frameIndex) || []).map((c) => c.id)
      );

      frame.dots = frame.dots.filter((d) => !removedDotIds.has(d.id));
      frame.connections = frame.connections.filter((c) => !removedConnIds.has(c.id));

      // Update groups - remove references to deleted dots and connections
      frame.groups = frame.groups.map((group) => ({
        ...group,
        dotIds: group.dotIds.filter((id) => !removedDotIds.has(id)),
        connectionIds: group.connectionIds.filter((id) => !removedConnIds.has(id)),
      }));

      frames[frameIndex] = frame;
    });

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];

    // Restore previous grid size
    project.metadata = {
      ...project.metadata,
      gridSize: this.previousGridSize,
    };

    // Restore removed dots and connections
    this.removedDots.forEach((dots, frameIndex) => {
      if (frameIndex >= frames.length) return;

      const frame = { ...frames[frameIndex] };

      // Restore dots
      frame.dots = [...frame.dots, ...dots.map(restoreDot)];

      // Restore connections
      const connections = this.removedConnections.get(frameIndex) || [];
      frame.connections = [...frame.connections, ...connections.map(restoreConnection)];

      // Restore previous groups state
      const prevGroups = this.previousGroups.get(frameIndex);
      if (prevGroups) {
        frame.groups = prevGroups.map(restoreGroup);
      }

      frames[frameIndex] = frame;
    });

    return { ...state, project: { ...project, frames } };
  }
}
