import type { Command, HistoryManager, HistoryState } from "./types";
import { MAX_HISTORY_SIZE, createHistoryManager } from "./types";
import { CompositeCommand } from "./compositeCommand";

export const executeCommand = (
  history: HistoryManager,
  state: HistoryState,
  command: Command
): { history: HistoryManager; state: HistoryState } => {
  const newState = command.execute(state);

  if (history.batchGroup !== null) {
    return {
      history: {
        ...history,
        batchGroup: [...history.batchGroup, command],
      },
      state: newState,
    };
  }

  const past = [...history.past, command];
  if (past.length > MAX_HISTORY_SIZE) {
    past.shift();
  }

  return {
    history: {
      ...history,
      past,
      future: [],
    },
    state: newState,
  };
};

export const undo = (
  history: HistoryManager,
  state: HistoryState
): { history: HistoryManager; state: HistoryState } | null => {
  if (history.past.length === 0) {
    return null;
  }

  const command = history.past[history.past.length - 1];
  const newState = command.undo(state);

  return {
    history: {
      ...history,
      past: history.past.slice(0, -1),
      future: [command, ...history.future],
    },
    state: newState,
  };
};

export const redo = (
  history: HistoryManager,
  state: HistoryState
): { history: HistoryManager; state: HistoryState } | null => {
  if (history.future.length === 0) {
    return null;
  }

  const command = history.future[0];
  const newState = command.execute(state);

  const past = [...history.past, command];
  if (past.length > MAX_HISTORY_SIZE) {
    past.shift();
  }

  return {
    history: {
      ...history,
      past,
      future: history.future.slice(1),
    },
    state: newState,
  };
};

export const beginBatch = (
  history: HistoryManager,
  label: string
): HistoryManager => {
  if (history.batchGroup !== null) {
    return history;
  }
  return {
    ...history,
    batchGroup: [],
    batchLabel: label,
  };
};

export const commitBatch = (
  history: HistoryManager
): HistoryManager => {
  if (history.batchGroup === null || history.batchGroup.length === 0) {
    return {
      ...history,
      batchGroup: null,
      batchLabel: null,
    };
  }

  const composite = new CompositeCommand(
    history.batchLabel ?? "Batch operation",
    history.batchGroup
  );

  const past = [...history.past, composite];
  if (past.length > MAX_HISTORY_SIZE) {
    past.shift();
  }

  return {
    past,
    future: [],
    batchGroup: null,
    batchLabel: null,
  };
};

export const cancelBatch = (
  history: HistoryManager,
  state: HistoryState
): { history: HistoryManager; state: HistoryState } => {
  if (history.batchGroup === null) {
    return { history, state };
  }

  let currentState = state;
  for (let i = history.batchGroup.length - 1; i >= 0; i--) {
    currentState = history.batchGroup[i].undo(currentState);
  }

  return {
    history: {
      ...history,
      batchGroup: null,
      batchLabel: null,
    },
    state: currentState,
  };
};

export const canUndo = (history: HistoryManager): boolean => {
  return history.past.length > 0 && history.batchGroup === null;
};

export const canRedo = (history: HistoryManager): boolean => {
  return history.future.length > 0 && history.batchGroup === null;
};

export const clearHistory = (): HistoryManager => createHistoryManager();
