import { useCallback, useEffect, useState, type CSSProperties, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Grid, Settings } from "lucide-react";
import { clamp } from "../lib/canvas";
import { PRESET_COLORS, UI_LIMITS } from "../lib/constants";
import ColorDropdown from "./ColorDropdown";
import CompactSlider from "./CompactSlider";
import IconToggle from "./IconToggle";
import type { Project } from "../lib/project";

interface CanvasToolbarProps {
  project: Project;
  zoom: number;
  setZoom: (zoom: number) => void;
  isCanvasSettingsOpen: boolean;
  setIsCanvasSettingsOpen: (open: boolean) => void;
  canvasSettingsStyle: CSSProperties;
  canvasSettingsButtonRef: RefObject<HTMLButtonElement | null>;
  canvasSettingsMenuRef: RefObject<HTMLDivElement | null>;
  onGridSizeChange: (value: number) => void;
  onDotGapChange: (value: number) => void;
  onDotSizeChange: (value: number) => void;
  onGridDotSizeChange: (value: number) => void;
  onGridColorChange: (value: string) => void;
  onShowGridChange: (value: boolean) => void;
}

const CanvasToolbar = ({
  project,
  zoom,
  setZoom,
  isCanvasSettingsOpen,
  setIsCanvasSettingsOpen,
  canvasSettingsStyle,
  canvasSettingsButtonRef,
  canvasSettingsMenuRef,
  onGridSizeChange,
  onDotGapChange,
  onDotSizeChange,
  onGridDotSizeChange,
  onGridColorChange,
  onShowGridChange,
}: CanvasToolbarProps) => {
  const [gridSizeInput, setGridSizeInput] = useState(String(project.metadata.gridSize));
  const [zoomInput, setZoomInput] = useState(String(Math.round(zoom * 100)));

  useEffect(() => {
    setGridSizeInput(String(project.metadata.gridSize));
  }, [project.metadata.gridSize]);

  useEffect(() => {
    setZoomInput(String(Math.round(zoom * 100)));
  }, [zoom]);

  const commitGridSizeInput = useCallback(() => {
    const trimmedValue = gridSizeInput.trim();
    if (trimmedValue === "") {
      setGridSizeInput(String(project.metadata.gridSize));
      return;
    }

    const parsedValue = Number(trimmedValue);
    if (Number.isNaN(parsedValue)) {
      setGridSizeInput(String(project.metadata.gridSize));
      return;
    }

    onGridSizeChange(parsedValue);
  }, [gridSizeInput, onGridSizeChange, project.metadata.gridSize]);

  const handleGridSizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commitGridSizeInput();
        event.currentTarget.blur();
      }
      if (event.key === "Escape") {
        setGridSizeInput(String(project.metadata.gridSize));
        event.currentTarget.blur();
      }
    },
    [commitGridSizeInput, project.metadata.gridSize]
  );

  const commitZoomInput = useCallback(() => {
    const trimmedValue = zoomInput.trim();
    if (trimmedValue === "") {
      setZoomInput(String(Math.round(zoom * 100)));
      return;
    }

    const parsedValue = Number(trimmedValue);
    if (Number.isNaN(parsedValue)) {
      setZoomInput(String(Math.round(zoom * 100)));
      return;
    }

    setZoom(
      clamp(
        parsedValue / 100,
        UI_LIMITS.zoom.min,
        UI_LIMITS.zoom.max
      )
    );
  }, [setZoom, zoomInput, zoom]);

  const handleZoomKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commitZoomInput();
        event.currentTarget.blur();
      }
      if (event.key === "Escape") {
        setZoomInput(String(Math.round(zoom * 100)));
        event.currentTarget.blur();
      }
    },
    [commitZoomInput, zoom]
  );

  return (
    <div className="canvas-toolbar">
      <div className="canvas-toolbar-group">
        <span className="canvas-toolbar-label">Canvas size</span>
        <input
          id="grid-size"
          className="canvas-toolbar-input"
          type="number"
          aria-label="Canvas size"
          min={UI_LIMITS.gridSize.min}
          max={UI_LIMITS.gridSize.max}
          value={gridSizeInput}
          onChange={(event) => setGridSizeInput(event.target.value)}
          onBlur={commitGridSizeInput}
          onKeyDown={handleGridSizeKeyDown}
        />
      </div>
      <div className="canvas-toolbar-group">
        <span className="canvas-toolbar-label">Zoom</span>
        <div className="zoom-control">
          <input
            type="range"
            className="zoom-range"
            min={UI_LIMITS.zoom.min * 100}
            max={UI_LIMITS.zoom.max * 100}
            step={UI_LIMITS.zoom.step * 100}
            value={Math.round(zoom * 100)}
            onChange={(event) =>
              setZoom(
                clamp(
                  Number(event.target.value) / 100,
                  UI_LIMITS.zoom.min,
                  UI_LIMITS.zoom.max
                )
              )
            }
            aria-label="Zoom level"
          />
          <input
            type="number"
            className="zoom-input"
            min={UI_LIMITS.zoom.min * 100}
            max={UI_LIMITS.zoom.max * 100}
            step={1}
            value={zoomInput}
            onChange={(event) => setZoomInput(event.target.value)}
            onBlur={commitZoomInput}
            onKeyDown={handleZoomKeyDown}
            aria-label="Zoom percent"
          />
          <span className="zoom-value">%</span>
        </div>
      </div>
      <div className="canvas-toolbar-group">
        <span className="canvas-toolbar-label">Grid</span>
        <IconToggle
          checked={project.metadata.showGrid}
          label="Toggle grid"
          icon={<Grid size={14} />}
          onToggle={() => onShowGridChange(!project.metadata.showGrid)}
        />
        <ColorDropdown
          ariaLabel="Grid color"
          label="Color"
          value={project.metadata.gridColor}
          colors={PRESET_COLORS}
          onChange={onGridColorChange}
        />
        <button
          type="button"
          ref={canvasSettingsButtonRef}
          className={`icon-toggle-btn${isCanvasSettingsOpen ? " active" : ""}`}
          aria-label="Canvas settings"
          title="Canvas settings"
          onClick={() => setIsCanvasSettingsOpen(!isCanvasSettingsOpen)}
        >
          <Settings size={14} />
        </button>
        {isCanvasSettingsOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                className="settings-menu"
                ref={canvasSettingsMenuRef}
                style={canvasSettingsStyle}
              >
                <p className="settings-menu-title">Canvas settings</p>
                <CompactSlider
                  id="dot-gap"
                  label="Dot gap"
                  min={UI_LIMITS.dotGap.min}
                  max={UI_LIMITS.dotGap.max}
                  step={UI_LIMITS.dotGap.step}
                  value={project.metadata.dotGap}
                  valueLabel={project.metadata.dotGap.toFixed(1)}
                  onChange={onDotGapChange}
                />
                <CompactSlider
                  id="dot-size"
                  label="Dot size"
                  min={UI_LIMITS.dotSize.min}
                  max={UI_LIMITS.dotSize.max}
                  step={UI_LIMITS.dotSize.step}
                  value={project.metadata.dotSize}
                  valueLabel={project.metadata.dotSize.toFixed(1)}
                  onChange={onDotSizeChange}
                />
                <CompactSlider
                  id="grid-dot-size"
                  label="Grid dot size"
                  min={UI_LIMITS.gridDotSize.min}
                  max={UI_LIMITS.gridDotSize.max}
                  step={UI_LIMITS.gridDotSize.step}
                  value={project.metadata.gridDotSize}
                  valueLabel={project.metadata.gridDotSize.toFixed(1)}
                  onChange={onGridDotSizeChange}
                />
              </div>,
              document.body
            )
          : null}
      </div>
    </div>
  );
};

export default CanvasToolbar;
