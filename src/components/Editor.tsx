import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LucideIcon,
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDot,
  Download,
  Eraser,
  Hexagon,
  Image,
  LassoSelect,
  Link2,
  Minus,
  MousePointer2,
  Move,
  Redo2,
  Sparkles,
  Square,
  SquareDashed,
  Star,
  Triangle,
  Type,
  Undo2,
  Upload,
  ArrowRight,
} from "lucide-react";
import { resolveColor, type Frame, type Project } from "../lib/project";
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CONNECTION_COLOR,
  DEFAULT_DOT_COLOR,
  SELECTION_STROKE_COLOR,
  CANVAS_RENDERING,
  PRESET_COLORS,
} from "../lib/constants";
import {
  deriveDotMap,
  derivePositionMap,
  getCanvasMetrics,
  useCanvasSetup,
} from "../lib/canvas";
import { PRESET_LIBRARY } from "../lib/presets";
import { ClearFrameCommand, RemoveDotsCommand } from "../lib/commands";
import { renderGroupBoundingBoxes } from "../lib/groups/boundingBox";
import { calculateBounds } from "../lib/transforms";

// Hooks
import {
  useToolState,
  useFileIO,
  useSvgReference,
  useFrameOperations,
  useRotation,
  useCanvasSettings,
  useEditorSelection,
  useConnectionOperations,
  useCanvasInteraction,
} from "../hooks";

// Components
import ColorDropdown from "./ColorDropdown";
import CollapsibleSection from "./CollapsibleSection";
import Dropdown from "./Dropdown";
import EditorActions from "./EditorActions";
import IconToggle from "./IconToggle";
import TopToolbar from "./TopToolbar";
import LayerPanel from "./LayerPanel";
import AutoConnectionPanel from "./AutoConnectionPanel";
import ConfirmDialog from "./ConfirmDialog";
import ToolOptionsPanel from "./ToolOptionsPanel";
import SelectionPanel from "./SelectionPanel";
import ConnectionPanel from "./ConnectionPanel";
import TraceReferencePanel from "./TraceReferencePanel";
import CanvasToolbar from "./CanvasToolbar";
import TimingPanel from "./TimingPanel";
import TimelinePanel from "./TimelinePanel";

import { useStudioStore } from "../store/studioStore";
import { TOOL_OPTIONS, type Tool } from "./editorUtils";

const TOOL_ICON_MAP: Record<Tool, LucideIcon> = {
  select: MousePointer2,
  marquee: SquareDashed,
  lasso: LassoSelect,
  dot: CircleDot,
  eraser: Eraser,
  connect: Link2,
  autoconnect: Sparkles,
  text: Type,
  rectangle: Square,
  circle: Circle,
  ellipse: Circle,
  line: Minus,
  triangle: Triangle,
  polygon: Hexagon,
  star: Star,
  arrow: ArrowRight,
  svg: Move,
};

const Editor = () => {
  // Local UI state
  const [dotColor, setDotColor] = useState<string>(DEFAULT_DOT_COLOR);
  const [connectionColor, setConnectionColor] = useState<string>(DEFAULT_CONNECTION_COLOR);
  const [connectionDurationOverride, setConnectionDurationOverride] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedPresetName, setSelectedPresetName] = useState("");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store
  const project = useStudioStore((state) => state.project);
  const setProject = useStudioStore((state) => state.setProject);
  const activeFrameIndex = useStudioStore((state) => state.activeFrameIndex);
  const setActiveFrameIndex = useStudioStore((state) => state.setActiveFrameIndex);
  const zoom = useStudioStore((state) => state.zoom);
  const setZoom = useStudioStore((state) => state.setZoom);

  const executeCommand = useStudioStore((state) => state.executeCommand);
  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const beginBatch = useStudioStore((state) => state.beginBatch);
  const commitBatch = useStudioStore((state) => state.commitBatch);
  const canUndo = useStudioStore((state) => state.canUndo);
  const canRedo = useStudioStore((state) => state.canRedo);

  const selection = useStudioStore((state) => state.selection);
  const setSelection = useStudioStore((state) => state.setSelection);
  const addToSelection = useStudioStore((state) => state.addToSelection);
  const removeFromSelection = useStudioStore((state) => state.removeFromSelection);
  const toggleSelection = useStudioStore((state) => state.toggleSelection);
  const clearSelection = useStudioStore((state) => state.clearSelection);
  const setGroupSelection = useStudioStore((state) => state.setGroupSelection);

  const selectedDotIds = selection.selectedDotIds;
  const selectedConnectionIds = selection.selectedConnectionIds;
  const selectedGroupIds = selection.selectedGroupIds;

  const frame = project.frames[activeFrameIndex] ?? project.frames[0];
  const gridSize = project.metadata.gridSize;
  const gridColor = project.metadata.gridColor;
  const gridDotSize = project.metadata.gridDotSize * zoom;
  const showGrid = project.metadata.showGrid;
  const dotGap = project.metadata.dotGap * zoom;
  const dotRadius = project.metadata.dotSize * zoom;
  const canvasPadding = Math.max(
    gridDotSize / 2,
    dotRadius + CANVAS_RENDERING.editorRingPadding + CANVAS_RENDERING.editorRingWidth,
    1
  );
  const { canvasSize } = getCanvasMetrics(gridSize, dotGap, canvasPadding);
  const canvasBackground = resolveColor(
    project.colors,
    project.metadata.backgroundColor,
    DEFAULT_CANVAS_BACKGROUND
  );

  const dotById = useMemo(() => (frame ? deriveDotMap(frame.dots) : new Map()), [frame]);
  const dotsByPosition = useMemo(
    () => (frame ? derivePositionMap(frame.dots) : new Map()),
    [frame]
  );

  // Update project helper
  const updateProject = useCallback(
    (updater: (project: Project) => Project) => {
      setSelectedPresetName((prev) => (prev ? "" : prev));
      setProject((prev) => updater(prev));
    },
    [setProject]
  );

  const updateActiveFrame = useCallback(
    (updater: (frame: Frame, project: Project) => Frame | { frame: Frame; colors?: string[] }) => {
      setSelectedPresetName((prev) => (prev ? "" : prev));
      setProject((prev) => {
        const frames = [...prev.frames];
        const targetIndex = Math.max(0, Math.min(activeFrameIndex, frames.length - 1));
        const targetFrame = frames[targetIndex];
        if (!targetFrame) {
          return prev;
        }
        const result = updater(targetFrame, prev);
        if (typeof result === "object" && result !== null && "frame" in result) {
          frames[targetIndex] = result.frame;
          if (result.colors !== undefined) {
            return { ...prev, colors: result.colors, frames };
          }
          return { ...prev, frames };
        }
        frames[targetIndex] = result;
        return { ...prev, frames };
      });
    },
    [activeFrameIndex, setProject]
  );

  const resetSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Tool state hook
  const toolState = useToolState();
  const {
    tool,
    setTool,
    pendingConnectionFrom,
    setPendingConnectionFrom,
    pendingAutoConnectFrom,
    setPendingAutoConnectFrom,
    textValue,
    setTextValue,
    shapeFilled,
    setShapeFilled,
    polygonSides,
    setPolygonSides,
    starPoints,
    setStarPoints,
    autoConnectShapes,
    setAutoConnectShapes,
    handleToolChange,
  } = toolState;

  // SVG reference hook
  const svgReferenceHook = useSvgReference({ tool, setTool });
  const {
    svgReference,
    setSvgReference,
    svgImageRef,
    previousToolRef,
    isDragOver,
    handleSvgFileInput,
    handleRemoveSvg,
    handleSvgStartMove,
    handleCanvasDragOver,
    handleCanvasDragEnter,
    handleCanvasDragLeave,
    handleCanvasDrop,
  } = svgReferenceHook;

  // Rotation hook
  const rotationHook = useRotation({
    frame,
    selectedDotIds,
    gridSize,
    activeFrameIndex,
    executeCommand,
  });
  const {
    rotationAngle,
    setRotationAngle,
    isRotating,
    setIsRotating,
    rotationStartAngle,
    setRotationStartAngle,
    rotationPreview,
    setRotationPreview,
    rotationHandleRef,
    handleFlipHorizontal,
    handleFlipVertical,
    handleRotate90CW,
    handleRotate90CCW,
    handleRotate180,
    handleRotationInputChange,
    handleApplyRotation,
  } = rotationHook;

  // Canvas settings hook
  const canvasSettingsHook = useCanvasSettings({
    project,
    updateProject,
    executeCommand,
    resetSelection,
  });
  const {
    isCanvasSettingsOpen,
    setIsCanvasSettingsOpen,
    canvasSettingsStyle,
    canvasSettingsButtonRef,
    canvasSettingsMenuRef,
    gridSizeDialog,
    handleGridSizeChange,
    confirmGridSizeChange,
    cancelGridSizeChange,
    handleDotSizeChange,
    handleDotGapChange,
    handleGridDotSizeChange,
    handleGridColorChange,
    handleShowGridChange,
    handleBackgroundChange,
  } = canvasSettingsHook;

  // File IO hook
  const fileIOHook = useFileIO({
    project,
    setProject,
    setActiveFrameIndex,
    resetSelection,
    setStatusMessage,
    setSelectedPresetName,
    onSvgImport: svgReferenceHook.handleSvgImport,
  });
  const {
    importProjectInputRef,
    importSvgInputRef,
    handleImportFile,
    handleImportMenuChange,
    handleExportMenuChange,
  } = fileIOHook;

  // Frame operations hook
  const frameOpsHook = useFrameOperations({
    project,
    frame,
    activeFrameIndex,
    updateProject,
    updateActiveFrame,
    setActiveFrameIndex,
    resetSelection,
  });
  const {
    handleAddFrame,
    handleDuplicateFrame,
    handleDeleteFrame,
    handleReorderFrames,
    handleFrameTimingChange,
    handleFrameNameChange,
  } = frameOpsHook;

  // Editor selection hook
  const editorSelectionHook = useEditorSelection({
    frame,
    selectedDotIds,
    selectedGroupIds,
    activeFrameIndex,
    projectColors: project.colors,
    dotColor,
    setSelection,
    setGroupSelection,
    clearSelection,
    updateActiveFrame,
    executeCommand,
  });
  const {
    selectedFadeInInput,
    setSelectedFadeInInput,
    selectedFadeOutInput,
    setSelectedFadeOutInput,
    handleSelectConnected,
    handleSelectByColor,
    handleInvertSelection,
    handleSelectConnections,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    handleRecolorSelected,
    handleApplyDotOverrides,
    handleClearDotOverrides,
  } = editorSelectionHook;

  // Connection operations hook
  const connectionOpsHook = useConnectionOperations({
    frame,
    selectedConnectionIds,
    activeFrameIndex,
    projectColors: project.colors,
    connectionColor,
    connectionDurationOverride,
    executeCommand,
  });
  const {
    handleAutoConnect,
    handleReverseConnectionOrder,
    handleSwapConnectionDirection,
    handleNormalizeConnectionOrder,
  } = connectionOpsHook;

  // Canvas interaction hook
  const canvasInteractionHook = useCanvasInteraction({
    frame,
    tool,
    gridSize,
    zoom,
    dotGap,
    canvasPadding,
    dotsByPosition,
    projectColors: project.colors,
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
  });
  const {
    marqueeRect,
    setMarqueeRect,
    lassoPath,
    setLassoPath,
    shapeStart,
    shapePreview,
    setShapeStart,
    setShapePreview,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
  } = canvasInteractionHook;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (isMeta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (isMeta && e.key === "a") {
        e.preventDefault();
        if (frame) {
          setSelection(frame.dots.map((d) => d.id));
        }
      }
      if (e.key === "Escape") {
        if (tool === "svg" || svgReference.isPlacing) {
          setSvgReference((prev) => ({
            ...prev,
            isPlacing: false,
            position: { ...prev.lastConfirmedPosition },
          }));
          if (previousToolRef.current) {
            setTool(previousToolRef.current);
            previousToolRef.current = null;
          }
          return;
        }
        clearSelection();
        setPendingConnectionFrom(null);
        setMarqueeRect(null);
        setLassoPath(null);
        setShapeStart(null);
        setShapePreview(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedDotIds.length > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
      // Group shortcuts
      if (isMeta && e.key === "g" && !e.shiftKey && selectedDotIds.length > 0) {
        e.preventDefault();
        handleCreateGroup();
      }
      if (isMeta && e.key === "g" && e.shiftKey && selectedGroupIds.length > 0) {
        e.preventDefault();
        handleUngroup();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    frame,
    selectedDotIds.length,
    selectedGroupIds.length,
    setSelection,
    clearSelection,
    svgReference.isPlacing,
    tool,
    setSvgReference,
    setTool,
    previousToolRef,
    setPendingConnectionFrom,
    setMarqueeRect,
    setLassoPath,
    setShapeStart,
    setShapePreview,
    handleCreateGroup,
    handleUngroup,
  ]);

  // Delete selected handler
  const handleDeleteSelected = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const dotsToRemove = frame.dots.filter((d) => selectedDotIds.includes(d.id));
    const remainingIds = new Set(
      frame.dots.filter((d) => !selectedDotIds.includes(d.id)).map((d) => d.id)
    );
    const connsToRemove = frame.connections.filter(
      (c) => !remainingIds.has(c.from) || !remainingIds.has(c.to)
    );
    executeCommand(new RemoveDotsCommand(activeFrameIndex, dotsToRemove, connsToRemove, frame.groups));
    resetSelection();
  }, [frame, selectedDotIds, activeFrameIndex, resetSelection, executeCommand]);

  // Clear frame handler
  const handleClearFrame = useCallback(() => {
    if (!frame || (frame.dots.length === 0 && frame.connections.length === 0)) return;
    executeCommand(new ClearFrameCommand(activeFrameIndex, frame.dots, frame.connections, frame.groups));
    resetSelection();
  }, [frame, activeFrameIndex, resetSelection, executeCommand]);

  // Canvas rendering
  useEffect(() => {
    if (!frame) return;
    const ctx = useCanvasSetup(editorCanvasRef.current, canvasSize, canvasSize);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.save();
    ctx.translate(canvasPadding, canvasPadding);

    // Draw SVG reference
    if (svgReference.dataUrl && svgImageRef.current) {
      ctx.globalAlpha = svgReference.opacity;
      const pixelX = svgReference.position.x * zoom;
      const pixelY = svgReference.position.y * zoom;
      const scaledWidth = svgReference.originalSize.width * svgReference.scale * zoom;
      const scaledHeight = svgReference.originalSize.height * svgReference.scale * zoom;
      ctx.drawImage(svgImageRef.current, pixelX, pixelY, scaledWidth, scaledHeight);
      ctx.globalAlpha = 1.0;
    }

    // Draw grid
    if (showGrid) {
      ctx.fillStyle = gridColor;
      for (let x = 0; x < gridSize; x += 1) {
        for (let y = 0; y < gridSize; y += 1) {
          ctx.fillRect(
            x * dotGap - gridDotSize / 2,
            y * dotGap - gridDotSize / 2,
            gridDotSize,
            gridDotSize
          );
        }
      }
    }

    // Draw connections
    ctx.lineWidth = Math.max(1, dotRadius * CANVAS_RENDERING.editorConnectionStrokeScale);
    const selectedConnSet = new Set(selectedConnectionIds);
    for (const connection of frame.connections) {
      const from = dotById.get(connection.from);
      const to = dotById.get(connection.to);
      if (!from || !to) continue;
      ctx.strokeStyle = resolveColor(project.colors, connection.color, DEFAULT_CONNECTION_COLOR);
      ctx.beginPath();
      ctx.moveTo(from.x * dotGap, from.y * dotGap);
      ctx.lineTo(to.x * dotGap, to.y * dotGap);
      ctx.stroke();

      if (selectedConnSet.has(connection.id)) {
        ctx.strokeStyle = SELECTION_STROKE_COLOR;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(from.x * dotGap, from.y * dotGap);
        ctx.lineTo(to.x * dotGap, to.y * dotGap);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = Math.max(1, dotRadius * CANVAS_RENDERING.editorConnectionStrokeScale);
      }
    }

    // Draw auto-connection indicators
    if (project.autoConnections && project.autoConnections.length > 0) {
      for (const autoConn of project.autoConnections) {
        const color = resolveColor(project.colors, autoConn.color, DEFAULT_CONNECTION_COLOR);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(autoConn.fromX * dotGap, autoConn.fromY * dotGap, dotRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(autoConn.fromX * dotGap, autoConn.fromY * dotGap, dotRadius + CANVAS_RENDERING.editorRingPadding + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(autoConn.toX * dotGap, autoConn.toY * dotGap, dotRadius + CANVAS_RENDERING.editorRingPadding + 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(autoConn.toX * dotGap, autoConn.toY * dotGap, dotRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.setLineDash([]);
      }
    }

    // Draw dots
    for (const dot of frame.dots) {
      ctx.fillStyle = resolveColor(project.colors, dot.color, DEFAULT_DOT_COLOR);
      ctx.beginPath();
      ctx.arc(dot.x * dotGap, dot.y * dotGap, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw group bounding boxes
    if (frame.groups.length > 0) {
      renderGroupBoundingBoxes(ctx, frame.groups, frame.dots, dotGap, selectedGroupIds);
    }

    // Draw pending connection indicator
    if (pendingConnectionFrom) {
      const dot = dotById.get(pendingConnectionFrom);
      if (dot) {
        ctx.strokeStyle = DEFAULT_CONNECTION_COLOR;
        ctx.lineWidth = CANVAS_RENDERING.editorRingWidth;
        ctx.beginPath();
        ctx.arc(dot.x * dotGap, dot.y * dotGap, dotRadius + CANVAS_RENDERING.editorRingPadding, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw pending auto-connect indicator
    if (pendingAutoConnectFrom) {
      ctx.strokeStyle = DEFAULT_CONNECTION_COLOR;
      ctx.lineWidth = CANVAS_RENDERING.editorRingWidth;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(pendingAutoConnectFrom.x * dotGap, pendingAutoConnectFrom.y * dotGap, dotRadius + CANVAS_RENDERING.editorRingPadding, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw selection indicators
    if (selectedDotIds.length) {
      ctx.strokeStyle = SELECTION_STROKE_COLOR;
      ctx.lineWidth = CANVAS_RENDERING.editorRingWidth;
      for (const dotId of selectedDotIds) {
        const dot = dotById.get(dotId);
        if (!dot) continue;
        ctx.beginPath();
        ctx.arc(dot.x * dotGap, dot.y * dotGap, dotRadius + CANVAS_RENDERING.editorRingPadding, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw rotation handle
      const selectedDots = frame.dots.filter((d) => selectedDotIds.includes(d.id));
      const canShowRotationHandle = tool === "select" || tool === "marquee" || tool === "lasso";
      if (selectedDots.length > 0 && canShowRotationHandle && !marqueeRect && !lassoPath) {
        const bounds = calculateBounds(selectedDots);
        if (bounds) {
          const centerX = bounds.centerX * dotGap;
          const centerY = bounds.centerY * dotGap;
          const handleRadius = 8;
          const handleDistance = 40;
          const handleX = centerX;
          const handleY = centerY - handleDistance;

          rotationHandleRef.current = { x: handleX, y: handleY, centerX, centerY };

          ctx.fillStyle = SELECTION_STROKE_COLOR;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = SELECTION_STROKE_COLOR;
          ctx.fillStyle = "white";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = SELECTION_STROKE_COLOR;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(handleX, handleY);
          ctx.stroke();
          ctx.setLineDash([]);

          if (isRotating && rotationStartAngle !== 0) {
            const currentAngle = parseFloat(rotationAngle) || 0;
            const startAngleRad = (-rotationStartAngle * Math.PI) / 180;
            const currentAngleRad = (-currentAngle * Math.PI) / 180;
            ctx.strokeStyle = "rgba(66, 153, 225, 0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, handleDistance - 10, startAngleRad - Math.PI / 2, currentAngleRad - Math.PI / 2);
            ctx.stroke();
          }
        } else {
          rotationHandleRef.current = null;
        }
      } else {
        rotationHandleRef.current = null;
      }
    }

    // Draw rotation preview
    if (rotationPreview && rotationPreview.length > 0) {
      for (const previewDot of rotationPreview) {
        ctx.fillStyle = resolveColor(project.colors, previewDot.color, DEFAULT_DOT_COLOR);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(previewDot.x * dotGap, previewDot.y * dotGap, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = SELECTION_STROKE_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(previewDot.x * dotGap, previewDot.y * dotGap, dotRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw marquee
    if (marqueeRect) {
      ctx.strokeStyle = SELECTION_STROKE_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      const rx = Math.min(marqueeRect.startX, marqueeRect.endX) * dotGap;
      const ry = Math.min(marqueeRect.startY, marqueeRect.endY) * dotGap;
      const rw = Math.abs(marqueeRect.endX - marqueeRect.startX) * dotGap;
      const rh = Math.abs(marqueeRect.endY - marqueeRect.startY) * dotGap;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }

    // Draw lasso
    if (lassoPath && lassoPath.length > 1) {
      ctx.strokeStyle = SELECTION_STROKE_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x * dotGap, lassoPath[0].y * dotGap);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x * dotGap, lassoPath[i].y * dotGap);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw shape preview
    if (shapePreview && shapePreview.length > 0) {
      ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
      for (const p of shapePreview) {
        ctx.beginPath();
        ctx.arc(p.x * dotGap, p.y * dotGap, dotRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }, [
    canvasPadding,
    canvasSize,
    dotById,
    dotGap,
    dotRadius,
    frame,
    gridColor,
    gridDotSize,
    gridSize,
    pendingConnectionFrom,
    pendingAutoConnectFrom,
    project.colors,
    project.autoConnections,
    selectedDotIds,
    selectedConnectionIds,
    selectedGroupIds,
    showGrid,
    marqueeRect,
    lassoPath,
    shapePreview,
    svgReference,
    svgImageRef,
    zoom,
    tool,
    isRotating,
    rotationAngle,
    rotationStartAngle,
    rotationPreview,
    rotationHandleRef,
  ]);

  // Preset load handler
  const handlePresetLoad = useCallback(
    (presetName: string) => {
      setSelectedPresetName(presetName);
      if (!presetName) return;
      const preset = PRESET_LIBRARY.find((entry) => entry.name === presetName);
      if (!preset) return;
      setProject(preset.create());
      setActiveFrameIndex(0);
      resetSelection();
      setStatusMessage(`Loaded preset: ${presetName}`);
    },
    [resetSelection, setActiveFrameIndex, setProject]
  );

  // Memoized options
  const presetOptions = useMemo(
    () => [
      { value: "", label: "None" },
      ...PRESET_LIBRARY.map((preset) => ({ value: preset.name, label: preset.name })),
    ],
    []
  );

  const importOptions = useMemo(
    () => [
      { value: "project", label: "Project (.json / .dotp)", icon: <Upload size={12} /> },
      { value: "svg", label: "SVG trace", icon: <Image size={12} /> },
    ],
    []
  );

  const exportOptions = useMemo(
    () => [
      { value: "json", label: "Export JSON", icon: <Download size={12} /> },
      { value: "binary", label: "Export binary", icon: <Archive size={12} /> },
    ],
    []
  );

  return (
    <div className="workspace-shell">
      <TopToolbar>
        <div className="toolbar-group">
          <button type="button" className="toolbar-btn toolbar-icon-btn" onClick={undo} disabled={!canUndo()} aria-label="Undo" title="Undo">
            <Undo2 size={16} />
          </button>
          <button type="button" className="toolbar-btn toolbar-icon-btn" onClick={redo} disabled={!canRedo()} aria-label="Redo" title="Redo">
            <Redo2 size={16} />
          </button>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">Preset</span>
          <Dropdown ariaLabel="Preset selection" value={selectedPresetName} options={presetOptions} onChange={handlePresetLoad} />
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">Colors</span>
          <ColorDropdown ariaLabel="Dot color" label="Dot" value={dotColor} colors={PRESET_COLORS} onChange={setDotColor} />
          <ColorDropdown ariaLabel="Connection color" label="Line" value={connectionColor} colors={PRESET_COLORS} onChange={setConnectionColor} />
          <ColorDropdown ariaLabel="Canvas background color" label="Canvas" value={canvasBackground} colors={PRESET_COLORS} onChange={handleBackgroundChange} />
        </div>
        <div className="toolbar-group">
          <Dropdown ariaLabel="Import menu" value="" triggerLabel="Import" triggerIcon={<Upload size={14} />} options={importOptions} onChange={handleImportMenuChange} />
          <Dropdown ariaLabel="Export menu" value="" triggerLabel="Export" triggerIcon={<Download size={14} />} options={exportOptions} onChange={handleExportMenuChange} />
          <input ref={importProjectInputRef} className="toolbar-file-input" type="file" accept=".json,.dotp" onChange={handleImportFile} aria-label="Import project" />
          <input ref={importSvgInputRef} className="toolbar-file-input" type="file" accept=".svg,image/svg+xml" onChange={handleSvgFileInput} aria-label="Import SVG" />
        </div>
      </TopToolbar>
      {statusMessage && <p className="status status-banner">{statusMessage}</p>}

      <div className={`workspace${isLeftPanelOpen ? "" : " left-collapsed"}${isRightPanelOpen ? "" : " right-collapsed"}${isTimelineOpen ? "" : " timeline-collapsed"}`}>
        <aside className={`panel panel-left${isLeftPanelOpen ? "" : " panel-collapsed"}`}>
          <CollapsibleSection title="Tools" defaultOpen>
            <div className="tool-grid">
              {TOOL_OPTIONS.map((option) => {
                const Icon = TOOL_ICON_MAP[option.id];
                const isActive = tool === option.id;
                return (
                  <button key={option.id} type="button" className={`tool-btn${isActive ? " active" : ""}`} onClick={() => handleToolChange(option.id)} aria-pressed={isActive} title={option.label}>
                    <Icon size={16} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          <ToolOptionsPanel
            tool={tool}
            textValue={textValue}
            setTextValue={setTextValue}
            shapeFilled={shapeFilled}
            setShapeFilled={setShapeFilled}
            polygonSides={polygonSides}
            setPolygonSides={setPolygonSides}
            starPoints={starPoints}
            setStarPoints={setStarPoints}
            autoConnectShapes={autoConnectShapes}
            setAutoConnectShapes={setAutoConnectShapes}
            connectionDurationOverride={connectionDurationOverride}
            setConnectionDurationOverride={setConnectionDurationOverride}
          />

          <SelectionPanel
            selectedDotIds={selectedDotIds}
            rotationAngle={rotationAngle}
            selectedFadeInInput={selectedFadeInInput}
            selectedFadeOutInput={selectedFadeOutInput}
            onSelectConnected={handleSelectConnected}
            onSelectByColor={handleSelectByColor}
            onInvertSelection={handleInvertSelection}
            onSelectConnections={handleSelectConnections}
            onFlipHorizontal={handleFlipHorizontal}
            onFlipVertical={handleFlipVertical}
            onRotate90CW={handleRotate90CW}
            onRotate90CCW={handleRotate90CCW}
            onRotate180={handleRotate180}
            onRotationInputChange={handleRotationInputChange}
            onApplyRotation={handleApplyRotation}
            onSetSelectedFadeIn={setSelectedFadeInInput}
            onSetSelectedFadeOut={setSelectedFadeOutInput}
            onApplyDotOverrides={handleApplyDotOverrides}
            onClearDotOverrides={handleClearDotOverrides}
          />

          <ConnectionPanel
            selectedConnectionIds={selectedConnectionIds}
            onReverseOrder={handleReverseConnectionOrder}
            onSwapDirection={handleSwapConnectionDirection}
            onNormalizeOrder={handleNormalizeConnectionOrder}
          />

          <CollapsibleSection title="Utility" defaultOpen>
            <EditorActions
              onAutoConnect={handleAutoConnect}
              onClearFrame={handleClearFrame}
              onDeleteSelected={handleDeleteSelected}
              onRecolorSelected={handleRecolorSelected}
            />
          </CollapsibleSection>

          <LayerPanel frame={frame} activeFrameIndex={activeFrameIndex} onCreateGroup={handleCreateGroup} />
          <AutoConnectionPanel autoConnections={project.autoConnections ?? []} colors={project.colors} executeCommand={executeCommand} />

          <TraceReferencePanel
            svgReference={svgReference}
            setSvgReference={setSvgReference}
            onStartMove={handleSvgStartMove}
            onRemove={handleRemoveSvg}
          />
        </aside>

        <main className="stage">
          <CanvasToolbar
            project={project}
            zoom={zoom}
            setZoom={setZoom}
            isCanvasSettingsOpen={isCanvasSettingsOpen}
            setIsCanvasSettingsOpen={setIsCanvasSettingsOpen}
            canvasSettingsStyle={canvasSettingsStyle}
            canvasSettingsButtonRef={canvasSettingsButtonRef}
            canvasSettingsMenuRef={canvasSettingsMenuRef}
            onGridSizeChange={handleGridSizeChange}
            onDotGapChange={handleDotGapChange}
            onDotSizeChange={handleDotSizeChange}
            onGridDotSizeChange={handleGridDotSizeChange}
            onGridColorChange={handleGridColorChange}
            onShowGridChange={handleShowGridChange}
          />
          <div className="canvas-shell">
            <canvas
              ref={editorCanvasRef}
              className={`canvas ${isDragOver ? "drag-over" : ""}`}
              style={{ background: canvasBackground }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
              onDragOver={handleCanvasDragOver}
              onDragEnter={handleCanvasDragEnter}
              onDragLeave={handleCanvasDragLeave}
              onDrop={handleCanvasDrop}
            />
          </div>
        </main>

        <aside className={`panel panel-right${isRightPanelOpen ? "" : " panel-collapsed"}`}>
          <CollapsibleSection title="Frame" defaultOpen>
            <p className="panel-meta">Active {activeFrameIndex + 1} / {project.frames.length}</p>
            {frame && (
              <div className="control-row">
                <label htmlFor="frame-name">Frame name</label>
                <input id="frame-name" type="text" value={frame.name} onChange={(event) => handleFrameNameChange(event.target.value)} />
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Playback" defaultOpen>
            <div className="control-row">
              <label>Connection fade in on start</label>
              <IconToggle
                checked={project.settings.connectionFadeInOnStart}
                label="Toggle connection fade in on start"
                icon={<Link2 size={14} />}
                onToggle={() => updateProject((current) => ({ ...current, settings: { ...current.settings, connectionFadeInOnStart: !current.settings.connectionFadeInOnStart } }))}
              />
            </div>
            <div className="control-row">
              <label>Connection fade out on end</label>
              <IconToggle
                checked={project.settings.connectionFadeOutOnEnd}
                label="Toggle connection fade out on end"
                icon={<Link2 size={14} />}
                onToggle={() => updateProject((current) => ({ ...current, settings: { ...current.settings, connectionFadeOutOnEnd: !current.settings.connectionFadeOutOnEnd } }))}
              />
            </div>
          </CollapsibleSection>

          {frame && <TimingPanel frame={frame} onTimingChange={handleFrameTimingChange} />}
        </aside>

        <TimelinePanel
          frames={project.frames}
          activeFrameIndex={activeFrameIndex}
          isOpen={isTimelineOpen}
          onSelectFrame={(index) => {
            setActiveFrameIndex(index);
            resetSelection();
          }}
          onReorderFrames={handleReorderFrames}
          onAddFrame={handleAddFrame}
          onDuplicateFrame={handleDuplicateFrame}
          onDeleteFrame={handleDeleteFrame}
        />

        <div className="panel-toggle panel-toggle-left">
          <button type="button" className="panel-toggle-btn" onClick={() => setIsLeftPanelOpen((open) => !open)} aria-label={isLeftPanelOpen ? "Collapse left panel" : "Expand left panel"} title={isLeftPanelOpen ? "Collapse left panel" : "Expand left panel"}>
            {isLeftPanelOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
        <div className="panel-toggle panel-toggle-right">
          <button type="button" className="panel-toggle-btn" onClick={() => setIsRightPanelOpen((open) => !open)} aria-label={isRightPanelOpen ? "Collapse right panel" : "Expand right panel"} title={isRightPanelOpen ? "Collapse right panel" : "Expand right panel"}>
            {isRightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <div className="panel-toggle panel-toggle-bottom">
          <button type="button" className="panel-toggle-btn" onClick={() => setIsTimelineOpen((open) => !open)} aria-label={isTimelineOpen ? "Collapse timeline" : "Expand timeline"} title={isTimelineOpen ? "Collapse timeline" : "Expand timeline"}>
            {isTimelineOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={gridSizeDialog.isOpen}
        title="Grid Size Change Warning"
        message={
          <>
            <p>Decreasing the grid size from <strong>{project.metadata.gridSize}</strong> to <strong>{gridSizeDialog.newSize}</strong> will remove content that falls outside the new boundaries:</p>
            <p><strong>{gridSizeDialog.affectedDotsCount}</strong> dot(s) and <strong>{gridSizeDialog.affectedConnectionsCount}</strong> connection(s) across <strong>{gridSizeDialog.affectedFramesCount}</strong> frame(s) will be deleted.</p>
            <p>You can undo this change using <strong>Cmd/Ctrl+Z</strong> to restore all removed content.</p>
          </>
        }
        confirmLabel="Change Grid Size"
        cancelLabel="Cancel"
        onConfirm={confirmGridSizeChange}
        onCancel={cancelGridSizeChange}
      />
    </div>
  );
};

export default Editor;
