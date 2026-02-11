import { makeId, type Frame, type Project } from "../lib/project";

export const TOOL_OPTIONS = [
  { id: "select", label: "Select" },
  { id: "marquee", label: "Marquee" },
  { id: "lasso", label: "Lasso" },
  { id: "dot", label: "Dot" },
  { id: "eraser", label: "Eraser" },
  { id: "connect", label: "Connect" },
  { id: "autoconnect", label: "Auto-Connect" },
  { id: "text", label: "Text" },
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "line", label: "Line" },
  { id: "triangle", label: "Triangle" },
  { id: "polygon", label: "Polygon" },
  { id: "star", label: "Star" },
  { id: "arrow", label: "Arrow" },
  { id: "svg", label: "Move SVG" },
] as const;

export type Tool = (typeof TOOL_OPTIONS)[number]["id"];

export const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
};

export const encodeBinaryProject = (project: Project) => {
  const json = JSON.stringify(project);
  const header = new TextEncoder().encode("DOTP1");
  const payload = new TextEncoder().encode(json);
  const buffer = new Uint8Array(header.length + payload.length);
  buffer.set(header, 0);
  buffer.set(payload, header.length);
  return buffer;
};

export const parseBinaryProject = (bytes: Uint8Array) => {
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "DOTP1") {
    return null;
  }
  const json = new TextDecoder().decode(bytes.slice(5));
  return JSON.parse(json) as Project;
};

export const createFrameClone = (frame: Frame, name: string): Frame => ({
  ...frame,
  id: makeId(),
  name,
  dots: frame.dots.map((dot) => ({ ...dot })),
  connections: frame.connections.map((connection) => ({ ...connection })),
});

export const parseDurationInput = (value: string) => {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
};
