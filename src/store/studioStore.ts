import { create } from "zustand";
import { DEFAULT_ZOOM } from "../lib/constants";
import { createDefaultProject, type Project } from "../lib/project";
import type { Command, HistoryManager, SelectionState } from "../lib/commands/types";
import { createHistoryManager } from "../lib/commands/types";
import {
  executeCommand as execCmd,
  undo as undoCmd,
  redo as redoCmd,
  beginBatch as beginBatchCmd,
  commitBatch as commitBatchCmd,
  cancelBatch as cancelBatchCmd,
  canUndo as canUndoFn,
  canRedo as canRedoFn,
  clearHistory,
} from "../lib/commands/historyManager";

export type StudioMode = "editor" | "player";

type StudioState = {
  project: Project;
  mode: StudioMode;
  activeFrameIndex: number;
  zoom: number;
  history: HistoryManager;
  selection: SelectionState;

  setProject: (update: Project | ((current: Project) => Project)) => void;
  setMode: (mode: StudioMode) => void;
  setActiveFrameIndex: (index: number) => void;
  setZoom: (value: number) => void;

  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  beginBatch: (label: string) => void;
  commitBatch: () => void;
  cancelBatch: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  resetHistory: () => void;

  setSelection: (dotIds: string[], connectionIds?: string[], groupIds?: string[]) => void;
  addToSelection: (dotIds: string[], connectionIds?: string[], groupIds?: string[]) => void;
  removeFromSelection: (dotIds: string[], connectionIds?: string[], groupIds?: string[]) => void;
  toggleSelection: (dotIds: string[], connectionIds?: string[], groupIds?: string[]) => void;
  clearSelection: () => void;
  setGroupSelection: (groupIds: string[]) => void;
  addGroupToSelection: (groupIds: string[]) => void;
  removeGroupFromSelection: (groupIds: string[]) => void;
};

const createInitialSelection = (): SelectionState => ({
  selectedDotIds: [],
  selectedConnectionIds: [],
  selectedGroupIds: [],
});

export const useStudioStore = create<StudioState>((set, get) => ({
  project: createDefaultProject(),
  mode: "editor",
  activeFrameIndex: 0,
  zoom: DEFAULT_ZOOM,
  history: createHistoryManager(),
  selection: createInitialSelection(),

  setProject: (update) =>
    set((state) => ({
      project: typeof update === "function" ? update(state.project) : update,
      history: clearHistory(),
    })),

  setMode: (mode) => set({ mode }),
  setActiveFrameIndex: (index) => set({ activeFrameIndex: index }),
  setZoom: (value) => set({ zoom: value }),

  executeCommand: (command) =>
    set((state) => {
      const historyState = {
        project: state.project,
        activeFrameIndex: state.activeFrameIndex,
      };
      const result = execCmd(state.history, historyState, command);
      return {
        history: result.history,
        project: result.state.project,
        activeFrameIndex: result.state.activeFrameIndex,
      };
    }),

  undo: () =>
    set((state) => {
      const historyState = {
        project: state.project,
        activeFrameIndex: state.activeFrameIndex,
      };
      const result = undoCmd(state.history, historyState);
      if (!result) return state;
      return {
        history: result.history,
        project: result.state.project,
        activeFrameIndex: result.state.activeFrameIndex,
      };
    }),

  redo: () =>
    set((state) => {
      const historyState = {
        project: state.project,
        activeFrameIndex: state.activeFrameIndex,
      };
      const result = redoCmd(state.history, historyState);
      if (!result) return state;
      return {
        history: result.history,
        project: result.state.project,
        activeFrameIndex: result.state.activeFrameIndex,
      };
    }),

  beginBatch: (label) =>
    set((state) => ({
      history: beginBatchCmd(state.history, label),
    })),

  commitBatch: () =>
    set((state) => ({
      history: commitBatchCmd(state.history),
    })),

  cancelBatch: () =>
    set((state) => {
      const historyState = {
        project: state.project,
        activeFrameIndex: state.activeFrameIndex,
      };
      const result = cancelBatchCmd(state.history, historyState);
      return {
        history: result.history,
        project: result.state.project,
        activeFrameIndex: result.state.activeFrameIndex,
      };
    }),

  canUndo: () => canUndoFn(get().history),
  canRedo: () => canRedoFn(get().history),

  resetHistory: () =>
    set({
      history: clearHistory(),
    }),

  setSelection: (dotIds, connectionIds = [], groupIds = []) =>
    set({
      selection: {
        selectedDotIds: dotIds,
        selectedConnectionIds: connectionIds,
        selectedGroupIds: groupIds,
      },
    }),

  addToSelection: (dotIds, connectionIds = [], groupIds = []) =>
    set((state) => {
      const existingDots = new Set(state.selection.selectedDotIds);
      const existingConns = new Set(state.selection.selectedConnectionIds);
      const existingGroups = new Set(state.selection.selectedGroupIds);
      dotIds.forEach((id) => existingDots.add(id));
      connectionIds.forEach((id) => existingConns.add(id));
      groupIds.forEach((id) => existingGroups.add(id));
      return {
        selection: {
          selectedDotIds: Array.from(existingDots),
          selectedConnectionIds: Array.from(existingConns),
          selectedGroupIds: Array.from(existingGroups),
        },
      };
    }),

  removeFromSelection: (dotIds, connectionIds = [], groupIds = []) =>
    set((state) => {
      const dotsToRemove = new Set(dotIds);
      const connsToRemove = new Set(connectionIds);
      const groupsToRemove = new Set(groupIds);
      return {
        selection: {
          selectedDotIds: state.selection.selectedDotIds.filter((id) => !dotsToRemove.has(id)),
          selectedConnectionIds: state.selection.selectedConnectionIds.filter(
            (id) => !connsToRemove.has(id)
          ),
          selectedGroupIds: state.selection.selectedGroupIds.filter(
            (id) => !groupsToRemove.has(id)
          ),
        },
      };
    }),

  toggleSelection: (dotIds, connectionIds = [], groupIds = []) =>
    set((state) => {
      const existingDots = new Set(state.selection.selectedDotIds);
      const existingConns = new Set(state.selection.selectedConnectionIds);
      const existingGroups = new Set(state.selection.selectedGroupIds);

      dotIds.forEach((id) => {
        if (existingDots.has(id)) {
          existingDots.delete(id);
        } else {
          existingDots.add(id);
        }
      });

      connectionIds.forEach((id) => {
        if (existingConns.has(id)) {
          existingConns.delete(id);
        } else {
          existingConns.add(id);
        }
      });

      groupIds.forEach((id) => {
        if (existingGroups.has(id)) {
          existingGroups.delete(id);
        } else {
          existingGroups.add(id);
        }
      });

      return {
        selection: {
          selectedDotIds: Array.from(existingDots),
          selectedConnectionIds: Array.from(existingConns),
          selectedGroupIds: Array.from(existingGroups),
        },
      };
    }),

  clearSelection: () =>
    set({
      selection: createInitialSelection(),
    }),

  setGroupSelection: (groupIds) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedGroupIds: groupIds,
      },
    })),

  addGroupToSelection: (groupIds) =>
    set((state) => {
      const existingGroups = new Set(state.selection.selectedGroupIds);
      groupIds.forEach((id) => existingGroups.add(id));
      return {
        selection: {
          ...state.selection,
          selectedGroupIds: Array.from(existingGroups),
        },
      };
    }),

  removeGroupFromSelection: (groupIds) =>
    set((state) => {
      const groupsToRemove = new Set(groupIds);
      return {
        selection: {
          ...state.selection,
          selectedGroupIds: state.selection.selectedGroupIds.filter(
            (id) => !groupsToRemove.has(id)
          ),
        },
      };
    }),
}));
