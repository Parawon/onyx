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

export const DEFAULT_TASK_TABLE_COL_WIDTHS: readonly number[] = [
  40, 220, 320, 140, 120, 120, 200, 60,
];

export const MIN_TASK_TABLE_COL_WIDTHS: readonly number[] = [
  32, 80, 100, 90, 80, 80, 100, 44,
];

export function parseTaskTableColumnWidths(raw: string | undefined): number[] {
  if (!raw || raw.trim() === "") {
    return [...DEFAULT_TASK_TABLE_COL_WIDTHS];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== TASK_TABLE_COL_COUNT) {
      return [...DEFAULT_TASK_TABLE_COL_WIDTHS];
    }
    return parsed.map((n, i) => {
      const w = typeof n === "number" ? n : Number(n);
      if (!Number.isFinite(w)) {
        return DEFAULT_TASK_TABLE_COL_WIDTHS[i]!;
      }
      return Math.max(MIN_TASK_TABLE_COL_WIDTHS[i] ?? 40, Math.round(w));
    });
  } catch {
    return [...DEFAULT_TASK_TABLE_COL_WIDTHS];
  }
}

/**
 * Resize by dragging the boundary between column `boundaryIndex` and `boundaryIndex + 1`.
 * Width is transferred between the two columns so the total stays constant.
 */
export function applyBoundaryResize(
  widths: readonly number[],
  boundaryIndex: number,
  deltaPx: number,
): number[] {
  if (boundaryIndex < 0 || boundaryIndex >= TASK_TABLE_COL_COUNT - 1) {
    return [...widths];
  }
  /** Integer device pixels avoid sub-pixel drift in JSON + layout. */
  const d = Math.round(deltaPx);
  if (d === 0) {
    return [...widths];
  }
  const next = [...widths];
  const i = boundaryIndex;
  const minI = MIN_TASK_TABLE_COL_WIDTHS[i]!;
  const minJ = MIN_TASK_TABLE_COL_WIDTHS[i + 1]!;
  let clamped = d;
  if (clamped > 0) {
    const maxShrinkRight = Math.max(0, next[i + 1]! - minJ);
    clamped = Math.min(clamped, maxShrinkRight);
  } else {
    const maxShrinkLeft = Math.max(0, next[i]! - minI);
    clamped = Math.max(clamped, -maxShrinkLeft);
  }
  next[i] = next[i]! + clamped;
  next[i + 1] = next[i + 1]! - clamped;
  return next;
}
