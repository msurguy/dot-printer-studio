import type { Command, HistoryState } from "./types";
import { makeId, type AutoConnection } from "../project";

export type AutoConnectionSnapshot = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: number;
  traceInDuration: number;
  traceOutDuration?: number;
  traceInReverse: boolean;
  traceOutReverse: boolean;
  stayDuration?: number;
  startTime: number;
};

export const snapshotAutoConnection = (ac: AutoConnection): AutoConnectionSnapshot => ({
  id: ac.id,
  fromX: ac.fromX,
  fromY: ac.fromY,
  toX: ac.toX,
  toY: ac.toY,
  color: ac.color,
  traceInDuration: ac.traceInDuration,
  traceOutDuration: ac.traceOutDuration,
  traceInReverse: ac.traceInReverse,
  traceOutReverse: ac.traceOutReverse,
  stayDuration: ac.stayDuration,
  startTime: ac.startTime,
});

export const restoreAutoConnection = (snapshot: AutoConnectionSnapshot): AutoConnection => {
  const ac: AutoConnection = {
    id: snapshot.id,
    fromX: snapshot.fromX,
    fromY: snapshot.fromY,
    toX: snapshot.toX,
    toY: snapshot.toY,
    color: snapshot.color,
    traceInDuration: snapshot.traceInDuration,
    traceInReverse: snapshot.traceInReverse,
    traceOutReverse: snapshot.traceOutReverse,
    startTime: snapshot.startTime,
  };
  if (snapshot.traceOutDuration !== undefined) {
    ac.traceOutDuration = snapshot.traceOutDuration;
  }
  if (snapshot.stayDuration !== undefined) {
    ac.stayDuration = snapshot.stayDuration;
  }
  return ac;
};

export class AddAutoConnectionCommand implements Command {
  readonly id: string;
  readonly type = "ADD_AUTO_CONNECTION";
  readonly label: string;
  readonly timestamp: number;
  readonly autoConnection: AutoConnectionSnapshot;
  readonly addedColors: string[];

  constructor(autoConnection: AutoConnection, addedColors: string[] = [], label?: string) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.autoConnection = snapshotAutoConnection(autoConnection);
    this.addedColors = addedColors;
    this.label = label ?? "Add auto-connection";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const autoConnections = [...(project.autoConnections ?? [])];

    autoConnections.push(restoreAutoConnection(this.autoConnection));

    if (this.addedColors.length > 0) {
      project.colors = [...project.colors, ...this.addedColors];
    }

    return { ...state, project: { ...project, autoConnections } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const autoConnections = (project.autoConnections ?? []).filter(
      (ac) => ac.id !== this.autoConnection.id
    );

    if (this.addedColors.length > 0) {
      project.colors = project.colors.slice(0, -this.addedColors.length);
    }

    return {
      ...state,
      project: {
        ...project,
        autoConnections: autoConnections.length > 0 ? autoConnections : undefined,
      },
    };
  }
}

export class RemoveAutoConnectionCommand implements Command {
  readonly id: string;
  readonly type = "REMOVE_AUTO_CONNECTION";
  readonly label: string;
  readonly timestamp: number;
  readonly removedAutoConnection: AutoConnectionSnapshot;

  constructor(autoConnection: AutoConnection, label?: string) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.removedAutoConnection = snapshotAutoConnection(autoConnection);
    this.label = label ?? "Remove auto-connection";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const autoConnections = (project.autoConnections ?? []).filter(
      (ac) => ac.id !== this.removedAutoConnection.id
    );

    return {
      ...state,
      project: {
        ...project,
        autoConnections: autoConnections.length > 0 ? autoConnections : undefined,
      },
    };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const autoConnections = [...(project.autoConnections ?? [])];

    autoConnections.push(restoreAutoConnection(this.removedAutoConnection));

    return { ...state, project: { ...project, autoConnections } };
  }
}

export class UpdateAutoConnectionCommand implements Command {
  readonly id: string;
  readonly type = "UPDATE_AUTO_CONNECTION";
  readonly label: string;
  readonly timestamp: number;
  readonly autoConnectionId: string;
  readonly previousState: AutoConnectionSnapshot;
  readonly newState: AutoConnectionSnapshot;
  readonly addedColors: string[];

  constructor(
    autoConnectionId: string,
    previousState: AutoConnection,
    newState: AutoConnection,
    addedColors: string[] = [],
    label?: string
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.autoConnectionId = autoConnectionId;
    this.previousState = snapshotAutoConnection(previousState);
    this.newState = snapshotAutoConnection(newState);
    this.addedColors = addedColors;
    this.label = label ?? "Update auto-connection";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const autoConnections = (project.autoConnections ?? []).map((ac) =>
      ac.id === this.autoConnectionId ? restoreAutoConnection(this.newState) : ac
    );

    if (this.addedColors.length > 0) {
      project.colors = [...project.colors, ...this.addedColors];
    }

    return { ...state, project: { ...project, autoConnections } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const autoConnections = (project.autoConnections ?? []).map((ac) =>
      ac.id === this.autoConnectionId ? restoreAutoConnection(this.previousState) : ac
    );

    if (this.addedColors.length > 0) {
      project.colors = project.colors.slice(0, -this.addedColors.length);
    }

    return { ...state, project: { ...project, autoConnections } };
  }
}
