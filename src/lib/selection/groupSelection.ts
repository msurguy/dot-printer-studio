import type { Group } from "../project";

/**
 * Find the group that contains a specific dot
 */
export const findGroupContainingDot = (
  dotId: string,
  groups: Group[]
): Group | undefined => {
  return groups.find((g) => g.dotIds.includes(dotId));
};

/**
 * Find the group that contains a specific connection
 */
export const findGroupContainingConnection = (
  connectionId: string,
  groups: Group[]
): Group | undefined => {
  return groups.find((g) => g.connectionIds.includes(connectionId));
};

/**
 * Expand selection to include all members of groups that contain any selected dot
 * Returns the expanded dot/connection IDs and the group IDs
 */
export const expandSelectionToGroups = (
  selectedDotIds: string[],
  selectedConnectionIds: string[],
  groups: Group[]
): {
  dotIds: string[];
  connectionIds: string[];
  groupIds: string[];
} => {
  const dotIdSet = new Set(selectedDotIds);
  const connIdSet = new Set(selectedConnectionIds);
  const groupIdSet = new Set<string>();

  // Find all groups that contain any selected element
  for (const group of groups) {
    const hasSelectedDot = group.dotIds.some((id) => dotIdSet.has(id));
    const hasSelectedConn = group.connectionIds.some((id) => connIdSet.has(id));

    if (hasSelectedDot || hasSelectedConn) {
      groupIdSet.add(group.id);
      // Add all group members to selection
      group.dotIds.forEach((id) => dotIdSet.add(id));
      group.connectionIds.forEach((id) => connIdSet.add(id));
    }
  }

  return {
    dotIds: Array.from(dotIdSet),
    connectionIds: Array.from(connIdSet),
    groupIds: Array.from(groupIdSet),
  };
};

/**
 * Get all groups that have at least one selected member
 */
export const getGroupsContainingSelection = (
  selectedDotIds: string[],
  selectedConnectionIds: string[],
  groups: Group[]
): Group[] => {
  const dotIdSet = new Set(selectedDotIds);
  const connIdSet = new Set(selectedConnectionIds);

  return groups.filter((group) => {
    const hasSelectedDot = group.dotIds.some((id) => dotIdSet.has(id));
    const hasSelectedConn = group.connectionIds.some((id) => connIdSet.has(id));
    return hasSelectedDot || hasSelectedConn;
  });
};

/**
 * Get all members of selected groups
 */
export const getGroupMembersFromSelection = (
  selectedGroupIds: string[],
  groups: Group[]
): {
  dotIds: string[];
  connectionIds: string[];
} => {
  const dotIds: string[] = [];
  const connectionIds: string[] = [];
  const groupIdSet = new Set(selectedGroupIds);

  for (const group of groups) {
    if (groupIdSet.has(group.id)) {
      dotIds.push(...group.dotIds);
      connectionIds.push(...group.connectionIds);
    }
  }

  return {
    dotIds: [...new Set(dotIds)],
    connectionIds: [...new Set(connectionIds)],
  };
};

/**
 * Check if all members of a group are selected
 */
export const isGroupFullySelected = (
  group: Group,
  selectedDotIds: string[],
  selectedConnectionIds: string[]
): boolean => {
  const dotIdSet = new Set(selectedDotIds);
  const connIdSet = new Set(selectedConnectionIds);

  const allDotsSelected = group.dotIds.every((id) => dotIdSet.has(id));
  const allConnsSelected = group.connectionIds.every((id) => connIdSet.has(id));

  return allDotsSelected && allConnsSelected;
};

/**
 * Check if any member of a group is selected
 */
export const isGroupPartiallySelected = (
  group: Group,
  selectedDotIds: string[],
  selectedConnectionIds: string[]
): boolean => {
  const dotIdSet = new Set(selectedDotIds);
  const connIdSet = new Set(selectedConnectionIds);

  const hasSelectedDot = group.dotIds.some((id) => dotIdSet.has(id));
  const hasSelectedConn = group.connectionIds.some((id) => connIdSet.has(id));

  return hasSelectedDot || hasSelectedConn;
};
