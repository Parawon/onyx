"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type EditorSaveStateValue = {
  status: SaveStatus;
  lastSavedAt: number | null;
  /** When false, autosave status is hidden (no edits since load / last sync). */
  autosaveVisible: boolean;
  setAutosaveVisible: (visible: boolean) => void;
  /** Clears “saved” timestamps before a new edit so the line doesn’t flash stale “Saved”. */
  resetAutosaveUiForEdit: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
};

const EditorSaveStateContext = createContext<EditorSaveStateValue | null>(null);

export const EditorSaveStateProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [autosaveVisible, setAutosaveVisible] = useState(false);

  const resetAutosaveUiForEdit = useCallback(() => {
    setStatus("idle");
    setLastSavedAt(null);
  }, []);

  const value = useMemo<EditorSaveStateValue>(
    () => ({
      status,
      lastSavedAt,
      autosaveVisible,
      setAutosaveVisible,
      resetAutosaveUiForEdit,
      markSaving: () => setStatus("saving"),
      markSaved: () => {
        setStatus("saved");
        setLastSavedAt(Date.now());
      },
      markError: () => setStatus("error"),
    }),
    [autosaveVisible, lastSavedAt, resetAutosaveUiForEdit, status]
  );

  return <EditorSaveStateContext.Provider value={value}>{children}</EditorSaveStateContext.Provider>;
};

export const useEditorSaveState = () => {
  const context = useContext(EditorSaveStateContext);
  if (!context) {
    throw new Error("useEditorSaveState must be used within EditorSaveStateProvider");
  }
  return context;
};
