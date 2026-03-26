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
      <div className="max-w-3xl space-y-4">
        <WorkspaceAnnouncementRow title="Q1 OKR draft — review by leadership" />
        <WorkspaceAnnouncementRow title="Team goal sync — weekly cadence" />
      </div>
    </WorkspaceSectionPage>
  );
}
