import type { Command, HistoryState, DotSnapshot, ConnectionSnapshot } from "./types";
import { snapshotDot, snapshotConnection, restoreDot, restoreConnection } from "./types";
import { makeId, type Group, type GroupAnimationOverrides } from "../project";
import { snapshotGroup, restoreGroup, type GroupSnapshot } from "../groups/types";
import { removeDotsFromAllGroups, removeConnectionsFromAllGroups } from "../groups/utils";

export class CreateGroupCommand implements Command {
  readonly id: string;
  readonly type = "CREATE_GROUP";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly group: GroupSnapshot;
  readonly previousGroups: GroupSnapshot[];

  constructor(
    frameIndex: number,
    dotIds: string[],
    connectionIds: string[],
    name: string,
    color: string,
    currentGroups: Group[] = []
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.group = {
      id: makeId(),
      name,
      color,
      dotIds: [...dotIds],
      connectionIds: [...connectionIds],
      visible: true,
      locked: false,
    };
    this.previousGroups = currentGroups.map(snapshotGroup);
    this.label = "Create group";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    // First, remove these dots/connections from any existing groups
    let updatedGroups = removeDotsFromAllGroups(this.group.dotIds, frame.groups);
    updatedGroups = removeConnectionsFromAllGroups(this.group.connectionIds, updatedGroups);

    // Then add the new group
    frame.groups = [...updatedGroups, restoreGroup(this.group)];
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    // Restore the previous groups state (before the new group was created)
    frame.groups = this.previousGroups.map(restoreGroup);
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class UngroupCommand implements Command {
  readonly id: string;
  readonly type = "UNGROUP";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly removedGroup: GroupSnapshot;

  constructor(frameIndex: number, group: Group) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.removedGroup = snapshotGroup(group);
    this.label = `Ungroup "${group.name}"`;
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = frame.groups.filter((g) => g.id !== this.removedGroup.id);
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = [...frame.groups, restoreGroup(this.removedGroup)];
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class DeleteGroupCommand implements Command {
  readonly id: string;
  readonly type = "DELETE_GROUP";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly removedGroup: GroupSnapshot;
  readonly removedDots: DotSnapshot[];
  readonly removedConnections: ConnectionSnapshot[];

  constructor(
    frameIndex: number,
    group: Group,
    dots: import("../project").Dot[],
    connections: import("../project").Connection[]
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.removedGroup = snapshotGroup(group);
    this.removedDots = dots.map(snapshotDot);
    this.removedConnections = connections.map(snapshotConnection);
    this.label = `Delete group "${group.name}"`;
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const removedDotIds = new Set(this.removedDots.map((d) => d.id));
    const removedConnIds = new Set(this.removedConnections.map((c) => c.id));

    frame.dots = frame.dots.filter((d) => !removedDotIds.has(d.id));
    frame.connections = frame.connections.filter((c) => !removedConnIds.has(c.id));
    frame.groups = frame.groups.filter((g) => g.id !== this.removedGroup.id);
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.dots = [...frame.dots, ...this.removedDots.map(restoreDot)];
    frame.connections = [...frame.connections, ...this.removedConnections.map(restoreConnection)];
    frame.groups = [...frame.groups, restoreGroup(this.removedGroup)];
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class UpdateGroupCommand implements Command {
  readonly id: string;
  readonly type = "UPDATE_GROUP";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly groupId: string;
  readonly before: Partial<Group>;
  readonly after: Partial<Group>;

  constructor(
    frameIndex: number,
    groupId: string,
    before: Partial<Group>,
    after: Partial<Group>,
    label?: string
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.groupId = groupId;
    this.before = before;
    this.after = after;
    this.label = label ?? "Update group";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        return { ...g, ...this.after };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        return { ...g, ...this.before };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class AddToGroupCommand implements Command {
  readonly id: string;
  readonly type = "ADD_TO_GROUP";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly groupId: string;
  readonly addedDotIds: string[];
  readonly addedConnectionIds: string[];

  constructor(
    frameIndex: number,
    groupId: string,
    dotIds: string[],
    connectionIds: string[]
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.groupId = groupId;
    this.addedDotIds = [...dotIds];
    this.addedConnectionIds = [...connectionIds];
    this.label = "Add to group";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        const newDotIds = new Set(g.dotIds);
        const newConnIds = new Set(g.connectionIds);
        this.addedDotIds.forEach((id) => newDotIds.add(id));
        this.addedConnectionIds.forEach((id) => newConnIds.add(id));
        return {
          ...g,
          dotIds: Array.from(newDotIds),
          connectionIds: Array.from(newConnIds),
        };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const dotsToRemove = new Set(this.addedDotIds);
    const connsToRemove = new Set(this.addedConnectionIds);

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        return {
          ...g,
          dotIds: g.dotIds.filter((id) => !dotsToRemove.has(id)),
          connectionIds: g.connectionIds.filter((id) => !connsToRemove.has(id)),
        };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class RemoveFromGroupCommand implements Command {
  readonly id: string;
  readonly type = "REMOVE_FROM_GROUP";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly groupId: string;
  readonly removedDotIds: string[];
  readonly removedConnectionIds: string[];

  constructor(
    frameIndex: number,
    groupId: string,
    dotIds: string[],
    connectionIds: string[]
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.groupId = groupId;
    this.removedDotIds = [...dotIds];
    this.removedConnectionIds = [...connectionIds];
    this.label = "Remove from group";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    const dotsToRemove = new Set(this.removedDotIds);
    const connsToRemove = new Set(this.removedConnectionIds);

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        return {
          ...g,
          dotIds: g.dotIds.filter((id) => !dotsToRemove.has(id)),
          connectionIds: g.connectionIds.filter((id) => !connsToRemove.has(id)),
        };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        const newDotIds = new Set(g.dotIds);
        const newConnIds = new Set(g.connectionIds);
        this.removedDotIds.forEach((id) => newDotIds.add(id));
        this.removedConnectionIds.forEach((id) => newConnIds.add(id));
        return {
          ...g,
          dotIds: Array.from(newDotIds),
          connectionIds: Array.from(newConnIds),
        };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}

export class SetGroupAnimationCommand implements Command {
  readonly id: string;
  readonly type = "SET_GROUP_ANIMATION";
  readonly label: string;
  readonly timestamp: number;
  readonly frameIndex: number;
  readonly groupId: string;
  readonly before: GroupAnimationOverrides | undefined;
  readonly after: GroupAnimationOverrides | undefined;

  constructor(
    frameIndex: number,
    groupId: string,
    before: GroupAnimationOverrides | undefined,
    after: GroupAnimationOverrides | undefined
  ) {
    this.id = makeId();
    this.timestamp = Date.now();
    this.frameIndex = frameIndex;
    this.groupId = groupId;
    this.before = before ? { ...before } : undefined;
    this.after = after ? { ...after } : undefined;
    this.label = after ? "Set group animation" : "Clear group animation";
  }

  execute(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        return { ...g, animationOverrides: this.after };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }

  undo(state: HistoryState): HistoryState {
    const project = { ...state.project };
    const frames = [...project.frames];
    const frame = { ...frames[this.frameIndex] };

    frame.groups = frame.groups.map((g) => {
      if (g.id === this.groupId) {
        return { ...g, animationOverrides: this.before };
      }
      return g;
    });
    frames[this.frameIndex] = frame;

    return { ...state, project: { ...project, frames } };
  }
}
