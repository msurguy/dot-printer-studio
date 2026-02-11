import { useState, useCallback } from "react";
import { DEFAULT_TOOL_ID, DEFAULT_TEXT } from "../lib/constants";
import type { Tool } from "../components/editorUtils";
import type { Point } from "../lib/selection";

export interface UseToolStateReturn {
  tool: Tool;
  setTool: React.Dispatch<React.SetStateAction<Tool>>;
  pendingConnectionFrom: string | null;
  setPendingConnectionFrom: React.Dispatch<React.SetStateAction<string | null>>;
  pendingAutoConnectFrom: Point | null;
  setPendingAutoConnectFrom: React.Dispatch<React.SetStateAction<Point | null>>;
  textValue: string;
  setTextValue: React.Dispatch<React.SetStateAction<string>>;
  shapeFilled: boolean;
  setShapeFilled: React.Dispatch<React.SetStateAction<boolean>>;
  polygonSides: number;
  setPolygonSides: React.Dispatch<React.SetStateAction<number>>;
  starPoints: number;
  setStarPoints: React.Dispatch<React.SetStateAction<number>>;
  autoConnectShapes: boolean;
  setAutoConnectShapes: React.Dispatch<React.SetStateAction<boolean>>;
  handleToolChange: (nextTool: string) => void;
}

export const useToolState = (): UseToolStateReturn => {
  const [tool, setTool] = useState<Tool>(DEFAULT_TOOL_ID as Tool);
  const [pendingConnectionFrom, setPendingConnectionFrom] = useState<string | null>(null);
  const [pendingAutoConnectFrom, setPendingAutoConnectFrom] = useState<Point | null>(null);
  const [textValue, setTextValue] = useState(DEFAULT_TEXT);
  const [shapeFilled, setShapeFilled] = useState(false);
  const [polygonSides, setPolygonSides] = useState(6);
  const [starPoints, setStarPoints] = useState(5);
  const [autoConnectShapes, setAutoConnectShapes] = useState(false);

  const handleToolChange = useCallback(
    (nextTool: string) => {
      setTool(nextTool as Tool);
      setPendingConnectionFrom(null);
      setPendingAutoConnectFrom(null);
    },
    []
  );

  return {
    tool,
    setTool,
    pendingConnectionFrom,
    setPendingConnectionFrom,
    pendingAutoConnectFrom,
    setPendingAutoConnectFrom,
    textValue,
    setTextValue,
    shapeFilled,
    setShapeFilled,
    polygonSides,
    setPolygonSides,
    starPoints,
    setStarPoints,
    autoConnectShapes,
    setAutoConnectShapes,
    handleToolChange,
  };
};
