"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

import { DualProgressBar } from "./dual-progress-bar";

type DualProgressBlockViewProps = {
  p1: number;
  p2: number;
  openPrompt: boolean;
  block: Parameters<BlockNoteEditor<any, any, any>["updateBlock"]>[0];
  editor: BlockNoteEditor<any, any, any>;
};

export function DualProgressBlockView({
  p1,
  p2,
  openPrompt,
  block,
  editor,
}: DualProgressBlockViewProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  /**
   * Slash menu sets `openPrompt` on the block. Open before paint; clear the flag on a macrotask
   * so React 18 Strict Mode remount still sees `openPrompt` and `queueMicrotask` cannot clear it
   * before the remount (which would leave the dialog closed).
   */
  useLayoutEffect(() => {
    if (!openPrompt) return;
    setOpen(true);
    const blockId = typeof block === "string" ? block : block.id;
    const t = window.setTimeout(() => {
      editor.updateBlock(blockId, { props: { openPrompt: false } });
    }, 0);
    return () => window.clearTimeout(t);
  }, [openPrompt, block, editor]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const openDialog = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
    setOpen(true);
  }, []);

  const overlay =
    open && typeof document !== "undefined" ? (
      <div
        className="bn-dual-progress-popover-backdrop fixed inset-0 z-[10000] flex items-center justify-center bg-transparent p-4"
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
    ) : null;

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
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <DualProgressBar p1={p1} p2={p2} className="max-w-xl py-1" />
      </button>

      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
