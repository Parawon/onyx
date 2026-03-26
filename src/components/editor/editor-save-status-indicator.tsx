"use client";

import { useEffect, useState } from "react";

import { useEditorSaveState } from "./editor-save-state-provider";

/** Shared “Saved / Saving…” line for BlockNote surfaces. */
export function EditorSaveStatusIndicator() {
  const { autosaveVisible, lastSavedAt, status } = useEditorSaveState();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (!autosaveVisible) {
    return null;
  }

  if (status === "saving") {
    return <span className="text-amber-400">Saving...</span>;
  }

  if (status === "error") {
    return <span className="text-red-400">Save failed</span>;
  }

  if (lastSavedAt) {
    const elapsedSeconds = Math.max(0, Math.floor((now - lastSavedAt) / 1000));
    if (elapsedSeconds < 5) {
      return <span>Saved just now</span>;
    }
    return <span>Saved {elapsedSeconds}s ago</span>;
  }

  return null;
}
