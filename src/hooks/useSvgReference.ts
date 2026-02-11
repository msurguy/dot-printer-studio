import { useState, useRef, useCallback, type ChangeEvent, type RefObject } from "react";
import type { Tool } from "../components/editorUtils";

export interface SvgReferenceState {
  dataUrl: string | null;
  position: { x: number; y: number };
  opacity: number;
  isLocked: boolean;
  originalSize: { width: number; height: number };
  scale: number;
  isPlacing: boolean;
  lastConfirmedPosition: { x: number; y: number };
}

export interface UseSvgReferenceReturn {
  svgReference: SvgReferenceState;
  setSvgReference: React.Dispatch<React.SetStateAction<SvgReferenceState>>;
  svgImageRef: RefObject<HTMLImageElement | null>;
  previousToolRef: RefObject<Tool | null>;
  isDragOver: boolean;
  setIsDragOver: React.Dispatch<React.SetStateAction<boolean>>;
  handleSvgImport: (file: File) => void;
  handleSvgFileInput: (e: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveSvg: () => void;
  handleSvgStartMove: () => void;
  handleSvgCancelPlacement: () => void;
  handleCanvasDragOver: (e: React.DragEvent) => void;
  handleCanvasDragEnter: (e: React.DragEvent) => void;
  handleCanvasDragLeave: (e: React.DragEvent) => void;
  handleCanvasDrop: (e: React.DragEvent) => void;
}

interface UseSvgReferenceParams {
  tool: Tool;
  setTool: React.Dispatch<React.SetStateAction<Tool>>;
}

const initialSvgState: SvgReferenceState = {
  dataUrl: null,
  position: { x: 0, y: 0 },
  opacity: 0.5,
  isLocked: false,
  originalSize: { width: 0, height: 0 },
  scale: 1,
  isPlacing: false,
  lastConfirmedPosition: { x: 0, y: 0 },
};

export const useSvgReference = ({
  tool,
  setTool,
}: UseSvgReferenceParams): UseSvgReferenceReturn => {
  const [svgReference, setSvgReference] = useState<SvgReferenceState>(initialSvgState);
  const [isDragOver, setIsDragOver] = useState(false);
  const svgImageRef = useRef<HTMLImageElement | null>(null);
  const previousToolRef = useRef<Tool | null>(null);

  const handleSvgImport = useCallback(
    (file: File) => {
      if (!file.type.includes("svg")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const svgText = reader.result as string;
        // Encode SVG text to base64, handling UTF-8 properly
        const encoder = new TextEncoder();
        const bytes = encoder.encode(svgText);
        const base64 = btoa(String.fromCharCode(...bytes));
        const dataUrl = `data:image/svg+xml;base64,${base64}`;

        // Parse SVG to get dimensions
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgEl = doc.querySelector("svg");
        let width = 100;
        let height = 100;
        if (svgEl) {
          const viewBox = svgEl.getAttribute("viewBox");
          if (viewBox) {
            const parts = viewBox.split(/\s+/);
            width = parseFloat(parts[2]) || 100;
            height = parseFloat(parts[3]) || 100;
          } else {
            width = parseFloat(svgEl.getAttribute("width") || "100");
            height = parseFloat(svgEl.getAttribute("height") || "100");
          }
        }

        // Create and cache Image object
        const img = new Image();
        img.onload = () => {
          svgImageRef.current = img;
          // Save current tool before entering placement mode and switch to svg tool
          previousToolRef.current = tool;
          setTool("svg");
          setSvgReference({
            dataUrl,
            position: { x: 0, y: 0 },
            opacity: 0.5,
            isLocked: false,
            originalSize: { width, height },
            scale: 1,
            isPlacing: true,
            lastConfirmedPosition: { x: 0, y: 0 },
          });
        };
        img.src = dataUrl;
      };
      reader.readAsText(file);
    },
    [tool, setTool]
  );

  const handleSvgFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleSvgImport(file);
      e.target.value = "";
    },
    [handleSvgImport]
  );

  const handleRemoveSvg = useCallback(() => {
    svgImageRef.current = null;
    setSvgReference(initialSvgState);
  }, []);

  const handleSvgStartMove = useCallback(() => {
    // Save current tool before entering placement mode and switch to svg tool
    previousToolRef.current = tool;
    setTool("svg");
    setSvgReference((prev) => ({
      ...prev,
      isPlacing: true,
      isLocked: false,
    }));
  }, [tool, setTool]);

  const handleSvgCancelPlacement = useCallback(() => {
    setSvgReference((prev) => ({
      ...prev,
      isPlacing: false,
      position: { ...prev.lastConfirmedPosition },
    }));
  }, []);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleCanvasDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "image/svg+xml") {
        handleSvgImport(file);
      }
    },
    [handleSvgImport]
  );

  return {
    svgReference,
    setSvgReference,
    svgImageRef,
    previousToolRef,
    isDragOver,
    setIsDragOver,
    handleSvgImport,
    handleSvgFileInput,
    handleRemoveSvg,
    handleSvgStartMove,
    handleSvgCancelPlacement,
    handleCanvasDragOver,
    handleCanvasDragEnter,
    handleCanvasDragLeave,
    handleCanvasDrop,
  };
};
