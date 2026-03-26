import {
  WorkspaceAnnouncementRow,
  WorkspaceSectionPage,
} from "@/components/workspace/workspace-section-page";

export default function ManagementPage() {
  return (
    <WorkspaceSectionPage
      title="Management"
      tagline="People & operations"
      description="Org structure, staffing, and operational cadence. Use this area for leadership workflows as you grow."
      sectionHeading="Priorities"
    >
      <div className="max-w-3xl space-y-4">
        <WorkspaceAnnouncementRow title="Headcount planning — next cycle" />
        <WorkspaceAnnouncementRow title="1:1 notes & performance — central hub (coming soon)" />
      </div>
    </WorkspaceSectionPage>
  );
}
