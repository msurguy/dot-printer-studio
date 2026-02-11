import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";

type ColorDropdownProps = {
  label: string;
  value: string;
  colors: readonly string[];
  onChange: (value: string) => void;
  ariaLabel: string;
};

const ColorDropdown = ({
  label,
  value,
  colors,
  onChange,
  ariaLabel,
}: ColorDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const container = triggerRef.current;
      const menu = menuRef.current;
      if (!container || !menu) return;

      const containerRect = container.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const edgePadding = 8;

      const shouldAlignRight =
        containerRect.left + menuRect.width > window.innerWidth - edgePadding;
      const shouldFlipUp =
        containerRect.bottom + menuRect.height > window.innerHeight - edgePadding;

      const left = shouldAlignRight
        ? containerRect.right - menuRect.width
        : containerRect.left;
      const top = shouldFlipUp
        ? containerRect.top - menuRect.height - 6
        : containerRect.bottom + 6;

      const clampedLeft = Math.max(
        edgePadding,
        Math.min(left, window.innerWidth - menuRect.width - edgePadding)
      );
      const clampedTop = Math.max(
        edgePadding,
        Math.min(top, window.innerHeight - menuRect.height - edgePadding)
      );

      setMenuStyle({
        position: "fixed",
        left: clampedLeft,
        top: clampedTop,
        minWidth: Math.max(190, containerRect.width),
        zIndex: 999,
      });
    };

    const raf = requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div className="color-dropdown" ref={containerRef}>
      <button
        type="button"
        className="color-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="color-preview" style={{ background: value }} />
        <span className="color-trigger-label">{label}</span>
        <span className="dropdown-caret" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="color-menu"
              role="listbox"
              ref={menuRef}
              style={menuStyle}
            >
              <div className="color-swatch-grid">
                {colors.map((color) => (
                  <button
                    key={`color-${label}-${color}`}
                    type="button"
                    className={color === value ? "color-swatch active" : "color-swatch"}
                    style={{ background: color }}
                    aria-label={`${label} color ${color}`}
                    aria-pressed={color === value}
                    title={color}
                    onClick={() => {
                      onChange(color);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
              <label className="color-custom">
                <span>Custom</span>
                <input
                  type="color"
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  aria-label={`${label} custom color`}
                />
              </label>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default ColorDropdown;
