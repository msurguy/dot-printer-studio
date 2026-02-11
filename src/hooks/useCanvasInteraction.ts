import { useState, useRef, useCallback, type PointerEvent } from "react";
import { clamp, createPositionKey, derivePositionMap } from "../lib/canvas";
import {
  ensureColorRef,
  makeId,
  type AutoConnection,
  type Connection,
  type Dot,
  type Frame,
} from "../lib/project";
import { buildTextDots } from "../lib/text";
import {
  AddDotsCommand,
  RemoveDotsCommand,
  AddConnectionsCommand,
  AddAutoConnectionCommand,
  TransformDotsCommand,
} from "../lib/commands";
import { type MarqueeRect, type Point, getSelectionMode } from "../lib/selection";
import {
  selectDotsInRect,
  selectDotsInLasso,
} from "../lib/selection/utils";
import { simplifyPath } from "../lib/selection/geometry";
import { getGroupMembersFromSelection } from "../lib/selection/groupSelection";
import { translateDots, rotate } from "../lib/transforms";
import { createShape, isShapeTool, type ShapeType } from "../lib/shapes";
import { parseDurationInput } from "../components/editorUtils";
import type { Tool } from "../components/editorUtils";
import type { Command } from "../lib/commands/types";
import type { Group } from "../lib/project";
import type { SvgReferenceState } from "./useSvgReference";
import type { RotationHandleState } from "./useRotation";

interface SelectionDragState {
  start: Point;
  beforeDots: Dot[];
  lastDelta: Point;
}

export interface UseCanvasInteractionReturn {
  marqueeRect: MarqueeRect | null;
  setMarqueeRect: React.Dispatch<React.SetStateAction<MarqueeRect | null>>;
  lassoPath: Point[] | null;
  setLassoPath: React.Dispatch<React.SetStateAction<Point[] | null>>;
  shapeStart: Point | null;
  setShapeStart: React.Dispatch<React.SetStateAction<Point | null>>;
  shapePreview: Point[] | null;
  setShapePreview: React.Dispatch<React.SetStateAction<Point[] | null>>;
  getGridCoords: (event: PointerEvent<HTMLCanvasElement>) => { x: number; y: number };
  getPixelCoords: (event: PointerEvent<HTMLCanvasElement>) => { x: number; y: number };
  handleCanvasPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  handleCanvasPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  handleCanvasPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
}

interface UseCanvasInteractionParams {
  frame: Frame | undefined;
  tool: Tool;
  gridSize: number;
  zoom: number;
  dotGap: number;
  canvasPadding: number;
  dotsByPosition: Map<string, Dot>;
  projectColors: string[];
  dotColor: string;
  connectionColor: string;
  connectionDurationOverride: string;
  textValue: string;
  shapeFilled: boolean;
  polygonSides: number;
  starPoints: number;
  autoConnectShapes: boolean;
  pendingConnectionFrom: string | null;
  setPendingConnectionFrom: React.Dispatch<React.SetStateAction<string | null>>;
  pendingAutoConnectFrom: Point | null;
  setPendingAutoConnectFrom: React.Dispatch<React.SetStateAction<Point | null>>;
  selectedDotIds: string[];
  selectedConnectionIds: string[];
  selectedGroupIds: string[];
  activeFrameIndex: number;
  setSelection: (dotIds: string[], connectionIds?: string[]) => void;
  addToSelection: (dotIds: string[]) => void;
  removeFromSelection: (dotIds: string[]) => void;
  toggleSelection: (dotIds: string[]) => void;
  clearSelection: () => void;
  updateActiveFrame: (updater: (frame: Frame, project: { colors: string[] }) => Frame) => void;
  executeCommand: (command: Command) => void;
  beginBatch: (label: string) => void;
  commitBatch: () => void;
  // SVG reference
  svgReference: SvgReferenceState;
  setSvgReference: React.Dispatch<React.SetStateAction<SvgReferenceState>>;
  previousToolRef: React.MutableRefObject<Tool | null>;
  setTool: React.Dispatch<React.SetStateAction<Tool>>;
  // Rotation
  rotationHandleRef: React.MutableRefObject<RotationHandleState | null>;
  isRotating: boolean;
  setIsRotating: React.Dispatch<React.SetStateAction<boolean>>;
  rotationStartAngle: number;
  setRotationStartAngle: React.Dispatch<React.SetStateAction<number>>;
  rotationAngle: string;
  setRotationAngle: React.Dispatch<React.SetStateAction<string>>;
  setRotationPreview: React.Dispatch<React.SetStateAction<Dot[] | null>>;
}

export const useCanvasInteraction = ({
  frame,
  tool,
  gridSize,
  zoom,
  dotGap,
  canvasPadding,
  dotsByPosition,
  projectColors,
  dotColor,
  connectionColor,
  connectionDurationOverride,
  textValue,
  shapeFilled,
  polygonSides,
  starPoints,
  autoConnectShapes,
  pendingConnectionFrom,
  setPendingConnectionFrom,
  pendingAutoConnectFrom,
  setPendingAutoConnectFrom,
  selectedDotIds,
  selectedConnectionIds,
  selectedGroupIds,
  activeFrameIndex,
  setSelection,
  addToSelection,
  removeFromSelection,
  toggleSelection,
  clearSelection,
  updateActiveFrame,
  executeCommand,
  beginBatch,
  commitBatch,
  svgReference,
  setSvgReference,
  previousToolRef,
  setTool,
  rotationHandleRef,
  isRotating,
  setIsRotating,
  rotationStartAngle,
  setRotationStartAngle,
  rotationAngle,
  setRotationAngle,
  setRotationPreview,
}: UseCanvasInteractionParams): UseCanvasInteractionReturn => {
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [lassoPath, setLassoPath] = useState<Point[] | null>(null);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapePreview, setShapePreview] = useState<Point[] | null>(null);

  const isDragging = useRef(false);
  const selectionDrag = useRef<SelectionDragState | null>(null);
  const dotToolMode = useRef<"add" | "remove" | null>(null);

  const getGridCoords = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const xPx =
        event.clientX -
        rect.left -
        event.currentTarget.clientLeft -
        canvasPadding;
      const yPx =
        event.clientY -
        rect.top -
        event.currentTarget.clientTop -
        canvasPadding;
      const x = clamp(Math.round(xPx / dotGap), 0, gridSize - 1);
      const y = clamp(Math.round(yPx / dotGap), 0, gridSize - 1);
      return { x, y };
    },
    [canvasPadding, dotGap, gridSize]
  );

  const getPixelCoords = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x =
        (event.clientX -
          rect.left -
          event.currentTarget.clientLeft -
          canvasPadding) /
        zoom;
      const y =
        (event.clientY -
          rect.top -
          event.currentTarget.clientTop -
          canvasPadding) /
        zoom;
      return { x, y };
    },
    [canvasPadding, zoom]
  );

  const getMovableDotIds = useCallback(
    (selectionState: {
      selectedDotIds: string[];
      selectedConnectionIds: string[];
      selectedGroupIds: string[];
    }) => {
      if (!frame) return [];
      const dotIdSet = new Set(selectionState.selectedDotIds);

      if (selectionState.selectedGroupIds.length > 0) {
        const groupMembers = getGroupMembersFromSelection(
          selectionState.selectedGroupIds,
          frame.groups
        );
        groupMembers.dotIds.forEach((id) => dotIdSet.add(id));
      }

      if (selectionState.selectedConnectionIds.length > 0) {
        const connIdSet = new Set(selectionState.selectedConnectionIds);
        for (const connection of frame.connections) {
          if (connIdSet.has(connection.id)) {
            dotIdSet.add(connection.from);
            dotIdSet.add(connection.to);
          }
        }
      }

      return Array.from(dotIdSet);
    },
    [frame]
  );

  const clampDragDelta = useCallback(
    (dots: Dot[], delta: Point) => {
      if (dots.length === 0) {
        return { x: 0, y: 0 };
      }

      const xs = dots.map((dot) => dot.x);
      const ys = dots.map((dot) => dot.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      return {
        x: clamp(delta.x, -minX, gridSize - 1 - maxX),
        y: clamp(delta.y, -minY, gridSize - 1 - maxY),
      };
    },
    [gridSize]
  );

  const startSelectionDrag = useCallback(
    (dotIds: string[], start: Point) => {
      if (!frame || dotIds.length === 0) return;
      const dotIdSet = new Set(dotIds);
      const beforeDots = frame.dots
        .filter((dot) => dotIdSet.has(dot.id))
        .map((dot) => ({ ...dot }));

      if (beforeDots.length === 0) return;

      selectionDrag.current = {
        start,
        beforeDots,
        lastDelta: { x: 0, y: 0 },
      };
    },
    [frame]
  );

  const handleCanvasPointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!frame) return;

      // Keep receiving pointer events after leaving canvas bounds.
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      isDragging.current = true;

      const pixelPos = getPixelCoords(event);
      const { x, y } = getGridCoords(event);
      const existingDot = dotsByPosition.get(createPositionKey(x, y));
      const mode = getSelectionMode(event);

      // Check if clicking on rotation handle
      const canUseRotationHandle = tool === "select" || tool === "marquee" || tool === "lasso";
      if (canUseRotationHandle && rotationHandleRef.current) {
        const handle = rotationHandleRef.current;
        const distance = Math.sqrt(
          Math.pow(pixelPos.x * zoom - handle.x, 2) + Math.pow(pixelPos.y * zoom - handle.y, 2)
        );
        const handleRadius = 8;

        if (distance <= handleRadius) {
          const angle = Math.atan2(pixelPos.y * zoom - handle.centerY, pixelPos.x * zoom - handle.centerX);
          const angleDegrees = (angle * 180) / Math.PI + 90;
          setIsRotating(true);
          setRotationStartAngle(angleDegrees);
          setRotationAngle("0");
          return;
        }
      }

      // If in SVG placement mode (or svg tool), click to confirm placement
      if (tool === "svg" || svgReference.isPlacing) {
        const pixelPos = getPixelCoords(event);
        setSvgReference((prev) => {
          const halfWidth = (prev.originalSize.width * prev.scale) / 2;
          const halfHeight = (prev.originalSize.height * prev.scale) / 2;
          const centeredPos = {
            x: pixelPos.x - halfWidth,
            y: pixelPos.y - halfHeight,
          };
          return {
            ...prev,
            isPlacing: false,
            position: centeredPos,
            lastConfirmedPosition: centeredPos,
          };
        });
        if (previousToolRef.current) {
          setTool(previousToolRef.current);
          previousToolRef.current = null;
        }
        return;
      }

      if (tool === "select") {
        if (existingDot && mode === "replace") {
          const currentMovable = getMovableDotIds({
            selectedDotIds,
            selectedConnectionIds,
            selectedGroupIds,
          });

          if (currentMovable.includes(existingDot.id)) {
            startSelectionDrag(currentMovable, { x, y });
            return;
          }

          setSelection([existingDot.id]);
          const nextMovable = getMovableDotIds({
            selectedDotIds: [existingDot.id],
            selectedConnectionIds: [],
            selectedGroupIds: [],
          });
          startSelectionDrag(nextMovable, { x, y });
          return;
        }

        if (existingDot) {
          if (mode === "add") {
            addToSelection([existingDot.id]);
          } else if (mode === "subtract") {
            removeFromSelection([existingDot.id]);
          } else if (mode === "toggle") {
            toggleSelection([existingDot.id]);
          } else {
            setSelection([existingDot.id]);
          }
        } else if (mode === "replace") {
          clearSelection();
        }
        return;
      }

      if (tool === "marquee") {
        setMarqueeRect({ startX: x, startY: y, endX: x, endY: y });
        return;
      }

      if (tool === "lasso") {
        setLassoPath([{ x, y }]);
        return;
      }

      if (isShapeTool(tool)) {
        setShapeStart({ x, y });
        return;
      }

      if (tool === "dot") {
        if (existingDot) {
          dotToolMode.current = "remove";
          const removedConnections = frame.connections.filter(
            (c) => c.from === existingDot.id || c.to === existingDot.id
          );
          executeCommand(
            new RemoveDotsCommand(activeFrameIndex, [existingDot], removedConnections, frame.groups)
          );
        } else {
          dotToolMode.current = "add";
          const { colors, ref } = ensureColorRef(projectColors, dotColor);
          const newDot: Dot = { id: makeId(), x, y, color: ref };
          const addedColors = colors.length > projectColors.length ? [dotColor] : [];
          executeCommand(new AddDotsCommand(activeFrameIndex, [newDot], addedColors));
        }
        return;
      }

      if (tool === "eraser") {
        if (existingDot) {
          const removedConnections = frame.connections.filter(
            (c) => c.from === existingDot.id || c.to === existingDot.id
          );
          executeCommand(
            new RemoveDotsCommand(activeFrameIndex, [existingDot], removedConnections, frame.groups)
          );
          removeFromSelection([existingDot.id]);
          if (pendingConnectionFrom === existingDot.id) {
            setPendingConnectionFrom(null);
          }
        }
        return;
      }

      if (tool === "connect") {
        if (!existingDot) return;
        if (!pendingConnectionFrom) {
          setPendingConnectionFrom(existingDot.id);
          return;
        }
        if (pendingConnectionFrom === existingDot.id) {
          setPendingConnectionFrom(null);
          return;
        }
        const exists = frame.connections.some(
          (c) =>
            (c.from === pendingConnectionFrom && c.to === existingDot.id) ||
            (c.to === pendingConnectionFrom && c.from === existingDot.id)
        );
        if (!exists) {
          const revealDuration = parseDurationInput(connectionDurationOverride);
          const { colors, ref } = ensureColorRef(projectColors, connectionColor);
          const addedColors = colors.length > projectColors.length ? [connectionColor] : [];
          const newConn: Connection = {
            id: makeId(),
            from: pendingConnectionFrom,
            to: existingDot.id,
            color: ref,
            order: frame.connections.length,
            revealDuration,
          };
          executeCommand(new AddConnectionsCommand(activeFrameIndex, [newConn], addedColors));
        }
        setPendingConnectionFrom(null);
        return;
      }

      if (tool === "autoconnect") {
        if (!pendingAutoConnectFrom) {
          setPendingAutoConnectFrom({ x, y });
          return;
        }
        if (pendingAutoConnectFrom.x === x && pendingAutoConnectFrom.y === y) {
          setPendingAutoConnectFrom(null);
          return;
        }
        const { colors, ref } = ensureColorRef(projectColors, connectionColor);
        const addedColors = colors.length > projectColors.length ? [connectionColor] : [];
        const newAutoConn: AutoConnection = {
          id: makeId(),
          fromX: pendingAutoConnectFrom.x,
          fromY: pendingAutoConnectFrom.y,
          toX: x,
          toY: y,
          color: ref,
          traceInDuration: 500,
          traceInReverse: false,
          traceOutReverse: false,
          startTime: 0,
        };
        executeCommand(new AddAutoConnectionCommand(newAutoConn, addedColors));
        setPendingAutoConnectFrom(null);
        return;
      }

      if (tool === "text") {
        if (!textValue.trim()) return;
        const seeds = buildTextDots(textValue, x, y);
        const { colors, ref } = ensureColorRef(projectColors, dotColor);
        const addedColors = colors.length > projectColors.length ? [dotColor] : [];
        const occupied = new Set(frame.dots.map((d) => createPositionKey(d.x, d.y)));
        const newDots: Dot[] = [];

        for (const seed of seeds) {
          if (seed.x < 0 || seed.y < 0 || seed.x >= gridSize || seed.y >= gridSize) continue;
          const key = createPositionKey(seed.x, seed.y);
          if (occupied.has(key)) continue;
          occupied.add(key);
          newDots.push({ id: makeId(), x: seed.x, y: seed.y, color: ref });
        }

        if (newDots.length > 0) {
          executeCommand(new AddDotsCommand(activeFrameIndex, newDots, addedColors, "Place text"));
        }
        return;
      }
    },
    [
      frame,
      tool,
      getGridCoords,
      getPixelCoords,
      dotsByPosition,
      getMovableDotIds,
      startSelectionDrag,
      selectedDotIds,
      selectedConnectionIds,
      selectedGroupIds,
      addToSelection,
      removeFromSelection,
      toggleSelection,
      setSelection,
      clearSelection,
      projectColors,
      dotColor,
      connectionColor,
      connectionDurationOverride,
      pendingConnectionFrom,
      pendingAutoConnectFrom,
      textValue,
      gridSize,
      activeFrameIndex,
      executeCommand,
      svgReference,
      setSvgReference,
      previousToolRef,
      setTool,
      rotationHandleRef,
      zoom,
      setIsRotating,
      setRotationStartAngle,
      setRotationAngle,
      setPendingConnectionFrom,
      setPendingAutoConnectFrom,
    ]
  );

  const handleCanvasPointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!frame) return;

      // Handle rotation dragging
      if (isRotating && rotationHandleRef.current) {
        const pixelPos = getPixelCoords(event);
        const handle = rotationHandleRef.current;
        const angle = Math.atan2(pixelPos.y * zoom - handle.centerY, pixelPos.x * zoom - handle.centerX);
        const angleDegrees = (angle * 180) / Math.PI + 90;
        const rotationDelta = angleDegrees - rotationStartAngle;
        const roundedAngle = Math.round(rotationDelta);
        setRotationAngle(roundedAngle.toString());

        if (selectedDotIds.length > 0 && roundedAngle !== 0) {
          const dotsToTransform = frame.dots.filter((d) => selectedDotIds.includes(d.id));
          const result = rotate(dotsToTransform, roundedAngle, gridSize);
          setRotationPreview(result.dots);
        } else {
          setRotationPreview(null);
        }
        return;
      }

      // Handle SVG placement mode
      if (tool === "svg" || svgReference.isPlacing) {
        const pixelPos = getPixelCoords(event);
        setSvgReference((prev) => {
          const halfWidth = (prev.originalSize.width * prev.scale) / 2;
          const halfHeight = (prev.originalSize.height * prev.scale) / 2;
          return {
            ...prev,
            position: {
              x: pixelPos.x - halfWidth,
              y: pixelPos.y - halfHeight,
            },
          };
        });
        return;
      }

      if (!isDragging.current) return;

      const { x, y } = getGridCoords(event);

      const dragState = selectionDrag.current;

      if (dragState) {
        const desiredDelta = {
          x: x - dragState.start.x,
          y: y - dragState.start.y,
        };
        const clampedDelta = clampDragDelta(dragState.beforeDots, desiredDelta);

        if (
          clampedDelta.x === dragState.lastDelta.x &&
          clampedDelta.y === dragState.lastDelta.y
        ) {
          return;
        }

        const result = translateDots(
          dragState.beforeDots,
          clampedDelta.x,
          clampedDelta.y,
          gridSize
        );
        const updateMap = new Map(result.dots.map((dot) => [dot.id, dot]));
        updateActiveFrame((current) => ({
          ...current,
          dots: current.dots.map((dot) => updateMap.get(dot.id) ?? dot),
        }));
        selectionDrag.current = { ...dragState, lastDelta: clampedDelta };
        return;
      }

      if (tool === "marquee" && marqueeRect) {
        setMarqueeRect((prev) => (prev ? { ...prev, endX: x, endY: y } : null));
        return;
      }

      if (tool === "lasso" && lassoPath) {
        setLassoPath((prev) => (prev ? [...prev, { x, y }] : null));
        return;
      }

      if (isShapeTool(tool) && shapeStart) {
        const shapeParams = {
          startX: shapeStart.x,
          startY: shapeStart.y,
          endX: x,
          endY: y,
          filled: shapeFilled,
          sides: polygonSides,
          points: starPoints,
        };
        const result = createShape(tool as ShapeType, shapeParams);
        const filtered = result.dots.filter(
          (p) => p.x >= 0 && p.x < gridSize && p.y >= 0 && p.y < gridSize
        );
        setShapePreview(filtered);
        return;
      }

      if (tool === "dot") {
        const existingDot = dotsByPosition.get(createPositionKey(x, y));
        if (dotToolMode.current === "remove" && existingDot) {
          const removedConnections = frame.connections.filter(
            (c) => c.from === existingDot.id || c.to === existingDot.id
          );
          executeCommand(
            new RemoveDotsCommand(activeFrameIndex, [existingDot], removedConnections, frame.groups)
          );
        } else if (dotToolMode.current === "add" && !existingDot) {
          const { colors, ref } = ensureColorRef(projectColors, dotColor);
          const newDot: Dot = { id: makeId(), x, y, color: ref };
          const addedColors = colors.length > projectColors.length ? [dotColor] : [];
          executeCommand(new AddDotsCommand(activeFrameIndex, [newDot], addedColors));
        }
        return;
      }

      if (tool === "eraser") {
        const existingDot = dotsByPosition.get(createPositionKey(x, y));
        if (existingDot) {
          const removedConnections = frame.connections.filter(
            (c) => c.from === existingDot.id || c.to === existingDot.id
          );
          executeCommand(
            new RemoveDotsCommand(activeFrameIndex, [existingDot], removedConnections, frame.groups)
          );
          removeFromSelection([existingDot.id]);
        }
        return;
      }
    },
    [
      frame,
      tool,
      getGridCoords,
      getPixelCoords,
      clampDragDelta,
      updateActiveFrame,
      marqueeRect,
      lassoPath,
      shapeStart,
      shapeFilled,
      polygonSides,
      starPoints,
      gridSize,
      dotsByPosition,
      projectColors,
      dotColor,
      activeFrameIndex,
      executeCommand,
      removeFromSelection,
      isRotating,
      rotationStartAngle,
      rotationHandleRef,
      zoom,
      setRotationAngle,
      selectedDotIds,
      setRotationPreview,
      svgReference,
      setSvgReference,
    ]
  );

  const handleCanvasPointerUp = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (!frame) return;
      isDragging.current = false;
      dotToolMode.current = null;

      // Handle rotation end
      if (isRotating) {
        const angle = parseFloat(rotationAngle);
        if (!isNaN(angle) && angle !== 0 && selectedDotIds.length > 0) {
          const dotsToTransform = frame.dots.filter((d) => selectedDotIds.includes(d.id));
          const result = rotate(dotsToTransform, angle, gridSize);
          executeCommand(
            new TransformDotsCommand(
              activeFrameIndex,
              dotsToTransform,
              result.dots,
              result.clippedIds,
              `Rotate ${angle}°`
            )
          );
        }
        setIsRotating(false);
        setRotationStartAngle(0);
        setRotationAngle("0");
        setRotationPreview(null);
        return;
      }

      const dragState = selectionDrag.current;

      if (dragState) {
        selectionDrag.current = null;
        if (dragState.lastDelta.x === 0 && dragState.lastDelta.y === 0) {
          return;
        }

        const result = translateDots(
          dragState.beforeDots,
          dragState.lastDelta.x,
          dragState.lastDelta.y,
          gridSize
        );
        executeCommand(
          new TransformDotsCommand(
            activeFrameIndex,
            dragState.beforeDots,
            result.dots,
            result.clippedIds,
            "Move selection"
          )
        );
        return;
      }

      const mode = getSelectionMode(event);

      if (tool === "marquee" && marqueeRect) {
        const selected = selectDotsInRect(frame.dots, marqueeRect);
        if (mode === "add") {
          addToSelection(selected);
        } else if (mode === "subtract") {
          removeFromSelection(selected);
        } else if (mode === "toggle") {
          toggleSelection(selected);
        } else {
          setSelection(selected);
        }
        setMarqueeRect(null);
        return;
      }

      if (tool === "lasso" && lassoPath) {
        const simplified = simplifyPath(lassoPath, 2);
        const selected = selectDotsInLasso(frame.dots, simplified);
        if (mode === "add") {
          addToSelection(selected);
        } else if (mode === "subtract") {
          removeFromSelection(selected);
        } else if (mode === "toggle") {
          toggleSelection(selected);
        } else {
          setSelection(selected);
        }
        setLassoPath(null);
        return;
      }

      if (isShapeTool(tool) && shapeStart && shapePreview && shapePreview.length > 0) {
        const { colors, ref } = ensureColorRef(projectColors, dotColor);
        const addedColors = colors.length > projectColors.length ? [dotColor] : [];
        const occupied = new Set(frame.dots.map((d) => createPositionKey(d.x, d.y)));
        const newDots: Dot[] = [];

        for (const p of shapePreview) {
          const key = createPositionKey(p.x, p.y);
          if (occupied.has(key)) continue;
          occupied.add(key);
          newDots.push({ id: makeId(), x: p.x, y: p.y, color: ref });
        }

        if (newDots.length > 0) {
          if (autoConnectShapes) {
            beginBatch(`Place ${tool}`);
          }
          executeCommand(
            new AddDotsCommand(activeFrameIndex, newDots, addedColors, `Place ${tool}`)
          );

          if (autoConnectShapes && newDots.length > 1) {
            const { colors: connColors, ref: connRef } = ensureColorRef(
              colors.length > projectColors.length ? colors : projectColors,
              connectionColor
            );
            const connAddedColors =
              connColors.length > (colors.length > projectColors.length ? colors : projectColors).length
                ? [connectionColor]
                : [];

            const dotMap = derivePositionMap(newDots);
            const newConnections: Connection[] = [];
            let order = frame.connections.length;

            for (const dot of newDots) {
              const offsets = [
                [1, 0],
                [0, 1],
              ];
              for (const [dx, dy] of offsets) {
                const neighbor = dotMap.get(createPositionKey(dot.x + dx, dot.y + dy));
                if (neighbor) {
                  newConnections.push({
                    id: makeId(),
                    from: dot.id,
                    to: neighbor.id,
                    color: connRef,
                    order: order++,
                  });
                }
              }
            }

            if (newConnections.length > 0) {
              executeCommand(
                new AddConnectionsCommand(activeFrameIndex, newConnections, connAddedColors)
              );
            }
            commitBatch();
          }
        }

        setShapeStart(null);
        setShapePreview(null);
        return;
      }
    },
    [
      frame,
      tool,
      marqueeRect,
      lassoPath,
      shapeStart,
      shapePreview,
      projectColors,
      dotColor,
      connectionColor,
      autoConnectShapes,
      activeFrameIndex,
      gridSize,
      addToSelection,
      removeFromSelection,
      toggleSelection,
      setSelection,
      executeCommand,
      beginBatch,
      commitBatch,
      isRotating,
      rotationAngle,
      selectedDotIds,
      setIsRotating,
      setRotationStartAngle,
      setRotationAngle,
      setRotationPreview,
    ]
  );

  return {
    marqueeRect,
    setMarqueeRect,
    lassoPath,
    setLassoPath,
    shapeStart,
    setShapeStart,
    shapePreview,
    setShapePreview,
    getGridCoords,
    getPixelCoords,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
  };
};
