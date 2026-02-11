import { buildTextDots } from "./text";
import {
  DEFAULT_CONNECTION_COLOR,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_DOT_COLOR,
  DEFAULT_DOT_GAP,
  DEFAULT_DOT_SIZE,
  DEFAULT_FADE_IN_ON_START,
  DEFAULT_FADE_OUT_ON_END,
  DEFAULT_CONNECTION_FADE_IN_ON_START,
  DEFAULT_CONNECTION_FADE_OUT_ON_END,
  DEFAULT_GRID_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_DOT_SIZE,
  DEFAULT_LOOP_PLAYBACK,
  DEFAULT_SHOW_GRID,
  PRESET_COLORS,
} from "./constants";
import { createPositionKey } from "./canvas";
import {
  createEmptyFrame,
  makeId,
  normalizeProject,
  type Connection,
  type Dot,
  type Frame,
  type Project,
} from "./project";

type RawDot = Omit<Dot, "color"> & { color: string };
type RawConnection = Omit<Connection, "color"> & { color: string };
type RawFrame = Omit<Frame, "dots" | "connections"> & {
  dots: RawDot[];
  connections: RawConnection[];
};

const createDot = (x: number, y: number, color: string): RawDot => ({
  id: makeId(),
  x,
  y,
  color,
});

const createDotsFromText = (text: string, x: number, y: number, color: string) => {
  return buildTextDots(text, x, y).map((seed) => createDot(seed.x, seed.y, color));
};

const mergeDots = (...groups: RawDot[][]) => {
  const map = new Map<string, RawDot>();
  for (const group of groups) {
    for (const dot of group) {
      map.set(createPositionKey(dot.x, dot.y), dot);
    }
  }
  return Array.from(map.values());
};

const getBounds = (dots: RawDot[]) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const dot of dots) {
    minX = Math.min(minX, dot.x);
    maxX = Math.max(maxX, dot.x);
    minY = Math.min(minY, dot.y);
    maxY = Math.max(maxY, dot.y);
  }
  return { minX, maxX, minY, maxY };
};

const getCenter = (dots: RawDot[]) => {
  const bounds = getBounds(dots);
  return {
    x: Math.round((bounds.minX + bounds.maxX) / 2),
    y: Math.round((bounds.minY + bounds.maxY) / 2),
  };
};

const buildLineDots = (x1: number, y1: number, x2: number, y2: number, color: string) => {
  const dots: RawDot[] = [];
  let dx = Math.abs(x2 - x1);
  let dy = Math.abs(y2 - y1);
  let sx = x1 < x2 ? 1 : -1;
  let sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1;
  let y = y1;

  while (true) {
    dots.push(createDot(x, y, color));
    if (x === x2 && y === y2) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return dots;
};

const autoConnectAdjacent = (dots: RawDot[], color: string) => {
  const map = new Map<string, RawDot>();
  for (const dot of dots) {
    map.set(createPositionKey(dot.x, dot.y), dot);
  }

  const connections: RawConnection[] = [];
  let order = 0;
  for (const dot of dots) {
    const right = map.get(createPositionKey(dot.x + 1, dot.y));
    const down = map.get(createPositionKey(dot.x, dot.y + 1));
    if (right) {
      connections.push({
        id: makeId(),
        from: dot.id,
        to: right.id,
        color,
        order,
      });
      order += 1;
    }
    if (down) {
      connections.push({
        id: makeId(),
        from: dot.id,
        to: down.id,
        color,
        order,
      });
      order += 1;
    }
  }

  return connections;
};

const buildCircleDots = (
  centerX: number,
  centerY: number,
  radius: number,
  count: number,
  color: string
) => {
  const dots: RawDot[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.round(centerX + Math.cos(angle) * radius);
    const y = Math.round(centerY + Math.sin(angle) * radius);
    const key = createPositionKey(x, y);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    dots.push(createDot(x, y, color));
  }
  return dots;
};

const buildLoopConnections = (dots: RawDot[], color: string, revealDuration?: number) => {
  const connections: RawConnection[] = [];
  if (dots.length < 2) {
    return connections;
  }
  for (let i = 0; i < dots.length; i += 1) {
    const from = dots[i];
    const to = dots[(i + 1) % dots.length];
    connections.push({
      id: makeId(),
      from: from.id,
      to: to.id,
      color,
      order: i,
      revealDuration,
    });
  }
  return connections;
};

const createFrame = (
  name: string,
  dots: RawDot[],
  connections: RawConnection[],
  overrides?: Partial<Omit<Frame, "dots" | "connections">>
): RawFrame => {
  const { dots: _d, connections: _c, ...base } = createEmptyFrame(name);
  return {
    ...base,
    dots,
    connections,
    ...overrides,
  };
};

const createProject = (name: string, frames: RawFrame[], gridSize = DEFAULT_GRID_SIZE): Project => {
  const rawProject = {
    version: "1.0",
    settings: {
      loopPlayback: DEFAULT_LOOP_PLAYBACK,
      fadeInOnStart: DEFAULT_FADE_IN_ON_START,
      fadeOutOnEnd: DEFAULT_FADE_OUT_ON_END,
      connectionFadeInOnStart: DEFAULT_CONNECTION_FADE_IN_ON_START,
      connectionFadeOutOnEnd: DEFAULT_CONNECTION_FADE_OUT_ON_END,
    },
    metadata: {
      created: new Date().toISOString(),
      gridSize,
      dotSize: DEFAULT_DOT_SIZE,
      dotGap: DEFAULT_DOT_GAP,
      gridColor: DEFAULT_GRID_COLOR,
      gridDotSize: DEFAULT_GRID_DOT_SIZE,
      showGrid: DEFAULT_SHOW_GRID,
      backgroundColor: DEFAULT_CANVAS_BACKGROUND,
    },
    frames: frames.map((frame, index) => ({
      ...frame,
      name: frame.name || `${name} ${index + 1}`,
    })),
  };

  return normalizeProject(rawProject);
};

const createConnectingConceptsPreset = () => {
  const colorA = DEFAULT_DOT_COLOR;
  const colorB = PRESET_COLORS[1];
  const connectionColor = DEFAULT_CONNECTION_COLOR;

  const designDots = createDotsFromText("DESIGN", 6, 10, colorA);
  const engineeringDots = createDotsFromText("ENGINEERING", 6, 26, colorB);
  const centerA = getCenter(designDots);
  const centerB = getCenter(engineeringDots);
  const bridgeDots = buildLineDots(centerA.x, centerA.y, centerB.x, centerB.y, connectionColor);

  const frame1Dots = designDots;
  const frame2Dots = mergeDots(designDots, engineeringDots);
  const frame3Dots = mergeDots(designDots, engineeringDots, bridgeDots);

  return createProject("Connecting Concepts", [
    createFrame("Frame 1", frame1Dots, autoConnectAdjacent(frame1Dots, connectionColor)),
    createFrame("Frame 2", frame2Dots, autoConnectAdjacent(frame2Dots, connectionColor)),
    createFrame("Frame 3", frame3Dots, autoConnectAdjacent(frame3Dots, connectionColor), {
      connectionAnimationDuration: 700,
      connectionStagger: 20,
    }),
  ]);
};

const createDigitalPhysicalPreset = () => {
  const colorA = PRESET_COLORS[0];
  const colorB = PRESET_COLORS[6];
  const connectionColor = PRESET_COLORS[2];

  const digitalDots = createDotsFromText("DIGITAL", 8, 8, colorA);
  const physicalDots = createDotsFromText("PHYSICAL", 8, 24, colorB);
  const centerA = getCenter(digitalDots);
  const centerB = getCenter(physicalDots);
  const bridgeDots = buildLineDots(centerA.x, centerA.y, centerB.x, centerB.y, connectionColor);

  const frame1Dots = digitalDots;
  const frame2Dots = mergeDots(digitalDots, physicalDots, bridgeDots);
  const frame3Dots = physicalDots;

  return createProject("Digital Physical", [
    createFrame("Frame 1", frame1Dots, autoConnectAdjacent(frame1Dots, connectionColor)),
    createFrame("Frame 2", frame2Dots, autoConnectAdjacent(frame2Dots, connectionColor), {
      connectionAnimationDuration: 900,
      connectionStagger: 30,
    }),
    createFrame("Frame 3", frame3Dots, autoConnectAdjacent(frame3Dots, connectionColor)),
  ]);
};

const createHumanComputerPreset = () => {
  const colorA = PRESET_COLORS[4];
  const colorB = PRESET_COLORS[5];
  const connectionColor = PRESET_COLORS[2];

  const humanDots = createDotsFromText("HUMAN", 4, 16, colorA);
  const computerDots = createDotsFromText("COMPUTER", 44, 16, colorB);
  const centerA = getCenter(humanDots);
  const centerB = getCenter(computerDots);
  const bridgeDots = buildLineDots(centerA.x, centerA.y, centerB.x, centerB.y, connectionColor);

  const frame1Dots = mergeDots(humanDots, bridgeDots);
  const frame2Dots = mergeDots(humanDots, computerDots, bridgeDots);
  const frame3Dots = mergeDots(computerDots, bridgeDots);

  return createProject("Human Computer", [
    createFrame("Frame 1", frame1Dots, autoConnectAdjacent(frame1Dots, connectionColor)),
    createFrame("Frame 2", frame2Dots, autoConnectAdjacent(frame2Dots, connectionColor), {
      connectionAnimationDuration: 650,
      connectionStagger: 18,
    }),
    createFrame("Frame 3", frame3Dots, autoConnectAdjacent(frame3Dots, connectionColor)),
  ]);
};

const createPulseLoopPreset = () => {
  const connectionColor = PRESET_COLORS[2];
  const ringColor = PRESET_COLORS[0];

  const ringSmall = buildCircleDots(60, 60, 16, 48, ringColor);
  const ringMedium = buildCircleDots(60, 60, 22, 60, ringColor);
  const ringLarge = buildCircleDots(60, 60, 28, 72, ringColor);

  const frame1Dots = ringSmall;
  const frame2Dots = ringMedium;
  const frame3Dots = ringLarge;

  return createProject(
    "Pulse Loop",
    [
      createFrame("Frame 1", frame1Dots, buildLoopConnections(frame1Dots, connectionColor, 800), {
        connectionAnimationDuration: 800,
        connectionStagger: 12,
      }),
      createFrame("Frame 2", frame2Dots, buildLoopConnections(frame2Dots, connectionColor, 900), {
        connectionAnimationDuration: 900,
        connectionStagger: 10,
      }),
      createFrame("Frame 3", frame3Dots, buildLoopConnections(frame3Dots, connectionColor, 1000), {
        connectionAnimationDuration: 1000,
        connectionStagger: 8,
      }),
    ],
    120
  );
};

const createCheckmarkPreset = () => {
  const checkColor = PRESET_COLORS[3];
  const connectionColor = PRESET_COLORS[2];

  // Create checkmark shape using line dots
  const shortStroke = buildLineDots(30, 35, 40, 45, checkColor);
  const longStroke = buildLineDots(40, 45, 70, 20, checkColor);
  const checkmarkDots = mergeDots(shortStroke, longStroke);

  // Circle around the checkmark
  const circleDots = buildCircleDots(50, 32, 24, 64, checkColor);
  const allDots = mergeDots(checkmarkDots, circleDots);

  return createProject("Checkmark", [
    createFrame("Frame 1", [], []),
    createFrame("Frame 2", checkmarkDots, autoConnectAdjacent(checkmarkDots, connectionColor), {
      connectionAnimationDuration: 600,
      connectionStagger: 15,
    }),
    createFrame("Frame 3", allDots, [
      ...autoConnectAdjacent(checkmarkDots, connectionColor),
      ...buildLoopConnections(circleDots, connectionColor, 800),
    ], {
      connectionAnimationDuration: 800,
      connectionStagger: 8,
    }),
  ]);
};

const createOKTextPreset = () => {
  const colorA = PRESET_COLORS[3];
  const colorB = PRESET_COLORS[5];
  const connectionColor = PRESET_COLORS[2];

  const okDots = createDotsFromText("OK", 30, 30, colorA);
  const circleDots = buildCircleDots(35, 32, 20, 80, colorB);
  const allDots = mergeDots(okDots, circleDots);

  return createProject("OK Text", [
    createFrame("Frame 1", okDots, autoConnectAdjacent(okDots, connectionColor), {
      connectionAnimationDuration: 500,
      connectionStagger: 25,
    }),
    createFrame("Frame 2", allDots, [
      ...autoConnectAdjacent(okDots, connectionColor),
      ...buildLoopConnections(circleDots, connectionColor, 1000),
    ], {
      connectionAnimationDuration: 1000,
      connectionStagger: 10,
    }),
    createFrame("Frame 3", allDots, [
      ...autoConnectAdjacent(okDots, connectionColor),
      ...buildLoopConnections(circleDots, connectionColor, 800),
    ], {
      connectionAnimationDuration: 800,
      connectionStagger: 8,
      duration: 1200,
    }),
  ]);
};

const createSpinnerPreset = () => {
  const spinnerColor = PRESET_COLORS[4];
  const connectionColor = PRESET_COLORS[2];

  // Create rotating arc segments
  const arc1 = buildCircleDots(50, 32, 20, 16, spinnerColor).slice(0, 12);
  const arc2 = buildCircleDots(50, 32, 20, 16, spinnerColor).slice(4, 16);
  const arc3 = buildCircleDots(50, 32, 20, 16, spinnerColor).slice(8, 16).concat(
    buildCircleDots(50, 32, 20, 16, spinnerColor).slice(0, 4)
  );

  return createProject(
    "Loading Spinner",
    [
      createFrame("Frame 1", arc1, buildLoopConnections(arc1, connectionColor, 500), {
        connectionAnimationDuration: 500,
        connectionStagger: 20,
        duration: 400,
      }),
      createFrame("Frame 2", arc2, buildLoopConnections(arc2, connectionColor, 500), {
        connectionAnimationDuration: 500,
        connectionStagger: 20,
        duration: 400,
      }),
      createFrame("Frame 3", arc3, buildLoopConnections(arc3, connectionColor, 500), {
        connectionAnimationDuration: 500,
        connectionStagger: 20,
        duration: 400,
      }),
    ],
    100
  );
};

const createWavePatternPreset = () => {
  const waveColor = PRESET_COLORS[6];
  const connectionColor = PRESET_COLORS[2];

  // Create wave patterns using sine-like dots
  const buildWave = (amplitude: number, phase: number) => {
    const dots: RawDot[] = [];
    for (let x = 10; x <= 90; x += 2) {
      const y = Math.round(32 + Math.sin((x + phase) * 0.15) * amplitude);
      dots.push(createDot(x, y, waveColor));
    }
    return dots;
  };

  const wave1 = buildWave(8, 0);
  const wave2 = buildWave(12, 10);
  const wave3 = buildWave(16, 20);

  return createProject("Wave Pattern", [
    createFrame("Frame 1", wave1, autoConnectAdjacent(wave1, connectionColor), {
      connectionAnimationDuration: 800,
      connectionStagger: 15,
    }),
    createFrame("Frame 2", wave2, autoConnectAdjacent(wave2, connectionColor), {
      connectionAnimationDuration: 800,
      connectionStagger: 15,
    }),
    createFrame("Frame 3", wave3, autoConnectAdjacent(wave3, connectionColor), {
      connectionAnimationDuration: 800,
      connectionStagger: 15,
    }),
  ]);
};

export type PresetEntry = {
  name: string;
  create: () => Project;
};

export const PRESET_LIBRARY: PresetEntry[] = [
  { name: "Connecting Concepts", create: createConnectingConceptsPreset },
  { name: "Digital Physical", create: createDigitalPhysicalPreset },
  { name: "Human Computer", create: createHumanComputerPreset },
  { name: "Pulse Loop", create: createPulseLoopPreset },
  { name: "Checkmark", create: createCheckmarkPreset },
  { name: "OK Text", create: createOKTextPreset },
  { name: "Loading Spinner", create: createSpinnerPreset },
  { name: "Wave Pattern", create: createWavePatternPreset },
];

export const createPresetProjects = (): Project[] =>
  PRESET_LIBRARY.map((entry) => entry.create());
