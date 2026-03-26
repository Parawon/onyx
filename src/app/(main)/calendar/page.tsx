import {
  WorkspaceAnnouncementRow,
  WorkspaceSectionPage,
} from "@/components/workspace/workspace-section-page";

export default function CalendarPage() {
  return (
    <WorkspaceSectionPage
      title="Calendar"
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
