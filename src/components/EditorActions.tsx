import { Palette, Sparkles, Trash, Trash2 } from "lucide-react";

type EditorActionsProps = {
  onAutoConnect: () => void;
  onClearFrame: () => void;
  onDeleteSelected: () => void;
  onRecolorSelected: () => void;
};

const EditorActions = ({
  onAutoConnect,
  onClearFrame,
  onDeleteSelected,
  onRecolorSelected,
}: EditorActionsProps) => {
  return (
    <div className="control-grid">
      <button type="button" className="btn btn-icon" onClick={onAutoConnect}>
        <Sparkles size={14} />
        <span>Auto-connect</span>
      </button>
      <button type="button" className="btn btn-icon" onClick={onClearFrame}>
        <Trash size={14} />
        <span>Clear frame</span>
      </button>
      <button type="button" className="btn btn-icon" onClick={onDeleteSelected}>
        <Trash2 size={14} />
        <span>Delete selected</span>
      </button>
      <button type="button" className="btn btn-icon" onClick={onRecolorSelected}>
        <Palette size={14} />
        <span>Recolor selected</span>
      </button>
    </div>
  );
};

export default EditorActions;
