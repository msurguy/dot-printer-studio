import { useCallback } from "react";
import { clamp } from "../lib/canvas";
import { createEmptyFrame, type Frame, type Project } from "../lib/project";
import { createFrameClone } from "../components/editorUtils";

const getDuplicatedFrameName = (name: string) => {
  const match = name.match(/^(.*?)(\d+)\s*$/);
  if (!match) {
    return `${name} Copy`;
  }

  const [, prefix, numericSuffix] = match;
  const nextNumber = String(Number(numericSuffix) + 1).padStart(numericSuffix.length, "0");
  return `${prefix}${nextNumber}`;
};

export interface UseFrameOperationsReturn {
  handleAddFrame: () => void;
  handleDuplicateFrame: () => void;
  handleDeleteFrame: () => void;
  handleReorderFrames: (fromIndex: number, toIndex: number) => void;
  handleFrameTimingChange: (updates: Partial<Frame>) => void;
  handleFrameNameChange: (value: string) => void;
}

interface UseFrameOperationsParams {
  project: Project;
  frame: Frame | undefined;
  activeFrameIndex: number;
  updateProject: (updater: (project: Project) => Project) => void;
  updateActiveFrame: (updater: (frame: Frame, project: Project) => Frame) => void;
  setActiveFrameIndex: (index: number) => void;
  resetSelection: () => void;
}

export const useFrameOperations = ({
  project,
  frame,
  activeFrameIndex,
  updateProject,
  updateActiveFrame,
  setActiveFrameIndex,
  resetSelection,
}: UseFrameOperationsParams): UseFrameOperationsReturn => {
  const handleAddFrame = useCallback(() => {
    updateProject((current) => {
      const nextIndex = current.frames.length + 1;
      return {
        ...current,
        frames: [...current.frames, createEmptyFrame(`Frame ${nextIndex}`)],
      };
    });
    setActiveFrameIndex(project.frames.length);
    resetSelection();
  }, [project.frames.length, resetSelection, setActiveFrameIndex, updateProject]);

  const handleDuplicateFrame = useCallback(() => {
    if (!frame) return;
    updateProject((current) => {
      const copy = createFrameClone(frame, getDuplicatedFrameName(frame.name));
      const nextFrames = [...current.frames];
      nextFrames.splice(activeFrameIndex + 1, 0, copy);
      return { ...current, frames: nextFrames };
    });
    setActiveFrameIndex(activeFrameIndex + 1);
    resetSelection();
  }, [activeFrameIndex, frame, resetSelection, setActiveFrameIndex, updateProject]);

  const handleDeleteFrame = useCallback(() => {
    if (project.frames.length <= 1) return;
    updateProject((current) => {
      const nextFrames = current.frames.filter((_, index) => index !== activeFrameIndex);
      return { ...current, frames: nextFrames };
    });
    setActiveFrameIndex(clamp(activeFrameIndex - 1, 0, project.frames.length - 2));
    resetSelection();
  }, [activeFrameIndex, project.frames.length, resetSelection, setActiveFrameIndex, updateProject]);

  const handleReorderFrames = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= project.frames.length ||
        toIndex >= project.frames.length
      ) {
        return;
      }

      updateProject((current) => {
        const nextFrames = [...current.frames];
        const [movedFrame] = nextFrames.splice(fromIndex, 1);
        if (!movedFrame) {
          return current;
        }
        nextFrames.splice(toIndex, 0, movedFrame);
        return { ...current, frames: nextFrames };
      });

      if (activeFrameIndex === fromIndex) {
        setActiveFrameIndex(toIndex);
        return;
      }

      if (fromIndex < activeFrameIndex && activeFrameIndex <= toIndex) {
        setActiveFrameIndex(activeFrameIndex - 1);
        return;
      }

      if (toIndex <= activeFrameIndex && activeFrameIndex < fromIndex) {
        setActiveFrameIndex(activeFrameIndex + 1);
      }
    },
    [activeFrameIndex, project.frames.length, setActiveFrameIndex, updateProject]
  );

  const handleFrameTimingChange = useCallback(
    (updates: Partial<Frame>) => {
      updateActiveFrame((current) => ({ ...current, ...updates }));
    },
    [updateActiveFrame]
  );

  const handleFrameNameChange = useCallback(
    (value: string) => {
      updateActiveFrame((current) => ({ ...current, name: value }));
    },
    [updateActiveFrame]
  );

  return {
    handleAddFrame,
    handleDuplicateFrame,
    handleDeleteFrame,
    handleReorderFrames,
    handleFrameTimingChange,
    handleFrameNameChange,
  };
};
