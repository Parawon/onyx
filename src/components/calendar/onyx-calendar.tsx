"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { parseDueDateString } from "@/components/editor/task-tracking-types";

export type OnyxCalendarEvent = {
  _id: string;
  goalScope: string;
  goalLabel: string;
  sourceTaskId: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  urgency: string;
  assigneeUserIds: readonly string[];
};

const SCOPE_BORDER_PALETTE = [
  "border-sky-400/55",
  "border-emerald-400/55",
  "border-violet-400/55",
  "border-amber-400/55",
  "border-rose-400/55",
  "border-cyan-400/55",
  "border-fuchsia-400/55",
  "border-lime-400/55",
] as const;

function scopeBorderClass(scope: string): string {
  let h = 0;
  for (let i = 0; i < scope.length; i++) {
    h = (h * 33 + scope.charCodeAt(i)) >>> 0;
  }
  return SCOPE_BORDER_PALETTE[h % SCOPE_BORDER_PALETTE.length]!;
}

function goalsHref(goalScope: string): string {
  return goalScope === "main" ? "/goals" : `/goals/${encodeURIComponent(goalScope)}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekSunday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  return addDays(x, -day);
}

function monthMatrix(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeekSunday(firstOfMonth);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(start, i));
  }
  return cells;
}

function weekDays(anchor: Date): Date[] {
  const start = startOfWeekSunday(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

type ViewMode = "month" | "week";

export function OnyxCalendar({
  mode,
  events,
}: {
  mode: "master" | "local";
  events: OnyxCalendarEvent[] | undefined | null;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [hiddenScopes, setHiddenScopes] = useState<Set<string>>(() => new Set());

  const scopeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of events ?? []) {
      if (!map.has(e.goalScope)) {
        map.set(e.goalScope, e.goalLabel);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const filtered = useMemo(() => {
    const list = events ?? [];
    if (mode === "local" || hiddenScopes.size === 0) {
      return list;
    }
    return list.filter((e) => !hiddenScopes.has(e.goalScope));
  }, [events, mode, hiddenScopes]);

  const { dated, undated } = useMemo(() => {
    const d: { date: Date; ev: OnyxCalendarEvent }[] = [];
    const u: OnyxCalendarEvent[] = [];
    for (const ev of filtered) {
      const dt = parseDueDateString(ev.dueDate);
      if (dt) {
        d.push({ date: startOfDay(dt), ev });
      } else {
        u.push(ev);
      }
    }
    d.sort((a, b) => a.date.getTime() - b.date.getTime() || a.ev.title.localeCompare(b.ev.title));
    return { dated: d, undated: u };
  }, [filtered]);

  const eventsByDay = useMemo(() => {
    const m = new Map<number, OnyxCalendarEvent[]>();
    for (const { date, ev } of dated) {
      const k = date.getTime();
      const arr = m.get(k) ?? [];
      arr.push(ev);
      m.set(k, arr);
    }
    return m;
  }, [dated]);

  const weekCells = useMemo(() => weekDays(cursor), [cursor]);
  const monthCells = useMemo(() => monthMatrix(cursor), [cursor]);

  const loading = events === undefined;
  const unauth = events === null;
  const empty = !loading && !unauth && filtered.length === 0;

  const toggleScope = (scope: string) => {
    setHiddenScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const showAllScopes = () => setHiddenScopes(new Set());
  const hideAllScopes = () => {
    const next = new Set<string>();
    for (const [scope] of scopeOptions) {
      next.add(scope);
    }
    setHiddenScopes(next);
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-0 gap-6",
        mode === "master" && scopeOptions.length > 0 && "flex-col lg:flex-row",
      )}
    >
      {mode === "master" && scopeOptions.length > 0 ? (
        <aside className="w-full shrink-0 lg:w-52">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Team filter
          </p>
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[11px] text-sky-400/90 hover:text-sky-300"
                onClick={showAllScopes}
              >
                All on
              </button>
              <span className="text-zinc-700">·</span>
              <button
                type="button"
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
                onClick={hideAllScopes}
              >
                All off
              </button>
            </div>
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {scopeOptions.map(([scope, label]) => {
                const on = !hiddenScopes.has(scope);
                return (
                  <li key={scope}>
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-zinc-300">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-zinc-600 bg-zinc-900 accent-sky-500"
                        checked={on}
                        onChange={() => toggleScope(scope)}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate border-l-2 pl-2",
                          scopeBorderClass(scope),
                        )}
                      >
                        {label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-zinc-500" aria-hidden />
            <div className="flex rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
                  view === "month"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-200",
                )}
                onClick={() => setView("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
                  view === "week"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-200",
                )}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              aria-label="Previous"
              onClick={() => {
                const x = new Date(cursor);
                if (view === "month") {
                  x.setMonth(x.getMonth() - 1);
                } else {
                  x.setDate(x.getDate() - 7);
                }
                setCursor(x);
              }}
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="min-w-[10rem] text-center text-sm font-medium text-zinc-200">
              {view === "month"
                ? cursor.toLocaleString(undefined, { month: "long", year: "numeric" })
                : `Week of ${weekCells[0]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            </span>
            <button
              type="button"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              aria-label="Next"
              onClick={() => {
                const x = new Date(cursor);
                if (view === "month") {
                  x.setMonth(x.getMonth() + 1);
                } else {
                  x.setDate(x.getDate() + 7);
                }
                setCursor(x);
              }}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-16 text-center text-sm text-zinc-500">
            Loading calendar…
          </div>
        ) : empty ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-16 text-center text-sm text-zinc-500">
            No tasks in calendar yet. Mark tasks with <span className="text-zinc-400">Cal</span> in Goals.
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {view === "month" ? (
                <MonthGrid cells={monthCells} anchorMonth={cursor.getMonth()} eventsByDay={eventsByDay} />
              ) : (
                <WeekStrip days={weekCells} eventsByDay={eventsByDay} mode={mode} />
              )}

              {undated.length > 0 ? (
                <div className="mt-8">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Unscheduled
                  </h3>
                  <ul className="space-y-2">
                    {undated.map((ev) => (
                      <EventRow key={ev._id} ev={ev} mode={mode} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  cells,
  anchorMonth,
  eventsByDay,
}: {
  cells: Date[];
  anchorMonth: number;
  eventsByDay: Map<number, OnyxCalendarEvent[]>;
}) {
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/40">
      <div className="grid min-w-[720px] grid-cols-7 border-b border-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {dow.map((d) => (
          <div key={d} className="border-r border-zinc-800 px-2 py-2 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-w-[720px] grid-cols-7">
        {cells.map((day) => {
          const inMonth = day.getMonth() === anchorMonth;
          const k = startOfDay(day).getTime();
          const list = eventsByDay.get(k) ?? [];
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[92px] border-b border-r border-zinc-800 p-1.5 last:border-r-0",
                !inMonth && "bg-black/40 opacity-50",
              )}
            >
              <div className="mb-1 text-right text-[11px] text-zinc-500">{day.getDate()}</div>
              <div className="flex flex-col gap-1">
                {list.slice(0, 3).map((ev) => (
                  <div
                    key={ev._id}
                    className={cn(
                      "truncate rounded border bg-zinc-900/80 px-1.5 py-0.5 text-[10px] text-zinc-200",
                      scopeBorderClass(ev.goalScope),
                    )}
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                ))}
                {list.length > 3 ? (
                  <span className="text-[10px] text-zinc-600">+{list.length - 3} more</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekStrip({
  days,
  eventsByDay,
  mode,
}: {
  days: Date[];
  eventsByDay: Map<number, OnyxCalendarEvent[]>;
  mode: "master" | "local";
}) {
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day) => {
        const k = startOfDay(day).getTime();
        const list = eventsByDay.get(k) ?? [];
        return (
          <div
            key={day.toISOString()}
            className="min-h-[180px] rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
          >
            <div className="mb-2 border-b border-zinc-800 pb-1 text-[11px] font-medium text-zinc-400">
              {day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
            </div>
            <ul className="space-y-2">
              {list.map((ev) => (
                <li key={ev._id}>
                  <EventRow ev={ev} compact mode={mode} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EventRow({
  ev,
  compact,
  mode,
}: {
  ev: OnyxCalendarEvent;
  compact?: boolean;
  mode: "master" | "local";
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-zinc-900/60 px-2 py-2",
        scopeBorderClass(ev.goalScope),
        compact && "py-1.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium text-zinc-100", compact ? "text-[11px]" : "text-[13px]")}>
            {mode === "master" ? `${ev.goalLabel}: ${ev.title}` : ev.title}
          </p>
          {ev.description.trim() && !compact ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{ev.description}</p>
          ) : null}
        </div>
        {mode === "master" ? (
          <Link
            href={goalsHref(ev.goalScope)}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-zinc-700 bg-black/30 px-1.5 py-1 text-[10px] text-sky-400/90 hover:border-sky-500/40 hover:text-sky-300"
          >
            <ExternalLink className="size-3" aria-hidden />
            Page
          </Link>
        ) : null}
      </div>
    </div>
  );
}
