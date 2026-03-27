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
