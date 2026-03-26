import {
  WorkspaceAnnouncementRow,
  WorkspaceSectionPage,
} from "@/components/workspace/workspace-section-page";

export default function FinancePage() {
  return (
    <WorkspaceSectionPage
      title="Finance"
      tagline="Budget & reporting"
      description="Budgets, forecasts, and financial snapshots. Connect accounting tools when you are ready to surface live data."
      sectionHeading="Snapshots"
    >
      <div className="max-w-3xl space-y-4">
        <WorkspaceAnnouncementRow title="Monthly close checklist — template" />
        <WorkspaceAnnouncementRow title="Runway & burn — placeholder summary" />
      </div>
    </WorkspaceSectionPage>
  );
}
