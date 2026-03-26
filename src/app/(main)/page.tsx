import { ArrowRight } from "lucide-react";

import {
  WorkspaceAnnouncementRow,
  WorkspaceSectionPage,
} from "@/components/workspace/workspace-section-page";

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Onyx";

export default function HomePage() {
  return (
    <WorkspaceSectionPage
      title={COMPANY_NAME}
      tagline="Strategic overview"
      description="Precision management and architectural oversight for the modern enterprise. Your operational velocity, visualized."
      sectionHeading="Announcements"
    >
      <div className="max-w-3xl space-y-4">
        <WorkspaceAnnouncementRow title="Quarterly Strategic Review — Oct 24, 2023" />
        <WorkspaceAnnouncementRow title="New Security Protocols Implementation — Oct 20, 2023" />
        <div className="group flex min-h-[4.5rem] items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-sky-500/40">
          <span className="text-zinc-500">More updates soon</span>
          <ArrowRight className="size-5 text-zinc-600 transition-colors group-hover:text-sky-400" />
        </div>
      </div>
    </WorkspaceSectionPage>
  );
}
