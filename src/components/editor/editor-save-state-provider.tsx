"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type EditorSaveStateValue = {
  status: SaveStatus;
  lastSavedAt: number | null;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
};

const EditorSaveStateContext = createContext<EditorSaveStateValue | null>(null);

export const EditorSaveStateProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const value = useMemo<EditorSaveStateValue>(
    () => ({
      status,
      lastSavedAt,
      markSaving: () => setStatus("saving"),
      markSaved: () => {
        setStatus("saved");
        setLastSavedAt(Date.now());
      },
      markError: () => setStatus("error"),
    }),
    [lastSavedAt, status]
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
