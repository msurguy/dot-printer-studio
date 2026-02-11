import type { Connection } from "../project";

export const reverseConnectionOrder = (connections: Connection[]): Connection[] => {
  if (connections.length === 0) return [];

  const maxOrder = Math.max(...connections.map((c) => c.order));
  return connections.map((conn) => ({
    ...conn,
    order: maxOrder - conn.order,
  }));
};

export const swapConnectionDirection = (connections: Connection[]): Connection[] => {
  return connections.map((conn) => ({
    ...conn,
    from: conn.to,
    to: conn.from,
  }));
};

export const reorderConnections = (
  connections: Connection[],
  newOrderIds: string[]
): Connection[] => {
  const orderMap = new Map(newOrderIds.map((id, index) => [id, index]));

  return connections.map((conn) => {
    const newOrder = orderMap.get(conn.id);
    if (newOrder !== undefined) {
      return { ...conn, order: newOrder };
    }
    return conn;
  });
};

export const moveConnectionsToFront = (
  allConnections: Connection[],
  connectionIds: string[]
): Connection[] => {
  const idsToMove = new Set(connectionIds);
  const maxOrder = Math.max(...allConnections.map((c) => c.order), -1);

  let nextOrder = maxOrder + 1;
  return allConnections.map((conn) => {
    if (idsToMove.has(conn.id)) {
      return { ...conn, order: nextOrder++ };
    }
    return conn;
  });
};

export const moveConnectionsToBack = (
  allConnections: Connection[],
  connectionIds: string[]
): Connection[] => {
  const idsToMove = new Set(connectionIds);
  const moveCount = connectionIds.length;

  let backOrder = 0;
  return allConnections.map((conn) => {
    if (idsToMove.has(conn.id)) {
      return { ...conn, order: backOrder++ };
    }
    return { ...conn, order: conn.order + moveCount };
  });
};

export const normalizeConnectionOrder = (connections: Connection[]): Connection[] => {
  const sorted = [...connections].sort((a, b) => a.order - b.order);
  return sorted.map((conn, index) => ({
    ...conn,
    order: index,
  }));
};
