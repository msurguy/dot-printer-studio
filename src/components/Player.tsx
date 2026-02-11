import { useCallback, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { EASING_LABELS } from "../lib/easing";
import { ensureColorRef, resolveColor } from "../lib/project";
import {
  DEFAULT_CANVAS_BACKGROUND,
  PRESET_COLORS,
  UI_LIMITS,
} from "../lib/constants";
import ColorDropdown from "./ColorDropdown";
import CompactSlider from "./CompactSlider";
import CollapsibleSection from "./CollapsibleSection";
import IconToggle from "./IconToggle";
import TopToolbar from "./TopToolbar";
import { useStudioStore } from "../store/studioStore";
import {
  DotPlayerReact,
  type DotPlayerReactRef,
  type DotPlayerData,
} from "../player";

const Player = () => {
  const playerRef = useRef<DotPlayerReactRef>(null);

  // Local UI state for playback display
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [displayFrameIndex, setDisplayFrameIndex] = useState(0);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  // Store state
  const project = useStudioStore((state) => state.project);
  const setProject = useStudioStore((state) => state.setProject);
  const setActiveFrameIndex = useStudioStore((state) => state.setActiveFrameIndex);
  const zoom = useStudioStore((state) => state.zoom);
  const setZoom = useStudioStore((state) => state.setZoom);

  const frame = project.frames[displayFrameIndex] ?? project.frames[0];

  // Convert project to DotPlayerData (they are compatible)
  const playerData: DotPlayerData = project;

  // Canvas background color
  const canvasBackground = resolveColor(
    project.colors,
    project.metadata.backgroundColor,
    DEFAULT_CANVAS_BACKGROUND
  );

  // Frame progress for progress bar
  const frameProgress = frame?.duration ? Math.min(playhead / frame.duration, 1) : 0;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handlePlayToggle = useCallback(() => {
    playerRef.current?.togglePlayPause();
  }, []);

  const handleRestart = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current?.goToFrame(0, true);
  }, []);

  const handleFrameJump = useCallback((index: number) => {
    const targetIndex = Math.max(0, Math.min(index, project.frames.length - 1));
    playerRef.current?.goToFrame(targetIndex, false);
    setDisplayFrameIndex(targetIndex);
    setActiveFrameIndex(targetIndex);
    setPlayhead(0);
  }, [project.frames.length, setActiveFrameIndex]);

  const handleLoopToggle = useCallback(() => {
    setProject((current) => ({
      ...current,
      settings: { ...current.settings, loopPlayback: !current.settings.loopPlayback },
    }));
  }, [setProject]);

  const handleBackgroundChange = useCallback((value: string) => {
    setProject((current) => {
      const { colors, ref } = ensureColorRef(current.colors, value);
      return {
        ...current,
        colors,
        metadata: {
          ...current.metadata,
          backgroundColor: ref,
        },
      };
    });
  }, [setProject]);

  const handleZoomChange = useCallback((value: number) => {
    setZoom(value);
    playerRef.current?.setZoom(value);
  }, [setZoom]);

  // ============================================================================
  // Player Event Callbacks
  // ============================================================================

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setPlayhead(0);
    setDisplayFrameIndex(0);
  }, []);

  const handleFrameChange = useCallback(({ frameIndex }: { frameIndex: number; frameName: string }) => {
    setDisplayFrameIndex(frameIndex);
    setActiveFrameIndex(frameIndex);
    setPlayhead(0);
  }, [setActiveFrameIndex]);

  const handleEnterFrame = useCallback(({ playhead: ph }: { frameIndex: number; playhead: number; progress: number }) => {
    setPlayhead(ph);
  }, []);

  const handleComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="workspace-shell">
      <TopToolbar>
        <div className="toolbar-group">
          <span className="toolbar-label">Playback</span>
          <button
            type="button"
            className="toolbar-btn toolbar-icon-btn"
            onClick={handlePlayToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            className="toolbar-btn toolbar-icon-btn"
            onClick={handleRestart}
            aria-label="Restart"
            title="Restart"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="toolbar-group">
          <ColorDropdown
            ariaLabel="Canvas background color"
            label="Canvas"
            value={canvasBackground}
            colors={PRESET_COLORS}
            onChange={handleBackgroundChange}
          />
        </div>
      </TopToolbar>

      <div
        className={`workspace${isLeftPanelOpen ? "" : " left-collapsed"}${
          isRightPanelOpen ? "" : " right-collapsed"
        }${isTimelineOpen ? "" : " timeline-collapsed"}`}
      >
        <aside className={`panel panel-left${isLeftPanelOpen ? "" : " panel-collapsed"}`}>
          <CollapsibleSection title="Playback" defaultOpen>
            <CompactSlider
              id="zoom"
              label="Zoom"
              min={UI_LIMITS.zoom.min}
              max={UI_LIMITS.zoom.max}
              step={UI_LIMITS.zoom.step}
              value={zoom}
              valueLabel={`${Math.round(zoom * 100)}%`}
              onChange={handleZoomChange}
            />
            <div className="control-row">
              <label>Loop</label>
              <IconToggle
                checked={project.settings.loopPlayback}
                label="Toggle loop playback"
                icon={<RotateCcw size={14} />}
                onToggle={handleLoopToggle}
              />
            </div>
            <div className="control-row">
              <label>Fade in on start</label>
              <IconToggle
                checked={project.settings.fadeInOnStart}
                label="Toggle fade in on start"
                icon={<Sparkles size={14} />}
                onToggle={() =>
                  setProject((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      fadeInOnStart: !current.settings.fadeInOnStart,
                    },
                  }))
                }
              />
            </div>
            <div className="control-row">
              <label>Fade out on end</label>
              <IconToggle
                checked={project.settings.fadeOutOnEnd}
                label="Toggle fade out on end"
                icon={<Sparkles size={14} />}
                onToggle={() =>
                  setProject((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      fadeOutOnEnd: !current.settings.fadeOutOnEnd,
                    },
                  }))
                }
              />
            </div>
            <div className="control-row">
              <label>Connection fade in on start</label>
              <IconToggle
                checked={project.settings.connectionFadeInOnStart}
                label="Toggle connection fade in on start"
                icon={<Link2 size={14} />}
                onToggle={() =>
                  setProject((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      connectionFadeInOnStart: !current.settings.connectionFadeInOnStart,
                    },
                  }))
                }
              />
            </div>
            <div className="control-row">
              <label>Connection fade out on end</label>
              <IconToggle
                checked={project.settings.connectionFadeOutOnEnd}
                label="Toggle connection fade out on end"
                icon={<Link2 size={14} />}
                onToggle={() =>
                  setProject((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      connectionFadeOutOnEnd: !current.settings.connectionFadeOutOnEnd,
                    },
                  }))
                }
              />
            </div>
          </CollapsibleSection>

        </aside>

        <main className="stage">
          <div className="canvas-shell">
            <DotPlayerReact
              ref={playerRef}
              data={playerData}
              loop={project.settings.loopPlayback}
              zoom={zoom}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onFrameChange={handleFrameChange}
              onEnterFrame={handleEnterFrame}
              onComplete={handleComplete}
            />
          </div>
          {frame ? (
            <div className="playback-bar">
              <div className="progress">
                <div className="progress-fill" style={{ width: `${frameProgress * 100}%` }} />
              </div>
              <div className="playback-meta">
                <span>
                  Frame {displayFrameIndex + 1} / {project.frames.length}
                </span>
                <span>
                  {Math.round(playhead)} / {frame.duration} ms
                </span>
              </div>
            </div>
          ) : null}
        </main>

        <aside className={`panel panel-right${isRightPanelOpen ? "" : " panel-collapsed"}`}>
          {frame ? (
            <CollapsibleSection title="Frame Info" defaultOpen>
              <div className="info-grid">
                <div>
                  <span>Duration</span>
                  <strong>{frame.duration} ms</strong>
                </div>
                <div>
                  <span>Easing</span>
                  <strong>{EASING_LABELS[frame.easing]}</strong>
                </div>
                <div>
                  <span>Dots</span>
                  <strong>{frame.dots.length}</strong>
                </div>
                <div>
                  <span>Connections</span>
                  <strong>{frame.connections.length}</strong>
                </div>
              </div>
            </CollapsibleSection>
          ) : null}
        </aside>

        <section className={`timeline-panel${isTimelineOpen ? "" : " panel-collapsed"}`}>
          <div className="timeline-header">
            <div>
              <p className="timeline-title">Timeline</p>
              <p className="timeline-meta">{project.frames.length} frames</p>
            </div>
            <div className="timeline-actions">
              <CompactSlider
                id="frame-jump"
                label="Frame"
                min={0}
                max={Math.max(project.frames.length - 1, 0)}
                value={displayFrameIndex}
                valueLabel={`${displayFrameIndex + 1}/${project.frames.length}`}
                onChange={handleFrameJump}
              />
            </div>
          </div>
          <div className="timeline-strip">
            {project.frames.map((entry, index) => (
              <button
                key={`player-${entry.id}`}
                type="button"
                className={index === displayFrameIndex ? "timeline-card active" : "timeline-card"}
                onClick={() => handleFrameJump(index)}
              >
                <span className="timeline-frame-name">{entry.name}</span>
                <span className="timeline-frame-meta">{entry.duration} ms</span>
              </button>
            ))}
          </div>
        </section>

        <div className="panel-toggle panel-toggle-left">
          <button
            type="button"
            className="panel-toggle-btn"
            onClick={() => setIsLeftPanelOpen((open) => !open)}
            aria-label={isLeftPanelOpen ? "Collapse left panel" : "Expand left panel"}
            title={isLeftPanelOpen ? "Collapse left panel" : "Expand left panel"}
          >
            {isLeftPanelOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
        <div className="panel-toggle panel-toggle-right">
          <button
            type="button"
            className="panel-toggle-btn"
            onClick={() => setIsRightPanelOpen((open) => !open)}
            aria-label={isRightPanelOpen ? "Collapse right panel" : "Expand right panel"}
            title={isRightPanelOpen ? "Collapse right panel" : "Expand right panel"}
          >
            {isRightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <div className="panel-toggle panel-toggle-bottom">
          <button
            type="button"
            className="panel-toggle-btn"
            onClick={() => setIsTimelineOpen((open) => !open)}
            aria-label={isTimelineOpen ? "Collapse timeline" : "Expand timeline"}
            title={isTimelineOpen ? "Collapse timeline" : "Expand timeline"}
          >
            {isTimelineOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Player;
