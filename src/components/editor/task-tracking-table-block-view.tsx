"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { useOrganization, useUser } from "@clerk/nextjs";
import { Plus, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

import { cn } from "@/lib/utils";

import {
  newTaskRow,
  parseTasksJSON,
  stringifyTasks,
  TASK_STATUSES,
  TASK_URGENCIES,
  type TaskTrackingRow,
  type TaskStatus,
  type TaskUrgency,
} from "./task-tracking-types";

const DEFAULT_TITLE = "Project Tasks";
const MAX_ASSIGNEE_AVATARS = 5;

function stopPm(e: SyntheticEvent) {
  e.stopPropagation();
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
          className="size-7 rounded-full object-cover ring-2 ring-zinc-900"
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
        className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 opacity-0 shadow ring-1 ring-zinc-600 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover/ava:opacity-100"
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
      className="relative flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1.5"
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
        className="max-w-[120px] shrink-0 cursor-pointer truncate rounded border border-transparent bg-transparent py-0.5 text-[11px] text-zinc-500 outline-none hover:border-zinc-700 hover:text-zinc-300"
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
  block: Parameters<BlockNoteEditor<any, any, any>["updateBlock"]>[0];
  editor: BlockNoteEditor<any, any, any>;
};

export function TaskTrackingTableBlockView({
  title,
  tasksJSON,
  block,
  editor,
}: TaskTrackingTableBlockViewProps) {
  const directory = useAssigneeDirectory();
  const tasks = useMemo(() => parseTasksJSON(tasksJSON), [tasksJSON]);
  const blockId = typeof block === "string" ? block : block.id;
  const [titleDraft, setTitleDraft] = useState(title);

  useEffect(() => {
    setTitleDraft(title);
  }, [title]);

  const persist = useCallback(
    (nextTitle: string, nextTasks: TaskTrackingRow[]) => {
      editor.updateBlock(blockId, {
        props: { title: nextTitle, tasksJSON: stringifyTasks(nextTasks) },
      });
    },
    [blockId, editor],
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

  const cellBase =
    "flex items-center border-b border-r border-zinc-800 px-3 py-1.5 transition-colors focus-within:bg-zinc-900/50";
  const ghostInput =
    "w-full border-none bg-transparent text-[14px] text-zinc-200 outline-none placeholder:text-zinc-700 focus:placeholder:text-zinc-600";

  return (
    <div
      className="group/table my-8 w-full"
      onMouseDown={stopPm}
      onPointerDownCapture={stopPm}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
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
          className="cursor-pointer rounded px-2 py-1 text-sm font-semibold text-zinc-500 outline-none transition-colors hover:bg-zinc-800/50 focus:cursor-text"
          aria-label="Table title"
        />
      </div>

      <div className="overflow-hidden rounded-sm border-l border-t border-zinc-800">
        <div
          role="table"
          className="grid min-w-[1000px] w-full [grid-template-columns:40px_220px_1fr_140px_120px_120px_200px_60px]"
        >
          <div className="contents bg-zinc-900/30 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            <div className="border-b border-r border-zinc-800 px-2 py-2" aria-hidden />
            {["Task", "Description", "Status", "Urgency", "Due Date", "Assignee", "Cal"].map(
              (h) => (
                <div key={h} className="border-b border-r border-zinc-800 px-3 py-2">
                  {h}
                </div>
              ),
            )}
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
          ) : null}

          {tasks.map((task) => (
            <div key={task.id} className="contents group/row hover:bg-zinc-900/40">
              <div className="flex select-none items-center justify-center gap-1 border-b border-r border-zinc-800">
                <button
                  type="button"
                  aria-label="Delete task"
                  className="rounded p-1 text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/row:opacity-100"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="size-3" aria-hidden />
                </button>
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
                    "whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[11px] font-medium",
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
                <input
                  type="text"
                  value={task.dueDate}
                  placeholder="Empty"
                  aria-label="Due date"
                  className={cn(
                    ghostInput,
                    "text-[13px] placeholder:opacity-0 group-hover/row:placeholder:opacity-100",
                  )}
                  onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                />
              </div>

              <div className={cn(cellBase, "min-w-0 items-stretch py-2")}>
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
            className="col-span-full flex cursor-pointer items-center gap-2 border-b border-r border-zinc-800 px-4 py-2 text-left text-sm text-zinc-500 transition-all hover:bg-zinc-900/60"
            onClick={addTask}
          >
            <Plus className="size-3.5 shrink-0" aria-hidden />
            <span className="text-[13px]">New</span>
          </button>
        </div>
      </div>
    </div>
  );
}
