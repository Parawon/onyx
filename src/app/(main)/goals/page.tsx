import { GoalsDemoSection } from "./goals-demo-section";
import { WorkspaceSectionPage } from "@/components/workspace/workspace-section-page";

export default function GoalsPage() {
  return (
    <WorkspaceSectionPage
      title="Goals"
      tagline="Objectives & OKRs"
      description="Define quarterly outcomes, align teams, and track progress from a single workspace view."
      sectionHeading="Progress"
    >
      <GoalsDemoSection />
    </WorkspaceSectionPage>
  );
}
