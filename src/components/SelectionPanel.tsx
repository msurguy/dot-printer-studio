import { UI_LIMITS } from "../lib/constants";
import CollapsibleSection from "./CollapsibleSection";

interface SelectionPanelProps {
  selectedDotIds: string[];
  rotationAngle: string;
  selectedFadeInInput: string;
  selectedFadeOutInput: string;
  onSelectConnected: () => void;
  onSelectByColor: () => void;
  onInvertSelection: () => void;
  onSelectConnections: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate90CW: () => void;
  onRotate90CCW: () => void;
  onRotate180: () => void;
  onRotationInputChange: (value: string) => void;
  onApplyRotation: () => void;
  onSetSelectedFadeIn: (value: string) => void;
  onSetSelectedFadeOut: (value: string) => void;
  onApplyDotOverrides: () => void;
  onClearDotOverrides: () => void;
}

const SelectionPanel = ({
  selectedDotIds,
  rotationAngle,
  selectedFadeInInput,
  selectedFadeOutInput,
  onSelectConnected,
  onSelectByColor,
  onInvertSelection,
  onSelectConnections,
  onFlipHorizontal,
  onFlipVertical,
  onRotate90CW,
  onRotate90CCW,
  onRotate180,
  onRotationInputChange,
  onApplyRotation,
  onSetSelectedFadeIn,
  onSetSelectedFadeOut,
  onApplyDotOverrides,
  onClearDotOverrides,
}: SelectionPanelProps) => {
  if (selectedDotIds.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection title={`Selection (${selectedDotIds.length} dots)`} defaultOpen>
      <div className="control-grid">
        <button type="button" className="btn" onClick={onSelectConnected}>
          Select connected
        </button>
        <button type="button" className="btn" onClick={onSelectByColor}>
          Select by color
        </button>
        <button type="button" className="btn" onClick={onInvertSelection}>
          Invert selection
        </button>
        <button type="button" className="btn" onClick={onSelectConnections}>
          Select connections
        </button>
      </div>
      <h3>Transform</h3>
      <div className="control-grid">
        <button type="button" className="btn" onClick={onFlipHorizontal}>
          Flip H
        </button>
        <button type="button" className="btn" onClick={onFlipVertical}>
          Flip V
        </button>
        <button type="button" className="btn" onClick={onRotate90CW}>
          Rotate CW
        </button>
        <button type="button" className="btn" onClick={onRotate90CCW}>
          Rotate CCW
        </button>
        <button type="button" className="btn" onClick={onRotate180}>
          Rotate 180
        </button>
      </div>
      <div className="control-row">
        <label htmlFor="rotation-angle">Rotate by angle (°)</label>
        <input
          id="rotation-angle"
          type="number"
          value={rotationAngle}
          onChange={(e) => onRotationInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onApplyRotation();
            }
          }}
          placeholder="0"
          step="1"
        />
        <button type="button" className="btn" onClick={onApplyRotation}>
          Apply
        </button>
      </div>
      <h3>Fade overrides</h3>
      <div className="control-row">
        <label htmlFor="fade-in-override">Fade in (ms)</label>
        <input
          id="fade-in-override"
          type="number"
          min={UI_LIMITS.dotFade.min}
          value={selectedFadeInInput}
          onChange={(event) => onSetSelectedFadeIn(event.target.value)}
          placeholder="Default"
        />
      </div>
      <div className="control-row">
        <label htmlFor="fade-out-override">Fade out (ms)</label>
        <input
          id="fade-out-override"
          type="number"
          min={UI_LIMITS.dotFade.min}
          value={selectedFadeOutInput}
          onChange={(event) => onSetSelectedFadeOut(event.target.value)}
          placeholder="Default"
        />
      </div>
      <div className="control-grid">
        <button type="button" className="btn" onClick={onApplyDotOverrides}>
          Apply
        </button>
        <button type="button" className="btn" onClick={onClearDotOverrides}>
          Clear
        </button>
      </div>
    </CollapsibleSection>
  );
};

export default SelectionPanel;
