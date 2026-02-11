# dot-printer-studio

A visual editor and web player for building **dot-matrix style animations** that are easy to author, inspect, and run in the browser. Created by Maks Surguy

<p align="center">
  <video src="https://github.com/user-attachments/assets/2751d506-7418-465e-9075-bbf92d7076f1" controls muted playsinline width="720">
    Your browser does not support the video tag.
  </video>
</p>

[Download the demo video](./youcandothings.mp4)

## Why should I care?

Most animation workflows optimize for general-purpose motion graphics. This project optimizes for **grid-based, programmable dot animations**.

If you want to:

- Design animation on a constrained dot grid (retro displays, LED walls, plotter-like visuals, badge screens)
- Keep animation data semantic and editable (dots, connections, groups, timing), not opaque keyframe blobs
- Build tooling around animation data (generators, transformations, import/export pipelines)
- Use a lightweight Canvas runtime with fine playback control

then `dot-printer-studio` gives you an end-to-end workflow: **authoring + format + runtime**.

## What this project enables

- Author reusable dot animation assets in a browser editor
- Version-control animation as plain JSON (`.json`) or wrapped binary (`.dotp`)
- Run animations in React apps (`DotPlayerReact`) or vanilla JS (`DotPlayer`)
- Build procedural/generative pipelines that output the same runtime format
- Use one data model across editor mode and player mode

## Editor features

- Multi-frame timeline with add, duplicate, delete, reorder, and frame naming
- Tooling for:
  - Select, marquee, lasso
  - Dot draw/erase
  - Manual connect + auto-connect
  - Text tool (5x7 font)
  - Shape tools: rectangle, circle, ellipse, line, triangle, polygon, star, arrow
  - SVG trace reference placement and locking for guided drawing
- Selection operations:
  - Select connected
  - Select by color
  - Invert selection
  - Select connections from selected dots
- Transform operations:
  - Flip horizontal/vertical
  - Rotate 90 CW/CCW, 180, arbitrary-angle rotate
  - Interactive rotation handle on canvas
- Group system:
  - Create, rename, lock, hide, ungroup, delete
  - Group-level animation overrides (fade/connection timing)
- Connection operations:
  - Reverse order
  - Swap direction
  - Normalize order
- Auto-connections (animation-wide path-based traces):
  - Start/end points
  - Trace in/out durations, direction, start time, optional hold duration
- Per-frame timing controls:
  - Frame duration and easing
  - Dot fade in/out, dot stagger, dot color transition + easing
  - Connection draw duration + stagger
  - Enable/disable dot/connection animation per frame
- Canvas controls:
  - Grid size, dot gap, dot size, grid dot size, grid color, zoom, background
- Import/export:
  - Import `.json` / `.dotp`
  - Export `.json` / `.dotp`
  - Import SVG references
- Undo/redo built on command history with batch operations

### Keyboard shortcuts

- `Cmd/Ctrl + Z`: Undo
- `Cmd/Ctrl + Shift + Z`: Redo
- `Cmd/Ctrl + A`: Select all dots in active frame
- `Delete` / `Backspace`: Delete selected dots
- `Cmd/Ctrl + G`: Create group from selection
- `Cmd/Ctrl + Shift + G`: Ungroup selected group
- `Esc`: Clear active interaction/selection (or cancel SVG placement)

## Player features

- Canvas2D runtime with frame-by-frame playback
- Looping, speed control, zoom control
- Programmatic navigation:
  - `goToFrame`, `goToNextFrame`, `goToPrevFrame`, `seek`, `seekProgress`
- Event model:
  - `ready`, `play`, `pause`, `stop`, `complete`, `loopComplete`, `frameChange`, `enterFrame`, `destroy`
- Runtime visual overrides:
  - Grid visibility
  - Background color
- Works in:
  - Vanilla JS (`DotPlayer`)
  - React (`DotPlayerReact`)

## dot-printer-studio vs Lottie

This is **not a universal Lottie replacement**. It is better for a specific class of animation systems.

### Where dot-printer-studio is stronger

- Dot/grid-native authoring model instead of vector timeline abstraction
- Semantic data primitives (`dots`, `connections`, `groups`, `frames`) that are straightforward to process in code
- Built-in editor workflows for connection ordering, path traces, and grid-aware operations
- Tight runtime control over frame progress and playback for interactive systems

### Where Lottie is stronger

- General motion graphics ecosystem maturity
- Illustrator/After Effects pipeline and designer tooling
- Broader player ecosystem and community assets

### Rule of thumb

- Choose **dot-printer-studio** for programmable dot-matrix visuals and data-first animation workflows.
- Choose **Lottie** for broad vector motion design pipelines and AE-centric production.

## Architecture

The project has two browser apps (Vite multi-page build):

- `index.html` -> Studio (`Editor` + in-app `Player` mode)
- `player-demo.html` -> Player API demo page (`DotPlayerReact` with controls)

High-level architecture:

```text
UI (React components)
  -> Domain hooks (editing, file IO, timing, selection, transforms)
    -> Store (Zustand) + Command history (undo/redo)
      -> Shared data model (Project/Frame/Dot/Connection/Group)
        -> Renderer/runtime (DotPlayer + Canvas2D)
```

### Key design choices

- **Single shared data model** for editor and runtime to avoid conversion drift
- **Command pattern** for reversible editing operations
- **Color references** stored as numeric indices into a palette for compactness and consistency
- **Normalization on import** to support backward compatibility and sanitize malformed content

## Repository structure

```text
src/
  components/        # Editor/player UI components
  hooks/             # Domain logic hooks (selection, file IO, transforms, etc.)
  lib/
    commands/        # Command pattern + history manager
    shapes/          # Shape generation algorithms
    transforms/      # Transform and ordering utilities
    selection/       # Selection logic
    groups/          # Group metadata and helpers
    generators/      # Programmatic animation generators
    project.ts       # Core project types + normalization/optimization
  player/            # Runtime player (vanilla + React wrapper)
  store/             # Zustand studio store
  player-demo/       # Dedicated demo app for player API
```

## File format details

The core format is a JSON object (`Project`) with a stable shape.

### Top-level model

- `version: string`
- `colors: string[]` (palette)
- `settings` (global playback behavior)
- `metadata` (grid and canvas metadata)
- `frames: Frame[]`
- `autoConnections?: AutoConnection[]`

### Why color refs?

Dots/connections store `color` as an integer `ColorRef` into `colors[]`.

Example:

- `colors[2] = "#f97316"`
- dot with `color: 2` uses `#f97316`

This keeps frame data compact and avoids repeated color strings.

### Minimal example

```json
{
  "version": "1.0",
  "colors": ["#0b1220", "#f8fafc", "#f97316"],
  "settings": {
    "loopPlayback": true,
    "fadeInOnStart": true,
    "fadeOutOnEnd": true,
    "connectionFadeInOnStart": true,
    "connectionFadeOutOnEnd": true
  },
  "metadata": {
    "created": "2026-01-01T00:00:00.000Z",
    "gridSize": 120,
    "dotSize": 2,
    "dotGap": 8,
    "gridColor": "#2b2b2b",
    "gridDotSize": 1,
    "showGrid": true,
    "backgroundColor": 0
  },
  "frames": [
    {
      "id": "f1",
      "name": "Frame 1",
      "dots": [{ "id": "d1", "x": 10, "y": 10, "color": 1 }],
      "connections": [],
      "groups": [],
      "duration": 1000,
      "easing": "easeInOut",
      "dotFadeInDuration": 300,
      "dotFadeOutDuration": 300,
      "dotColorTransitionDuration": 300,
      "dotColorTransitionEasing": "easeInOut",
      "connectionAnimationDuration": 700,
      "connectionStagger": 20,
      "dotStagger": 20,
      "animateDots": true,
      "animateConnections": true
    }
  ]
}
```

### `.dotp` binary wrapper

`.dotp` is currently a lightweight wrapper:

- Header: ASCII `DOTP1` (5 bytes)
- Payload: UTF-8 JSON text for the same `Project` structure

So `.dotp` is effectively:

- `DOTP1` + `JSON.stringify(project)`

### Compatibility behavior

On import, data is normalized:

- Missing fields get defaults
- Legacy string colors are converted to palette refs
- Out-of-bounds dots/connections are filtered
- Optional legacy settings map to current settings when possible

## Using the player in your app

### React API

```tsx
import { DotPlayerReact, type DotPlayerData } from "./src/player";

export function MyView({ data }: { data: DotPlayerData }) {
  return <DotPlayerReact data={data} autoplay loop />;
}
```

### Vanilla JS API

```ts
import { DotPlayer } from "./src/player";

const container = document.getElementById("player")!;
const player = DotPlayer.loadAnimation({
  container,
  data: animationData,
  autoplay: true,
  loop: true,
  speed: 1,
  zoom: 1,
});

player.on("frameChange", ({ frameIndex }) => {
  console.log("Frame:", frameIndex);
});
```

## Programmatic generation

The repo includes generator-oriented code under `src/lib/generators/` and preset builders in `src/lib/presets.ts`.

This is useful when you want to:

- Generate animation assets from code
- Build custom converters
- Create brand/system-driven motion templates

## Local development

### Requirements

- Node.js 18+ (Node.js 20 recommended)
- npm 9+

### Run

```bash
npm install
npm run dev
```

### Verify

```bash
npm run ci
```

This runs:

- TypeScript typecheck
- Vite production build

## Build outputs

```bash
npm run build
```

Outputs to `dist/`:

- `dist/index.html` (studio app)
- `dist/player-demo.html` (player demo)

## Deploy to GitHub Pages

This repo includes GitHub Actions workflows for CI and Pages deploy.

1. Push repository to GitHub.
2. In GitHub, set `Settings -> Pages -> Source` to `GitHub Actions`.
3. Push to `main` (or run deploy workflow manually).

The deploy workflow sets `VITE_BASE_PATH=/${{ github.event.repository.name }}/` so asset URLs resolve correctly on project pages.

## Deploy to any static host

```bash
npm run build
```

Publish the `dist/` directory to Vercel, Netlify, Cloudflare Pages, S3, or similar static hosting.

## Samples

Sample assets live in `samples/` and are loaded by the player demo page.

## License

MIT (see `LICENSE`).
