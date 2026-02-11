import { useRef, useCallback, type ChangeEvent, type RefObject } from "react";
import {
  downloadBlob,
  encodeBinaryProject,
  parseBinaryProject,
} from "../components/editorUtils";
import { normalizeProject, optimizeProjectColors, type Project } from "../lib/project";

export interface UseFileIOReturn {
  importProjectInputRef: RefObject<HTMLInputElement>;
  importSvgInputRef: RefObject<HTMLInputElement>;
  handleExportJson: () => void;
  handleExportBinary: () => void;
  handleImportFile: (event: ChangeEvent<HTMLInputElement>) => void;
  handleImportMenuChange: (value: string) => void;
  handleExportMenuChange: (value: string) => void;
}

interface UseFileIOParams {
  project: Project;
  setProject: (project: Project) => void;
  setActiveFrameIndex: (index: number) => void;
  resetSelection: () => void;
  setStatusMessage: (message: string | null) => void;
  setSelectedPresetName: (name: string) => void;
  onSvgImport?: (file: File) => void;
}

export const useFileIO = ({
  project,
  setProject,
  setActiveFrameIndex,
  resetSelection,
  setStatusMessage,
  setSelectedPresetName,
  onSvgImport,
}: UseFileIOParams): UseFileIOReturn => {
  const importProjectInputRef = useRef<HTMLInputElement>(null!);
  const importSvgInputRef = useRef<HTMLInputElement>(null!);

  const handleExportJson = useCallback(() => {
    const optimized = optimizeProjectColors(project);
    const blob = new Blob([JSON.stringify(optimized, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "dot-printer-project.json");
  }, [project]);

  const handleExportBinary = useCallback(() => {
    const buffer = encodeBinaryProject(optimizeProjectColors(project));
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    downloadBlob(blob, "dot-printer-project.dotp");
  }, [project]);

  const handleImportFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result;
          let data: Project | null = null;
          if (result instanceof ArrayBuffer) {
            const bytes = new Uint8Array(result);
            const parsed = parseBinaryProject(bytes);
            if (parsed) {
              data = parsed;
            } else {
              const json = new TextDecoder().decode(bytes);
              data = JSON.parse(json) as Project;
            }
          } else if (typeof result === "string") {
            data = JSON.parse(result) as Project;
          }
          if (!data) {
            throw new Error("Unsupported file");
          }
          const normalized = normalizeProject(data);
          setSelectedPresetName("");
          setProject(normalized);
          setActiveFrameIndex(0);
          resetSelection();
          setStatusMessage(`Loaded ${file.name}`);
        } catch {
          setStatusMessage("Import failed. Check the file format.");
        } finally {
          input.value = "";
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [resetSelection, setActiveFrameIndex, setProject, setSelectedPresetName, setStatusMessage]
  );

  const handleImportMenuChange = useCallback(
    (value: string) => {
      if (value === "project") {
        importProjectInputRef.current?.click();
        return;
      }
      if (value === "svg") {
        importSvgInputRef.current?.click();
      }
    },
    []
  );

  const handleExportMenuChange = useCallback(
    (value: string) => {
      if (value === "json") {
        handleExportJson();
        return;
      }
      if (value === "binary") {
        handleExportBinary();
      }
    },
    [handleExportBinary, handleExportJson]
  );

  return {
    importProjectInputRef,
    importSvgInputRef,
    handleExportJson,
    handleExportBinary,
    handleImportFile,
    handleImportMenuChange,
    handleExportMenuChange,
  };
};
