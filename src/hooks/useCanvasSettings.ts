import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  type CSSProperties,
  type RefObject,
} from "react";
import { clamp } from "../lib/canvas";
import { ensureColorRef, type Connection, type Dot, type Project } from "../lib/project";
import { UI_LIMITS } from "../lib/constants";
import { ChangeGridSizeCommand } from "../lib/commands";
import { snapshotGroup, type GroupSnapshot } from "../lib/groups/types";
import type { Command } from "../lib/commands/types";

export interface GridSizeDialogState {
  isOpen: boolean;
  newSize: number;
  affectedDotsCount: number;
  affectedConnectionsCount: number;
  affectedFramesCount: number;
}

export interface UseCanvasSettingsReturn {
  isCanvasSettingsOpen: boolean;
  setIsCanvasSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canvasSettingsStyle: CSSProperties;
  canvasSettingsButtonRef: RefObject<HTMLButtonElement | null>;
  canvasSettingsMenuRef: RefObject<HTMLDivElement | null>;
  gridSizeDialog: GridSizeDialogState;
  handleGridSizeChange: (value: number) => void;
  confirmGridSizeChange: () => void;
  cancelGridSizeChange: () => void;
  handleDotSizeChange: (value: number) => void;
  handleDotGapChange: (value: number) => void;
  handleGridDotSizeChange: (value: number) => void;
  handleGridColorChange: (value: string) => void;
  handleShowGridChange: (value: boolean) => void;
  handleBackgroundChange: (value: string) => void;
}

interface UseCanvasSettingsParams {
  project: Project;
  updateProject: (updater: (project: Project) => Project) => void;
  executeCommand: (command: Command) => void;
  resetSelection: () => void;
}

const initialGridSizeDialog: GridSizeDialogState = {
  isOpen: false,
  newSize: 0,
  affectedDotsCount: 0,
  affectedConnectionsCount: 0,
  affectedFramesCount: 0,
};

export const useCanvasSettings = ({
  project,
  updateProject,
  executeCommand,
  resetSelection,
}: UseCanvasSettingsParams): UseCanvasSettingsReturn => {
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);
  const [canvasSettingsStyle, setCanvasSettingsStyle] = useState<CSSProperties>({});
  const [gridSizeDialog, setGridSizeDialog] = useState<GridSizeDialogState>(initialGridSizeDialog);

  const canvasSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const canvasSettingsMenuRef = useRef<HTMLDivElement | null>(null);

  const updateCanvasSettingsPosition = useCallback(() => {
    const button = canvasSettingsButtonRef.current;
    if (!button) return false;

    const buttonRect = button.getBoundingClientRect();
    const menuHeight = canvasSettingsMenuRef.current?.offsetHeight ?? 0;
    const menuWidth = 280;
    const edgePadding = 8;
    const shouldFlipUp =
      menuHeight > 0 &&
      buttonRect.bottom + menuHeight > window.innerHeight - edgePadding;

    const left = Math.max(
      edgePadding,
      Math.min(buttonRect.left, window.innerWidth - menuWidth - edgePadding)
    );
    const top = shouldFlipUp
      ? Math.max(edgePadding, buttonRect.top - menuHeight - 8)
      : buttonRect.bottom + 8;

    setCanvasSettingsStyle({
      position: "fixed",
      left,
      top,
      width: menuWidth,
      zIndex: 999,
    });

    return menuHeight > 0;
  }, []);

  // Position the settings menu
  useLayoutEffect(() => {
    if (!isCanvasSettingsOpen) return;

    let rafId = 0;
    const tick = () => {
      if (!updateCanvasSettingsPosition()) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    window.addEventListener("resize", updateCanvasSettingsPosition);
    window.addEventListener("scroll", updateCanvasSettingsPosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateCanvasSettingsPosition);
      window.removeEventListener("scroll", updateCanvasSettingsPosition, true);
    };
  }, [isCanvasSettingsOpen, updateCanvasSettingsPosition]);

  // Click-outside handler
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!isCanvasSettingsOpen) return;
      const target = event.target as Node;
      if (
        canvasSettingsButtonRef.current?.contains(target) ||
        canvasSettingsMenuRef.current?.contains(target)
      ) {
        return;
      }
      setIsCanvasSettingsOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCanvasSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isCanvasSettingsOpen]);

  const handleGridSizeChange = useCallback(
    (value: number) => {
      const nextSize = clamp(Math.round(value), UI_LIMITS.gridSize.min, UI_LIMITS.gridSize.max);
      const currentSize = project.metadata.gridSize;

      // If increasing size or no change, just update directly
      if (nextSize >= currentSize) {
        updateProject((current) => ({
          ...current,
          metadata: {
            ...current.metadata,
            gridSize: nextSize,
          },
        }));
        return;
      }

      // Calculate what will be removed
      const removedDotsMap = new Map<number, Dot[]>();
      const removedConnectionsMap = new Map<number, Connection[]>();
      const previousGroupsMap = new Map<number, GroupSnapshot[]>();
      let totalDotsAffected = 0;
      let totalConnectionsAffected = 0;
      let framesAffected = 0;

      project.frames.forEach((frame, frameIndex) => {
        const dotsToRemove = frame.dots.filter(
          (dot) => dot.x >= nextSize || dot.y >= nextSize
        );

        if (dotsToRemove.length > 0) {
          framesAffected++;
          totalDotsAffected += dotsToRemove.length;

          const removedDotIds = new Set(dotsToRemove.map((d) => d.id));
          const validIds = new Set(
            frame.dots.filter((d) => !removedDotIds.has(d.id)).map((d) => d.id)
          );

          const connectionsToRemove = frame.connections.filter(
            (connection) => !validIds.has(connection.from) || !validIds.has(connection.to)
          );

          totalConnectionsAffected += connectionsToRemove.length;

          removedDotsMap.set(frameIndex, dotsToRemove);
          removedConnectionsMap.set(frameIndex, connectionsToRemove);

          // Snapshot current groups for undo
          previousGroupsMap.set(frameIndex, frame.groups.map(snapshotGroup));
        }
      });

      // If nothing will be removed, just update
      if (totalDotsAffected === 0) {
        updateProject((current) => ({
          ...current,
          metadata: {
            ...current.metadata,
            gridSize: nextSize,
          },
        }));
        return;
      }

      // Show warning dialog
      setGridSizeDialog({
        isOpen: true,
        newSize: nextSize,
        affectedDotsCount: totalDotsAffected,
        affectedConnectionsCount: totalConnectionsAffected,
        affectedFramesCount: framesAffected,
      });
    },
    [project, updateProject]
  );

  const confirmGridSizeChange = useCallback(() => {
    const nextSize = gridSizeDialog.newSize;
    const currentSize = project.metadata.gridSize;

    // Calculate what will be removed
    const removedDotsMap = new Map<number, Dot[]>();
    const removedConnectionsMap = new Map<number, Connection[]>();
    const previousGroupsMap = new Map<number, GroupSnapshot[]>();

    project.frames.forEach((frame, frameIndex) => {
      const dotsToRemove = frame.dots.filter(
        (dot) => dot.x >= nextSize || dot.y >= nextSize
      );

      if (dotsToRemove.length > 0) {
        const removedDotIds = new Set(dotsToRemove.map((d) => d.id));
        const validIds = new Set(
          frame.dots.filter((d) => !removedDotIds.has(d.id)).map((d) => d.id)
        );

        const connectionsToRemove = frame.connections.filter(
          (connection) => !validIds.has(connection.from) || !validIds.has(connection.to)
        );

        removedDotsMap.set(frameIndex, dotsToRemove);
        removedConnectionsMap.set(frameIndex, connectionsToRemove);

        // Snapshot current groups for undo
        previousGroupsMap.set(frameIndex, frame.groups.map(snapshotGroup));
      }
    });

    // Execute command
    executeCommand(
      new ChangeGridSizeCommand(
        currentSize,
        nextSize,
        removedDotsMap,
        removedConnectionsMap,
        previousGroupsMap
      )
    );

    // Close dialog and reset selection
    setGridSizeDialog(initialGridSizeDialog);
    resetSelection();
  }, [gridSizeDialog, project, executeCommand, resetSelection]);

  const cancelGridSizeChange = useCallback(() => {
    setGridSizeDialog(initialGridSizeDialog);
  }, []);

  const handleDotSizeChange = useCallback(
    (value: number) => {
      updateProject((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          dotSize: clamp(value, UI_LIMITS.dotSize.min, UI_LIMITS.dotSize.max),
        },
      }));
    },
    [updateProject]
  );

  const handleDotGapChange = useCallback(
    (value: number) => {
      updateProject((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          dotGap: clamp(value, UI_LIMITS.dotGap.min, UI_LIMITS.dotGap.max),
        },
      }));
    },
    [updateProject]
  );

  const handleGridDotSizeChange = useCallback(
    (value: number) => {
      updateProject((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          gridDotSize: clamp(value, UI_LIMITS.gridDotSize.min, UI_LIMITS.gridDotSize.max),
        },
      }));
    },
    [updateProject]
  );

  const handleGridColorChange = useCallback(
    (value: string) => {
      updateProject((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          gridColor: value,
        },
      }));
    },
    [updateProject]
  );

  const handleShowGridChange = useCallback(
    (value: boolean) => {
      updateProject((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          showGrid: value,
        },
      }));
    },
    [updateProject]
  );

  const handleBackgroundChange = useCallback(
    (value: string) => {
      updateProject((current) => {
        const { colors, ref } = ensureColorRef(current.colors, value);
        return {
          ...current,
          colors,
          metadata: {
            ...current.metadata,
            backgroundColor: ref,
          },
        };
      });
    },
    [updateProject]
  );

  return {
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
  };
};
