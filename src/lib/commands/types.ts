import type { Project, Dot, Connection } from "../project";

export interface SelectionState {
  selectedDotIds: string[];
  selectedConnectionIds: string[];
  selectedGroupIds: string[];
}

export interface HistoryState {
  project: Project;
  activeFrameIndex: number;
}

export interface Command {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly timestamp: number;
  execute(state: HistoryState): HistoryState;
  undo(state: HistoryState): HistoryState;
}

export interface HistoryManager {
  past: Command[];
  future: Command[];
  batchGroup: Command[] | null;
  batchLabel: string | null;
}

export const MAX_HISTORY_SIZE = 500;

export const createHistoryManager = (): HistoryManager => ({
  past: [],
  future: [],
  batchGroup: null,
  batchLabel: null,
});

export type DotSnapshot = {
  id: string;
  x: number;
  y: number;
  color: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
};

export type ConnectionSnapshot = {
  id: string;
  from: string;
  to: string;
  color: number;
  order: number;
  revealDuration?: number;
};

export const snapshotDot = (dot: Dot): DotSnapshot => ({
  id: dot.id,
  x: dot.x,
  y: dot.y,
  color: dot.color,
  fadeInDuration: dot.fadeInDuration,
  fadeOutDuration: dot.fadeOutDuration,
});

export const snapshotConnection = (conn: Connection): ConnectionSnapshot => ({
  id: conn.id,
  from: conn.from,
  to: conn.to,
  color: conn.color,
  order: conn.order,
  revealDuration: conn.revealDuration,
});

export const restoreDot = (snapshot: DotSnapshot): Dot => {
  const dot: Dot = {
    id: snapshot.id,
    x: snapshot.x,
    y: snapshot.y,
    color: snapshot.color,
  };
  if (snapshot.fadeInDuration !== undefined) {
    dot.fadeInDuration = snapshot.fadeInDuration;
  }
  if (snapshot.fadeOutDuration !== undefined) {
    dot.fadeOutDuration = snapshot.fadeOutDuration;
  }
  return dot;
};

export const restoreConnection = (snapshot: ConnectionSnapshot): Connection => {
  const conn: Connection = {
    id: snapshot.id,
    from: snapshot.from,
    to: snapshot.to,
    color: snapshot.color,
    order: snapshot.order,
  };
  if (snapshot.revealDuration !== undefined) {
    conn.revealDuration = snapshot.revealDuration;
  }
  return conn;
};
