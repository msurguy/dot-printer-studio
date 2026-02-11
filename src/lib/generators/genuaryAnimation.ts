/**
 * Genuary Animation Generator
 *
 * Creates a circuit-board style animation that writes "GENUARY"
 * with traces, nodes, and generative patterns.
 */

import type {
  DotPlayerData,
  DotPlayerFrame,
  DotPlayerDot,
  DotPlayerConnection,
} from "../../player/types";

// ============================================================================
// Configuration
// ============================================================================

interface GeneratorConfig {
  gridSize: number;
  centerX: number;
  centerY: number;
  letterSpacing: number;
  dotColor: number; // color index
  traceColor: number; // color index
  nodeColor: number; // color index
  accentColor: number; // color index
}

const DEFAULT_CONFIG: GeneratorConfig = {
  gridSize: 60,
  centerX: 30,
  centerY: 30,
  letterSpacing: 6,
  dotColor: 1, // teal
  traceColor: 2, // orange
  nodeColor: 3, // red
  accentColor: 4, // yellow
};

// ============================================================================
// Letter Definitions (5x7 grid per letter, circuit-board style)
// ============================================================================

type LetterDef = { dots: [number, number][]; connections: [number, number][] };

function defineLetters(): Record<string, LetterDef> {
  // Each letter is defined on a 5-wide x 7-tall grid
  // dots are [x, y] offsets, connections are [dotIndex1, dotIndex2]

  const G: LetterDef = {
    dots: [
      [1, 0],
      [2, 0],
      [3, 0], // top
      [0, 1],
      [4, 1], // sides
      [0, 2], // left
      [0, 3],
      [2, 3],
      [3, 3],
      [4, 3], // middle + right
      [0, 4],
      [4, 4], // sides
      [0, 5],
      [4, 5], // sides
      [1, 6],
      [2, 6],
      [3, 6], // bottom
    ],
    connections: [
      [0, 1],
      [1, 2], // top line
      [0, 3],
      [2, 4], // top corners
      [3, 5], // left side
      [5, 6],
      [7, 8],
      [8, 9], // middle bar
      [6, 10],
      [9, 11], // middle to sides
      [10, 12],
      [11, 13], // lower sides
      [12, 14],
      [14, 15],
      [15, 16],
      [16, 13], // bottom
    ],
  };

  const E: LetterDef = {
    dots: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0], // top
      [0, 1], // left
      [0, 2], // left
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3], // middle
      [0, 4], // left
      [0, 5], // left
      [0, 6],
      [1, 6],
      [2, 6],
      [3, 6],
      [4, 6], // bottom
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // top
      [0, 5],
      [5, 6],
      [6, 7], // upper left
      [7, 8],
      [8, 9],
      [9, 10], // middle
      [7, 11],
      [11, 12],
      [12, 13], // lower left
      [13, 14],
      [14, 15],
      [15, 16],
      [16, 17], // bottom
    ],
  };

  const N: LetterDef = {
    // N: two vertical strokes with a diagonal from top-left to bottom-right
    dots: [
      // Left vertical stroke
      [0, 0], // 0: top-left
      [0, 1], // 1
      [0, 2], // 2
      [0, 3], // 3
      [0, 4], // 4
      [0, 5], // 5
      [0, 6], // 6: bottom-left
      // Right vertical stroke
      [4, 0], // 7: top-right
      [4, 1], // 8
      [4, 2], // 9
      [4, 3], // 10
      [4, 4], // 11
      [4, 5], // 12
      [4, 6], // 13: bottom-right
      // Diagonal dots (from top-left toward bottom-right)
      [1, 1], // 14
      [2, 3], // 15
      [3, 5], // 16
    ],
    connections: [
      // Left vertical
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      // Right vertical
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      // Diagonal from top-left to bottom-right with intermediate dots
      [0, 14],
      [14, 15],
      [15, 16],
      [16, 13],
    ],
  };

  const U: LetterDef = {
    dots: [
      [0, 0],
      [4, 0], // top
      [0, 1],
      [4, 1], // upper
      [0, 2],
      [4, 2], // mid
      [0, 3],
      [4, 3], // mid
      [0, 4],
      [4, 4], // lower
      [0, 5],
      [4, 5], // lower
      [1, 6],
      [2, 6],
      [3, 6], // bottom
    ],
    connections: [
      [0, 2],
      [1, 3], // top to upper
      [2, 4],
      [3, 5], // upper to mid
      [4, 6],
      [5, 7], // mid
      [6, 8],
      [7, 9], // mid to lower
      [8, 10],
      [9, 11], // lower
      [10, 12],
      [12, 13],
      [13, 14],
      [14, 11], // bottom curve
    ],
  };

  const A: LetterDef = {
    dots: [
      [2, 0], // top peak
      [1, 1],
      [3, 1], // upper
      [0, 2],
      [4, 2], // upper sides
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3], // middle bar
      [0, 4],
      [4, 4], // lower
      [0, 5],
      [4, 5], // lower
      [0, 6],
      [4, 6], // bottom
    ],
    connections: [
      [0, 1],
      [0, 2], // peak to upper
      [1, 3],
      [2, 4], // upper to sides
      [3, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [4, 9], // middle bar
      [5, 10],
      [9, 11], // mid to lower
      [10, 12],
      [11, 13], // lower
      [12, 14],
      [13, 15], // bottom
    ],
  };

  const R: LetterDef = {
    dots: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0], // top
      [0, 1],
      [4, 1], // upper sides
      [0, 2],
      [4, 2], // upper-mid
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3], // middle bar
      [0, 4],
      [2, 4], // lower-mid
      [0, 5],
      [3, 5], // lower
      [0, 6],
      [4, 6], // bottom
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3], // top
      [0, 4],
      [3, 5], // top corners
      [4, 6],
      [5, 7], // upper sides
      [6, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [7, 11], // middle bar
      [8, 12],
      [10, 13], // lower connections
      [12, 14],
      [13, 15], // lower
      [14, 16],
      [15, 17], // bottom
    ],
  };

  const Y: LetterDef = {
    dots: [
      [0, 0],
      [4, 0], // top
      [0, 1],
      [4, 1], // upper
      [1, 2],
      [3, 2], // converging
      [2, 3], // center
      [2, 4], // center
      [2, 5], // center
      [2, 6], // bottom
    ],
    connections: [
      [0, 2],
      [1, 3], // top to upper
      [2, 4],
      [3, 5], // upper to converging
      [4, 6],
      [5, 6], // converging to center
      [6, 7],
      [7, 8],
      [8, 9], // stem
    ],
  };

  return { G, E, N, U, A, R, Y };
}

// ============================================================================
// Utility Functions
// ============================================================================

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function resetIdCounter(): void {
  idCounter = 0;
}

// Pseudo-random with seed for reproducibility
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// ============================================================================
// Circuit Board Pattern Generators
// ============================================================================

interface CircuitNode {
  x: number;
  y: number;
  type: "junction" | "endpoint" | "via";
}

function generateCircuitTraces(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  random: () => number,
  gridSize: number
): CircuitNode[] {
  // Generate a circuit-board style path between two points
  // Uses only horizontal and vertical segments with 90-degree turns
  const nodes: CircuitNode[] = [];
  let currentX = startX;
  let currentY = startY;

  nodes.push({ x: currentX, y: currentY, type: "junction" });

  // Decide routing strategy
  const goHorizontalFirst = random() > 0.5;
  const addMidpoint = random() > 0.3;

  if (addMidpoint && Math.abs(endX - startX) > 3 && Math.abs(endY - startY) > 3) {
    // Add intermediate waypoint for more complex routing
    const midX = Math.round(startX + (endX - startX) * (0.3 + random() * 0.4));
    const midY = Math.round(startY + (endY - startY) * (0.3 + random() * 0.4));

    // Clamp to grid
    const clampedMidX = Math.max(1, Math.min(gridSize - 2, midX));
    const clampedMidY = Math.max(1, Math.min(gridSize - 2, midY));

    if (goHorizontalFirst) {
      nodes.push({ x: clampedMidX, y: currentY, type: "via" });
      currentX = clampedMidX;
      nodes.push({ x: currentX, y: clampedMidY, type: "via" });
      currentY = clampedMidY;
    } else {
      nodes.push({ x: currentX, y: clampedMidY, type: "via" });
      currentY = clampedMidY;
      nodes.push({ x: clampedMidX, y: currentY, type: "via" });
      currentX = clampedMidX;
    }
  }

  // Final approach to endpoint
  if (goHorizontalFirst) {
    if (currentX !== endX) {
      nodes.push({ x: endX, y: currentY, type: "via" });
    }
    if (currentY !== endY) {
      nodes.push({ x: endX, y: endY, type: "endpoint" });
    }
  } else {
    if (currentY !== endY) {
      nodes.push({ x: currentX, y: endY, type: "via" });
    }
    if (currentX !== endX) {
      nodes.push({ x: endX, y: endY, type: "endpoint" });
    }
  }

  // Ensure we end at the destination
  const last = nodes[nodes.length - 1];
  if (last.x !== endX || last.y !== endY) {
    nodes.push({ x: endX, y: endY, type: "endpoint" });
  }

  return nodes;
}

function generateDecorativeTraces(
  centerX: number,
  centerY: number,
  gridSize: number,
  random: () => number
): { dots: DotPlayerDot[]; connections: DotPlayerConnection[] } {
  const dots: DotPlayerDot[] = [];
  const connections: DotPlayerConnection[] = [];

  // Generate traces emanating from corners and edges
  const corners = [
    { x: 2, y: 2 },
    { x: gridSize - 3, y: 2 },
    { x: 2, y: gridSize - 3 },
    { x: gridSize - 3, y: gridSize - 3 },
  ];

  corners.forEach((corner, cornerIdx) => {
    // Create 2-4 traces from each corner
    const numTraces = 2 + Math.floor(random() * 3);

    for (let t = 0; t < numTraces; t++) {
      const traceLength = 3 + Math.floor(random() * 6);
      let x = corner.x;
      let y = corner.y;

      // Direction towards center
      const dirX = centerX > corner.x ? 1 : -1;
      const dirY = centerY > corner.y ? 1 : -1;

      const traceDots: DotPlayerDot[] = [];

      for (let i = 0; i < traceLength; i++) {
        const dot: DotPlayerDot = {
          id: generateId("deco"),
          x,
          y,
          color: random() > 0.7 ? 4 : 2, // yellow or orange
        };
        traceDots.push(dot);
        dots.push(dot);

        // Move in circuit-board fashion (orthogonal only)
        if (random() > 0.5) {
          x += dirX * (1 + Math.floor(random() * 2));
        } else {
          y += dirY * (1 + Math.floor(random() * 2));
        }

        // Clamp to grid
        x = Math.max(1, Math.min(gridSize - 2, x));
        y = Math.max(1, Math.min(gridSize - 2, y));
      }

      // Connect trace dots
      for (let i = 0; i < traceDots.length - 1; i++) {
        connections.push({
          id: generateId("deco_conn"),
          from: traceDots[i].id,
          to: traceDots[i + 1].id,
          color: 2,
          order: cornerIdx * 100 + t * 10 + i,
        });
      }
    }
  });

  return { dots, connections };
}

// ============================================================================
// Letter Rendering
// ============================================================================

function renderLetter(
  letter: string,
  offsetX: number,
  offsetY: number,
  letterDefs: Record<string, LetterDef>,
  config: GeneratorConfig
): { dots: DotPlayerDot[]; connections: DotPlayerConnection[] } {
  const def = letterDefs[letter];
  if (!def) return { dots: [], connections: [] };

  const dots: DotPlayerDot[] = def.dots.map(([dx, dy], idx) => ({
    id: generateId(`${letter}_dot`),
    x: offsetX + dx,
    y: offsetY + dy,
    color: config.dotColor,
  }));

  const connections: DotPlayerConnection[] = def.connections.map(
    ([fromIdx, toIdx], idx) => ({
      id: generateId(`${letter}_conn`),
      from: dots[fromIdx].id,
      to: dots[toIdx].id,
      color: config.traceColor,
      order: idx,
    })
  );

  return { dots, connections };
}

function renderWord(
  word: string,
  centerX: number,
  centerY: number,
  letterDefs: Record<string, LetterDef>,
  config: GeneratorConfig
): { dots: DotPlayerDot[]; connections: DotPlayerConnection[] } {
  const letterWidth = 5;
  const totalWidth = word.length * letterWidth + (word.length - 1) * (config.letterSpacing - letterWidth);
  const startX = Math.round(centerX - totalWidth / 2);
  const startY = Math.round(centerY - 3); // 7-tall letters, center vertically

  const allDots: DotPlayerDot[] = [];
  const allConnections: DotPlayerConnection[] = [];

  let currentX = startX;

  for (const letter of word) {
    const { dots, connections } = renderLetter(
      letter,
      currentX,
      startY,
      letterDefs,
      config
    );
    allDots.push(...dots);

    // Adjust connection orders to be sequential
    connections.forEach((conn) => {
      conn.order += allConnections.length;
    });
    allConnections.push(...connections);

    currentX += config.letterSpacing;
  }

  return { dots: allDots, connections: allConnections };
}

// ============================================================================
// Frame Generators
// ============================================================================

function createBaseFrame(name: string): DotPlayerFrame {
  return {
    id: generateId("frame"),
    name,
    dots: [],
    connections: [],
    groups: [],
    duration: 2000,
    easing: "easeInOut",
    dotFadeInDuration: 300,
    dotFadeOutDuration: 300,
    dotColorTransitionDuration: 240,
    dotColorTransitionEasing: "easeInOut",
    connectionAnimationDuration: 400,
    connectionStagger: 30,
    dotStagger: 15,
    animateDots: true,
    animateConnections: true,
  };
}

function generateFrame1_CircuitBackground(
  config: GeneratorConfig,
  random: () => number
): DotPlayerFrame {
  const frame = createBaseFrame("Circuit Background");
  frame.duration = 2500;
  frame.connectionAnimationDuration = 300;
  frame.connectionStagger = 20;

  // Generate decorative circuit traces in corners
  const { dots, connections } = generateDecorativeTraces(
    config.centerX,
    config.centerY,
    config.gridSize,
    random
  );

  frame.dots = dots;
  frame.connections = connections;

  return frame;
}

function generateFrame2_LetterNodes(
  config: GeneratorConfig,
  letterDefs: Record<string, LetterDef>,
  random: () => number
): DotPlayerFrame {
  const frame = createBaseFrame("Letter Nodes Appear");
  frame.duration = 1800;
  frame.dotStagger = 25;
  frame.animateConnections = false;

  // Get word dots (just the dots, no connections yet)
  const { dots } = renderWord(
    "GENUARY",
    config.centerX,
    config.centerY,
    letterDefs,
    config
  );

  // Add some decorative background dots
  const { dots: bgDots } = generateDecorativeTraces(
    config.centerX,
    config.centerY,
    config.gridSize,
    random
  );

  frame.dots = [...bgDots, ...dots];

  return frame;
}

function generateFrame3_LettersTrace(
  config: GeneratorConfig,
  letterDefs: Record<string, LetterDef>,
  random: () => number
): DotPlayerFrame {
  const frame = createBaseFrame("Letters Trace");
  frame.duration = 4000;
  frame.connectionAnimationDuration = 200;
  frame.connectionStagger = 15;

  // Get complete word with connections
  const { dots, connections } = renderWord(
    "GENUARY",
    config.centerX,
    config.centerY,
    letterDefs,
    config
  );

  // Add decorative background
  const { dots: bgDots, connections: bgConns } = generateDecorativeTraces(
    config.centerX,
    config.centerY,
    config.gridSize,
    random
  );

  frame.dots = [...bgDots, ...dots];
  frame.connections = [...bgConns, ...connections];

  return frame;
}

function generateFrame4_CircuitExpansion(
  config: GeneratorConfig,
  letterDefs: Record<string, LetterDef>,
  random: () => number
): DotPlayerFrame {
  const frame = createBaseFrame("Circuit Expansion");
  frame.duration = 4500;
  frame.connectionAnimationDuration = 180;
  frame.connectionStagger = 12;

  // Get complete word
  const { dots: wordDots, connections: wordConns } = renderWord(
    "GENUARY",
    config.centerX,
    config.centerY,
    letterDefs,
    config
  );

  // Enhanced decorative traces
  const { dots: bgDots, connections: bgConns } = generateDecorativeTraces(
    config.centerX,
    config.centerY,
    config.gridSize,
    random
  );

  const extraDots: DotPlayerDot[] = [];
  const extraConns: DotPlayerConnection[] = [];
  let connectionOrder = bgConns.length + wordConns.length;

  // 1. Many extension traces from letter dots
  const extensionPoints = wordDots.filter(() => random() > 0.7);

  extensionPoints.forEach((startDot) => {
    const dirX = startDot.x < config.centerX ? -1 : 1;
    const dirY = startDot.y < config.centerY ? -1 : 1;

    let x = startDot.x + dirX * 2;
    let y = startDot.y;

    const traceDots: DotPlayerDot[] = [];
    const traceLength = 4 + Math.floor(random() * 5);

    for (let i = 0; i < traceLength; i++) {
      x = Math.max(1, Math.min(config.gridSize - 2, x));
      y = Math.max(1, Math.min(config.gridSize - 2, y));

      const dot: DotPlayerDot = {
        id: generateId("ext"),
        x,
        y,
        color: random() > 0.5 ? 4 : 2,
      };
      traceDots.push(dot);
      extraDots.push(dot);

      // Add branches occasionally
      if (random() > 0.75 && i > 1) {
        const branchLength = 2 + Math.floor(random() * 3);
        let bx = x;
        let by = y;
        const branchDots: DotPlayerDot[] = [];

        for (let b = 0; b < branchLength; b++) {
          if (random() > 0.5) {
            bx += (random() > 0.5 ? 1 : -1) * 2;
          } else {
            by += (random() > 0.5 ? 1 : -1) * 2;
          }
          bx = Math.max(1, Math.min(config.gridSize - 2, bx));
          by = Math.max(1, Math.min(config.gridSize - 2, by));

          const branchDot: DotPlayerDot = {
            id: generateId("branch"),
            x: bx,
            y: by,
            color: random() > 0.6 ? 5 : 2,
          };
          branchDots.push(branchDot);
          extraDots.push(branchDot);
        }

        // Connect branch
        if (branchDots.length > 0) {
          extraConns.push({
            id: generateId("branch_conn"),
            from: dot.id,
            to: branchDots[0].id,
            color: 2,
            order: connectionOrder++,
          });

          for (let b = 0; b < branchDots.length - 1; b++) {
            extraConns.push({
              id: generateId("branch_conn"),
              from: branchDots[b].id,
              to: branchDots[b + 1].id,
              color: 2,
              order: connectionOrder++,
            });
          }
        }
      }

      if (random() > 0.5) {
        x += dirX * (1 + Math.floor(random() * 2));
      } else {
        y += dirY * (1 + Math.floor(random() * 2));
      }
    }

    if (traceDots.length > 0) {
      extraConns.push({
        id: generateId("ext_conn"),
        from: startDot.id,
        to: traceDots[0].id,
        color: 2,
        order: connectionOrder++,
      });

      for (let i = 0; i < traceDots.length - 1; i++) {
        extraConns.push({
          id: generateId("ext_conn"),
          from: traceDots[i].id,
          to: traceDots[i + 1].id,
          color: 2,
          order: connectionOrder++,
        });
      }
    }
  });

  // 2. Add component-like structures (capacitors, resistors)
  const componentPositions = [
    { x: 8, y: 10 },
    { x: config.gridSize - 10, y: 12 },
    { x: 10, y: config.gridSize - 10 },
    { x: config.gridSize - 8, y: config.gridSize - 12 },
  ];

  componentPositions.forEach((pos) => {
    // Create a capacitor-like double-line pattern
    const compDots: DotPlayerDot[] = [];

    // Two parallel lines
    for (let i = 0; i < 3; i++) {
      compDots.push({
        id: generateId("cap"),
        x: pos.x + i,
        y: pos.y,
        color: 4,
      });
      compDots.push({
        id: generateId("cap"),
        x: pos.x + i,
        y: pos.y + 2,
        color: 4,
      });
    }

    extraDots.push(...compDots);

    // Connect horizontal lines
    for (let i = 0; i < 2; i++) {
      extraConns.push({
        id: generateId("cap_conn"),
        from: compDots[i * 2].id,
        to: compDots[i * 2 + 2].id,
        color: 4,
        order: connectionOrder++,
      });
      extraConns.push({
        id: generateId("cap_conn"),
        from: compDots[i * 2 + 1].id,
        to: compDots[i * 2 + 3].id,
        color: 4,
        order: connectionOrder++,
      });
    }

    // Add lead wires
    const leadIn: DotPlayerDot = {
      id: generateId("lead"),
      x: pos.x - 1,
      y: pos.y + 1,
      color: 2,
    };
    const leadOut: DotPlayerDot = {
      id: generateId("lead"),
      x: pos.x + 3,
      y: pos.y + 1,
      color: 2,
    };
    extraDots.push(leadIn, leadOut);

    extraConns.push({
      id: generateId("lead_conn"),
      from: leadIn.id,
      to: compDots[0].id,
      color: 2,
      order: connectionOrder++,
    });
    extraConns.push({
      id: generateId("lead_conn"),
      from: compDots[4].id,
      to: leadOut.id,
      color: 2,
      order: connectionOrder++,
    });
  });

  // 3. Add junction nodes with multiple connections
  const junctionPositions = [
    { x: 15, y: 8 },
    { x: config.gridSize - 15, y: 10 },
    { x: 12, y: config.gridSize - 8 },
    { x: config.gridSize - 12, y: config.gridSize - 10 },
  ];

  junctionPositions.forEach((pos) => {
    const junction: DotPlayerDot = {
      id: generateId("junction"),
      x: pos.x,
      y: pos.y,
      color: 3,
    };
    extraDots.push(junction);

    // Create 4-6 traces emanating from junction
    const numTraces = 4 + Math.floor(random() * 3);
    const angleStep = (Math.PI * 2) / numTraces;

    for (let i = 0; i < numTraces; i++) {
      const angle = i * angleStep + random() * 0.3;
      const length = 3 + Math.floor(random() * 4);
      let x = pos.x;
      let y = pos.y;
      const traceDots: DotPlayerDot[] = [];

      for (let j = 0; j < length; j++) {
        const dx = Math.round(Math.cos(angle) * (j + 1) * 1.5);
        const dy = Math.round(Math.sin(angle) * (j + 1) * 1.5);
        x = Math.max(1, Math.min(config.gridSize - 2, pos.x + dx));
        y = Math.max(1, Math.min(config.gridSize - 2, pos.y + dy));

        const dot: DotPlayerDot = {
          id: generateId("junction_trace"),
          x,
          y,
          color: random() > 0.7 ? 5 : 2,
        };
        traceDots.push(dot);
        extraDots.push(dot);
      }

      if (traceDots.length > 0) {
        extraConns.push({
          id: generateId("junction_conn"),
          from: junction.id,
          to: traceDots[0].id,
          color: 2,
          order: connectionOrder++,
        });

        for (let j = 0; j < traceDots.length - 1; j++) {
          extraConns.push({
            id: generateId("junction_conn"),
            from: traceDots[j].id,
            to: traceDots[j + 1].id,
            color: 2,
            order: connectionOrder++,
          });
        }
      }
    }
  });

  // 4. Add dense corner circuit patterns
  const denseCorners = [
    { x: 4, y: 4, dirX: 1, dirY: 1 },
    { x: config.gridSize - 5, y: 4, dirX: -1, dirY: 1 },
  ];

  denseCorners.forEach((corner) => {
    // Create a small dense circuit board pattern
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (random() > 0.3) {
          const dot: DotPlayerDot = {
            id: generateId("dense"),
            x: corner.x + col * corner.dirX * 2,
            y: corner.y + row * corner.dirY * 2,
            color: random() > 0.6 ? 4 : 1,
          };
          extraDots.push(dot);

          // Connect to neighbors
          if (col > 0 && random() > 0.4) {
            const neighborX = corner.x + (col - 1) * corner.dirX * 2;
            const neighborY = corner.y + row * corner.dirY * 2;
            const neighbor = extraDots.find(d => d.x === neighborX && d.y === neighborY);
            if (neighbor) {
              extraConns.push({
                id: generateId("dense_conn"),
                from: neighbor.id,
                to: dot.id,
                color: 2,
                order: connectionOrder++,
              });
            }
          }
          if (row > 0 && random() > 0.4) {
            const neighborX = corner.x + col * corner.dirX * 2;
            const neighborY = corner.y + (row - 1) * corner.dirY * 2;
            const neighbor = extraDots.find(d => d.x === neighborX && d.y === neighborY);
            if (neighbor) {
              extraConns.push({
                id: generateId("dense_conn"),
                from: neighbor.id,
                to: dot.id,
                color: 2,
                order: connectionOrder++,
              });
            }
          }
        }
      }
    }
  });

  frame.dots = [...bgDots, ...wordDots, ...extraDots];
  frame.connections = [...bgConns, ...wordConns, ...extraConns];

  return frame;
}

function generateFrame5_Highlight(
  config: GeneratorConfig,
  letterDefs: Record<string, LetterDef>,
  random: () => number
): DotPlayerFrame {
  const frame = createBaseFrame("Highlight");
  frame.duration = 2000;
  frame.dotColorTransitionDuration = 500;

  // Get complete word with highlighted colors
  const { dots: wordDots, connections: wordConns } = renderWord(
    "GENUARY",
    config.centerX,
    config.centerY,
    letterDefs,
    config
  );

  // Change some dots to accent color
  wordDots.forEach((dot) => {
    if (random() > 0.6) {
      dot.color = config.accentColor;
    }
  });

  // Minimal background for emphasis
  const { dots: bgDots, connections: bgConns } = generateDecorativeTraces(
    config.centerX,
    config.centerY,
    config.gridSize,
    random
  );

  // Dim background connections
  bgConns.forEach((conn) => {
    conn.color = 0; // dark color
  });

  frame.dots = [...bgDots, ...wordDots];
  frame.connections = [...bgConns, ...wordConns];

  return frame;
}

// ============================================================================
// Main Generator Function
// ============================================================================

export function generateGenuaryAnimation(seed: number = 42): DotPlayerData {
  resetIdCounter();
  const random = seededRandom(seed);
  const letterDefs = defineLetters();
  const config = DEFAULT_CONFIG;

  // Generate frames
  const frames: DotPlayerFrame[] = [
    generateFrame1_CircuitBackground(config, random),
    generateFrame2_LetterNodes(config, letterDefs, random),
    generateFrame3_LettersTrace(config, letterDefs, random),
    generateFrame4_CircuitExpansion(config, letterDefs, random),
    generateFrame5_Highlight(config, letterDefs, random),
  ];

  // Create the complete animation data
  const animation: DotPlayerData = {
    version: "1.0",
    colors: [
      "#0b1220", // 0: dark background
      "#1b998b", // 1: teal (main dots)
      "#f97316", // 2: orange (traces)
      "#e11d48", // 3: red (nodes)
      "#facc15", // 4: yellow (accents)
      "#0ea5e9", // 5: blue
      "#334155", // 6: slate
      "#f1f5f9", // 7: light
    ],
    settings: {
      loopPlayback: true,
      fadeInOnStart: true,
      fadeOutOnEnd: true,
      connectionFadeInOnStart: true,
      connectionFadeOutOnEnd: true,
    },
    metadata: {
      gridSize: config.gridSize,
      dotSize: 2.8,
      dotGap: 8,
      gridColor: "#1a2744",
      gridDotSize: 0.8,
      showGrid: true,
      backgroundColor: 0,
    },
    frames,
  };

  return animation;
}

// ============================================================================
// Export to JSON
// ============================================================================

export function exportAnimationToJSON(animation: DotPlayerData): string {
  return JSON.stringify(animation, null, 2);
}

// Quick helper to generate and export
export function generateAndExportGenuary(seed: number = 42): string {
  const animation = generateGenuaryAnimation(seed);
  return exportAnimationToJSON(animation);
}
