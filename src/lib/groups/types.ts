import type { Group, GroupAnimationOverrides } from "../project";

export type GroupSnapshot = {
  id: string;
  name: string;
  color: string;
  dotIds: string[];
  connectionIds: string[];
  visible: boolean;
  locked: boolean;
  animationOverrides?: GroupAnimationOverrides;
};

export const snapshotGroup = (group: Group): GroupSnapshot => ({
  id: group.id,
  name: group.name,
  color: group.color,
  dotIds: [...group.dotIds],
  connectionIds: [...group.connectionIds],
  visible: group.visible,
  locked: group.locked,
  animationOverrides: group.animationOverrides
    ? { ...group.animationOverrides }
    : undefined,
});

export const restoreGroup = (snapshot: GroupSnapshot): Group => ({
  id: snapshot.id,
  name: snapshot.name,
  color: snapshot.color,
  dotIds: [...snapshot.dotIds],
  connectionIds: [...snapshot.connectionIds],
  visible: snapshot.visible,
  locked: snapshot.locked,
  animationOverrides: snapshot.animationOverrides
    ? { ...snapshot.animationOverrides }
    : undefined,
});
