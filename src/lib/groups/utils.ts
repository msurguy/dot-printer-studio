import type { Dot, Group } from "../project";
import { DEFAULT_GROUP_COLORS } from "../constants";

export const findGroupForDot = (
  dotId: string,
  groups: Group[]
): Group | undefined => {
  return groups.find((g) => g.dotIds.includes(dotId));
};

export const findGroupForConnection = (
  connectionId: string,
  groups: Group[]
): Group | undefined => {
  return groups.find((g) => g.connectionIds.includes(connectionId));
};

export const findGroupById = (
  groupId: string,
  groups: Group[]
): Group | undefined => {
  return groups.find((g) => g.id === groupId);
};

export const getGroupMembers = (
  group: Group
): { dotIds: string[]; connectionIds: string[] } => ({
  dotIds: [...group.dotIds],
  connectionIds: [...group.connectionIds],
});

export interface GroupBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const getGroupBounds = (
  group: Group,
  dots: Dot[]
): GroupBounds | null => {
  const dotMap = new Map(dots.map((d) => [d.id, d]));
  const groupDots = group.dotIds
    .map((id) => dotMap.get(id))
    .filter((d): d is Dot => d !== undefined);

  if (groupDots.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const dot of groupDots) {
    minX = Math.min(minX, dot.x);
    minY = Math.min(minY, dot.y);
    maxX = Math.max(maxX, dot.x);
    maxY = Math.max(maxY, dot.y);
  }

  return { minX, minY, maxX, maxY };
};

export const removeDotsFromAllGroups = (
  dotIds: string[],
  groups: Group[]
): Group[] => {
  const idsToRemove = new Set(dotIds);
  return groups.map((group) => ({
    ...group,
    dotIds: group.dotIds.filter((id) => !idsToRemove.has(id)),
  }));
};

export const removeConnectionsFromAllGroups = (
  connectionIds: string[],
  groups: Group[]
): Group[] => {
  const idsToRemove = new Set(connectionIds);
  return groups.map((group) => ({
    ...group,
    connectionIds: group.connectionIds.filter((id) => !idsToRemove.has(id)),
  }));
};

export const removeElementsFromAllGroups = (
  dotIds: string[],
  connectionIds: string[],
  groups: Group[]
): Group[] => {
  const dotsToRemove = new Set(dotIds);
  const connsToRemove = new Set(connectionIds);
  return groups.map((group) => ({
    ...group,
    dotIds: group.dotIds.filter((id) => !dotsToRemove.has(id)),
    connectionIds: group.connectionIds.filter((id) => !connsToRemove.has(id)),
  }));
};

export const getNextGroupColor = (groups: Group[]): string => {
  const usedColors = new Set(groups.map((g) => g.color));
  for (const color of DEFAULT_GROUP_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }
  // If all colors used, cycle back
  return DEFAULT_GROUP_COLORS[groups.length % DEFAULT_GROUP_COLORS.length];
};

export const getNextGroupName = (groups: Group[]): string => {
  const existingNumbers = groups
    .map((g) => {
      const match = g.name.match(/^Group\s*(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  return `Group ${maxNumber + 1}`;
};

export const isGroupEmpty = (group: Group): boolean => {
  return group.dotIds.length === 0 && group.connectionIds.length === 0;
};

export const cleanupEmptyGroups = (groups: Group[]): Group[] => {
  return groups.filter((g) => !isGroupEmpty(g));
};
