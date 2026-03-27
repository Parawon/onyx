export type TaskStatus = "completed" | "in-progress" | "not-started" | "planning" | "backlog";

export type TaskUrgency = "extreme" | "high" | "mid" | "low" | "very low";

export type TaskTrackingRow = {
  id: string;
  name: string;
  status: TaskStatus;
  urgency: TaskUrgency;
  description: string;
  dueDate: string;
  /** Clerk user IDs of assignees (order preserved for display). */
  assigneeUserIds: string[];
  inCalendar: boolean;
};

export const TASK_STATUSES: TaskStatus[] = [
  "completed",
  "in-progress",
  "not-started",
  "planning",
  "backlog",
];

export const TASK_URGENCIES: TaskUrgency[] = ["extreme", "high", "mid", "low", "very low"];

export function parseTasksJSON(raw: string): TaskTrackingRow[] {
  if (!raw || raw.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeLegacyRow).filter((r): r is TaskTrackingRow => r !== null);
  } catch {
    return [];
  }
}

/** Accepts legacy rows that used `responsibility` (string) instead of assignee ids. */
function normalizeLegacyRow(x: unknown): TaskTrackingRow | null {
  if (x === null || typeof x !== "object") {
    return null;
  }
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    typeof o.status !== "string" ||
    typeof o.urgency !== "string" ||
    typeof o.description !== "string" ||
    typeof o.dueDate !== "string" ||
    typeof o.inCalendar !== "boolean"
  ) {
    return null;
  }
  let assigneeUserIds: string[] = [];
  if (Array.isArray(o.assigneeUserIds)) {
    assigneeUserIds = o.assigneeUserIds.filter((id): id is string => typeof id === "string");
  }
  const status = (TASK_STATUSES as readonly string[]).includes(String(o.status))
    ? (o.status as TaskStatus)
    : "backlog";
  const urgency = (TASK_URGENCIES as readonly string[]).includes(String(o.urgency))
    ? (o.urgency as TaskUrgency)
    : "mid";
  return {
    id: o.id,
    name: o.name,
    status,
    urgency,
    description: o.description,
    dueDate: o.dueDate,
    assigneeUserIds,
    inCalendar: o.inCalendar,
  };
}

export function stringifyTasks(tasks: TaskTrackingRow[]): string {
  return JSON.stringify(tasks);
}

export function newTaskRow(): TaskTrackingRow {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: "New task",
    status: "backlog",
    urgency: "mid",
    description: "",
    dueDate: "",
    assigneeUserIds: [],
    inCalendar: false,
  };
}

/** Parse stored due date (`yyyy-MM-dd` or legacy free text) to a local calendar date. */
export function parseDueDateString(raw: string): Date | undefined {
  if (!raw.trim()) {
    return undefined;
  }
  const t = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d);
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== mo - 1 ||
      date.getDate() !== d
    ) {
      return undefined;
    }
    return date;
  }
  const parsed = new Date(t);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatDueDateStorage(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Task table has 8 columns: handle, task, description, status, urgency, due, assignee, cal. */
export const TASK_TABLE_COL_COUNT = 8;

/** Stored width per column; use `"1fr"` for the flexible Description column (Notion-style). */
export type TaskTableColumnWidth = number | "1fr";

/** Default layout: fixed px except Description (`1fr`) which fills remaining space. */
export const DEFAULT_TASK_TABLE_COLUMN_WIDTHS: readonly TaskTableColumnWidth[] = [
  40, 220, "1fr", 140, 120, 120, 200, 60,
];

export const MIN_TASK_TABLE_COL_WIDTHS: readonly number[] = [
  32, 80, 100, 90, 80, 80, 100, 44,
];

export function parseTaskTableColumnWidths(raw: string | undefined): TaskTableColumnWidth[] {
  if (!raw || raw.trim() === "") {
    return [...DEFAULT_TASK_TABLE_COLUMN_WIDTHS];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== TASK_TABLE_COL_COUNT) {
      return [...DEFAULT_TASK_TABLE_COLUMN_WIDTHS];
    }
    return parsed.map((el, i) => {
      if (el === "1fr" || (typeof el === "string" && el.trim() === "1fr")) {
        return "1fr" as const;
      }
      const w = typeof el === "number" ? el : Number(el);
      if (!Number.isFinite(w)) {
        return DEFAULT_TASK_TABLE_COLUMN_WIDTHS[i]!;
      }
      return Math.max(MIN_TASK_TABLE_COL_WIDTHS[i] ?? 40, Math.round(w));
    });
  } catch {
    return [...DEFAULT_TASK_TABLE_COLUMN_WIDTHS];
  }
}

/**
 * CSS `grid-template-columns` for the task block grid.
 * Fixed columns use `minmax(min, preferred)` so they can shrink and the table stays within the container width;
 * the Description column stays `minmax(..., 1fr)` to absorb remaining space.
 */
export function taskGridTemplateColumns(widths: readonly TaskTableColumnWidth[]): string {
  return widths
    .map((w, i) => {
      const min = MIN_TASK_TABLE_COL_WIDTHS[i] ?? 40;
      if (w === "1fr") {
        return `minmax(${min}px, 1fr)`;
      }
      return `minmax(${min}px, ${w}px)`;
    })
    .join(" ");
}

/**
 * Resize by dragging the boundary between column `boundaryIndex` and `boundaryIndex + 1`.
 * Fixed–fixed: width transfers between neighbors. Adjacent to `"1fr"`: only the px column changes.
 */
export function applyBoundaryResize(
  widths: readonly TaskTableColumnWidth[],
  boundaryIndex: number,
  deltaPx: number,
): TaskTableColumnWidth[] {
  if (boundaryIndex < 0 || boundaryIndex >= TASK_TABLE_COL_COUNT - 1) {
    return [...widths];
  }
  const d = Math.round(deltaPx);
  if (d === 0) {
    return [...widths];
  }
  const next = [...widths] as TaskTableColumnWidth[];
  const i = boundaryIndex;
  const L = next[i]!;
  const R = next[i + 1]!;

  if (L !== "1fr" && R !== "1fr") {
    const minI = MIN_TASK_TABLE_COL_WIDTHS[i]!;
    const minJ = MIN_TASK_TABLE_COL_WIDTHS[i + 1]!;
    let clamped = d;
    if (clamped > 0) {
      const maxShrinkRight = Math.max(0, (R as number) - minJ);
      clamped = Math.min(clamped, maxShrinkRight);
    } else {
      const maxShrinkLeft = Math.max(0, (L as number) - minI);
      clamped = Math.max(clamped, -maxShrinkLeft);
    }
    next[i] = (L as number) + clamped;
    next[i + 1] = (R as number) - clamped;
    return next;
  }

  if (L !== "1fr" && R === "1fr") {
    const minL = MIN_TASK_TABLE_COL_WIDTHS[i]!;
    let clamped = d;
    if (clamped <= 0) {
      const maxShrinkLeft = Math.max(0, (L as number) - minL);
      clamped = Math.max(clamped, -maxShrinkLeft);
    }
    next[i] = (L as number) + clamped;
    return next;
  }

  if (L === "1fr" && R !== "1fr") {
    const minR = MIN_TASK_TABLE_COL_WIDTHS[i + 1]!;
    let clamped = d;
    if (clamped > 0) {
      const maxShrinkRight = Math.max(0, (R as number) - minR);
      clamped = Math.min(clamped, maxShrinkRight);
    }
    next[i + 1] = (R as number) - clamped;
    return next;
  }

  return next;
}
