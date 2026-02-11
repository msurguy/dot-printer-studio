import { useState, useRef, useCallback, type MutableRefObject } from "react";
import {
  flipHorizontal,
  flipVertical,
  rotate,
  rotate90CW,
  rotate90CCW,
  rotate180,
} from "../lib/transforms";
import { TransformDotsCommand } from "../lib/commands";
import type { Dot, Frame } from "../lib/project";
import type { Command } from "../lib/commands/types";

export interface RotationHandleState {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
}

export interface UseRotationReturn {
  rotationAngle: string;
  setRotationAngle: React.Dispatch<React.SetStateAction<string>>;
  isRotating: boolean;
  setIsRotating: React.Dispatch<React.SetStateAction<boolean>>;
  rotationStartAngle: number;
  setRotationStartAngle: React.Dispatch<React.SetStateAction<number>>;
  rotationPreview: Dot[] | null;
  setRotationPreview: React.Dispatch<React.SetStateAction<Dot[] | null>>;
  rotationHandleRef: MutableRefObject<RotationHandleState | null>;
  handleFlipHorizontal: () => void;
  handleFlipVertical: () => void;
  handleRotate90CW: () => void;
  handleRotate90CCW: () => void;
  handleRotate180: () => void;
  handleRotateByAngle: (angle: number) => void;
  handleRotationInputChange: (value: string) => void;
  handleApplyRotation: () => void;
}

interface UseRotationParams {
  frame: Frame | undefined;
  selectedDotIds: string[];
  gridSize: number;
  activeFrameIndex: number;
  executeCommand: (command: Command) => void;
}

export const useRotation = ({
  frame,
  selectedDotIds,
  gridSize,
  activeFrameIndex,
  executeCommand,
}: UseRotationParams): UseRotationReturn => {
  const [rotationAngle, setRotationAngle] = useState("0");
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [rotationPreview, setRotationPreview] = useState<Dot[] | null>(null);
  const rotationHandleRef = useRef<RotationHandleState | null>(null);

  const handleFlipHorizontal = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const dotsToTransform = frame.dots.filter((d) => selectedDotIds.includes(d.id));
    const result = flipHorizontal(dotsToTransform, gridSize);
    executeCommand(
      new TransformDotsCommand(
        activeFrameIndex,
        dotsToTransform,
        result.dots,
        result.clippedIds,
        "Flip horizontal"
      )
    );
  }, [selectedDotIds, frame, gridSize, activeFrameIndex, executeCommand]);

  const handleFlipVertical = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const dotsToTransform = frame.dots.filter((d) => selectedDotIds.includes(d.id));
    const result = flipVertical(dotsToTransform, gridSize);
    executeCommand(
      new TransformDotsCommand(
        activeFrameIndex,
        dotsToTransform,
        result.dots,
        result.clippedIds,
        "Flip vertical"
      )
    );
  }, [selectedDotIds, frame, gridSize, activeFrameIndex, executeCommand]);

  const handleRotate90CW = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const dotsToTransform = frame.dots.filter((d) => selectedDotIds.includes(d.id));
    const result = rotate90CW(dotsToTransform, gridSize);
    executeCommand(
      new TransformDotsCommand(
        activeFrameIndex,
        dotsToTransform,
        result.dots,
        result.clippedIds,
        "Rotate 90° CW"
      )
    );
  }, [selectedDotIds, frame, gridSize, activeFrameIndex, executeCommand]);

  const handleRotate90CCW = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const dotsToTransform = frame.dots.filter((d) => selectedDotIds.includes(d.id));
    const result = rotate90CCW(dotsToTransform, gridSize);
    executeCommand(
      new TransformDotsCommand(
        activeFrameIndex,
        dotsToTransform,
        result.dots,
        result.clippedIds,
        "Rotate 90° CCW"
      )
    );
  }, [selectedDotIds, frame, gridSize, activeFrameIndex, executeCommand]);

  const handleRotate180 = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const dotsToTransform = frame.dots.filter((d) => selectedDotIds.includes(d.id));
    const result = rotate180(dotsToTransform, gridSize);
    executeCommand(
      new TransformDotsCommand(
        activeFrameIndex,
        dotsToTransform,
        result.dots,
        result.clippedIds,
        "Rotate 180°"
      )
    );
  }, [selectedDotIds, frame, gridSize, activeFrameIndex, executeCommand]);

  const handleRotateByAngle = useCallback(
    (angle: number) => {
      if (!selectedDotIds.length || !frame) return;
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
    },
    [selectedDotIds, frame, gridSize, activeFrameIndex, executeCommand]
  );

  const handleRotationInputChange = useCallback((value: string) => {
    setRotationAngle(value);
  }, []);

  const handleApplyRotation = useCallback(() => {
    const angle = parseFloat(rotationAngle);
    if (isNaN(angle)) return;
    handleRotateByAngle(angle);
  }, [rotationAngle, handleRotateByAngle]);

  return {
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
    handleRotateByAngle,
    handleRotationInputChange,
    handleApplyRotation,
  };
};
