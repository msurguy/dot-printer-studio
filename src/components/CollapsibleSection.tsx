import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  className,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`panel-section collapsible ${isOpen ? "is-open" : "is-closed"}${
        className ? ` ${className}` : ""
      }`}
    >
      <button
        type="button"
        className="collapsible-header"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-icon" aria-hidden="true">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      <div className="collapsible-content">{children}</div>
    </section>
  );
};

export default CollapsibleSection;
