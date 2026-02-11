import { CircleDot, Link2 } from "lucide-react";
import { EASING_LABELS, type EasingName } from "../lib/easing";
import { UI_LIMITS } from "../lib/constants";
import CollapsibleSection from "./CollapsibleSection";
import IconToggle from "./IconToggle";
import type { Frame } from "../lib/project";

interface TimingPanelProps {
  frame: Frame;
  onTimingChange: (updates: Partial<Frame>) => void;
}

const TimingPanel = ({ frame, onTimingChange }: TimingPanelProps) => {
  return (
    <CollapsibleSection title="Timing" defaultOpen>
      <div className="control-row">
        <label htmlFor="frame-duration">Frame duration (ms)</label>
        <input
          id="frame-duration"
          type="number"
          min={UI_LIMITS.frameDuration.min}
          max={UI_LIMITS.frameDuration.max}
          value={frame.duration}
          onChange={(event) =>
            onTimingChange({ duration: Number(event.target.value) })
          }
        />
      </div>
      <div className="control-row">
        <label>Animate dots</label>
        <IconToggle
          checked={frame.animateDots}
          label="Toggle dot animation"
          icon={<CircleDot size={14} />}
          onToggle={() =>
            onTimingChange({ animateDots: !frame.animateDots })
          }
        />
      </div>
      <div className="control-row">
        <label>Animate connections</label>
        <IconToggle
          checked={frame.animateConnections}
          label="Toggle connection animation"
          icon={<Link2 size={14} />}
          onToggle={() =>
            onTimingChange({ animateConnections: !frame.animateConnections })
          }
        />
      </div>
      <div className="control-row">
        <label htmlFor="dot-fade-in">Dot fade in (ms)</label>
        <input
          id="dot-fade-in"
          type="number"
          min={UI_LIMITS.dotFade.min}
          max={UI_LIMITS.dotFade.max}
          value={frame.dotFadeInDuration}
          onChange={(event) =>
            onTimingChange({ dotFadeInDuration: Number(event.target.value) })
          }
        />
      </div>
      <div className="control-row">
        <label htmlFor="dot-fade-out">Dot fade out (ms)</label>
        <input
          id="dot-fade-out"
          type="number"
          min={UI_LIMITS.dotFade.min}
          max={UI_LIMITS.dotFade.max}
          value={frame.dotFadeOutDuration}
          onChange={(event) =>
            onTimingChange({ dotFadeOutDuration: Number(event.target.value) })
          }
        />
      </div>
      <div className="control-row">
        <label htmlFor="dot-stagger">Dot stagger (ms)</label>
        <input
          id="dot-stagger"
          type="number"
          min={UI_LIMITS.dotStagger.min}
          max={UI_LIMITS.dotStagger.max}
          value={frame.dotStagger}
          onChange={(event) =>
            onTimingChange({ dotStagger: Number(event.target.value) })
          }
        />
      </div>
      <div className="control-row">
        <label htmlFor="dot-color-transition">Dot color transition (ms)</label>
        <input
          id="dot-color-transition"
          type="number"
          min={UI_LIMITS.dotColorTransition.min}
          max={UI_LIMITS.dotColorTransition.max}
          value={frame.dotColorTransitionDuration}
          onChange={(event) =>
            onTimingChange({
              dotColorTransitionDuration: Number(event.target.value),
            })
          }
        />
      </div>
      <div className="control-row">
        <label htmlFor="dot-color-easing">Dot color easing</label>
        <select
          id="dot-color-easing"
          value={frame.dotColorTransitionEasing}
          onChange={(event) =>
            onTimingChange({
              dotColorTransitionEasing: event.target.value as EasingName,
            })
          }
        >
          {Object.keys(EASING_LABELS).map((key) => (
            <option key={key} value={key}>
              {EASING_LABELS[key as EasingName]}
            </option>
          ))}
        </select>
      </div>
      <div className="control-row">
        <label htmlFor="frame-easing">Easing</label>
        <select
          id="frame-easing"
          value={frame.easing}
          onChange={(event) =>
            onTimingChange({ easing: event.target.value as EasingName })
          }
        >
          {Object.keys(EASING_LABELS).map((key) => (
            <option key={key} value={key}>
              {EASING_LABELS[key as EasingName]}
            </option>
          ))}
        </select>
      </div>
      <div className="control-row">
        <label htmlFor="conn-duration">Connection draw (ms)</label>
        <input
          id="conn-duration"
          type="number"
          min={UI_LIMITS.connectionDuration.min}
          max={UI_LIMITS.connectionDuration.max}
          value={frame.connectionAnimationDuration}
          onChange={(event) =>
            onTimingChange({
              connectionAnimationDuration: Number(event.target.value),
            })
          }
        />
      </div>
      <div className="control-row">
        <label htmlFor="conn-stagger">Connection stagger (ms)</label>
        <input
          id="conn-stagger"
          type="number"
          min={UI_LIMITS.connectionStagger.min}
          max={UI_LIMITS.connectionStagger.max}
          value={frame.connectionStagger}
          onChange={(event) =>
            onTimingChange({ connectionStagger: Number(event.target.value) })
          }
        />
      </div>
    </CollapsibleSection>
  );
};

export default TimingPanel;
