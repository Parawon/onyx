"use client";

import { DashboardHomeContent } from "@/components/dashboard/dashboard-home-content";
import { DashboardDescription } from "@/components/dashboard/dashboard-description";
import { WorkspaceSectionPage } from "@/components/workspace/workspace-section-page";

const COMPANY_NAME = "BuilderLab";

export default function HomePage() {
  return (
    <WorkspaceSectionPage
      title={COMPANY_NAME}
      tagline="Strategic overview"
      description={<DashboardDescription />}
    >
      <DashboardHomeContent />
    </WorkspaceSectionPage>
  );
}
