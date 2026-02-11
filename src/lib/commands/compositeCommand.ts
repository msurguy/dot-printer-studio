import type { Command, HistoryState } from "./types";
import { makeId } from "../project";

export class CompositeCommand implements Command {
  readonly id: string;
  readonly type = "COMPOSITE";
  readonly label: string;
  readonly timestamp: number;
  readonly children: Command[];

  constructor(label: string, children: Command[]) {
    this.id = makeId();
    this.label = label;
    this.timestamp = Date.now();
    this.children = children;
  }

  execute(state: HistoryState): HistoryState {
    return this.children.reduce((s, cmd) => cmd.execute(s), state);
  }

  undo(state: HistoryState): HistoryState {
    return this.children.reduceRight((s, cmd) => cmd.undo(s), state);
  }
}
