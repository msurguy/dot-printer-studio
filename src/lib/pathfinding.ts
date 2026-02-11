/**
 * A* pathfinding algorithm for grid-based movement
 */

export interface GridPosition {
  x: number;
  y: number;
}

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to end)
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

const createPositionKey = (x: number, y: number): string => `${x}:${y}`;

// Diagonal distance constant (√2)
const SQRT2 = Math.SQRT2;

/**
 * Octile distance heuristic for 8-directional movement.
 * This is admissible and consistent for grids with diagonal movement.
 */
const octileDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  // Cost is: straight moves + (diagonal cost - straight cost) * diagonal moves
  // = max(dx, dy) + (√2 - 1) * min(dx, dy)
  return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
};

// 8-directional movement (including diagonals)
const DIRECTIONS = [
  { dx: 0, dy: -1, cost: 1 }, // up
  { dx: 1, dy: -1, cost: SQRT2 }, // up-right (diagonal)
  { dx: 1, dy: 0, cost: 1 }, // right
  { dx: 1, dy: 1, cost: SQRT2 }, // down-right (diagonal)
  { dx: 0, dy: 1, cost: 1 }, // down
  { dx: -1, dy: 1, cost: SQRT2 }, // down-left (diagonal)
  { dx: -1, dy: 0, cost: 1 }, // left
  { dx: -1, dy: -1, cost: SQRT2 }, // up-left (diagonal)
];

/**
 * Find the shortest path between two grid positions using A* algorithm.
 * Returns an array of positions from start to end, or null if no path exists.
 *
 * @param start - Starting grid position
 * @param end - Ending grid position
 * @param gridSize - Size of the grid (gridSize x gridSize)
 * @param obstacles - Set of "x:y" position keys that are blocked
 */
export function findPath(
  start: GridPosition,
  end: GridPosition,
  gridSize: number,
  obstacles: Set<string>
): GridPosition[] | null {
  // If start equals end, return single point
  if (start.x === end.x && start.y === end.y) {
    return [{ x: start.x, y: start.y }];
  }

  const startKey = createPositionKey(start.x, start.y);
  const endKey = createPositionKey(end.x, end.y);

  // Create working obstacle set that excludes start and end
  const workingObstacles = new Set(obstacles);
  workingObstacles.delete(startKey);
  workingObstacles.delete(endKey);

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  // Initialize start node
  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: octileDistance(start.x, start.y, end.x, end.y),
    f: octileDistance(start.x, start.y, end.x, end.y),
    parent: null,
  };
  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f score
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    const current = openSet[lowestIndex];
    const currentKey = createPositionKey(current.x, current.y);

    // Check if we reached the end
    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path: GridPosition[] = [];
      let node: PathNode | null = current;
      while (node !== null) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    // Move current from open to closed
    openSet.splice(lowestIndex, 1);
    closedSet.add(currentKey);

    // Check all neighbors
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = createPositionKey(nx, ny);

      // Skip if out of bounds
      if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) {
        continue;
      }

      // Skip if in closed set
      if (closedSet.has(neighborKey)) {
        continue;
      }

      // Skip if obstacle (but not if it's the end position)
      if (workingObstacles.has(neighborKey)) {
        continue;
      }

      // For diagonal moves, check if we can cut the corner
      // (both adjacent cells must be passable to prevent cutting through walls)
      if (dir.dx !== 0 && dir.dy !== 0) {
        const adj1Key = createPositionKey(current.x + dir.dx, current.y);
        const adj2Key = createPositionKey(current.x, current.y + dir.dy);
        if (workingObstacles.has(adj1Key) || workingObstacles.has(adj2Key)) {
          continue; // Can't cut corner - adjacent cells are blocked
        }
      }

      const gScore = current.g + dir.cost;
      const hScore = octileDistance(nx, ny, end.x, end.y);

      // Check if neighbor is in open set
      const existingIndex = openSet.findIndex((n) => n.x === nx && n.y === ny);

      if (existingIndex === -1) {
        // Add new node to open set
        openSet.push({
          x: nx,
          y: ny,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        });
      } else if (gScore < openSet[existingIndex].g) {
        // Update existing node if this path is better
        openSet[existingIndex].g = gScore;
        openSet[existingIndex].f = gScore + hScore;
        openSet[existingIndex].parent = current;
      }
    }
  }

  // No path found
  return null;
}

/**
 * Build a set of obstacle position keys from an array of dots
 */
export function buildObstacleSet(
  dots: Array<{ x: number; y: number }>
): Set<string> {
  const obstacles = new Set<string>();
  for (const dot of dots) {
    obstacles.add(createPositionKey(dot.x, dot.y));
  }
  return obstacles;
}

/**
 * Calculate total path length using Euclidean distance for accurate diagonal support
 */
export function calculatePathLength(path: GridPosition[]): number {
  if (path.length < 2) return 0;
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    // Euclidean distance: diagonal = √2, straight = 1
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}
