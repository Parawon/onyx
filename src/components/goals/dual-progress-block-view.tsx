"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

import { Calendar } from "@/components/ui/calendar";
import { DualProgressBar } from "./dual-progress-bar";
import {
  formatDueDateStorage,
  parseDueDateString,
  parseTasksJSON,
  type TaskTrackingRow,
} from "@/components/editor/task-tracking-types";

type DualProgressBlockViewProps = {
  p1: number;
  p2: number;
  openPrompt: boolean;
  trackedTaskIdsJSON: string;
  dueDate: string;
  timelineStartDate: string;
  block: Parameters<BlockNoteEditor<any, any, any>["updateBlock"]>[0];
  editor: BlockNoteEditor<any, any, any>;
};

type TaskChoice = {
  id: string;
  name: string;
  status: TaskTrackingRow["status"];
};

function toStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetweenInclusiveStart(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return Math.round((toStartOfDay(b).getTime() - toStartOfDay(a).getTime()) / msPerDay);
}

function clampPct(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function parseTrackedTaskIdsJSON(raw: string): string[] {
  if (!raw || raw.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function walkBlocks(nodes: unknown, out: unknown[]) {
  if (!Array.isArray(nodes)) {
    return;
  }
  for (const n of nodes) {
    if (n == null || typeof n !== "object") {
      continue;
    }
    out.push(n);
    const children = (n as { children?: unknown }).children;
    if (Array.isArray(children)) {
      walkBlocks(children, out);
    }
  }
}

function extractTaskChoicesFromEditorDocument(editor: BlockNoteEditor<any, any, any>): TaskChoice[] {
  const blocks: unknown[] = [];
  walkBlocks(editor.document as unknown, blocks);

  const choices: TaskChoice[] = [];
  const seen = new Set<string>();
  for (const b of blocks) {
    const type = (b as { type?: unknown }).type;
    if (type !== "taskTrackingTable") {
      continue;
    }
    const props = (b as { props?: Record<string, unknown> }).props;
    const rows = parseTasksJSON(typeof props?.tasksJSON === "string" ? props.tasksJSON : "");
    for (const row of rows) {
      if (seen.has(row.id)) {
        continue;
      }
      seen.add(row.id);
      choices.push({ id: row.id, name: row.name || "Untitled task", status: row.status });
    }
  }
  return choices;
}

export function DualProgressBlockView({
  p1,
  p2,
  openPrompt,
  trackedTaskIdsJSON,
  dueDate,
  timelineStartDate,
  block,
  editor,
}: DualProgressBlockViewProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [dueDateDraft, setDueDateDraft] = useState("");
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const taskChoices = useMemo(
    () => extractTaskChoicesFromEditorDocument(editor),
    [editor.document, editor],
  );
  const taskChoicesById = useMemo(() => {
    const m = new Map<string, TaskChoice>();
    for (const t of taskChoices) {
      m.set(t.id, t);
    }
    return m;
  }, [taskChoices]);
  const selectedExistingCount = useMemo(
    () => selectedTaskIds.filter((id) => taskChoicesById.has(id)).length,
    [selectedTaskIds, taskChoicesById],
  );
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    transform: string;
  } | null>(null);

  const blockId = typeof block === "string" ? block : block.id;

  const persistDualProgress = useCallback(
    (next: {
      trackedTaskIds: string[];
      dueDateValue: string;
      timelineStartDateValue: string;
      p1Value: number;
      p2Value: number;
    }) => {
      editor.updateBlock(blockId, {
        props: {
          trackedTaskIdsJSON: JSON.stringify(next.trackedTaskIds),
          dueDate: next.dueDateValue,
          timelineStartDate: next.timelineStartDateValue,
          p1: Math.round(clampPct(next.p1Value)),
          p2: Math.round(clampPct(next.p2Value)),
        },
      });
    },
    [blockId, editor],
  );

  const computeP1 = useCallback(
    (ids: string[]) => {
      const present = ids.filter((id) => taskChoicesById.has(id));
      if (present.length === 0) return 0;
      const completed = present.filter((id) => taskChoicesById.get(id)?.status === "completed").length;
      return (completed / present.length) * 100;
    },
    [taskChoicesById],
  );

  const computeP2 = useCallback((startRaw: string, dueRaw: string) => {
    const start = parseDueDateString(startRaw);
    const due = parseDueDateString(dueRaw);
    if (!start || !due) {
      return 0;
    }
    const overallDays = Math.max(1, daysBetweenInclusiveStart(start, due));
    const today = toStartOfDay(new Date());
    const remainingDays = Math.max(0, daysBetweenInclusiveStart(today, due));
    const progressed = (overallDays - remainingDays) / overallDays;
    return clampPct(progressed * 100);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setStep(1);
  }, []);

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
    const t = window.setTimeout(() => {
      editor.updateBlock(blockId, { props: { openPrompt: false } });
    }, 0);
    return () => window.clearTimeout(t);
  }, [openPrompt, block, editor]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep(1);
    setSelectedTaskIds(parseTrackedTaskIdsJSON(trackedTaskIdsJSON));
    setDueDateDraft(dueDate);
  }, [open, trackedTaskIdsJSON, dueDate]);

  useEffect(() => {
    const trackedIds = parseTrackedTaskIdsJSON(trackedTaskIdsJSON).filter((id) =>
      taskChoicesById.has(id),
    );
    const nextP1 = computeP1(trackedIds);
    const nextP2 = computeP2(timelineStartDate, dueDate);
    const roundedP1 = Math.round(nextP1);
    const roundedP2 = Math.round(nextP2);
    if (roundedP1 === Math.round(p1) && roundedP2 === Math.round(p2)) {
      return;
    }
    // BlockNote's React node view can still be mounting here; defer updateBlock to avoid flushSync during render.
    const t = window.setTimeout(() => {
      persistDualProgress({
        trackedTaskIds: trackedIds,
        dueDateValue: dueDate,
        timelineStartDateValue: timelineStartDate,
        p1Value: roundedP1,
        p2Value: roundedP2,
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [
    trackedTaskIdsJSON,
    taskChoicesById,
    computeP1,
    computeP2,
    timelineStartDate,
    dueDate,
    p1,
    p2,
    persistDualProgress,
  ]);

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
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (popoverRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, close, updatePopoverPosition]);

  const openDialog = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
    setOpen(true);
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  }, []);

  const goNext = useCallback(() => {
    setStep(2);
  }, []);

  const goBack = useCallback(() => {
    setStep(1);
  }, []);

  const applySelectionAndDueDate = useCallback(() => {
    const canonicalIds = selectedTaskIds.filter((id) => taskChoicesById.has(id));
    const due = dueDateDraft.trim();
    const existingStart = parseDueDateString(timelineStartDate);
    const nextStartDate =
      due.length > 0
        ? existingStart
          ? timelineStartDate
          : formatDueDateStorage(new Date())
        : "";

    persistDualProgress({
      trackedTaskIds: canonicalIds,
      dueDateValue: due,
      timelineStartDateValue: nextStartDate,
      p1Value: computeP1(canonicalIds),
      p2Value: computeP2(nextStartDate, due),
    });
    close();
  }, [
    selectedTaskIds,
    taskChoicesById,
    dueDateDraft,
    timelineStartDate,
    persistDualProgress,
    computeP1,
    computeP2,
    close,
  ]);

  const overlay =
    open && typeof document !== "undefined" && popoverCoords ? (
      <>
        <div
          ref={popoverRef}
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
            {step === 1 ? "Which tasks to track?" : "Select due date"}
          </h2>
          {step === 1 ? (
            <>
              <p className="bn-dual-progress-popover__muted mt-2 text-sm leading-relaxed">
                Tasks added here count toward P1 progression:
                {" "}
                <span className="text-zinc-300">
                  completed tracked tasks / total tracked tasks
                </span>
                .
              </p>
              {taskChoices.length === 0 ? (
                <p className="bn-dual-progress-popover__muted mt-3 text-sm leading-relaxed">
                  No task table tasks found in this note yet.
                </p>
              ) : (
                <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                  {taskChoices.map((task) => {
                    const checked = selectedTaskIds.includes(task.id);
                    return (
                      <label
                        key={task.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900/70"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(task.id)}
                          className="mt-0.5 size-3.5 rounded border-zinc-600 bg-zinc-900 accent-sky-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{task.name}</span>
                          <span className="block text-[11px] text-zinc-500">{task.status}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-500">
                  {selectedExistingCount} task{selectedExistingCount === 1 ? "" : "s"} selected
                </p>
                <button
                  type="button"
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={goNext}
                  disabled={taskChoices.length === 0}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="bn-dual-progress-popover__muted mt-2 text-sm leading-relaxed">
                P2 timeline progression is calculated as:
                {" "}
                <span className="text-zinc-300">
                  (overall days - remaining days) / overall days
                </span>
                .
              </p>
              <div className="mt-3 rounded-md border border-zinc-800">
                <Calendar
                  mode="single"
                  selected={parseDueDateString(dueDateDraft)}
                  defaultMonth={parseDueDateString(dueDateDraft) ?? new Date()}
                  onSelect={(d) => setDueDateDraft(d ? formatDueDateStorage(d) : "")}
                  autoFocus
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                  onClick={() => setDueDateDraft("")}
                >
                  Clear date
                </button>
                <span className="text-xs text-zinc-500">
                  {dueDateDraft ? `Due: ${dueDateDraft}` : "No due date"}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                  onClick={goBack}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-500"
                  onClick={applySelectionAndDueDate}
                >
                  Save
                </button>
              </div>
            </>
          )}
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
