"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
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
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    transform: string;
  } | null>(null);

  const close = useCallback(() => setOpen(false), []);

  const updatePopoverPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el || !open) return;

    const rect = el.getBoundingClientRect();
    // New blocks from the slash menu often measure 0×0 on the first frame; skip until laid out.
    if (rect.width < 1 && rect.height < 1) {
      return;
    }

    const gap = 8;
    const margin = 8;
    const approxPopoverWidth = Math.min(22 * 16, window.innerWidth - 2 * margin);
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(
      margin + approxPopoverWidth / 2,
      Math.min(centerX, window.innerWidth - margin - approxPopoverWidth / 2),
    );

    const approxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const placeBelow = spaceBelow >= approxHeight || spaceBelow >= spaceAbove;

    if (placeBelow) {
      setPopoverCoords({
        top: rect.bottom + gap,
        left,
        transform: "translateX(-50%)",
      });
    } else {
      setPopoverCoords({
        top: rect.top - gap,
        left,
        transform: "translate(-50%, -100%)",
      });
    }
  }, [open]);

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

  useLayoutEffect(() => {
    if (!open) {
      setPopoverCoords(null);
      return;
    }

    let alive = true;
    const tick = () => {
      if (!alive) return;
      updatePopoverPosition();
    };

    tick();
    const raf1 = requestAnimationFrame(tick);
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(tick);
    });

    const el = anchorRef.current;
    const ro =
      el != null
        ? new ResizeObserver(() => {
            if (alive) tick();
          })
        : null;
    if (el != null && ro != null) {
      ro.observe(el);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
      ro?.disconnect();
    };
  }, [open, updatePopoverPosition, p1, p2]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, close, updatePopoverPosition]);

  const openDialog = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
    setOpen(true);
  }, []);

  const overlay =
    open && typeof document !== "undefined" && popoverCoords ? (
      <>
        <div
          className="bn-dual-progress-popover-backdrop fixed inset-0 z-[10000] bg-transparent"
          role="presentation"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={close}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dual-progress-track-title"
          className="bn-dual-progress-popover fixed z-[10001] max-h-[min(72vh,calc(100dvh-1rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto"
          style={{
            top: popoverCoords.top,
            left: popoverCoords.left,
            transform: popoverCoords.transform,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDownCapture={(e) => e.stopPropagation()}
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
      </>
    ) : null;

  return (
    <>
      <button
        ref={anchorRef}
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
