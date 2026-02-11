import { useCallback, useState, type DragEvent } from "react";
import type { Frame } from "../lib/project";

interface TimelinePanelProps {
  frames: Frame[];
  activeFrameIndex: number;
  isOpen: boolean;
  onSelectFrame: (index: number) => void;
  onReorderFrames: (fromIndex: number, toIndex: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
}

const TimelinePanel = ({
  frames,
  activeFrameIndex,
  isOpen,
  onSelectFrame,
  onReorderFrames,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
}: TimelinePanelProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((event: DragEvent<HTMLButtonElement>, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLButtonElement>, index: number) => {
      if (draggedIndex === null || draggedIndex === index) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [draggedIndex]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLButtonElement>, dropIndex: number) => {
      event.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) {
        return;
      }
      onReorderFrames(draggedIndex, dropIndex);
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, onReorderFrames]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <section className={`timeline-panel${isOpen ? "" : " panel-collapsed"}`}>
      <div className="timeline-header">
        <div>
          <p className="timeline-title">Timeline</p>
          <p className="timeline-meta">{frames.length} frames</p>
        </div>
        <div className="timeline-actions">
          <button type="button" className="btn btn-compact" onClick={onAddFrame}>
            Add
          </button>
          <button type="button" className="btn btn-compact" onClick={onDuplicateFrame}>
            Duplicate
          </button>
          <button type="button" className="btn btn-compact" onClick={onDeleteFrame}>
            Delete
          </button>
        </div>
      </div>
      <div className="timeline-strip">
        {frames.map((entry, index) => (
          <button
            key={`timeline-${entry.id}`}
            type="button"
            className={`timeline-card${index === activeFrameIndex ? " active" : ""}${index === draggedIndex ? " dragging" : ""}${index === dragOverIndex ? " drag-over" : ""}`}
            onClick={() => onSelectFrame(index)}
            draggable
            onDragStart={(event) => handleDragStart(event, index)}
            onDragOver={(event) => handleDragOver(event, index)}
            onDrop={(event) => handleDrop(event, index)}
            onDragEnd={handleDragEnd}
            onDragLeave={() => {
              if (dragOverIndex === index) {
                setDragOverIndex(null);
              }
            }}
          >
            <span className="timeline-frame-name">{entry.name}</span>
            <span className="timeline-frame-meta">{entry.duration} ms</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default TimelinePanel;
