"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useEditorSaveState } from "./editor-save-state-provider";

/** Shared “Saved / Saving…” line for BlockNote surfaces. Wrapper keeps a fixed line height so layout doesn’t jump. */
export function EditorSaveStatusIndicator({ className }: { className?: string }) {
  const { autosaveVisible, lastSavedAt, status } = useEditorSaveState();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  let inner: ReactNode = null;
  if (autosaveVisible) {
    if (status === "saving") {
      inner = <span className="text-amber-400">Saving...</span>;
    } else if (status === "error") {
      inner = <span className="text-red-400">Save failed</span>;
    } else if (lastSavedAt) {
      const elapsedSeconds = Math.max(0, Math.floor((now - lastSavedAt) / 1000));
      if (elapsedSeconds < 5) {
        inner = <span>Saved just now</span>;
      } else {
        inner = (
          <span className="tabular-nums">
            Saved {elapsedSeconds}s ago
          </span>
        );
      }
    } else {
      inner = <span className="invisible select-none">Saved</span>;
    }
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full shrink-0 items-center justify-end overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-none text-zinc-400",
        className,
      )}
      aria-live="polite"
    >
      {inner}
    </span>
  );
}
