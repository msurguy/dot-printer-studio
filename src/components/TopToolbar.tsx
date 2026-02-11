import { useEffect, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { useStudioStore } from "../store/studioStore";

type TopToolbarProps = {
  children?: ReactNode;
};

const TopToolbar = ({ children }: TopToolbarProps) => {
  const mode = useStudioStore((state) => state.mode);
  const setMode = useStudioStore((state) => state.setMode);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    if (!isInfoOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInfoOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isInfoOpen]);

  return (
    <>
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
          <div className="toolbar-title-wrap">
            <span className="toolbar-title">Dot Printer Studio</span>
            <button
              type="button"
              className="toolbar-info-btn"
              aria-label="About Dot Printer Studio"
              title="About Dot Printer Studio"
              onClick={() => setIsInfoOpen(true)}
            >
              <Info size={14} />
            </button>
          </div>
        </div>
        <div className="toolbar-items">{children}</div>
      </header>

      {isInfoOpen && (
        <div className="dialog-overlay" onClick={() => setIsInfoOpen(false)}>
          <section
            className="dialog-content info-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="About Dot Printer Studio"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="info-dialog-header">
              <h3 className="dialog-title">About Dot Printer Studio</h3>
              <button
                type="button"
                className="info-dialog-close"
                aria-label="Close project info"
                onClick={() => setIsInfoOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="dialog-message">
              <p>
                Dot Printer Studio is an open-source visual editor and web player for
                building dot-matrix animations with timeline and frame-level controls.
              </p>
              <p>
                You can create, preview, and export animations as <strong>.json</strong>{" "}
                or <strong>.dotp</strong>, then use the same format in the runtime player.
              </p>
              <p className="info-meta">
                Authored by <strong>Maks Surguy</strong> • License: <strong>MIT</strong>
              </p>
            </div>

            <div className="info-links">
              <a
                href="https://github.com/msurguy/dot-printer-studio"
                target="_blank"
                rel="noreferrer"
              >
                Source code
              </a>
              <a
                href="https://github.com/msurguy/dot-printer-studio/issues"
                target="_blank"
                rel="noreferrer"
              >
                Report an issue
              </a>
              <a
                href="https://github.com/msurguy"
                target="_blank"
                rel="noreferrer"
              >
                Author profile
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default TopToolbar;
