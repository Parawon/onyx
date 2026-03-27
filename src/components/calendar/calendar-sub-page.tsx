"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import { CalendarPageHeader } from "@/components/calendar/calendar-page-header";
import { OnyxCalendar } from "@/components/calendar/onyx-calendar";
import { Button } from "@/components/ui/button";

function RemoveCalendarButton({ slug }: { slug: string }) {
  const router = useRouter();
  const deleteSubPage = useMutation(api.calendar.deleteSubPage);
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      className="text-zinc-400 hover:bg-zinc-900/60 hover:text-red-400"
      onClick={() => {
        const ok = window.confirm(
          "Remove this calendar page? This cannot be undone.",
        );
        if (!ok) {
          return;
        }
        setBusy(true);
        void deleteSubPage({ slug })
          .then(() => {
            router.push("/calendar");
          })
          .catch((err: unknown) => {
            setBusy(false);
            const message = err instanceof Error ? err.message : "Could not remove this calendar.";
            window.alert(message);
          });
      }}
    >
      <Trash2 className="mr-1.5 size-4" aria-hidden />
      {busy ? "Removing…" : "Remove calendar"}
    </Button>
  );
}

export function CalendarSubPage({ slug }: { slug: string }) {
  const decoded = decodeURIComponent(slug);
  const meta = useQuery(api.calendar.getSubPageMeta, { slug: decoded });
  const pageEvents = useQuery(api.calendarEvents.getCalendarEvents, { goalScope: decoded });

  if (meta === undefined) {
    return (
      <div className="flex min-h-[40vh] flex-col bg-background px-12 pt-12 text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (meta === null) {
    return (
      <div className="flex min-h-[40vh] flex-col bg-background px-12 pt-12">
        <p className="text-lg text-zinc-400">This calendar page doesn’t exist or you don’t have access.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background">
      <CalendarPageHeader suffix={meta.label} right={<RemoveCalendarButton slug={decoded} />} />
      <div className="mx-auto w-full max-w-[1400px] px-12 pb-12">
        <section className="mb-8 pt-6">
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
            Tasks from the matching Goals page appear here when marked with{" "}
            <span className="text-zinc-400">Cal</span>. Use the same URL slug for Goals and Calendar (e.g.{" "}
            <span className="font-mono text-zinc-400">/goals/{decoded}</span>).
          </p>
        </section>
        <OnyxCalendar mode="local" events={pageEvents ?? undefined} />
      </div>
    </div>
  );
}
