import { useState, useEffect, useCallback } from "react";
import {
  selectConnectedDots,
  selectByColor,
  invertSelection,
  getConnectionsForDots,
} from "../lib/selection/utils";
import {
  CreateGroupCommand,
  UngroupCommand,
  DeleteGroupCommand,
} from "../lib/commands";
import { getNextGroupColor, getNextGroupName } from "../lib/groups/utils";
import { ensureColorRef, type Frame } from "../lib/project";
import { parseDurationInput } from "../components/editorUtils";
import type { Command } from "../lib/commands/types";

export interface UseEditorSelectionReturn {
  selectedFadeInInput: string;
  setSelectedFadeInInput: React.Dispatch<React.SetStateAction<string>>;
  selectedFadeOutInput: string;
  setSelectedFadeOutInput: React.Dispatch<React.SetStateAction<string>>;
  handleSelectConnected: () => void;
  handleSelectByColor: () => void;
  handleInvertSelection: () => void;
  handleSelectConnections: () => void;
  handleCreateGroup: () => void;
  handleUngroup: () => void;
  handleDeleteGroup: () => void;
  handleRecolorSelected: () => void;
  handleApplyDotOverrides: () => void;
  handleClearDotOverrides: () => void;
}

interface UseEditorSelectionParams {
  frame: Frame | undefined;
  selectedDotIds: string[];
  selectedGroupIds: string[];
  activeFrameIndex: number;
  projectColors: string[];
  dotColor: string;
  setSelection: (dotIds: string[], connectionIds?: string[]) => void;
  setGroupSelection: (groupIds: string[]) => void;
  clearSelection: () => void;
  updateActiveFrame: (
    updater: (frame: Frame, project: { colors: string[] }) => Frame | { frame: Frame; colors?: string[] }
  ) => void;
  executeCommand: (command: Command) => void;
}

export const useEditorSelection = ({
  frame,
  selectedDotIds,
  selectedGroupIds,
  activeFrameIndex,
  projectColors,
  dotColor,
  setSelection,
  setGroupSelection,
  clearSelection,
  updateActiveFrame,
  executeCommand,
}: UseEditorSelectionParams): UseEditorSelectionReturn => {
  const [selectedFadeInInput, setSelectedFadeInInput] = useState("");
  const [selectedFadeOutInput, setSelectedFadeOutInput] = useState("");

  // Sync fade inputs with selected dots
  useEffect(() => {
    if (!frame || !selectedDotIds.length) {
      setSelectedFadeInInput("");
      setSelectedFadeOutInput("");
      return;
    }
    const selectedDots = frame.dots.filter((dot) => selectedDotIds.includes(dot.id));
    if (!selectedDots.length) {
      setSelectedFadeInInput("");
      setSelectedFadeOutInput("");
      return;
    }

    const resolveSharedValue = (key: "fadeInDuration" | "fadeOutDuration") => {
      const values = new Set(selectedDots.map((dot) => dot[key]));
      if (values.size === 1) {
        const [value] = values;
        return value === undefined ? "" : String(value);
      }
      return "";
    };

    setSelectedFadeInInput(resolveSharedValue("fadeInDuration"));
    setSelectedFadeOutInput(resolveSharedValue("fadeOutDuration"));
  }, [frame, selectedDotIds]);

  const handleSelectConnected = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const connected = selectConnectedDots(selectedDotIds, frame.connections);
    setSelection(connected);
  }, [selectedDotIds, frame, setSelection]);

  const handleSelectByColor = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const firstDot = frame.dots.find((d) => d.id === selectedDotIds[0]);
    if (!firstDot) return;
    const sameColor = selectByColor(frame.dots, firstDot.color);
    setSelection(sameColor);
  }, [selectedDotIds, frame, setSelection]);

  const handleInvertSelection = useCallback(() => {
    if (!frame) return;
    const allIds = frame.dots.map((d) => d.id);
    const inverted = invertSelection(allIds, selectedDotIds);
    setSelection(inverted);
  }, [frame, selectedDotIds, setSelection]);

  const handleSelectConnections = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    const connIds = getConnectionsForDots(selectedDotIds, frame.connections);
    setSelection(selectedDotIds, connIds);
  }, [selectedDotIds, frame, setSelection]);

  const handleCreateGroup = useCallback(() => {
    if (!selectedDotIds.length || !frame) return;
    // Get connections that are fully contained within selected dots
    const connIds = getConnectionsForDots(selectedDotIds, frame.connections);
    const groupName = getNextGroupName(frame.groups);
    const groupColor = getNextGroupColor(frame.groups);
    executeCommand(
      new CreateGroupCommand(
        activeFrameIndex,
        selectedDotIds,
        connIds,
        groupName,
        groupColor,
        frame.groups // Pass current groups for proper undo and to remove dots from existing groups
      )
    );
  }, [selectedDotIds, frame, activeFrameIndex, executeCommand]);

  const handleUngroup = useCallback(() => {
    if (!selectedGroupIds.length || !frame) return;
    // Ungroup the first selected group
    const group = frame.groups.find((g) => g.id === selectedGroupIds[0]);
    if (!group) return;
    executeCommand(new UngroupCommand(activeFrameIndex, group));
    setGroupSelection([]);
  }, [selectedGroupIds, frame, activeFrameIndex, executeCommand, setGroupSelection]);

  const handleDeleteGroup = useCallback(() => {
    if (!selectedGroupIds.length || !frame) return;
    const group = frame.groups.find((g) => g.id === selectedGroupIds[0]);
    if (!group) return;
    // Get all dots and connections in the group
    const dotsToRemove = frame.dots.filter((d) => group.dotIds.includes(d.id));
    const connsToRemove = frame.connections.filter((c) => group.connectionIds.includes(c.id));
    executeCommand(
      new DeleteGroupCommand(activeFrameIndex, group, dotsToRemove, connsToRemove)
    );
    clearSelection();
  }, [selectedGroupIds, frame, activeFrameIndex, executeCommand, clearSelection]);

  const handleRecolorSelected = useCallback(() => {
    if (!selectedDotIds.length) return;
    updateActiveFrame((current, proj) => {
      const { colors, ref } = ensureColorRef(proj.colors, dotColor);
      return {
        frame: {
          ...current,
          dots: current.dots.map((dot) =>
            selectedDotIds.includes(dot.id) ? { ...dot, color: ref } : dot
          ),
        },
        colors,
      };
    });
  }, [dotColor, selectedDotIds, updateActiveFrame]);

  const handleApplyDotOverrides = useCallback(() => {
    if (!selectedDotIds.length) return;
    const fadeInOverride = parseDurationInput(selectedFadeInInput);
    const fadeOutOverride = parseDurationInput(selectedFadeOutInput);
    updateActiveFrame((current) => ({
      ...current,
      dots: current.dots.map((dot) => {
        if (!selectedDotIds.includes(dot.id)) return dot;
        return {
          ...dot,
          fadeInDuration:
            selectedFadeInInput.trim() === "" ? dot.fadeInDuration : fadeInOverride,
          fadeOutDuration:
            selectedFadeOutInput.trim() === "" ? dot.fadeOutDuration : fadeOutOverride,
        };
      }),
    }));
  }, [selectedDotIds, selectedFadeInInput, selectedFadeOutInput, updateActiveFrame]);

  const handleClearDotOverrides = useCallback(() => {
    if (!selectedDotIds.length) return;
    setSelectedFadeInInput("");
    setSelectedFadeOutInput("");
    updateActiveFrame((current) => ({
      ...current,
      dots: current.dots.map((dot) =>
        selectedDotIds.includes(dot.id)
          ? { ...dot, fadeInDuration: undefined, fadeOutDuration: undefined }
          : dot
      ),
    }));
  }, [selectedDotIds, updateActiveFrame]);

  return {
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
  };
};
