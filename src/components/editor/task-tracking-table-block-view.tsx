"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { useOrganization, useUser } from "@clerk/nextjs";
import { Filter, Plus, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  applyBoundaryResize,
  formatDueDateStorage,
  newTaskRow,
  parseDueDateString,
  parseTasksJSON,
  parseTaskTableColumnWidths,
  stringifyTasks,
  TASK_STATUSES,
  TASK_URGENCIES,
  type TaskTrackingRow,
  type TaskStatus,
  type TaskUrgency,
} from "./task-tracking-types";

const DEFAULT_TITLE = "Project Tasks";
const MAX_ASSIGNEE_AVATARS = 5;

const HEADER_LABELS: readonly (string | null)[] = [
  null,
  "Task",
  "Description",
  "Status",
  "Urgency",
  "Due Date",
  "Assignee",
  "Cal",
];

function stopPm(e: SyntheticEvent) {
  e.stopPropagation();
}

/** Parent capture must not swallow pointerdown for column resize — children never receive it if we stop here. */
function stopPmCaptureUnlessColumnResize(e: ReactPointerEvent<HTMLDivElement>) {
  const t = e.target;
  if (t instanceof Element && t.closest("[data-task-column-resize]")) {
    return;
  }
  e.stopPropagation();
}

function TaskColumnResizeHandle({
  boundaryIndex,
  onPointerDownResize,
}: {
  boundaryIndex: number;
  onPointerDownResize: (e: ReactPointerEvent<HTMLDivElement>, boundaryIndex: number) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize between columns ${boundaryIndex + 1} and ${boundaryIndex + 2}`}
      className="absolute end-0 top-0 z-10 h-full w-3 max-w-[50%] -translate-x-1/2 cursor-col-resize touch-none select-none hover:bg-sky-500/35"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPointerDownResize(e, boundaryIndex);
      }}
    />
  );
}

function DueDatePickerCell({
  value,
  onChange,
  ghostInputClass,
}: {
  value: string;
  onChange: (next: string) => void;
  ghostInputClass: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDueDateString(value), [value]);

  const label = useMemo(() => {
    if (!selected) {
      return "Empty";
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(selected);
  }, [selected]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            ghostInputClass,
            "w-full cursor-pointer text-left text-[13px] hover:text-zinc-200",
            !selected && "text-zinc-500 placeholder:text-zinc-700",
          )}
          onMouseDown={stopPm}
          onPointerDownCapture={stopPm}
          aria-label="Due date"
          aria-expanded={open}
        >
          <span
            className={cn(
              !selected && "opacity-0 group-hover/row:opacity-100",
              selected && "text-zinc-200",
            )}
          >
            {label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-auto border-zinc-800 p-0"
        onMouseDown={stopPm}
        onPointerDownCapture={stopPm}
      >
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? new Date()}
          onSelect={(d) => {
            onChange(d ? formatDueDateStorage(d) : "");
            setOpen(false);
          }}
          autoFocus
        />
        <div className="border-t border-zinc-800 px-2 py-1.5">
          <button
            type="button"
            className="w-full rounded-md px-2 py-1.5 text-left text-[12px] text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Clear date
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DeleteTaskConfirm({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Delete task"
          aria-expanded={open}
          className="rounded p-1 text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/row:opacity-100"
          onMouseDown={stopPm}
          onPointerDownCapture={stopPm}
        >
          <Trash2 className="size-2.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[220px] border-zinc-800 p-3"
        onMouseDown={stopPm}
        onPointerDownCapture={stopPm}
      >
        <p className="mb-3 text-sm text-zinc-300">Delete this task? This can’t be undone.</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-red-500/15 px-2.5 py-1.5 text-[12px] font-medium text-red-400 ring-1 ring-red-500/30 transition-colors hover:bg-red-500/25"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Delete
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400";
    case "in-progress":
      return "border border-sky-500/30 bg-sky-500/20 text-sky-400";
    case "planning":
      return "border border-purple-500/30 bg-purple-500/20 text-purple-400";
    case "not-started":
      return "border border-zinc-700 bg-zinc-800 text-zinc-400";
    case "backlog":
      return "border border-zinc-600/50 bg-zinc-900 text-zinc-500";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function parseStatus(value: string): TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value)
    ? (value as TaskStatus)
    : "backlog";
}

function parseUrgency(value: string): TaskUrgency {
  return (TASK_URGENCIES as readonly string[]).includes(value)
    ? (value as TaskUrgency)
    : "mid";
}

type AssigneeProfile = {
  imageUrl: string;
  label: string;
};

function initials(label: string | undefined, fallbackId: string): string {
  const t = (label ?? "").trim();
  if (t.length >= 2) {
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
  }
  return fallbackId.slice(0, 2).toUpperCase() || "?";
}

function useAssigneeDirectory(): Map<string, AssigneeProfile> {
  const { user } = useUser();
  const { memberships, isLoaded: orgLoaded } = useOrganization({
    memberships: { pageSize: 100, infinite: true, keepPreviousData: true },
  });

  useEffect(() => {
    if (!orgLoaded || !memberships?.hasNextPage || memberships.isFetching) {
      return;
    }
    void memberships.fetchNext();
  }, [orgLoaded, memberships]);

  return useMemo(() => {
    const map = new Map<string, AssigneeProfile>();
    if (user?.id) {
      map.set(user.id, {
        imageUrl: user.imageUrl,
        label:
          user.fullName ??
          user.primaryEmailAddress?.emailAddress ??
          user.username ??
          "You",
      });
    }
    for (const m of memberships?.data ?? []) {
      const id = m.publicUserData?.userId;
      if (!id || map.has(id)) {
        continue;
      }
      const pud = m.publicUserData;
      if (!pud) {
        continue;
      }
      const label =
        [pud.firstName, pud.lastName].filter(Boolean).join(" ").trim() ||
        pud.identifier ||
        id;
      map.set(id, { imageUrl: pud.imageUrl, label });
    }
    return map;
  }, [user, memberships?.data]);
}

function AssigneeAvatar({
  userId,
  profile,
  onRemove,
}: {
  userId: string;
  profile: AssigneeProfile | undefined;
  onRemove: () => void;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="group/ava relative shrink-0">
      {profile?.imageUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- Clerk CDN URLs
        <img
          src={profile.imageUrl}
          alt=""
          className="size-6 rounded-full object-cover ring-2 ring-zinc-900"
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className="flex size-7 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-medium text-zinc-300 ring-2 ring-zinc-900"
          aria-hidden
        >
          {initials(profile?.label, userId)}
        </div>
      )}
      <button
        type="button"
        className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 opacity-0 shadow ring-1 ring-zinc-600 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover/ava:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title={`Remove ${profile?.label ?? "assignee"}`}
        aria-label={`Remove ${profile?.label ?? "assignee"}`}
      >
        <X className="size-2.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function AssigneeCell({
  assigneeUserIds,
  directory,
  onChange,
}: {
  assigneeUserIds: string[];
  directory: Map<string, AssigneeProfile>;
  onChange: (ids: string[]) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  useEffect(() => {
    if (!overflowOpen) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) {
        return;
      }
      setOverflowOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [overflowOpen]);

  const total = assigneeUserIds.length;
  const visibleIds = assigneeUserIds.slice(0, MAX_ASSIGNEE_AVATARS);
  const overflowCount = Math.max(0, total - MAX_ASSIGNEE_AVATARS);
  const overflowIds = assigneeUserIds.slice(MAX_ASSIGNEE_AVATARS);

  const addableOptions = useMemo(() => {
    const assigned = new Set(assigneeUserIds);
    return [...directory.entries()].filter(([id]) => !assigned.has(id));
  }, [directory, assigneeUserIds]);

  const remove = useCallback(
    (id: string) => {
      onChange(assigneeUserIds.filter((x) => x !== id));
    },
    [assigneeUserIds, onChange],
  );

  const add = useCallback(
    (id: string) => {
      if (assigneeUserIds.includes(id)) {
        return;
      }
      onChange([...assigneeUserIds, id]);
    },
    [assigneeUserIds, onChange],
  );

  return (
    <div
      ref={wrapRef}
      className="relative flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1"
      onMouseDown={stopPm}
      onPointerDownCapture={stopPm}
    >
      <div className="flex min-w-0 items-center">
        <div className="-space-x-2 flex items-center pr-1">
          {visibleIds.map((id) => (
            <AssigneeAvatar
              key={id}
              userId={id}
              profile={directory.get(id)}
              onRemove={() => remove(id)}
            />
          ))}
        </div>
        {overflowCount > 0 ? (
          <>
            <button
              type="button"
              className="ml-1 shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
              aria-expanded={overflowOpen}
              aria-haspopup="dialog"
              onClick={() => setOverflowOpen((o) => !o)}
            >
              +{overflowCount}
            </button>
            {overflowOpen ? (
              <div
                className="absolute left-0 top-full z-50 mt-1 max-h-44 min-w-[200px] overflow-y-auto rounded-md border border-zinc-700 bg-zinc-950 py-1.5 shadow-xl"
                role="dialog"
                aria-label="Additional assignees"
              >
                {overflowIds.map((id) => {
                  const p = directory.get(id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-900/80"
                    >
                      <AssigneeAvatar
                        userId={id}
                        profile={p}
                        onRemove={() => remove(id)}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-300">
                        {p?.label ?? id}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <select
        aria-label="Add assignee"
        className="min-w-0 max-w-full shrink cursor-pointer truncate rounded border border-transparent bg-transparent py-0.5 text-[11px] text-zinc-500 outline-none hover:border-zinc-700 hover:text-zinc-300"
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) {
            add(v);
          }
          e.target.value = "";
        }}
      >
        <option value="" className="bg-zinc-900">
          Add…
        </option>
        {addableOptions.map(([id, p]) => (
          <option key={id} value={id} className="bg-zinc-900">
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export type TaskTrackingTableBlockViewProps = {
  title: string;
  tasksJSON: string;
  /** JSON array of 8 column widths in px; empty uses defaults. */
  columnWidthsJSON: string;
  block: Parameters<BlockNoteEditor<any, any, any>["updateBlock"]>[0];
  editor: BlockNoteEditor<any, any, any>;
};

export function TaskTrackingTableBlockView({
  title,
  tasksJSON,
  columnWidthsJSON,
  block,
  editor,
}: TaskTrackingTableBlockViewProps) {
  const directory = useAssigneeDirectory();
  const tasks = useMemo(() => parseTasksJSON(tasksJSON), [tasksJSON]);
  const blockId = typeof block === "string" ? block : block.id;
  const [titleDraft, setTitleDraft] = useState(title);
  const [colWidths, setColWidths] = useState(() =>
    parseTaskTableColumnWidths(columnWidthsJSON),
  );

  useEffect(() => {
    setTitleDraft(title);
  }, [title]);

  useEffect(() => {
    setColWidths(parseTaskTableColumnWidths(columnWidthsJSON));
  }, [columnWidthsJSON]);

  const colWidthsRef = useRef(colWidths);
  useEffect(() => {
    colWidthsRef.current = colWidths;
  }, [colWidths]);

  const persist = useCallback(
    (nextTitle: string, nextTasks: TaskTrackingRow[]) => {
      editor.updateBlock(blockId, {
        props: {
          title: nextTitle,
          tasksJSON: stringifyTasks(nextTasks),
          columnWidthsJSON: JSON.stringify(colWidthsRef.current),
        },
      });
    },
    [blockId, editor],
  );

  const onColumnResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, boundaryIndex: number) => {
      const startX = e.clientX;
      const startWidths = [...colWidthsRef.current];
      const captureEl = e.currentTarget as HTMLDivElement;
      const pointerId = e.pointerId;
      try {
        captureEl.setPointerCapture(pointerId);
      } catch {
        /* already captured or unsupported */
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        setColWidths(applyBoundaryResize(startWidths, boundaryIndex, dx));
      };

      let ended = false;
      const done = (ev: PointerEvent) => {
        if (ended) {
          return;
        }
        ended = true;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", done);
        window.removeEventListener("pointercancel", done);

        try {
          if (captureEl.releasePointerCapture) {
            captureEl.releasePointerCapture(pointerId);
          }
        } catch {
          /* not capturing */
        }

        const dx = ev.clientX - startX;
        const final = applyBoundaryResize(startWidths, boundaryIndex, dx);
        setColWidths(final);
        colWidthsRef.current = final;

        const t = titleDraft.trim() || DEFAULT_TITLE;
        editor.updateBlock(blockId, {
          props: {
            title: t,
            tasksJSON: stringifyTasks(tasks),
            columnWidthsJSON: JSON.stringify(final),
          },
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", done);
      window.addEventListener("pointercancel", done);
    },
    [blockId, editor, tasks, titleDraft],
  );

  const resolvedTitle = useCallback(
    () => titleDraft.trim() || DEFAULT_TITLE,
    [titleDraft],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<TaskTrackingRow>) => {
      const next = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
      persist(resolvedTitle(), next);
    },
    [tasks, persist, resolvedTitle],
  );

  const addTask = useCallback(() => {
    persist(resolvedTitle(), [...tasks, newTaskRow()]);
  }, [tasks, persist, resolvedTitle]);

  const deleteTask = useCallback(
    (id: string) => {
      persist(resolvedTitle(), tasks.filter((t) => t.id !== id));
    },
    [tasks, persist, resolvedTitle],
  );

  const commitTitle = useCallback(() => {
    const t = resolvedTitle();
    setTitleDraft(t);
    persist(t, tasks);
  }, [resolvedTitle, tasks, persist]);

  /**
   * Include-only filter: empty array = no filter on that axis (all values allowed).
   * Non-empty = show only rows whose status / urgency is in the list (AND across axes).
   */
  const [includedStatuses, setIncludedStatuses] = useState<TaskStatus[]>([]);
  const [includedUrgencies, setIncludedUrgencies] = useState<TaskUrgency[]>([]);
  const [draftIncludedStatuses, setDraftIncludedStatuses] = useState<TaskStatus[]>([]);
  const [draftIncludedUrgencies, setDraftIncludedUrgencies] = useState<TaskUrgency[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const filterActive =
    includedStatuses.length > 0 || includedUrgencies.length > 0;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (includedStatuses.length > 0 && !includedStatuses.includes(t.status)) {
        return false;
      }
      if (includedUrgencies.length > 0 && !includedUrgencies.includes(t.urgency)) {
        return false;
      }
      return true;
    });
  }, [tasks, includedStatuses, includedUrgencies]);

  const handleFilterOpenChange = useCallback(
    (open: boolean) => {
      setFilterOpen(open);
      if (open) {
        setDraftIncludedStatuses([...includedStatuses]);
        setDraftIncludedUrgencies([...includedUrgencies]);
      }
    },
    [includedStatuses, includedUrgencies],
  );

  const toggleDraftStatus = useCallback((s: TaskStatus) => {
    setDraftIncludedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }, []);

  const toggleDraftUrgency = useCallback((u: TaskUrgency) => {
    setDraftIncludedUrgencies((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u],
    );
  }, []);

  const applyFilter = useCallback(() => {
    const nextStatus =
      draftIncludedStatuses.length === TASK_STATUSES.length
        ? []
        : [...draftIncludedStatuses];
    const nextUrgency =
      draftIncludedUrgencies.length === TASK_URGENCIES.length
        ? []
        : [...draftIncludedUrgencies];
    setIncludedStatuses(nextStatus);
    setIncludedUrgencies(nextUrgency);
    setFilterOpen(false);
  }, [draftIncludedStatuses, draftIncludedUrgencies]);

  const clearFilters = useCallback(() => {
    setIncludedStatuses([]);
    setIncludedUrgencies([]);
    setDraftIncludedStatuses([]);
    setDraftIncludedUrgencies([]);
    setFilterOpen(false);
  }, []);

  const cellBase =
    "flex items-center border-b border-r border-zinc-800 px-3 py-1.5 transition-colors focus-within:bg-zinc-900/50";
  const ghostInput =
    "w-full border-none bg-transparent text-[14px] text-zinc-200 outline-none placeholder:text-zinc-700 focus:placeholder:text-zinc-600";

  return (
    <div
      className="group/table my-8 w-full"
      onMouseDown={stopPm}
      onPointerDownCapture={stopPmCaptureUnlessColumnResize}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 px-1">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="min-w-0 flex-1 cursor-pointer rounded px-2 py-1 text-sm font-semibold text-zinc-500 outline-none transition-colors hover:bg-zinc-800/50 focus:cursor-text"
          aria-label="Table title"
        />
        <div className="flex shrink-0 items-center">
          {filterActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md bg-sky-500/20 px-2.5 py-1 text-[12px] font-medium text-sky-300 ring-1 ring-sky-500/40 transition-colors hover:bg-sky-500/30"
            >
              Clear filter
            </button>
          ) : (
            <Popover open={filterOpen} onOpenChange={handleFilterOpenChange} modal>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[12px] font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
                  aria-expanded={filterOpen}
                  aria-label="Filter tasks"
                  onMouseDown={stopPm}
                  onPointerDownCapture={stopPm}
                >
                  <Filter className="size-3.5 shrink-0" aria-hidden />
                  Filter
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                className="w-72 border-zinc-800 p-3"
                onMouseDown={stopPm}
                onPointerDownCapture={stopPm}
              >
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </p>
                <p className="mb-2 text-[11px] text-zinc-600">
                  Show only rows with these statuses. Leave none checked to ignore
                  status.
                </p>
                <div className="mb-4 flex flex-col gap-1">
                  {TASK_STATUSES.map((s) => (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[13px] text-zinc-300 hover:bg-zinc-900/80"
                      onMouseDown={stopPm}
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-zinc-600 bg-zinc-900 text-sky-500 accent-sky-500"
                        checked={draftIncludedStatuses.includes(s)}
                        onChange={() => toggleDraftStatus(s)}
                      />
                      <span>{s.replace(/-/g, " ")}</span>
                    </label>
                  ))}
                </div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Urgency
                </p>
                <p className="mb-2 text-[11px] text-zinc-600">
                  Show only rows with these urgency levels. Leave none checked to
                  ignore urgency.
                </p>
                <div className="mb-3 flex flex-col gap-1">
                  {TASK_URGENCIES.map((u) => (
                    <label
                      key={u}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[13px] text-zinc-300 hover:bg-zinc-900/80"
                      onMouseDown={stopPm}
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-zinc-600 bg-zinc-900 text-sky-500 accent-sky-500"
                        checked={draftIncludedUrgencies.includes(u)}
                        onChange={() => toggleDraftUrgency(u)}
                      />
                      <span>{u}</span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-zinc-800 pt-3">
                  <button
                    type="button"
                    className="w-full rounded-md bg-sky-600 py-2 text-[12px] font-medium text-white transition-colors hover:bg-sky-500"
                    onClick={applyFilter}
                  >
                    Apply filter
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border-l border-t border-zinc-800">
        <div
          role="table"
          className="grid w-full"
          style={{
            gridTemplateColumns: colWidths.map((w) => `${w}px`).join(" "),
            minWidth: colWidths.reduce((a, b) => a + b, 0),
          }}
        >
          <div className="contents bg-zinc-900/30 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {HEADER_LABELS.map((label, colIdx) => (
              <div
                key={colIdx}
                className="relative border-b border-r border-zinc-800 px-2 py-1"
              >
                {label ? <span>{label}</span> : <span aria-hidden className="block min-h-[1em]" />}
                {colIdx < HEADER_LABELS.length - 1 ? (
                  <TaskColumnResizeHandle
                    boundaryIndex={colIdx}
                    onPointerDownResize={onColumnResizePointerDown}
                  />
                ) : null}
              </div>
            ))}
          </div>

          {tasks.length === 0 ? (
            <div className="contents">
              <div
                role="row"
                className="col-span-full border-b border-r border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500"
              >
                No tasks yet. Use <span className="text-zinc-400">New</span> below.
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="contents">
              <div
                role="row"
                className="col-span-full border-b border-r border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500"
              >
                No tasks match the filter.{" "}
                <button
                  type="button"
                  className="text-sky-400 underline decoration-sky-400/50 underline-offset-2 hover:text-sky-300"
                  onClick={clearFilters}
                >
                  Clear filter
                </button>
              </div>
            </div>
          ) : null}

          {filteredTasks.map((task) => (
            <div key={task.id} className="contents group/row hover:bg-zinc-900/40">
              <div className="flex select-none items-center justify-center gap-1 border-b border-r border-zinc-800">
                <DeleteTaskConfirm onConfirm={() => deleteTask(task.id)} />
              </div>

              <div className={cellBase}>
                <input
                  className={cn(ghostInput, "font-medium text-white")}
                  value={task.name}
                  placeholder="Untitled"
                  aria-label="Task name"
                  onChange={(e) => updateTask(task.id, { name: e.target.value })}
                />
              </div>

              <div className={cellBase}>
                <input
                  className={ghostInput}
                  value={task.description}
                  placeholder="Add description…"
                  aria-label="Description"
                  onChange={(e) => updateTask(task.id, { description: e.target.value })}
                />
              </div>

              <div className={cn(cellBase, "relative cursor-pointer")}>
                <select
                  value={task.status}
                  aria-label="Status"
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  onChange={(e) =>
                    updateTask(task.id, { status: parseStatus(e.target.value) })
                  }
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-zinc-900">
                      {s.replace(/-/g, " ")}
                    </option>
                  ))}
                </select>
                <span
                  className={cn(
                    "whitespace-nowrap rounded-[3px] px-1.5 py-px text-[10px] font-medium leading-tight",
                    statusBadgeClass(task.status),
                  )}
                >
                  {task.status.replace(/-/g, " ")}
                </span>
              </div>

              <div className={cellBase}>
                <select
                  value={task.urgency}
                  aria-label="Urgency"
                  className="w-full cursor-pointer appearance-none bg-transparent text-[13px] text-zinc-400 outline-none transition-colors hover:text-zinc-200"
                  onChange={(e) =>
                    updateTask(task.id, { urgency: parseUrgency(e.target.value) })
                  }
                >
                  {TASK_URGENCIES.map((u) => (
                    <option key={u} value={u} className="bg-zinc-900 text-zinc-200">
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className={cellBase}>
                <DueDatePickerCell
                  value={task.dueDate}
                  onChange={(dueDate) => updateTask(task.id, { dueDate })}
                  ghostInputClass={cn(
                    ghostInput,
                    "placeholder:opacity-0 group-hover/row:placeholder:opacity-100",
                  )}
                />
              </div>

              <div className={cn(cellBase, "min-w-0 items-stretch")}>
                <AssigneeCell
                  assigneeUserIds={task.assigneeUserIds}
                  directory={directory}
                  onChange={(ids) => updateTask(task.id, { assigneeUserIds: ids })}
                />
              </div>

              <div className={cn(cellBase, "justify-center")}>
                <input
                  type="checkbox"
                  checked={task.inCalendar}
                  aria-label="In calendar"
                  className="size-3.5 cursor-pointer rounded-[3px] border-zinc-700 bg-zinc-900 accent-zinc-500 transition-all"
                  onChange={(e) => updateTask(task.id, { inCalendar: e.target.checked })}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="col-span-full flex cursor-pointer items-center gap-2 border-b border-r border-zinc-800 px-3 py-1.5 text-left text-sm text-zinc-500 transition-all hover:bg-zinc-900/60"
            onClick={addTask}
          >
            <Plus className="size-3 shrink-0" aria-hidden />
            <span className="text-[12px]">New</span>
          </button>
        </div>
      </div>
    </div>
  );
}
