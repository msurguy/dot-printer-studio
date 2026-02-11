import { useStudioStore } from "../store/studioStore";

const SidebarHeader = () => {
  const mode = useStudioStore((state) => state.mode);
  const setMode = useStudioStore((state) => state.setMode);

  return (
    <div className="panel-header">
      <div className="brand-mark" aria-hidden="true">
        DP
      </div>
      <div className="mode-toggle">
        <button
          type="button"
          className={mode === "editor" ? "pill active" : "pill"}
          onClick={() => setMode("editor")}
        >
          Editor
        </button>
        <button
          type="button"
          className={mode === "player" ? "pill active" : "pill"}
          onClick={() => setMode("player")}
        >
          Player
        </button>
      </div>
    </div>
  );
};

export default SidebarHeader;
