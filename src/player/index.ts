// ============================================================================
// DotPlayer - Vanilla JS Animation Player
// ============================================================================

export { DotPlayer } from "./DotPlayer";

// ============================================================================
// DotPlayerReact - React Wrapper Component
// ============================================================================

export { DotPlayerReact } from "./DotPlayerReact";
export type { DotPlayerReactProps, DotPlayerReactRef } from "./DotPlayerReact";

// ============================================================================
// Types - Data Structures
// ============================================================================

export type {
  ColorRef,
  DotPlayerData,
  DotPlayerFrame,
  DotPlayerDot,
  DotPlayerConnection,
  DotPlayerSettings,
  DotPlayerMetadata,
} from "./types";

// ============================================================================
// Types - Options and Configuration
// ============================================================================

export type {
  DotPlayerOptions,
  DotPlayerRendererSettings,
} from "./types";

// ============================================================================
// Types - State
// ============================================================================

export type { DotPlayerState } from "./types";

// ============================================================================
// Types - Events
// ============================================================================

export type {
  DotPlayerEventType,
  DotPlayerEventMap,
  DotPlayerFrameChangeEvent,
  DotPlayerEnterFrameEvent,
} from "./types";

// ============================================================================
// Utilities (for advanced usage)
// ============================================================================

export { validatePlayerData } from "./utils";

// ============================================================================
// Re-exports from lib (for convenience)
// ============================================================================

export type { EasingName } from "../lib/easing";
