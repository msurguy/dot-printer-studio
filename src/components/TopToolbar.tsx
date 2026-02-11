import type { ReactNode } from "react";
import { useStudioStore } from "../store/studioStore";

type TopToolbarProps = {
  children?: ReactNode;
};

const TopToolbar = ({ children }: TopToolbarProps) => {
  const mode = useStudioStore((state) => state.mode);
  const setMode = useStudioStore((state) => state.setMode);

  return (
    <header className="top-toolbar" role="toolbar" aria-label="Top toolbar">
      <div className="toolbar-brand">
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
      <div className="toolbar-center">
        <span className="toolbar-title">Dot Printer Studio</span>
      </div>
      <div className="toolbar-items">{children}</div>
    </header>
  );
};

export default TopToolbar;
