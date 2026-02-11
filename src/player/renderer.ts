import { easingFunctions } from "../lib/easing";
import {
  DEFAULT_CONNECTION_COLOR,
  DEFAULT_DOT_COLOR,
  DEFAULT_DOT_COLOR_TRANSITION,
  DEFAULT_DOT_COLOR_TRANSITION_EASING,
} from "../lib/constants";
import type {
  AutoConnection,
  DotPlayerGroup,
  FrameRenderState,
  RenderContext,
} from "./types";
import {
  buildConnectionPaths,
  clamp,
  createPositionKey,
  deriveConnectionKey,
  deriveConnectionKeySet,
  deriveDotColorMap,
  deriveDotMap,
  deriveDotPositionSet,
  mixColors,
  resolveColor,
} from "./utils";
import { findPath, buildObstacleSet } from "../lib/pathfinding";

// ============================================================================
// Group Lookup Utilities
// ============================================================================

/**
 * Build a map from dot ID to its containing group (if any)
 */
function buildDotToGroupMap(
  groups: DotPlayerGroup[],
): Map<string, DotPlayerGroup> {
  const map = new Map<string, DotPlayerGroup>();
  for (const group of groups) {
    if (!group.visible) continue;
    for (const dotId of group.dotIds) {
      map.set(dotId, group);
    }
  }
  return map;
}

/**
 * Build a map from connection ID to its containing group (if any)
 */
function buildConnectionToGroupMap(
  groups: DotPlayerGroup[],
): Map<string, DotPlayerGroup> {
  const map = new Map<string, DotPlayerGroup>();
  for (const group of groups) {
    if (!group.visible) continue;
    for (const connId of group.connectionIds) {
      map.set(connId, group);
    }
  }
  return map;
}

/**
 * Renders a single frame to the canvas.
 * This is the main rendering function that handles all visual output.
 */
export function renderFrame(
  context: RenderContext,
  state: FrameRenderState,
  autoConnections?: AutoConnection[],
): void {
  const { ctx, canvasSize, colors, gridOffset } = context;
  const { frame, frameIndex, totalFrames, playhead, settings, frames } = state;
  const animateDots = frame.animateDots !== false;
  const animateConnections = frame.animateConnections !== false;

  // Clear canvas
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.save();
  ctx.translate(gridOffset, gridOffset);

  // Render grid
  if (context.showGrid) {
    renderGrid(context);
  }

  // Calculate frame progress and easing
  const baseProgress =
    frame.duration > 0 ? clamp(playhead / frame.duration, 0, 1) : 0;
  const ease = easingFunctions[frame.easing] ?? easingFunctions.linear;
  const easedProgress = ease(baseProgress);
  const easedTime = frame.duration * easedProgress;

  // Determine adjacent frames for transitions
  const lastFrameIndex = totalFrames - 1;
  const prevFrameIndex = frameIndex - 1;
  const nextFrameIndex = frameIndex + 1;

  const prevFrame =
    prevFrameIndex >= 0
      ? frames[prevFrameIndex]
      : settings.loopPlayback
        ? frames[lastFrameIndex]
        : undefined;

  const nextFrame =
    nextFrameIndex <= lastFrameIndex
      ? frames[nextFrameIndex]
      : settings.loopPlayback
        ? frames[0]
        : undefined;

  // Determine fade behavior flags
  // When fadeInOnStart is ON and we're on frame 0, force fade-in (don't use prevFrame positions)
  // When fadeOutOnEnd is ON and we're on the last frame, force fade-out (don't use nextFrame positions)
  const forceStartFadeIn = frameIndex === 0 && settings.fadeInOnStart;
  const forceEndFadeOut =
    frameIndex === lastFrameIndex && settings.fadeOutOnEnd;
  const forceConnectionStartFadeIn =
    frameIndex === 0 && settings.connectionFadeInOnStart;
  const forceConnectionEndFadeOut =
    frameIndex === lastFrameIndex && settings.connectionFadeOutOnEnd;

  // Disable fade when we're at the boundary and the fade setting is OFF (and not looping)
  const disableStartFadeIn =
    frameIndex === 0 && !settings.fadeInOnStart && !settings.loopPlayback;
  const disableEndFadeOut =
    frameIndex === lastFrameIndex &&
    !settings.fadeOutOnEnd &&
    !settings.loopPlayback;
  const disableConnectionStartFadeIn =
    frameIndex === 0 &&
    !settings.connectionFadeInOnStart &&
    !settings.loopPlayback;
  const disableConnectionEndFadeOut =
    frameIndex === lastFrameIndex &&
    !settings.connectionFadeOutOnEnd &&
    !settings.loopPlayback;

  // Build position and connection sets for transitions
  // forceStartFadeIn: use empty set so all dots appear as "new" and fade in
  // disableStartFadeIn: use current frame positions so no dots appear as "new"
  const prevDotPositions = animateDots
    ? forceStartFadeIn
      ? new Set<string>()
      : disableStartFadeIn
        ? deriveDotPositionSet(frame.dots)
        : prevFrame
          ? deriveDotPositionSet(prevFrame.dots)
          : new Set<string>()
    : deriveDotPositionSet(frame.dots);

  const prevDotColors = disableStartFadeIn
    ? deriveDotColorMap(frame)
    : deriveDotColorMap(prevFrame);

  // forceEndFadeOut: use empty set so all dots appear as "leaving" and fade out
  // disableEndFadeOut: use current frame positions so no dots appear as "leaving"
  const nextDotPositions = animateDots
    ? forceEndFadeOut
      ? new Set<string>()
      : disableEndFadeOut
        ? deriveDotPositionSet(frame.dots)
        : nextFrame
          ? deriveDotPositionSet(nextFrame.dots)
          : new Set<string>()
    : deriveDotPositionSet(frame.dots);

  // forceConnectionStartFadeIn: use empty set so all connections appear as "new"
  // disableConnectionStartFadeIn: use current frame connections so none appear as "new"
  const prevConnectionKeys = animateConnections
    ? forceConnectionStartFadeIn
      ? new Set<string>()
      : disableConnectionStartFadeIn
        ? deriveConnectionKeySet(frame)
        : deriveConnectionKeySet(prevFrame)
    : deriveConnectionKeySet(frame);

  // forceConnectionEndFadeOut: use empty set so all connections appear as "leaving"
  // disableConnectionEndFadeOut: use current frame connections so none appear as "leaving"
  const nextConnectionKeys = animateConnections
    ? forceConnectionEndFadeOut
      ? new Set<string>()
      : disableConnectionEndFadeOut
        ? deriveConnectionKeySet(frame)
        : deriveConnectionKeySet(nextFrame)
    : deriveConnectionKeySet(frame);

  // Build dot map for this frame
  const dotById = deriveDotMap(frame.dots);

  // Build group lookup maps for animation overrides
  const dotToGroup = buildDotToGroupMap(frame.groups);
  const connectionToGroup = buildConnectionToGroupMap(frame.groups);

  // Calculate stagger and timing values
  // When frame.dotStagger is 0, all dots appear simultaneously (no stagger)
  // Otherwise, use the configured value clamped to sensible limits
  const dotCount = Math.max(frame.dots.length, 1);
  const dotStagger =
    frame.dotStagger === 0
      ? 0
      : Math.min(
          frame.dotStagger,
          frame.dotFadeInDuration / 4,
          (frame.duration * 0.4) / dotCount,
        );
  const fadeOutDefault = Math.max(frame.dotFadeOutDuration, 1);

  const colorTransitionDuration = Math.max(
    frame.dotColorTransitionDuration ?? DEFAULT_DOT_COLOR_TRANSITION,
    0,
  );
  const colorEase =
    easingFunctions[
      frame.dotColorTransitionEasing ?? DEFAULT_DOT_COLOR_TRANSITION_EASING
    ] ?? easingFunctions.linear;
  const colorTransitionProgress =
    colorTransitionDuration <= 0
      ? 1
      : colorEase(clamp(playhead / colorTransitionDuration, 0, 1));

  // Set line width for connections
  ctx.lineWidth = Math.max(
    1,
    context.dotRadius * context.connectionStrokeScale,
  );

  // Render existing connections (from previous frame)
  renderExistingConnections(
    context,
    frame,
    dotById,
    prevConnectionKeys,
    nextConnectionKeys,
    easedTime,
    fadeOutDefault,
    connectionToGroup,
  );

  // Render animating connections (new in this frame)
  if (animateConnections) {
    renderAnimatingConnections(
      context,
      frame,
      dotById,
      prevConnectionKeys,
      nextConnectionKeys,
      easedTime,
      fadeOutDefault,
      connectionToGroup,
    );
  }

  // Render auto-connections (animation-wide pathfinding connections)
  if (autoConnections && autoConnections.length > 0) {
    // Calculate cumulative time from animation start
    let cumulativeTime = 0;
    for (let i = 0; i < frameIndex; i++) {
      cumulativeTime += frames[i].duration;
    }
    cumulativeTime += playhead;

    renderAutoConnections(context, frame, autoConnections, cumulativeTime);
  }

  // Render dots
  renderDots(
    context,
    frame,
    prevDotPositions,
    nextDotPositions,
    prevDotColors,
    easedTime,
    dotStagger,
    fadeOutDefault,
    colorTransitionProgress,
    dotToGroup,
  );
  ctx.restore();
}

/**
 * Renders the background grid dots.
 */
function renderGrid(context: RenderContext): void {
  const { ctx, gridSize, dotGap, gridColor, gridDotSize } = context;

  ctx.fillStyle = gridColor;
  for (let x = 0; x < gridSize; x += 1) {
    for (let y = 0; y < gridSize; y += 1) {
      ctx.fillRect(
        x * dotGap - gridDotSize / 2,
        y * dotGap - gridDotSize / 2,
        gridDotSize,
        gridDotSize,
      );
    }
  }
}

/**
 * Renders connections that existed in the previous frame (no reveal animation).
 */
function renderExistingConnections(
  context: RenderContext,
  frame: FrameRenderState["frame"],
  dotById: Map<string, FrameRenderState["frame"]["dots"][0]>,
  prevConnectionKeys: Set<string>,
  nextConnectionKeys: Set<string>,
  easedTime: number,
  fadeOutDefault: number,
  connectionToGroup: Map<string, DotPlayerGroup>,
): void {
  const { ctx, dotGap, colors } = context;

  for (const connection of frame.connections) {
    const from = dotById.get(connection.from);
    const to = dotById.get(connection.to);
    if (!from || !to) {
      continue;
    }

    const key = deriveConnectionKey(from, to);
    const isNew = !prevConnectionKeys.has(key);
    if (isNew) {
      continue;
    }

    // Check for group animation overrides
    const group = connectionToGroup.get(connection.id);
    const groupFadeOut = group?.animationOverrides?.fadeOutDuration;
    const effectiveFadeOut = groupFadeOut ?? fadeOutDefault;

    const isLeaving = !nextConnectionKeys.has(key);
    const fadeOut = isLeaving
      ? clamp((frame.duration - easedTime) / effectiveFadeOut, 0, 1)
      : 1;

    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.strokeStyle = resolveColor(
      colors,
      connection.color,
      DEFAULT_CONNECTION_COLOR,
    );
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(from.x * dotGap, from.y * dotGap);
    ctx.lineTo(to.x * dotGap, to.y * dotGap);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Renders connections that are new in this frame with progressive reveal animation.
 */
function renderAnimatingConnections(
  context: RenderContext,
  frame: FrameRenderState["frame"],
  dotById: Map<string, FrameRenderState["frame"]["dots"][0]>,
  prevConnectionKeys: Set<string>,
  nextConnectionKeys: Set<string>,
  easedTime: number,
  fadeOutDefault: number,
  connectionToGroup: Map<string, DotPlayerGroup>,
): void {
  const {
    ctx,
    dotGap,
    dotRadius,
    colors,
    penTipColor,
    penTipRadiusOffset,
    penTipShadowBlur,
  } = context;

  // Filter to only new connections
  const newConnections = frame.connections.filter((connection) => {
    const from = dotById.get(connection.from);
    const to = dotById.get(connection.to);
    if (!from || !to) {
      return false;
    }
    const key = deriveConnectionKey(from, to);
    return !prevConnectionKeys.has(key);
  });

  const connectionPaths = buildConnectionPaths(newConnections, dotById);
  let pathIndex = 0;

  for (const path of connectionPaths) {
    if (!path.length) {
      continue;
    }

    // Check for group animation overrides on first segment
    const firstConnection = path[0]?.connection;
    const group = firstConnection
      ? connectionToGroup.get(firstConnection.id)
      : undefined;
    const groupDuration =
      group?.animationOverrides?.connectionAnimationDuration;
    const groupStagger = group?.animationOverrides?.connectionStagger;

    const override = path.find(
      (segment) => segment.connection.revealDuration !== undefined,
    );
    const pathDuration = Math.max(
      override?.connection.revealDuration ??
        groupDuration ??
        frame.connectionAnimationDuration,
      1,
    );
    const effectiveStagger = groupStagger ?? frame.connectionStagger;
    const totalLength = path.reduce(
      (sum, segment) => sum + (segment.length || 1),
      0,
    );
    const pathStart = pathIndex * effectiveStagger;
    const elapsed = easedTime - pathStart;

    if (elapsed <= 0) {
      pathIndex += 1;
      continue;
    }

    let accumulated = 0;
    for (const segment of path) {
      const segmentDuration =
        pathDuration * ((segment.length || 1) / totalLength);
      const local = elapsed - accumulated;
      accumulated += segmentDuration;

      if (local <= 0) {
        continue;
      }

      // Check for group fade out override
      const segmentGroup = connectionToGroup.get(segment.connection.id);
      const groupFadeOut = segmentGroup?.animationOverrides?.fadeOutDuration;
      const effectiveFadeOut = groupFadeOut ?? fadeOutDefault;

      const progress = clamp(local / Math.max(segmentDuration, 1), 0, 1);
      const isLeaving = !nextConnectionKeys.has(segment.key);
      const fadeOut = isLeaving
        ? clamp((frame.duration - easedTime) / effectiveFadeOut, 0, 1)
        : 1;

      const x1 = segment.from.x * dotGap;
      const y1 = segment.from.y * dotGap;
      const x2 = segment.to.x * dotGap;
      const y2 = segment.to.y * dotGap;
      const x = x1 + (x2 - x1) * progress;
      const y = y1 + (y2 - y1) * progress;

      ctx.save();
      ctx.globalAlpha = fadeOut;
      ctx.strokeStyle = resolveColor(
        colors,
        segment.connection.color,
        DEFAULT_CONNECTION_COLOR,
      );
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Draw pen tip if still animating
      if (progress < 1) {
        ctx.fillStyle = penTipColor;
        ctx.shadowColor = resolveColor(
          colors,
          segment.connection.color,
          DEFAULT_CONNECTION_COLOR,
        );
        ctx.shadowBlur = penTipShadowBlur;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius + penTipRadiusOffset, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    pathIndex += 1;
  }
}

/**
 * Renders all dots with fade-in, fade-out, scale, and color transition effects.
 */
function renderDots(
  context: RenderContext,
  frame: FrameRenderState["frame"],
  prevDotPositions: Set<string>,
  nextDotPositions: Set<string>,
  prevDotColors: Map<string, number>,
  easedTime: number,
  dotStagger: number,
  fadeOutDefault: number,
  colorTransitionProgress: number,
  dotToGroup: Map<string, DotPlayerGroup>,
): void {
  const { ctx, dotGap, dotRadius, colors } = context;

  for (let index = 0; index < frame.dots.length; index += 1) {
    const dot = frame.dots[index];
    const key = createPositionKey(dot.x, dot.y);
    const isNew = !prevDotPositions.has(key);
    const isLeaving = !nextDotPositions.has(key);

    // Check for group animation overrides
    const group = dotToGroup.get(dot.id);
    const groupFadeIn = group?.animationOverrides?.fadeInDuration;
    const groupFadeOut = group?.animationOverrides?.fadeOutDuration;

    const fadeInDuration = Math.max(
      dot.fadeInDuration ?? groupFadeIn ?? frame.dotFadeInDuration,
      1,
    );
    const fadeOutDuration = Math.max(
      dot.fadeOutDuration ?? groupFadeOut ?? frame.dotFadeOutDuration,
      1,
    );

    const delay = isNew ? index * dotStagger : 0;
    const local = easedTime - delay;
    const fadeIn = isNew ? clamp(local / fadeInDuration, 0, 1) : 1;
    const fadeOut = isLeaving
      ? clamp((frame.duration - easedTime) / fadeOutDuration, 0, 1)
      : 1;
    const alpha = Math.min(fadeIn, fadeOut);

    if (alpha <= 0) {
      continue;
    }

    const scale = 0.6 + 0.4 * alpha;
    const currentColor = resolveColor(colors, dot.color, DEFAULT_DOT_COLOR);
    let fillColor = currentColor;

    // Handle color transition for dots that existed in previous frame
    if (!isNew) {
      const prevColorRef = prevDotColors.get(key);
      if (prevColorRef !== undefined && prevColorRef !== dot.color) {
        const prevColor = resolveColor(colors, prevColorRef, DEFAULT_DOT_COLOR);
        const blended = mixColors(
          prevColor,
          currentColor,
          colorTransitionProgress,
        );
        if (blended) {
          fillColor = blended;
        }
      }
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(dot.x * dotGap, dot.y * dotGap, dotRadius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Renders auto-connections with A* pathfinding and trace animation.
 */
function renderAutoConnections(
  context: RenderContext,
  frame: FrameRenderState["frame"],
  autoConnections: AutoConnection[],
  cumulativeTime: number,
): void {
  const {
    ctx,
    dotGap,
    dotRadius,
    gridSize,
    colors,
    penTipColor,
    penTipRadiusOffset,
    penTipShadowBlur,
  } = context;

  // Build obstacle set from current frame dots
  const obstacles = buildObstacleSet(frame.dots);

  for (const autoConn of autoConnections) {
    // Calculate elapsed time since this auto-connection started
    const elapsed = cumulativeTime - autoConn.startTime;
    if (elapsed < 0) continue; // Not started yet

    // Calculate animation phases
    const traceInEnd = autoConn.traceInDuration;
    const stayEnd = traceInEnd + (autoConn.stayDuration ?? Infinity);
    const traceOutEnd =
      autoConn.traceOutDuration !== undefined
        ? stayEnd + autoConn.traceOutDuration
        : Infinity;

    // Determine draw progress based on phase
    // progressStart/progressEnd represent the portion of the path to draw (0-1)
    let progressStart = 0;
    let progressEnd = 1;
    let isTracing = false;

    if (elapsed < traceInEnd) {
      // Trace in phase
      const traceInProgress = clamp(elapsed / autoConn.traceInDuration, 0, 1);
      if (autoConn.traceInReverse) {
        // Draw from end backwards: progressStart shrinks from 1 to 0
        progressStart = 1 - traceInProgress;
        progressEnd = 1;
      } else {
        // Draw from start forwards: progressEnd grows from 0 to 1
        progressStart = 0;
        progressEnd = traceInProgress;
      }
      isTracing = true;
    } else if (elapsed < stayEnd) {
      // Stay phase - fully drawn
      progressStart = 0;
      progressEnd = 1;
    } else if (
      elapsed < traceOutEnd &&
      autoConn.traceOutDuration !== undefined
    ) {
      // Trace out phase
      const traceOutProgress = clamp(
        (elapsed - stayEnd) / autoConn.traceOutDuration,
        0,
        1,
      );
      if (autoConn.traceOutReverse) {
        // Erase from end: progressEnd shrinks from 1 to 0
        progressStart = 0;
        progressEnd = 1 - traceOutProgress;
      } else {
        // Erase from start: progressStart grows from 0 to 1
        progressStart = traceOutProgress;
        progressEnd = 1;
      }
      isTracing = true;
    } else if (autoConn.traceOutDuration !== undefined) {
      // After trace out - not visible
      continue;
    } else {
      // No trace out, permanent
      progressStart = 0;
      progressEnd = 1;
    }

    if (progressEnd <= progressStart) continue;

    // Find path using A* (exclude start and end from obstacles)
    const path = findPath(
      { x: autoConn.fromX, y: autoConn.fromY },
      { x: autoConn.toX, y: autoConn.toY },
      gridSize,
      obstacles,
    );

    if (!path || path.length < 2) continue;

    // Calculate total path length using Euclidean distance for diagonal support
    let totalLength = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    const startLength = totalLength * progressStart;
    const endLength = totalLength * progressEnd;

    const color = resolveColor(
      colors,
      autoConn.color,
      DEFAULT_CONNECTION_COLOR,
    );
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, dotRadius * context.connectionStrokeScale);
    ctx.lineCap = "round";
    ctx.beginPath();

    let penTipX = 0;
    let penTipY = 0;
    let showPenTip = false;
    let accumulatedLength = 0;
    let pathStarted = false;

    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      const segmentStart = accumulatedLength;
      const segmentEnd = accumulatedLength + segmentLength;

      // Check if this segment intersects with the visible range [startLength, endLength]
      if (segmentEnd <= startLength) {
        // Segment is entirely before visible range
        accumulatedLength = segmentEnd;
        continue;
      }

      if (segmentStart >= endLength) {
        // Segment is entirely after visible range - we're done
        break;
      }

      // Calculate the portion of this segment that's visible
      const visibleStart = Math.max(segmentStart, startLength);
      const visibleEnd = Math.min(segmentEnd, endLength);

      // Convert to segment-local t values (0-1)
      const tStart = (visibleStart - segmentStart) / segmentLength;
      const tEnd = (visibleEnd - segmentStart) / segmentLength;

      const x0 = path[i - 1].x + (path[i].x - path[i - 1].x) * tStart;
      const y0 = path[i - 1].y + (path[i].y - path[i - 1].y) * tStart;
      const x1 = path[i - 1].x + (path[i].x - path[i - 1].x) * tEnd;
      const y1 = path[i - 1].y + (path[i].y - path[i - 1].y) * tEnd;

      if (!pathStarted) {
        ctx.moveTo(x0 * dotGap, y0 * dotGap);
        pathStarted = true;
      }

      ctx.lineTo(x1 * dotGap, y1 * dotGap);
      penTipX = x1 * dotGap;
      penTipY = y1 * dotGap;

      // Show pen tip if we're not at the full end
      if (visibleEnd < totalLength) {
        showPenTip = true;
      }

      accumulatedLength = segmentEnd;
    }

    ctx.stroke();

    // Draw pen tip if still tracing
    if (isTracing && showPenTip) {
      ctx.fillStyle = penTipColor;
      ctx.shadowColor = color;
      ctx.shadowBlur = penTipShadowBlur;
      ctx.beginPath();
      ctx.arc(penTipX, penTipY, dotRadius + penTipRadiusOffset, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
