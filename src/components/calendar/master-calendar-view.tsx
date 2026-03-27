"use client";

import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { OnyxCalendar } from "@/components/calendar/onyx-calendar";

export function MasterCalendarView() {
  const events = useQuery(api.calendarEvents.getCalendarEvents, {});
  return (
    <div className="mx-auto w-full max-w-[1400px] px-12 pb-16 pt-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Master calendar</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Tasks from every Goals page that have <span className="text-zinc-400">Cal</span> checked. Use the sidebar to
          show or hide workspaces.
        </p>
      </header>
      <OnyxCalendar mode="master" events={events ?? undefined} />
    </div>
  );
}
