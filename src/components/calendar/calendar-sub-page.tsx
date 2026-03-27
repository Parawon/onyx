"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import {
  WorkspaceAnnouncementRow,
  WorkspaceSectionPage,
} from "@/components/workspace/workspace-section-page";
import { Button } from "@/components/ui/button";

function DeleteCalendarSubPageButton({ slug }: { slug: string }) {
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
          "Delete this calendar page? This cannot be undone.",
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
            const message = err instanceof Error ? err.message : "Could not delete this calendar.";
            window.alert(message);
          });
      }}
    >
      <Trash2 className="mr-1.5 size-4" aria-hidden />
      {busy ? "Deleting…" : "Delete calendar"}
    </Button>
  );
}

export function CalendarSubPage({ slug }: { slug: string }) {
  const decoded = decodeURIComponent(slug);
  const meta = useQuery(api.calendar.getSubPageMeta, { slug: decoded });

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
    <WorkspaceSectionPage
      title={`Calendar — ${meta.label}`}
      tagline="Schedule & events"
      description="Plan reviews, deadlines, and milestones. A full calendar integration can plug in here when you connect your provider."
      sectionHeading="Upcoming"
    >
      <div className="flex max-w-3xl flex-col gap-6">
        <div className="flex justify-end">
          <DeleteCalendarSubPageButton slug={decoded} />
        </div>
        <div className="space-y-4">
          <WorkspaceAnnouncementRow title="Executive review — placeholder slot" />
          <WorkspaceAnnouncementRow title="Sprint planning — TBD" />
        </div>
      </div>
    </WorkspaceSectionPage>
  );
}
