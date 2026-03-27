export type TaskStatus = "completed" | "in-progress" | "not-started" | "planning" | "backlog";

export type TaskUrgency = "extreme" | "high" | "mid" | "low" | "very low";

export type TaskTrackingRow = {
  id: string;
  name: string;
  status: TaskStatus;
  urgency: TaskUrgency;
  description: string;
  dueDate: string;
  responsibility: string;
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
    return parsed.filter(isTaskRow);
  } catch {
    return [];
  }
}

function isTaskRow(x: unknown): x is TaskTrackingRow {
  if (x === null || typeof x !== "object") {
    return false;
  }
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.status === "string" &&
    typeof o.urgency === "string" &&
    typeof o.description === "string" &&
    typeof o.dueDate === "string" &&
    typeof o.responsibility === "string" &&
    typeof o.inCalendar === "boolean"
  );
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
    responsibility: "",
    inCalendar: false,
  };
}
