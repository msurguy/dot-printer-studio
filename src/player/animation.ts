/**
 * AnimationController manages frame timing using requestAnimationFrame.
 * This provides smooth animation without external dependencies.
 */
export class AnimationController {
  private rafId: number | null = null;
  private lastTime: number = 0;
  private playhead: number = 0;
  private duration: number = 0;
  private speed: number = 1;
  private isPaused: boolean = false;

  private onUpdate: ((playhead: number) => void) | null = null;
  private onComplete: (() => void) | null = null;

  /**
   * Set the callback for playhead updates.
   */
  setOnUpdate(callback: (playhead: number) => void): void {
    this.onUpdate = callback;
  }

  /**
   * Set the callback for animation completion.
   */
  setOnComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  /**
   * Start or resume animation from a specific time to target duration.
   */
  start(fromTime: number, duration: number): void {
    this.stop();
    this.playhead = fromTime;
    this.duration = duration;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.tick();
  }

  /**
   * Resume animation from paused state.
   */
  resume(): void {
    if (!this.isPaused || this.rafId !== null) {
      return;
    }
    this.isPaused = false;
    this.lastTime = performance.now();
    this.tick();
  }

  /**
   * Pause the animation.
   */
  pause(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isPaused = true;
  }

  /**
   * Stop the animation completely and reset.
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isPaused = false;
    this.playhead = 0;
  }

  /**
   * Set playback speed multiplier.
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
  }

  /**
   * Get current playback speed.
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Get current playhead position.
   */
  getPlayhead(): number {
    return this.playhead;
  }

  /**
   * Set playhead position directly (for seeking).
   */
  setPlayhead(time: number): void {
    this.playhead = Math.max(0, Math.min(time, this.duration));
  }

  /**
   * Check if animation is currently paused.
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Check if animation is currently running.
   */
  isRunning(): boolean {
    return this.rafId !== null;
  }

  /**
   * Internal animation tick using requestAnimationFrame.
   */
  private tick = (): void => {
    const now = performance.now();
    const delta = (now - this.lastTime) * this.speed;
    this.lastTime = now;

    this.playhead = Math.min(this.playhead + delta, this.duration);

    // Notify update
    if (this.onUpdate) {
      this.onUpdate(this.playhead);
    }

    // Check for completion
    if (this.playhead >= this.duration) {
      this.rafId = null;
      if (this.onComplete) {
        this.onComplete();
      }
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.stop();
    this.onUpdate = null;
    this.onComplete = null;
  }
}
