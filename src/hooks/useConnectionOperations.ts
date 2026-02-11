import { useCallback } from "react";
import { createPositionKey, derivePositionMap } from "../lib/canvas";
import { ensureColorRef, makeId, type Connection, type Frame } from "../lib/project";
import {
  AddConnectionsCommand,
  ReorderConnectionsCommand,
  SwapConnectionDirectionCommand,
} from "../lib/commands";
import {
  reverseConnectionOrder,
  normalizeConnectionOrder,
} from "../lib/transforms/connectionOrder";
import { parseDurationInput } from "../components/editorUtils";
import type { Command } from "../lib/commands/types";

export interface UseConnectionOperationsReturn {
  handleAutoConnect: () => void;
  handleReverseConnectionOrder: () => void;
  handleSwapConnectionDirection: () => void;
  handleNormalizeConnectionOrder: () => void;
}

interface UseConnectionOperationsParams {
  frame: Frame | undefined;
  selectedConnectionIds: string[];
  activeFrameIndex: number;
  projectColors: string[];
  connectionColor: string;
  connectionDurationOverride: string;
  executeCommand: (command: Command) => void;
}

export const useConnectionOperations = ({
  frame,
  selectedConnectionIds,
  activeFrameIndex,
  projectColors,
  connectionColor,
  connectionDurationOverride,
  executeCommand,
}: UseConnectionOperationsParams): UseConnectionOperationsReturn => {
  const handleAutoConnect = useCallback(() => {
    if (!frame) return;
    const { colors, ref } = ensureColorRef(projectColors, connectionColor);
    const addedColors = colors.length > projectColors.length ? [connectionColor] : [];
    const dotMap = derivePositionMap(frame.dots);
    const existing = new Set(
      frame.connections.map((c) => [c.from, c.to].sort().join(":"))
    );
    const newConnections: Connection[] = [];
    let order = frame.connections.length;
    const revealDuration = parseDurationInput(connectionDurationOverride);

    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const dot of frame.dots) {
      for (const [dx, dy] of offsets) {
        const neighbor = dotMap.get(createPositionKey(dot.x + dx, dot.y + dy));
        if (!neighbor) continue;
        const key = [dot.id, neighbor.id].sort().join(":");
        if (existing.has(key)) continue;
        existing.add(key);
        newConnections.push({
          id: makeId(),
          from: dot.id,
          to: neighbor.id,
          color: ref,
          order: order++,
          revealDuration,
        });
      }
    }

    if (newConnections.length > 0) {
      executeCommand(
        new AddConnectionsCommand(activeFrameIndex, newConnections, addedColors, "Auto-connect")
      );
    }
  }, [
    frame,
    projectColors,
    connectionColor,
    connectionDurationOverride,
    activeFrameIndex,
    executeCommand,
  ]);

  const handleReverseConnectionOrder = useCallback(() => {
    if (!selectedConnectionIds.length || !frame) return;
    const connsToReverse = frame.connections.filter((c) =>
      selectedConnectionIds.includes(c.id)
    );
    const reversed = reverseConnectionOrder(connsToReverse);
    const updates = connsToReverse.map((c, i) => ({
      id: c.id,
      beforeOrder: c.order,
      afterOrder: reversed[i].order,
    }));
    executeCommand(new ReorderConnectionsCommand(activeFrameIndex, updates, "Reverse order"));
  }, [selectedConnectionIds, frame, activeFrameIndex, executeCommand]);

  const handleSwapConnectionDirection = useCallback(() => {
    if (!selectedConnectionIds.length || !frame) return;
    executeCommand(
      new SwapConnectionDirectionCommand(activeFrameIndex, selectedConnectionIds)
    );
  }, [selectedConnectionIds, frame, activeFrameIndex, executeCommand]);

  const handleNormalizeConnectionOrder = useCallback(() => {
    if (!frame) return;
    const normalized = normalizeConnectionOrder(frame.connections);
    const updates = frame.connections.map((c) => {
      const norm = normalized.find((n) => n.id === c.id);
      return {
        id: c.id,
        beforeOrder: c.order,
        afterOrder: norm?.order ?? c.order,
      };
    });
    executeCommand(new ReorderConnectionsCommand(activeFrameIndex, updates, "Normalize order"));
  }, [frame, activeFrameIndex, executeCommand]);

  return {
    handleAutoConnect,
    handleReverseConnectionOrder,
    handleSwapConnectionDirection,
    handleNormalizeConnectionOrder,
  };
};
