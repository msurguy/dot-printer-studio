import CollapsibleSection from "./CollapsibleSection";
import CompactSlider from "./CompactSlider";
import type { SvgReferenceState } from "../hooks/useSvgReference";

interface TraceReferencePanelProps {
  svgReference: SvgReferenceState;
  setSvgReference: React.Dispatch<React.SetStateAction<SvgReferenceState>>;
  onStartMove: () => void;
  onRemove: () => void;
}

const TraceReferencePanel = ({
  svgReference,
  setSvgReference,
  onStartMove,
  onRemove,
}: TraceReferencePanelProps) => {
  return (
    <CollapsibleSection title="Trace Reference" defaultOpen>
      {svgReference.dataUrl ? (
        <>
          {svgReference.isPlacing && (
            <p className="status">Click to place SVG, ESC to cancel</p>
          )}
          <CompactSlider
            id="svg-opacity"
            label="Opacity"
            min={0}
            max={1}
            step={0.05}
            value={svgReference.opacity}
            valueLabel={`${Math.round(svgReference.opacity * 100)}%`}
            onChange={(val) =>
              setSvgReference((prev) => ({ ...prev, opacity: val }))
            }
          />
          <CompactSlider
            id="svg-scale"
            label="Size"
            min={0.1}
            max={3}
            step={0.1}
            value={svgReference.scale}
            valueLabel={`${Math.round(svgReference.scale * 100)}%`}
            onChange={(val) =>
              setSvgReference((prev) => ({ ...prev, scale: val }))
            }
          />
          <div className="control-row">
            <label htmlFor="svg-pos-x">Position X</label>
            <input
              id="svg-pos-x"
              type="number"
              value={Math.round(svgReference.position.x)}
              onChange={(e) =>
                setSvgReference((prev) => ({
                  ...prev,
                  position: { ...prev.position, x: Number(e.target.value) },
                }))
              }
              disabled={svgReference.isLocked || svgReference.isPlacing}
            />
          </div>
          <div className="control-row">
            <label htmlFor="svg-pos-y">Position Y</label>
            <input
              id="svg-pos-y"
              type="number"
              value={Math.round(svgReference.position.y)}
              onChange={(e) =>
                setSvgReference((prev) => ({
                  ...prev,
                  position: { ...prev.position, y: Number(e.target.value) },
                }))
              }
              disabled={svgReference.isLocked || svgReference.isPlacing}
            />
          </div>
          <div className="control-grid">
            <button
              type="button"
              className={`btn ${svgReference.isPlacing ? "active" : ""}`}
              onClick={onStartMove}
              disabled={svgReference.isPlacing}
            >
              Move
            </button>
            <button
              type="button"
              className={`btn ${svgReference.isLocked ? "active" : ""}`}
              onClick={() =>
                setSvgReference((prev) => ({
                  ...prev,
                  isLocked: !prev.isLocked,
                }))
              }
              disabled={svgReference.isPlacing}
            >
              {svgReference.isLocked ? "Unlock" : "Lock"}
            </button>
          </div>
          <button
            type="button"
            className="btn"
            onClick={onRemove}
            style={{ width: "100%", marginTop: "4px" }}
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <p className="status">Use Import → SVG to load a trace, or drag SVG onto canvas.</p>
        </>
      )}
    </CollapsibleSection>
  );
};

export default TraceReferencePanel;
