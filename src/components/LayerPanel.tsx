import { useCallback, useState } from "react";
import { Eye, EyeOff, Lock, Unlock, Trash2, Unlink } from "lucide-react";
import type { Group, Frame } from "../lib/project";
import { useStudioStore } from "../store/studioStore";
import CollapsibleSection from "./CollapsibleSection";
import {
  UngroupCommand,
  DeleteGroupCommand,
  UpdateGroupCommand,
} from "../lib/commands";

interface LayerPanelProps {
  frame: Frame;
  activeFrameIndex: number;
  onCreateGroup: () => void;
}

const LayerPanel = ({ frame, activeFrameIndex, onCreateGroup }: LayerPanelProps) => {
  const executeCommand = useStudioStore((state) => state.executeCommand);
  const selection = useStudioStore((state) => state.selection);
  const setSelection = useStudioStore((state) => state.setSelection);
  const setGroupSelection = useStudioStore((state) => state.setGroupSelection);
  const clearSelection = useStudioStore((state) => state.clearSelection);

  const selectedGroupIds = selection.selectedGroupIds;
  const selectedDotIds = selection.selectedDotIds;

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleSelectGroup = useCallback(
    (group: Group) => {
      // Select the group and all its members
      setSelection(group.dotIds, group.connectionIds, [group.id]);
    },
    [setSelection]
  );

  const handleToggleVisibility = useCallback(
    (group: Group) => {
      executeCommand(
        new UpdateGroupCommand(
          activeFrameIndex,
          group.id,
          { visible: group.visible },
          { visible: !group.visible },
          group.visible ? "Hide group" : "Show group"
        )
      );
    },
    [activeFrameIndex, executeCommand]
  );

  const handleToggleLock = useCallback(
    (group: Group) => {
      executeCommand(
        new UpdateGroupCommand(
          activeFrameIndex,
          group.id,
          { locked: group.locked },
          { locked: !group.locked },
          group.locked ? "Unlock group" : "Lock group"
        )
      );
    },
    [activeFrameIndex, executeCommand]
  );

  const handleUngroup = useCallback(
    (group: Group) => {
      executeCommand(new UngroupCommand(activeFrameIndex, group));
      setGroupSelection([]);
    },
    [activeFrameIndex, executeCommand, setGroupSelection]
  );

  const handleDeleteGroup = useCallback(
    (group: Group) => {
      const dotsToRemove = frame.dots.filter((d) => group.dotIds.includes(d.id));
      const connsToRemove = frame.connections.filter((c) =>
        group.connectionIds.includes(c.id)
      );
      executeCommand(
        new DeleteGroupCommand(activeFrameIndex, group, dotsToRemove, connsToRemove)
      );
      clearSelection();
    },
    [activeFrameIndex, frame, executeCommand, clearSelection]
  );

  const handleStartRename = useCallback((group: Group) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  }, []);

  const handleFinishRename = useCallback(
    (group: Group) => {
      if (editingName.trim() && editingName !== group.name) {
        executeCommand(
          new UpdateGroupCommand(
            activeFrameIndex,
            group.id,
            { name: group.name },
            { name: editingName.trim() },
            "Rename group"
          )
        );
      }
      setEditingGroupId(null);
      setEditingName("");
    },
    [activeFrameIndex, editingName, executeCommand]
  );

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent, group: Group) => {
      if (e.key === "Enter") {
        handleFinishRename(group);
      } else if (e.key === "Escape") {
        setEditingGroupId(null);
        setEditingName("");
      }
    },
    [handleFinishRename]
  );

  if (frame.groups.length === 0 && selectedDotIds.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection title="Groups" defaultOpen>
      {frame.groups.length > 0 ? (
        <div className="layer-list">
          {frame.groups.map((group) => {
            const isSelected = selectedGroupIds.includes(group.id);
            return (
              <div
                key={group.id}
                className={`layer-item ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectGroup(group)}
              >
                <div
                  className="layer-color"
                  style={{ backgroundColor: group.color }}
                />
                {editingGroupId === group.id ? (
                  <input
                    type="text"
                    className="layer-name-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(group)}
                    onKeyDown={(e) => handleRenameKeyDown(e, group)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="layer-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(group);
                    }}
                  >
                    {group.name}
                  </span>
                )}
                <span className="layer-count">
                  {group.dotIds.length}
                </span>
                <button
                  type="button"
                  className="layer-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisibility(group);
                  }}
                  title={group.visible ? "Hide" : "Show"}
                >
                  {group.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  type="button"
                  className="layer-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLock(group);
                  }}
                  title={group.locked ? "Unlock" : "Lock"}
                >
                  {group.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                  type="button"
                  className="layer-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUngroup(group);
                  }}
                  title="Ungroup"
                >
                  <Unlink size={14} />
                </button>
                <button
                  type="button"
                  className="layer-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group);
                  }}
                  title="Delete group and contents"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="layer-empty">No groups yet</p>
      )}
      <div className="control-grid">
        <button
          type="button"
          className="btn"
          onClick={onCreateGroup}
          disabled={selectedDotIds.length === 0}
        >
          Create Group
        </button>
      </div>
    </CollapsibleSection>
  );
};

export default LayerPanel;
