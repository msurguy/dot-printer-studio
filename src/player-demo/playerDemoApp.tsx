import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DotPlayerReact,
  type DotPlayerData,
  type DotPlayerReactRef,
  validatePlayerData,
} from "../player";

const DOTP_HEADER = "DOTP1";
const decoder = new TextDecoder();

type SampleOption = {
  id: string;
  label: string;
  url: string;
};

const SAMPLE_OPTIONS: SampleOption[] = [
  {
    id: "sample-project",
    label: "samples/sample-project.dotp",
    url: new URL("../../samples/sample-project.dotp", import.meta.url).href,
  },
  {
    id: "genuary-animation",
    label: "samples/genuary-animation.json",
    url: new URL("../../samples/genuary-animation.json", import.meta.url).href,
  },
];

const parseTextProject = (raw: string): DotPlayerData => {
  const withoutBom = raw.replace(/^\uFEFF/, "");
  const payload = withoutBom.startsWith(DOTP_HEADER)
    ? withoutBom.slice(DOTP_HEADER.length)
    : withoutBom;
  return validatePlayerData(JSON.parse(payload));
};

const parseBinaryProject = (bytes: Uint8Array): DotPlayerData => {
  const header = decoder.decode(bytes.slice(0, DOTP_HEADER.length));
  if (header === DOTP_HEADER) {
    return parseTextProject(decoder.decode(bytes.slice(DOTP_HEADER.length)));
  }
  return parseTextProject(decoder.decode(bytes));
};

const defaultData = validatePlayerData({});

export const PlayerDemoApp = () => {
  const playerRef = useRef<DotPlayerReactRef>(null);

  const [data, setData] = useState<DotPlayerData>(defaultData);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loop, setLoop] = useState(true);
  const [showGridMode, setShowGridMode] = useState<"default" | "show" | "hide">(
    "default"
  );
  const [backgroundMode, setBackgroundMode] = useState<"default" | "custom">(
    "default"
  );
  const [customBackgroundColor, setCustomBackgroundColor] = useState("#0b1220");
  const [selectedSampleId, setSelectedSampleId] = useState(
    SAMPLE_OPTIONS[0]?.id ?? ""
  );
  const [sourceLabel, setSourceLabel] = useState("None");
  const [statusMessage, setStatusMessage] = useState(
    "Choose a sample file or upload your own .dotp/.json animation."
  );

  const totalFrames = data.frames.length;
  const currentFrame = data.frames[frameIndex] ?? data.frames[0];
  const frameDuration = Math.max(currentFrame?.duration ?? 1, 1);
  const frameProgress = Math.min(playhead / frameDuration, 1);

  const stats = useMemo(() => {
    let totalDots = 0;
    let totalConnections = 0;
    for (const frame of data.frames) {
      totalDots += frame.dots.length;
      totalConnections += frame.connections.length;
    }
    return { totalDots, totalConnections };
  }, [data.frames]);

  const applyData = useCallback((nextData: DotPlayerData, label: string) => {
    setData(nextData);
    setLoop(nextData.settings.loopPlayback);
    setFrameIndex(0);
    setPlayhead(0);
    setIsPlaying(false);
    setSourceLabel(label);
    setStatusMessage(`Loaded ${label}`);
  }, []);

  const loadSample = useCallback(
    async (sampleId: string) => {
      const sample = SAMPLE_OPTIONS.find((option) => option.id === sampleId);
      if (!sample) {
        setStatusMessage("Invalid sample selection.");
        return;
      }

      setSelectedSampleId(sampleId);
      setStatusMessage(`Loading ${sample.label}...`);

      try {
        const response = await fetch(sample.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        applyData(parseBinaryProject(new Uint8Array(buffer)), sample.label);
      } catch {
        setStatusMessage(`Failed to load ${sample.label}.`);
      }
    },
    [applyData]
  );

  useEffect(() => {
    const initialSample = SAMPLE_OPTIONS[0];
    if (initialSample) {
      void loadSample(initialSample.id);
    }
  }, [loadSample]);

  const handleSampleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void loadSample(selectedSampleId);
    },
    [loadSample, selectedSampleId]
  );

  const handleFileUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }

      setStatusMessage(`Importing ${file.name}...`);

      try {
        const buffer = await file.arrayBuffer();
        applyData(parseBinaryProject(new Uint8Array(buffer)), file.name);
      } catch {
        setStatusMessage(`Failed to parse ${file.name}.`);
      }
    },
    [applyData]
  );

  const handleFrameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextFrame = Number(event.target.value);
      setFrameIndex(nextFrame);
      setPlayhead(0);
      playerRef.current?.goToFrame(nextFrame, false);
    },
    []
  );

  const handleProgressChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const progress = Number(event.target.value);
      const nextPlayhead = progress * frameDuration;
      setPlayhead(nextPlayhead);
      playerRef.current?.seekProgress(progress);
    },
    [frameDuration]
  );

  const handleSpeedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextSpeed = Number(event.target.value);
    setSpeed(nextSpeed);
    playerRef.current?.setSpeed(nextSpeed);
  }, []);

  const handleZoomChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    playerRef.current?.setZoom(nextZoom);
  }, []);

  const handleLoopToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextLoop = event.target.checked;
    setLoop(nextLoop);
    playerRef.current?.setLoop(nextLoop);
  }, []);

  const showGridOverride =
    showGridMode === "default" ? undefined : showGridMode === "show";
  const backgroundOverride =
    backgroundMode === "custom" ? customBackgroundColor : undefined;

  return (
    <div className="demo-shell">
      <header className="demo-header">
        <h1>Dot Printer Player Demo</h1>
        <p>
          Test animation playback with bundled samples or your own files. This page
          uses <code>DotPlayerReact</code> directly.
        </p>
      </header>

      <section className="demo-toolbar">
        <form onSubmit={handleSampleSubmit} className="toolbar-card">
          <label htmlFor="sample-select">Sample file</label>
          <div className="row">
            <select
              id="sample-select"
              value={selectedSampleId}
              onChange={(event) => setSelectedSampleId(event.target.value)}
            >
              {SAMPLE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit">Load Sample</button>
          </div>
        </form>

        <div className="toolbar-card">
          <label htmlFor="file-input">Upload file (.dotp or .json)</label>
          <input
            id="file-input"
            type="file"
            accept=".dotp,.json,application/json,application/octet-stream"
            onChange={handleFileUpload}
          />
        </div>

        <div className="toolbar-card">
          <label>Source</label>
          <div className="source-label">{sourceLabel}</div>
          <div className="status">{statusMessage}</div>
        </div>
      </section>

      <section className="demo-main">
        <div className="player-panel">
          <div className="player-surface">
            <DotPlayerReact
              ref={playerRef}
              data={data}
              loop={loop}
              speed={speed}
              zoom={zoom}
              showGrid={showGridOverride}
              backgroundColor={backgroundOverride}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onStop={() => {
                setIsPlaying(false);
                setFrameIndex(0);
                setPlayhead(0);
              }}
              onComplete={() => setIsPlaying(false)}
              onFrameChange={({ frameIndex: nextFrame }) => {
                setFrameIndex(nextFrame);
                setPlayhead(0);
              }}
              onEnterFrame={({ frameIndex: nextFrame, playhead: nextPlayhead }) => {
                setFrameIndex(nextFrame);
                setPlayhead(nextPlayhead);
              }}
            />
          </div>

          <div className="transport">
            <button onClick={() => playerRef.current?.togglePlayPause()}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button onClick={() => playerRef.current?.stop()}>Stop</button>
            <button onClick={() => playerRef.current?.goToFirstFrame(false)}>
              First
            </button>
            <button onClick={() => playerRef.current?.goToPrevFrame(false)}>
              Prev
            </button>
            <button onClick={() => playerRef.current?.goToNextFrame(false)}>
              Next
            </button>
            <button onClick={() => playerRef.current?.goToLastFrame(false)}>
              Last
            </button>
            <button onClick={() => playerRef.current?.goToFrame(0, true)}>
              Restart + Play
            </button>
          </div>
        </div>

        <aside className="controls-panel">
          <div className="control-group">
            <label htmlFor="frame-slider">
              Frame: {Math.min(frameIndex + 1, totalFrames)} / {totalFrames}
            </label>
            <input
              id="frame-slider"
              type="range"
              min={0}
              max={Math.max(totalFrames - 1, 0)}
              step={1}
              value={Math.min(frameIndex, Math.max(totalFrames - 1, 0))}
              onChange={handleFrameChange}
              disabled={totalFrames <= 1}
            />
          </div>

          <div className="control-group">
            <label htmlFor="playhead-slider">
              Frame progress: {Math.round(frameProgress * 100)}%
            </label>
            <input
              id="playhead-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={frameProgress}
              onChange={handleProgressChange}
            />
          </div>

          <div className="control-group">
            <label htmlFor="speed-slider">Speed: {speed.toFixed(2)}x</label>
            <input
              id="speed-slider"
              type="range"
              min={0.25}
              max={4}
              step={0.05}
              value={speed}
              onChange={handleSpeedChange}
            />
          </div>

          <div className="control-group">
            <label htmlFor="zoom-slider">Zoom: {zoom.toFixed(2)}x</label>
            <input
              id="zoom-slider"
              type="range"
              min={0.5}
              max={4}
              step={0.05}
              value={zoom}
              onChange={handleZoomChange}
            />
          </div>

          <div className="control-group inline">
            <label htmlFor="loop-toggle">Loop playback</label>
            <input
              id="loop-toggle"
              type="checkbox"
              checked={loop}
              onChange={handleLoopToggle}
            />
          </div>

          <div className="control-group">
            <label htmlFor="show-grid-mode">Grid override</label>
            <select
              id="show-grid-mode"
              value={showGridMode}
              onChange={(event) =>
                setShowGridMode(event.target.value as "default" | "show" | "hide")
              }
            >
              <option value="default">Use file setting</option>
              <option value="show">Force show grid</option>
              <option value="hide">Force hide grid</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="background-mode">Background override</label>
            <select
              id="background-mode"
              value={backgroundMode}
              onChange={(event) =>
                setBackgroundMode(event.target.value as "default" | "custom")
              }
            >
              <option value="default">Use file setting</option>
              <option value="custom">Custom color</option>
            </select>
            <input
              type="color"
              value={customBackgroundColor}
              onChange={(event) => setCustomBackgroundColor(event.target.value)}
              disabled={backgroundMode !== "custom"}
            />
          </div>

          <div className="stats">
            <p>Current frame duration: {Math.round(frameDuration)} ms</p>
            <p>Current playhead: {Math.round(playhead)} ms</p>
            <p>Total frames: {totalFrames}</p>
            <p>Total dots across frames: {stats.totalDots}</p>
            <p>Total connections across frames: {stats.totalConnections}</p>
          </div>
        </aside>
      </section>
    </div>
  );
};
