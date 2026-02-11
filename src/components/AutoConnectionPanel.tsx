import { Trash2 } from "lucide-react";
import type { AutoConnection } from "../lib/project";
import { ensureColorRef, resolveColor } from "../lib/project";
import { PRESET_COLORS } from "../lib/constants";
import type { Command } from "../lib/commands/types";
import {
  RemoveAutoConnectionCommand,
  UpdateAutoConnectionCommand,
} from "../lib/commands/autoConnectionCommands";
import ColorDropdown from "./ColorDropdown";
import CollapsibleSection from "./CollapsibleSection";

type AutoConnectionPanelProps = {
  autoConnections: AutoConnection[];
  colors: string[];
  executeCommand: (command: Command) => void;
};

const AutoConnectionPanel = ({
  autoConnections,
  colors,
  executeCommand,
}: AutoConnectionPanelProps) => {
  const handleDelete = (autoConn: AutoConnection) => {
    executeCommand(new RemoveAutoConnectionCommand(autoConn));
  };

  const handleUpdate = (
    autoConn: AutoConnection,
    updates: Partial<AutoConnection>
  ) => {
    const newState = { ...autoConn, ...updates };
    executeCommand(
      new UpdateAutoConnectionCommand(autoConn.id, autoConn, newState)
    );
  };

  const handleColorChange = (autoConn: AutoConnection, newColor: string) => {
    const { colors: newColors, ref } = ensureColorRef(colors, newColor);
    const addedColors = newColors.length > colors.length ? [newColor] : [];
    const newState = { ...autoConn, color: ref };
    executeCommand(
      new UpdateAutoConnectionCommand(
        autoConn.id,
        autoConn,
        newState,
        addedColors
      )
    );
  };

  if (autoConnections.length === 0) return null;

  return (
    <CollapsibleSection title="Auto-Connections" defaultOpen>
      <div className="autoconn-list">
        {autoConnections.map((autoConn) => (
          <div key={autoConn.id} className="autoconn-item">
            <div className="autoconn-header">
              <span className="autoconn-label">
                ({autoConn.fromX},{autoConn.fromY}) → ({autoConn.toX},
                {autoConn.toY})
              </span>
              <button
                className="layer-btn danger"
                onClick={() => handleDelete(autoConn)}
                title="Delete auto-connection"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="autoconn-settings">
              <div className="control-row">
                <label>Trace in (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={autoConn.traceInDuration}
                  onChange={(e) =>
                    handleUpdate(autoConn, {
                      traceInDuration: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </div>
              <div className="control-row">
                <label>In direction</label>
                <select
                  value={autoConn.traceInReverse ? "reverse" : "forward"}
                  onChange={(e) =>
                    handleUpdate(autoConn, {
                      traceInReverse: e.target.value === "reverse",
                    })
                  }
                >
                  <option value="forward">Forward</option>
                  <option value="reverse">Reverse</option>
                </select>
              </div>
              <div className="control-row">
                <label>Stay (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={autoConn.stayDuration ?? ""}
                  placeholder="Permanent"
                  onChange={(e) =>
                    handleUpdate(autoConn, {
                      stayDuration: e.target.value
                        ? Math.max(0, Number(e.target.value))
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="control-row">
                <label>Trace out (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={autoConn.traceOutDuration ?? ""}
                  placeholder="None"
                  onChange={(e) =>
                    handleUpdate(autoConn, {
                      traceOutDuration:
                        e.target.value === ""
                          ? undefined
                          : Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </div>
              {autoConn.traceOutDuration !== undefined && (
                <div className="control-row">
                  <label>Out direction</label>
                  <select
                    value={autoConn.traceOutReverse ? "reverse" : "forward"}
                    onChange={(e) =>
                      handleUpdate(autoConn, {
                        traceOutReverse: e.target.value === "reverse",
                      })
                    }
                  >
                    <option value="forward">Forward</option>
                    <option value="reverse">Reverse</option>
                  </select>
                </div>
              )}
              <div className="control-row">
                <label>Start time (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={autoConn.startTime}
                  onChange={(e) =>
                    handleUpdate(autoConn, {
                      startTime: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </div>
              <ColorDropdown
                ariaLabel="Connection color"
                label="Color"
                value={resolveColor(colors, autoConn.color, PRESET_COLORS[2])}
                colors={PRESET_COLORS}
                onChange={(color) => handleColorChange(autoConn, color)}
              />
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
};

export default AutoConnectionPanel;
