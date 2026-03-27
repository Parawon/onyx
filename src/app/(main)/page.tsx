import { DashboardHomeContent } from "@/components/dashboard/dashboard-home-content";
import { WorkspaceSectionPage } from "@/components/workspace/workspace-section-page";

const COMPANY_NAME = "BuilderLab";

export default function HomePage() {
  return (
    <WorkspaceSectionPage
      title={COMPANY_NAME}
      tagline="Strategic overview"
      description="Precision management and architectural oversight for the modern enterprise. Your operational velocity, visualized."
      sectionHeading="Editor"
    >
      <DashboardHomeContent />
    </WorkspaceSectionPage>
  );
}
