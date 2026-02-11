import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

type IconToggleProps = {
  checked: boolean;
  label: string;
  onToggle: () => void;
  icon?: ReactNode;
  checkedIcon?: ReactNode;
  uncheckedIcon?: ReactNode;
};

const IconToggle = ({
  checked,
  label,
  onToggle,
  icon,
  checkedIcon,
  uncheckedIcon,
}: IconToggleProps) => {
  const resolvedIcon =
    icon ??
    (checked ? checkedIcon : uncheckedIcon) ??
    (checked ? <Check size={14} /> : <X size={14} />);

  return (
    <button
      type="button"
      className={`icon-toggle-btn${checked ? " active" : ""}`}
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={label}
      title={label}
    >
      {resolvedIcon}
    </button>
  );
};

export default IconToggle;
