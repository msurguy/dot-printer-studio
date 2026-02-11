import type { Command, HistoryState, ConnectionSnapshot } from "./types";
import { makeId, type Connection, type Group } from "../project";
import { snapshotConnection, restoreConnection } from "./types";
import { snapshotGroup, restoreGroup, type GroupSnapshot } from "../groups/types";
import { removeConnectionsFromAllGroups } from "../groups/utils";

export class AddConnectionsCommand implements Command {
  readonly id: string;
  readonly type = "ADD_CONNECTIONS";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly connections: ConnectionSnapshot[];
  readonly addedColors: string[];

  constructor(
    frameIndex: number,
    connections: Connection[],
    addedColors: string[] = [],
    label?: string
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.connections = connections.map(snapshotConnection);
    this.addedColors = addedColors;
    this.label =
      label ??
      (connections.length === 1 ? "Add connection" : `Add ${connections.length} connections`);
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.connections = [...frame.connections, ...this.connections.map(restoreConnection)];
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

    const addedIds = new Set(this.connections.map((c) => c.id));
    frame.connections = frame.connections.filter((c) => !addedIds.has(c.id));
    frames[this.frameIndex] = frame;

    if (this.addedColors.length > 0) {
      project.colors = project.colors.slice(0, -this.addedColors.length);
    }

    return { ...state, project: { ...project, frames } };
  }
}

export class RemoveConnectionsCommand implements Command {
  readonly id: string;
  readonly type = "REMOVE_CONNECTIONS";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly removedConnections: ConnectionSnapshot[];
  readonly previousGroups: GroupSnapshot[];

  constructor(
    frameIndex: number,
    removedConnections: Connection[],
    currentGroups: Group[],
    label?: string
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.removedConnections = removedConnections.map(snapshotConnection);
    this.previousGroups = currentGroups.map(snapshotGroup);
    this.label =
      label ??
      (removedConnections.length === 1
        ? "Delete connection"
        : `Delete ${removedConnections.length} connections`);
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const removedIds = new Set(this.removedConnections.map((c) => c.id));
    frame.connections = frame.connections.filter((c) => !removedIds.has(c.id));
    // Clean up group membership for removed connections
    frame.groups = removeConnectionsFromAllGroups(
      this.removedConnections.map((c) => c.id),
      frame.groups
    );
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.connections = [...frame.connections, ...this.removedConnections.map(restoreConnection)];
    // Restore previous group state
    frame.groups = this.previousGroups.map(restoreGroup);
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export interface ConnectionOrderUpdate {
  id: string;
  beforeOrder: number;
  afterOrder: number;
}

export class ReorderConnectionsCommand implements Command {
  readonly id: string;
  readonly type = "REORDER_CONNECTIONS";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly updates: ConnectionOrderUpdate[];

  constructor(frameIndex: number, updates: ConnectionOrderUpdate[], label?: string) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.updates = updates;
    this.label = label ?? "Reorder connections";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const orderMap = new Map(this.updates.map((u) => [u.id, u.afterOrder]));
    frame.connections = frame.connections.map((conn) => {
      const newOrder = orderMap.get(conn.id);
      if (newOrder !== undefined) {
        return { ...conn, order: newOrder };
      }
      return conn;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const orderMap = new Map(this.updates.map((u) => [u.id, u.beforeOrder]));
    frame.connections = frame.connections.map((conn) => {
      const oldOrder = orderMap.get(conn.id);
      if (oldOrder !== undefined) {
        return { ...conn, order: oldOrder };
      }
      return conn;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class SwapConnectionDirectionCommand implements Command {
  readonly id: string;
  readonly type = "SWAP_CONNECTION_DIRECTION";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly connectionIds: string[];

  constructor(frameIndex: number, connectionIds: string[], label?: string) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.connectionIds = connectionIds;
    this.label =
      label ??
      (connectionIds.length === 1 ? "Swap direction" : `Swap ${connectionIds.length} directions`);
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const idsToSwap = new Set(this.connectionIds);
    frame.connections = frame.connections.map((conn) => {
      if (idsToSwap.has(conn.id)) {
        return { ...conn, from: conn.to, to: conn.from };
      }
      return conn;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    return this.execute(state);
  }
}
