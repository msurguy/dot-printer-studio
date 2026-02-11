import type { Command, HistoryState, DotSnapshot, ConnectionSnapshot } from "./types";
import { makeId, type Dot, type Connection, type Group } from "../project";
import { snapshotDot, snapshotConnection, restoreDot, restoreConnection } from "./types";
import { snapshotGroup, restoreGroup, type GroupSnapshot } from "../groups/types";
import { removeDotsFromAllGroups } from "../groups/utils";

export class AddDotsCommand implements Command {
  readonly id: string;
  readonly type = "ADD_DOTS";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly dots: DotSnapshot[];
  readonly addedColors: string[];

  constructor(
    frameIndex: number,
    dots: Dot[],
    addedColors: string[] = [],
    label?: string
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.dots = dots.map(snapshotDot);
    this.addedColors = addedColors;
    this.label = label ?? (dots.length === 1 ? "Add dot" : `Add ${dots.length} dots`);
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.dots = [...frame.dots, ...this.dots.map(restoreDot)];
    frames[this.frameIndex] = frame;

    if (this.addedColors.length > 0) {
      project.colors = [...project.colors, ...this.addedColors];
    }

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const addedIds = new Set(this.dots.map((d) => d.id));
    frame.dots = frame.dots.filter((d) => !addedIds.has(d.id));
    frames[this.frameIndex] = frame;

    if (this.addedColors.length > 0) {
      project.colors = project.colors.slice(0, -this.addedColors.length);
    }

    return { ...state, project: { ...project, frames } };
  }
}

export class RemoveDotsCommand implements Command {
  readonly id: string;
  readonly type = "REMOVE_DOTS";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly removedDots: DotSnapshot[];
  readonly removedConnections: ConnectionSnapshot[];
  readonly previousGroups: GroupSnapshot[];

  constructor(
    frameIndex: number,
    removedDots: Dot[],
    removedConnections: Connection[],
    currentGroups: Group[],
    label?: string
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.removedDots = removedDots.map(snapshotDot);
    this.removedConnections = removedConnections.map(snapshotConnection);
    this.previousGroups = currentGroups.map(snapshotGroup);
    this.label =
      label ?? (removedDots.length === 1 ? "Delete dot" : `Delete ${removedDots.length} dots`);
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const removedDotIds = new Set(this.removedDots.map((d) => d.id));
    const removedConnIds = new Set(this.removedConnections.map((c) => c.id));

    frame.dots = frame.dots.filter((d) => !removedDotIds.has(d.id));
    frame.connections = frame.connections.filter((c) => !removedConnIds.has(c.id));
    // Clean up group membership for removed dots
    frame.groups = removeDotsFromAllGroups(
      this.removedDots.map((d) => d.id),
      frame.groups
    );
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.dots = [...frame.dots, ...this.removedDots.map(restoreDot)];
    frame.connections = [...frame.connections, ...this.removedConnections.map(restoreConnection)];
    // Restore previous group state
    frame.groups = this.previousGroups.map(restoreGroup);
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export interface DotUpdate {
  id: string;
  before: Partial<Dot>;
  after: Partial<Dot>;
}

export class UpdateDotsCommand implements Command {
  readonly id: string;
  readonly type = "UPDATE_DOTS";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly updates: DotUpdate[];

  constructor(frameIndex: number, updates: DotUpdate[], label?: string) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.updates = updates;
    this.label = label ?? (updates.length === 1 ? "Update dot" : `Update ${updates.length} dots`);
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const updateMap = new Map(this.updates.map((u) => [u.id, u.after]));
    frame.dots = frame.dots.map((dot) => {
      const update = updateMap.get(dot.id);
      if (update) {
        return { ...dot, ...update };
      }
      return dot;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const updateMap = new Map(this.updates.map((u) => [u.id, u.before]));
    frame.dots = frame.dots.map((dot) => {
      const update = updateMap.get(dot.id);
      if (update) {
        return { ...dot, ...update };
      }
      return dot;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class ClearFrameCommand implements Command {
  readonly id: string;
  readonly type = "CLEAR_FRAME";
  readonly label = "Clear frame";
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly previousDots: DotSnapshot[];
  readonly previousConnections: ConnectionSnapshot[];
  readonly previousGroups: GroupSnapshot[];

  constructor(
    frameIndex: number,
    previousDots: Dot[],
    previousConnections: Connection[],
    previousGroups: Group[]
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.previousDots = previousDots.map(snapshotDot);
    this.previousConnections = previousConnections.map(snapshotConnection);
    this.previousGroups = previousGroups.map(snapshotGroup);
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.dots = [];
    frame.connections = [];
    frame.groups = [];
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.dots = this.previousDots.map(restoreDot);
    frame.connections = this.previousConnections.map(restoreConnection);
    frame.groups = this.previousGroups.map(restoreGroup);
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}
