"use client";

import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import {
  WorkspaceAnnouncementRow,
  WorkspaceSectionPage,
} from "@/components/workspace/workspace-section-page";

export function CalendarSubPage({ slug }: { slug: string }) {
  const decoded = decodeURIComponent(slug);
  const meta = useQuery(api.goals.getSubPageMeta, { slug: decoded });

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
        <p className="text-lg text-zinc-400">No calendar for this slug — create the matching Goals sub-page first.</p>
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
      <div className="max-w-3xl space-y-4">
        <WorkspaceAnnouncementRow title="Executive review — placeholder slot" />
        <WorkspaceAnnouncementRow title="Sprint planning — TBD" />
      </div>
    </WorkspaceSectionPage>
  );
}
