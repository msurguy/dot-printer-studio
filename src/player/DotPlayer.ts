import { CANVAS_RENDERING, PLAYER_PEN_TIP_COLOR } from "../lib/constants";
import { getCanvasMetrics } from "../lib/canvas";
import { AnimationController } from "./animation";
import { renderFrame } from "./renderer";
import type {
  DotPlayerData,
  DotPlayerEventMap,
  DotPlayerEventType,
  DotPlayerOptions,
  DotPlayerState,
  RenderContext,
} from "./types";
import { clamp, resolveColor, setupCanvas, validatePlayerData } from "./utils";

type EventCallback<T extends DotPlayerEventType> = (
  data: DotPlayerEventMap[T]
) => void;

/**
 * DotPlayer - A vanilla JavaScript animation player for dot-based animations.
 *
 * Usage:
 * ```javascript
 * const player = DotPlayer.loadAnimation({
 *   container: document.getElementById('player'),
 *   data: animationData,
 *   autoplay: true,
 *   loop: true,
 * });
 *
 * player.on('frameChange', ({ frameIndex }) => console.log(frameIndex));
 * player.pause();
 * ```
 */
export class DotPlayer {
  // Container and canvas
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;

  // Animation data
  private data: DotPlayerData;

  // State
  private currentFrame: number = 0;
  private playhead: number = 0;
  private speed: number = 1;
  private zoom: number = 1;
  private loop: boolean;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private isDestroyed: boolean = false;

  // Renderer settings overrides
  private showGridOverride?: boolean;
  private backgroundColorOverride?: string;

  // Animation controller
  private animation: AnimationController;

  // Event listeners
  private listeners: Map<DotPlayerEventType, Set<EventCallback<DotPlayerEventType>>> =
    new Map();

  // ============================================================================
  // Static Factory
  // ============================================================================

  /**
   * Create and return a new DotPlayer instance.
   */
  static loadAnimation(options: DotPlayerOptions): DotPlayer {
    return new DotPlayer(options);
  }

  // ============================================================================
  // Constructor
  // ============================================================================

  constructor(options: DotPlayerOptions) {
    this.container = options.container;
    this.data = validatePlayerData(options.data);
    this.loop = options.loop ?? this.data.settings.loopPlayback;
    this.speed = options.speed ?? 1;
    this.zoom = options.zoom ?? 1;

    // Renderer overrides
    this.showGridOverride = options.rendererSettings?.showGrid;
    this.backgroundColorOverride = options.rendererSettings?.backgroundColor;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.container.appendChild(this.canvas);

    // Initialize animation controller
    this.animation = new AnimationController();
    this.animation.setSpeed(this.speed);
    this.animation.setOnUpdate(this.handleAnimationUpdate);
    this.animation.setOnComplete(this.handleAnimationComplete);

    // Initial render
    this.resize();
    this.render();

    // Emit ready event
    this.emit("ready", undefined);

    // Autoplay if requested
    if (options.autoplay) {
      this.play();
    }
  }

  // ============================================================================
  // Playback Controls
  // ============================================================================

  /**
   * Start or resume playback.
   */
  play(): void {
    if (this.isDestroyed || this.data.frames.length === 0) {
      return;
    }

    if (this.isPaused) {
      // Resume from pause
      this.isPaused = false;
      this.isPlaying = true;
      this.animation.resume();
      this.emit("play", undefined);
      return;
    }

    if (this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.startFrameAnimation(this.currentFrame);
    this.emit("play", undefined);
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this.isDestroyed || !this.isPlaying) {
      return;
    }

    this.animation.pause();
    this.isPaused = true;
    this.isPlaying = false;
    this.emit("pause", undefined);
  }

  /**
   * Stop playback and reset to beginning.
   */
  stop(): void {
    if (this.isDestroyed) {
      return;
    }

    this.animation.stop();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentFrame = 0;
    this.playhead = 0;
    this.render();
    this.emit("stop", undefined);
  }

  /**
   * Toggle between play and pause.
   */
  togglePlayPause(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  // ============================================================================
  // Seeking
  // ============================================================================

  /**
   * Seek to a specific time within the current frame.
   */
  seek(time: number): void {
    if (this.isDestroyed) {
      return;
    }

    const frame = this.data.frames[this.currentFrame];
    if (!frame) {
      return;
    }

    this.playhead = clamp(time, 0, frame.duration);
    this.animation.setPlayhead(this.playhead);
    this.render();
  }

  /**
   * Seek to a progress value (0-1) within the current frame.
   */
  seekProgress(progress: number): void {
    if (this.isDestroyed) {
      return;
    }

    const frame = this.data.frames[this.currentFrame];
    if (!frame) {
      return;
    }

    const time = clamp(progress, 0, 1) * frame.duration;
    this.seek(time);
  }

  /**
   * Jump to a specific frame.
   */
  goToFrame(index: number, play: boolean = false): void {
    if (this.isDestroyed) {
      return;
    }

    const targetIndex = clamp(index, 0, this.data.frames.length - 1);
    if (targetIndex === this.currentFrame && this.playhead === 0) {
      if (play && !this.isPlaying) {
        this.play();
      }
      return;
    }

    this.animation.stop();
    this.currentFrame = targetIndex;
    this.playhead = 0;

    const frame = this.data.frames[this.currentFrame];
    this.emit("frameChange", {
      frameIndex: this.currentFrame,
      frameName: frame?.name ?? "",
    });

    this.render();

    if (play) {
      this.isPlaying = true;
      this.isPaused = false;
      this.startFrameAnimation(this.currentFrame);
      this.emit("play", undefined);
    }
  }

  /**
   * Go to the next frame.
   */
  goToNextFrame(play: boolean = false): void {
    const nextIndex = this.currentFrame + 1;
    if (nextIndex < this.data.frames.length) {
      this.goToFrame(nextIndex, play);
    } else if (this.loop) {
      this.goToFrame(0, play);
    }
  }

  /**
   * Go to the previous frame.
   */
  goToPrevFrame(play: boolean = false): void {
    const prevIndex = this.currentFrame - 1;
    if (prevIndex >= 0) {
      this.goToFrame(prevIndex, play);
    } else if (this.loop) {
      this.goToFrame(this.data.frames.length - 1, play);
    }
  }

  /**
   * Go to the first frame.
   */
  goToFirstFrame(play: boolean = false): void {
    this.goToFrame(0, play);
  }

  /**
   * Go to the last frame.
   */
  goToLastFrame(play: boolean = false): void {
    this.goToFrame(this.data.frames.length - 1, play);
  }

  // ============================================================================
  // Settings
  // ============================================================================

  /**
   * Set playback speed multiplier.
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
    this.animation.setSpeed(this.speed);
  }

  /**
   * Get current playback speed.
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Set loop mode.
   */
  setLoop(loop: boolean): void {
    this.loop = loop;
  }

  /**
   * Get current loop setting.
   */
  getLoop(): boolean {
    return this.loop;
  }

  /**
   * Set zoom level and re-render.
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(10, zoom));
    this.resize();
    this.render();
  }

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * Override grid visibility. Pass undefined to use data metadata value.
   */
  setShowGrid(showGrid?: boolean): void {
    this.showGridOverride = showGrid;
    this.render();
  }

  /**
   * Get effective grid visibility.
   */
  getShowGrid(): boolean {
    return this.showGridOverride ?? this.data.metadata.showGrid;
  }

  /**
   * Override background color. Pass undefined to use data metadata value.
   */
  setBackgroundColor(backgroundColor?: string): void {
    this.backgroundColorOverride = backgroundColor;
    this.resize();
    this.render();
  }

  /**
   * Get effective background color.
   */
  getBackgroundColor(): string {
    return (
      this.backgroundColorOverride ??
      resolveColor(
        this.data.colors,
        this.data.metadata.backgroundColor,
        "#c5c5c5"
      )
    );
  }

  // ============================================================================
  // State Getters
  // ============================================================================

  /**
   * Get the current player state.
   */
  getState(): DotPlayerState {
    const frame = this.data.frames[this.currentFrame];
    const frameProgress =
      frame && frame.duration > 0
        ? clamp(this.playhead / frame.duration, 0, 1)
        : 0;

    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentFrame: this.currentFrame,
      totalFrames: this.data.frames.length,
      playhead: this.playhead,
      frameProgress,
      speed: this.speed,
      loop: this.loop,
    };
  }

  /**
   * Get current frame index.
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Get total number of frames.
   */
  getTotalFrames(): number {
    return this.data.frames.length;
  }

  /**
   * Get current playhead position in milliseconds.
   */
  getPlayhead(): number {
    return this.playhead;
  }

  /**
   * Get current frame progress (0-1).
   */
  getFrameProgress(): number {
    const frame = this.data.frames[this.currentFrame];
    if (!frame || frame.duration <= 0) {
      return 0;
    }
    return clamp(this.playhead / frame.duration, 0, 1);
  }

  /**
   * Check if player is currently playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if player is currently paused.
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Load new animation data.
   */
  loadData(data: DotPlayerData): void {
    if (this.isDestroyed) {
      return;
    }

    this.stop();
    this.data = validatePlayerData(data);
    this.currentFrame = 0;
    this.playhead = 0;
    this.resize();
    this.render();
  }

  /**
   * Get the current animation data.
   */
  getData(): DotPlayerData {
    return this.data;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  /**
   * Calculate scaled canvas layout metrics for current zoom.
   */
  private getCanvasLayout() {
    const { gridSize, dotGap, dotSize, gridDotSize } = this.data.metadata;
    const scaledDotGap = dotGap * this.zoom;
    const scaledDotRadius = dotSize * this.zoom;
    const scaledGridDotSize = gridDotSize * this.zoom;
    const canvasPadding = Math.max(
      scaledGridDotSize / 2,
      scaledDotRadius + CANVAS_RENDERING.playerPenTipRadiusOffset,
      1
    );
    const { canvasSize, gridOffset } = getCanvasMetrics(
      gridSize,
      scaledDotGap,
      canvasPadding
    );

    return {
      gridSize,
      canvasSize,
      gridOffset,
      scaledDotGap,
      scaledDotRadius,
      scaledGridDotSize,
    };
  }

  /**
   * Recalculate canvas size based on data and zoom.
   */
  resize(): void {
    if (this.isDestroyed) {
      return;
    }

    const { canvasSize } = this.getCanvasLayout();

    this.ctx = setupCanvas(this.canvas, canvasSize, canvasSize);

    // Update background
    const bgColor =
      this.backgroundColorOverride ??
      resolveColor(
        this.data.colors,
        this.data.metadata.backgroundColor,
        "#c5c5c5"
      );
    this.canvas.style.background = bgColor;
  }

  /**
   * Force a render of the current state.
   */
  render(): void {
    if (this.isDestroyed || !this.ctx) {
      return;
    }

    const frame = this.data.frames[this.currentFrame];
    if (!frame) {
      return;
    }

    const { gridColor, showGrid } = this.data.metadata;
    const {
      gridSize,
      canvasSize,
      gridOffset,
      scaledDotGap,
      scaledDotRadius,
      scaledGridDotSize,
    } = this.getCanvasLayout();

    const renderContext: RenderContext = {
      ctx: this.ctx,
      canvasSize,
      gridOffset,
      dotGap: scaledDotGap,
      dotRadius: scaledDotRadius,
      gridSize,
      gridColor,
      gridDotSize: scaledGridDotSize,
      showGrid: this.showGridOverride ?? showGrid,
      colors: this.data.colors,
      connectionStrokeScale: CANVAS_RENDERING.playerConnectionStrokeScale,
      penTipRadiusOffset: CANVAS_RENDERING.playerPenTipRadiusOffset,
      penTipShadowBlur: CANVAS_RENDERING.playerPenTipShadowBlur,
      penTipColor: PLAYER_PEN_TIP_COLOR,
    };

    renderFrame(
      renderContext,
      {
        frame,
        frameIndex: this.currentFrame,
        totalFrames: this.data.frames.length,
        playhead: this.playhead,
        settings: this.data.settings,
        frames: this.data.frames,
      },
      this.data.autoConnections
    );
  }

  // ============================================================================
  // Events
  // ============================================================================

  /**
   * Subscribe to a player event.
   * Returns an unsubscribe function.
   */
  on<T extends DotPlayerEventType>(
    event: T,
    callback: EventCallback<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<DotPlayerEventType>);

    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from a player event.
   */
  off<T extends DotPlayerEventType>(
    event: T,
    callback?: EventCallback<T>
  ): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)?.delete(callback as EventCallback<DotPlayerEventType>);
  }

  /**
   * Emit an event to all listeners.
   */
  private emit<T extends DotPlayerEventType>(
    event: T,
    data: DotPlayerEventMap[T]
  ): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Destroy the player and clean up resources.
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.emit("destroy", undefined);

    this.animation.destroy();
    this.listeners.clear();

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.ctx = null;
    this.isDestroyed = true;
  }

  // ============================================================================
  // Internal Animation Handlers
  // ============================================================================

  /**
   * Start animation for a specific frame.
   */
  private startFrameAnimation(frameIndex: number): void {
    const frame = this.data.frames[frameIndex];
    if (!frame) {
      return;
    }

    const duration = Math.max(frame.duration, 1);
    const fromTime = clamp(this.playhead, 0, duration);

    if (fromTime >= duration) {
      this.handleFrameComplete(frameIndex);
      return;
    }

    this.animation.start(fromTime, duration);
  }

  /**
   * Handle animation update from controller.
   */
  private handleAnimationUpdate = (playhead: number): void => {
    this.playhead = playhead;
    this.render();

    const frame = this.data.frames[this.currentFrame];
    if (frame) {
      this.emit("enterFrame", {
        frameIndex: this.currentFrame,
        playhead: this.playhead,
        progress: clamp(this.playhead / frame.duration, 0, 1),
      });
    }
  };

  /**
   * Handle animation complete from controller.
   */
  private handleAnimationComplete = (): void => {
    this.handleFrameComplete(this.currentFrame);
  };

  /**
   * Handle frame completion - advance to next frame or loop.
   */
  private handleFrameComplete(frameIndex: number): void {
    const lastFrameIndex = this.data.frames.length - 1;

    if (frameIndex < lastFrameIndex) {
      // Advance to next frame
      this.currentFrame = frameIndex + 1;
      this.playhead = 0;

      const frame = this.data.frames[this.currentFrame];
      this.emit("frameChange", {
        frameIndex: this.currentFrame,
        frameName: frame?.name ?? "",
      });

      if (this.isPlaying) {
        this.startFrameAnimation(this.currentFrame);
      }
    } else if (this.loop) {
      // Loop back to first frame
      this.emit("loopComplete", undefined);

      this.currentFrame = 0;
      this.playhead = 0;

      const frame = this.data.frames[this.currentFrame];
      this.emit("frameChange", {
        frameIndex: this.currentFrame,
        frameName: frame?.name ?? "",
      });

      if (this.isPlaying) {
        this.startFrameAnimation(this.currentFrame);
      }
    } else {
      // Animation complete
      this.isPlaying = false;
      this.isPaused = false;
      this.emit("complete", undefined);
    }
  }
}
