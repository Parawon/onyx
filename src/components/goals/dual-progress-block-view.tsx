"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DualProgressBar } from "./dual-progress-bar";

type DualProgressBlockViewProps = {
  p1: number;
  p2: number;
};

export function DualProgressBlockView({ p1, p2 }: DualProgressBlockViewProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className="w-full rounded-md text-left outline-none ring-offset-2 ring-offset-black focus-visible:ring-2 focus-visible:ring-sky-500"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onPointerDownCapture={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <DualProgressBar p1={p1} p2={p2} className="max-w-xl py-1" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/20 p-4"
          role="presentation"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dual-progress-track-title"
            className="bn-dual-progress-popover relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="bn-dual-progress-popover__close absolute right-1.5 top-1.5 p-1.5"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
            <h2
              id="dual-progress-track-title"
              className="pr-9 text-sm font-semibold leading-snug"
            >
              Which tasks to track?
            </h2>
            <p className="bn-dual-progress-popover__muted mt-2 text-sm leading-relaxed">
              Dummy dialog — you&apos;ll choose real tasks here later. Click outside or use the close
              control to dismiss.
            </p>
            <ul className="bn-dual-progress-popover__muted mt-3 space-y-1.5 text-sm leading-snug">
              <li>Task A (placeholder)</li>
              <li>Task B (placeholder)</li>
              <li>Task C (placeholder)</li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
