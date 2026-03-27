"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { Plus, UserPlus, GripVertical, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

// Helper for Notion-style pastel badges
function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "completed": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    case "in-progress": return "bg-sky-500/20 text-sky-400 border border-sky-500/30";
    case "planning": return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
    case "not-started": return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    default: return "bg-zinc-900 text-zinc-500";
  }
}

export function TaskTrackingTableBlockView({ title, tasksJSON, block, editor }: any) {
  const { user } = useUser();
  const tasks = useMemo(() => parseTasksJSON(tasksJSON), [tasksJSON]);
  const blockId = typeof block === "string" ? block : block.id;
  const [titleDraft, setTitleDraft] = useState(title);

  const persist = useCallback((nextTitle: string, nextTasks: TaskTrackingRow[]) => {
    editor.updateBlock(blockId, {
      props: { title: nextTitle, tasksJSON: stringifyTasks(nextTasks) },
    });
  }, [blockId, editor]);

  const updateTask = (id: string, patch: Partial<TaskTrackingRow>) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    persist(titleDraft, next);
  };

  const addTask = () => persist(titleDraft, [...tasks, newTaskRow()]);
  
  const deleteTask = (id: string) => {
    const next = tasks.filter((t) => t.id !== id);
    persist(titleDraft, next);
  };

  // Notion-style "Ghost" Classes
  const cellBase = "border-r border-b border-zinc-800 px-3 py-1.5 flex items-center transition-colors focus-within:bg-zinc-900/50";
  const ghostInput = "w-full bg-transparent border-none outline-none text-[14px] text-zinc-200 placeholder:text-zinc-700 focus:placeholder:text-zinc-600";

  return (
    <div className="w-full my-8 group/table select-none" onMouseDown={(e) => e.stopPropagation()}>
      {/* Table Header / Title */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => persist(titleDraft, tasks)}
          className="text-sm font-semibold text-zinc-500 bg-transparent hover:bg-zinc-800/50 px-2 py-1 rounded transition-colors outline-none cursor-pointer focus:cursor-text"
        />
      </div>

      {/* The Grid Container */}
      <div className="border-t border-l border-zinc-800 overflow-hidden rounded-sm">
        <div 
          className="grid w-full min-w-[1000px] [grid-template-columns:40px_220px_1fr_140px_120px_120px_180px_60px]"
          role="table"
        >
          {/* Header Row */}
          <div className="contents bg-zinc-900/30 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <div className="border-r border-b border-zinc-800 px-2 py-2"></div>
            {["Task", "Description", "Status", "Urgency", "Due Date", "Assignee", "Cal"].map((h) => (
              <div key={h} className="border-r border-b border-zinc-800 px-3 py-2">{h}</div>
            ))}
          </div>

          {/* Task Rows */}
          {tasks.map((task) => (
            <div key={task.id} className="contents group/row hover:bg-zinc-900/40">
              {/* Drag/Delete Handle */}
              <div className="border-r border-b border-zinc-800 flex items-center justify-center gap-1">
                 <button 
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-400 rounded text-zinc-600 transition-all"
                 >
                   <Trash2 size={12} />
                 </button>
              </div>

              {/* Name */}
              <div className={cellBase}>
                <input 
                  className={cn(ghostInput, "font-medium text-white")} 
                  value={task.name} 
                  placeholder="Untitled"
                  onChange={(e) => updateTask(task.id, { name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className={cellBase}>
                <input 
                  className={ghostInput} 
                  value={task.description} 
                  placeholder="Add description..."
                  onChange={(e) => updateTask(task.id, { description: e.target.value })}
                />
              </div>

              {/* Status Selector */}
              <div className={cn(cellBase, "relative cursor-pointer")}>
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, { status: e.target.value as any })}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                >
                  {TASK_STATUSES.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
                </select>
                <span className={cn("px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap", statusBadgeClass(task.status))}>
                  {task.status.replace(/-/g, " ")}
                </span>
              </div>

              {/* Urgency */}
              <div className={cellBase}>
                <select
                   value={task.urgency}
                   onChange={(e) => updateTask(task.id, { urgency: e.target.value as any })}
                   className="bg-transparent outline-none w-full text-[13px] text-zinc-400 cursor-pointer appearance-none hover:text-zinc-200 transition-colors"
                >
                   {TASK_URGENCIES.map(u => <option key={u} value={u} className="bg-zinc-900 text-zinc-200">{u}</option>)}
                </select>
              </div>

              {/* Due Date */}
              <div className={cellBase}>
                <input 
                  type="text"
                  placeholder="Empty"
                  className={cn(ghostInput, "text-[13px] placeholder:opacity-0 group-hover/row:placeholder:opacity-100")} 
                  value={task.dueDate} 
                  onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                />
              </div>

              {/* Responsibility */}
              <div className={cn(cellBase, "gap-2")}>
                {!task.responsibility ? (
                  <button 
                    onClick={() => updateTask(task.id, { responsibility: user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Me" })}
                    className="text-zinc-600 hover:text-zinc-400 flex items-center gap-1.5 text-[12px] opacity-0 group-hover/row:opacity-100 transition-opacity"
                  >
                    <UserPlus size={14} /> Add
                  </button>
                ) : (
                  <span className="text-[12px] truncate text-zinc-300">
                    {task.responsibility.split("(")[0]}
                  </span>
                )}
              </div>

              {/* Calendar Toggle */}
              <div className={cn(cellBase, "justify-center")}>
                <input 
                  type="checkbox" 
                  checked={task.inCalendar}
                  onChange={(e) => updateTask(task.id, { inCalendar: e.target.checked })}
                  className="size-3.5 rounded-[3px] border-zinc-700 bg-zinc-900 text-zinc-200 accent-zinc-500 transition-all cursor-pointer"
                />
              </div>
            </div>
          ))}

          {/* Add New Row Action */}
          <div 
            onClick={addTask}
            className="col-span-full border-r border-b border-zinc-800 px-4 py-2 text-zinc-500 hover:bg-zinc-900/60 cursor-pointer flex items-center gap-2 text-sm transition-all"
          >
            <Plus size={14} />
            <span className="text-[13px]">New</span>
          </div>
        </div>
      </div>
    </div>
  );
}