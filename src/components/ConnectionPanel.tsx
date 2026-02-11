import CollapsibleSection from "./CollapsibleSection";

interface ConnectionPanelProps {
  selectedConnectionIds: string[];
  onReverseOrder: () => void;
  onSwapDirection: () => void;
  onNormalizeOrder: () => void;
}

const ConnectionPanel = ({
  selectedConnectionIds,
  onReverseOrder,
  onSwapDirection,
  onNormalizeOrder,
}: ConnectionPanelProps) => {
  if (selectedConnectionIds.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection title={`Connections (${selectedConnectionIds.length})`} defaultOpen>
      <div className="control-grid">
        <button type="button" className="btn" onClick={onReverseOrder}>
          Reverse order
        </button>
        <button type="button" className="btn" onClick={onSwapDirection}>
          Swap direction
        </button>
        <button type="button" className="btn" onClick={onNormalizeOrder}>
          Normalize order
        </button>
      </div>
    </CollapsibleSection>
  );
};

export default ConnectionPanel;
