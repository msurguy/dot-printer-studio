import { Link2, Square, SquareDashed, Sparkles } from "lucide-react";
import { isShapeTool } from "../lib/shapes";
import { UI_LIMITS } from "../lib/constants";
import CollapsibleSection from "./CollapsibleSection";
import IconToggle from "./IconToggle";
import type { Tool } from "./editorUtils";

interface ToolOptionsPanelProps {
  tool: Tool;
  textValue: string;
  setTextValue: (value: string) => void;
  shapeFilled: boolean;
  setShapeFilled: (filled: boolean) => void;
  polygonSides: number;
  setPolygonSides: (sides: number) => void;
  starPoints: number;
  setStarPoints: (points: number) => void;
  autoConnectShapes: boolean;
  setAutoConnectShapes: (value: boolean) => void;
  connectionDurationOverride: string;
  setConnectionDurationOverride: (value: string) => void;
}

const ToolOptionsPanel = ({
  tool,
  textValue,
  setTextValue,
  shapeFilled,
  setShapeFilled,
  polygonSides,
  setPolygonSides,
  starPoints,
  setStarPoints,
  autoConnectShapes,
  setAutoConnectShapes,
  connectionDurationOverride,
  setConnectionDurationOverride,
}: ToolOptionsPanelProps) => {
  return (
    <CollapsibleSection title="Tool Options" defaultOpen>
      {tool === "text" && (
        <div className="control-row">
          <label htmlFor="text-input">Text</label>
          <input
            id="text-input"
            type="text"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder="Type text"
          />
        </div>
      )}
      {isShapeTool(tool) && (
        <>
          <div className="control-row">
            <label>Filled</label>
            <IconToggle
              checked={shapeFilled}
              label="Toggle filled shapes"
              checkedIcon={<Square size={14} />}
              uncheckedIcon={<SquareDashed size={14} />}
              onToggle={() => setShapeFilled(!shapeFilled)}
            />
          </div>
          <div className="control-row">
            <label>Auto-connect</label>
            <IconToggle
              checked={autoConnectShapes}
              label="Toggle auto-connect for shapes"
              checkedIcon={<Sparkles size={14} />}
              uncheckedIcon={<Link2 size={14} />}
              onToggle={() => setAutoConnectShapes(!autoConnectShapes)}
            />
          </div>
          {tool === "polygon" && (
            <div className="control-row">
              <label htmlFor="polygon-sides">Sides</label>
              <input
                id="polygon-sides"
                type="number"
                min={3}
                max={12}
                value={polygonSides}
                onChange={(e) => setPolygonSides(Number(e.target.value))}
              />
            </div>
          )}
          {tool === "star" && (
            <div className="control-row">
              <label htmlFor="star-points">Points</label>
              <input
                id="star-points"
                type="number"
                min={3}
                max={12}
                value={starPoints}
                onChange={(e) => setStarPoints(Number(e.target.value))}
              />
            </div>
          )}
        </>
      )}
      <div className="control-row">
        <label htmlFor="connection-override">New connection draw (ms)</label>
        <input
          id="connection-override"
          type="number"
          min={UI_LIMITS.connectionOverrideMin}
          value={connectionDurationOverride}
          onChange={(event) => setConnectionDurationOverride(event.target.value)}
          placeholder="Default"
        />
      </div>
    </CollapsibleSection>
  );
};

export default ToolOptionsPanel;
