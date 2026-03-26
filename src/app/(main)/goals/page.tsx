import { DualProgressBar } from "@/components/goals";
import {
  WorkspaceAnnouncementRow,
  WorkspaceSectionPage,
} from "@/components/workspace/workspace-section-page";

export default function GoalsPage() {
  return (
    <WorkspaceSectionPage
      title="Goals"
      tagline="Objectives & OKRs"
      description="Define quarterly outcomes, align teams, and track progress from a single workspace view."
      sectionHeading="Highlights"
    >
      <div className="max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Progress</p>
          <DualProgressBar p1={48} p2={72} ariaLabelP1="Metric A" ariaLabelP2="Metric B" />
        </div>
        <div className="space-y-4">
          <WorkspaceAnnouncementRow title="Q1 OKR draft — review by leadership" />
          <WorkspaceAnnouncementRow title="Team goal sync — weekly cadence" />
        </div>
      </div>
    </WorkspaceSectionPage>
  );
}
