import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import { DotPlayer } from "./DotPlayer";
import type {
  DotPlayerData,
  DotPlayerEventMap,
  DotPlayerState,
} from "./types";

// ============================================================================
// Props Interface
// ============================================================================

export interface DotPlayerReactProps {
  /** Animation data to play */
  data: DotPlayerData;

  /** Start playing automatically when mounted */
  autoplay?: boolean;

  /** Loop the animation */
  loop?: boolean;

  /** Playback speed multiplier (default: 1) */
  speed?: number;

  /** Zoom level (default: 1) */
  zoom?: number;

  /** Override grid visibility from data */
  showGrid?: boolean;

  /** Override background color from data */
  backgroundColor?: string;

  /** Additional CSS class for the container */
  className?: string;

  /** Additional inline styles for the container */
  style?: CSSProperties;

  // Event callbacks
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onComplete?: () => void;
  onLoopComplete?: () => void;
  onFrameChange?: (data: DotPlayerEventMap["frameChange"]) => void;
  onEnterFrame?: (data: DotPlayerEventMap["enterFrame"]) => void;
  onDestroy?: () => void;
}

// ============================================================================
// Ref Interface
// ============================================================================

export interface DotPlayerReactRef {
  /** Access the underlying DotPlayer instance */
  player: DotPlayer | null;

  /** Load new animation data */
  loadData(data: DotPlayerData): void;

  /** Get current animation data */
  getData(): DotPlayerData | null;

  /** Start or resume playback */
  play(): void;

  /** Pause playback */
  pause(): void;

  /** Stop playback and reset */
  stop(): void;

  /** Toggle between play and pause */
  togglePlayPause(): void;

  /** Seek to a specific time within current frame (ms) */
  seek(time: number): void;

  /** Seek to a progress value (0-1) within current frame */
  seekProgress(progress: number): void;

  /** Jump to a specific frame */
  goToFrame(index: number, play?: boolean): void;

  /** Go to next frame */
  goToNextFrame(play?: boolean): void;

  /** Go to previous frame */
  goToPrevFrame(play?: boolean): void;

  /** Go to first frame */
  goToFirstFrame(play?: boolean): void;

  /** Go to last frame */
  goToLastFrame(play?: boolean): void;

  /** Set playback speed */
  setSpeed(speed: number): void;

  /** Set loop mode */
  setLoop(loop: boolean): void;

  /** Set zoom level */
  setZoom(zoom: number): void;

  /** Override grid visibility (undefined = use data default) */
  setShowGrid(showGrid?: boolean): void;

  /** Override background color (undefined = use data default) */
  setBackgroundColor(backgroundColor?: string): void;

  /** Get current player state */
  getState(): DotPlayerState | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * React wrapper component for DotPlayer.
 *
 * Usage:
 * ```tsx
 * import { DotPlayerReact } from './player';
 *
 * function App() {
 *   const playerRef = useRef<DotPlayerReactRef>(null);
 *
 *   return (
 *     <DotPlayerReact
 *       ref={playerRef}
 *       data={animationData}
 *       autoplay
 *       loop
 *       onComplete={() => console.log('done')}
 *     />
 *   );
 * }
 * ```
 */
export const DotPlayerReact = forwardRef<DotPlayerReactRef, DotPlayerReactProps>(
  (props, ref) => {
    const {
      data,
      autoplay = false,
      loop,
      speed = 1,
      zoom = 1,
      showGrid,
      backgroundColor,
      className,
      style,
      onReady,
      onPlay,
      onPause,
      onStop,
      onComplete,
      onLoopComplete,
      onFrameChange,
      onEnterFrame,
      onDestroy,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<DotPlayer | null>(null);

    // Keep track of previous data to detect changes
    const dataRef = useRef(data);

    // ========================================================================
    // Initialize player
    // ========================================================================

    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      // Create player instance
      const player = DotPlayer.loadAnimation({
        container: containerRef.current,
        data,
        autoplay,
        loop,
        speed,
        zoom,
        rendererSettings: {
          showGrid,
          backgroundColor,
        },
      });

      playerRef.current = player;
      dataRef.current = data;

      // Cleanup on unmount
      return () => {
        player.destroy();
        playerRef.current = null;
      };
      // Only re-create player if data changes (deep comparison via JSON)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ========================================================================
    // Handle data changes
    // ========================================================================

    useEffect(() => {
      // Skip initial render
      if (dataRef.current === data) {
        return;
      }

      // Load new data if it changed
      if (playerRef.current) {
        playerRef.current.loadData(data);
        dataRef.current = data;
      }
    }, [data]);

    // ========================================================================
    // Sync prop changes to player
    // ========================================================================

    useEffect(() => {
      if (playerRef.current && loop !== undefined) {
        playerRef.current.setLoop(loop);
      }
    }, [loop]);

    useEffect(() => {
      if (playerRef.current) {
        playerRef.current.setSpeed(speed);
      }
    }, [speed]);

    useEffect(() => {
      if (playerRef.current) {
        playerRef.current.setZoom(zoom);
      }
    }, [zoom]);

    useEffect(() => {
      if (playerRef.current) {
        playerRef.current.setShowGrid(showGrid);
      }
    }, [showGrid]);

    useEffect(() => {
      if (playerRef.current) {
        playerRef.current.setBackgroundColor(backgroundColor);
      }
    }, [backgroundColor]);

    // ========================================================================
    // Event subscriptions
    // ========================================================================

    useEffect(() => {
      const player = playerRef.current;
      if (!player) {
        return;
      }

      const unsubscribers: (() => void)[] = [];

      if (onReady) {
        unsubscribers.push(player.on("ready", onReady));
      }
      if (onPlay) {
        unsubscribers.push(player.on("play", onPlay));
      }
      if (onPause) {
        unsubscribers.push(player.on("pause", onPause));
      }
      if (onStop) {
        unsubscribers.push(player.on("stop", onStop));
      }
      if (onComplete) {
        unsubscribers.push(player.on("complete", onComplete));
      }
      if (onLoopComplete) {
        unsubscribers.push(player.on("loopComplete", onLoopComplete));
      }
      if (onFrameChange) {
        unsubscribers.push(player.on("frameChange", onFrameChange));
      }
      if (onEnterFrame) {
        unsubscribers.push(player.on("enterFrame", onEnterFrame));
      }
      if (onDestroy) {
        unsubscribers.push(player.on("destroy", onDestroy));
      }

      return () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    }, [
      onReady,
      onPlay,
      onPause,
      onStop,
      onComplete,
      onLoopComplete,
      onFrameChange,
      onEnterFrame,
      onDestroy,
    ]);

    // ========================================================================
    // Expose ref methods
    // ========================================================================

    useImperativeHandle(
      ref,
      () => ({
        get player() {
          return playerRef.current;
        },

        loadData(data: DotPlayerData) {
          playerRef.current?.loadData(data);
          dataRef.current = data;
        },

        getData() {
          return playerRef.current?.getData() ?? null;
        },

        play() {
          playerRef.current?.play();
        },

        pause() {
          playerRef.current?.pause();
        },

        stop() {
          playerRef.current?.stop();
        },

        togglePlayPause() {
          playerRef.current?.togglePlayPause();
        },

        seek(time: number) {
          playerRef.current?.seek(time);
        },

        seekProgress(progress: number) {
          playerRef.current?.seekProgress(progress);
        },

        goToFrame(index: number, play?: boolean) {
          playerRef.current?.goToFrame(index, play);
        },

        goToNextFrame(play?: boolean) {
          playerRef.current?.goToNextFrame(play);
        },

        goToPrevFrame(play?: boolean) {
          playerRef.current?.goToPrevFrame(play);
        },

        goToFirstFrame(play?: boolean) {
          playerRef.current?.goToFirstFrame(play);
        },

        goToLastFrame(play?: boolean) {
          playerRef.current?.goToLastFrame(play);
        },

        setSpeed(speed: number) {
          playerRef.current?.setSpeed(speed);
        },

        setLoop(loop: boolean) {
          playerRef.current?.setLoop(loop);
        },

        setZoom(zoom: number) {
          playerRef.current?.setZoom(zoom);
        },

        setShowGrid(showGrid?: boolean) {
          playerRef.current?.setShowGrid(showGrid);
        },

        setBackgroundColor(backgroundColor?: string) {
          playerRef.current?.setBackgroundColor(backgroundColor);
        },

        getState() {
          return playerRef.current?.getState() ?? null;
        },
      }),
      []
    );

    // ========================================================================
    // Render
    // ========================================================================

    return <div ref={containerRef} className={className} style={style} />;
  }
);

DotPlayerReact.displayName = "DotPlayerReact";
