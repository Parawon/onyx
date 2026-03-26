import { DocumentsIndex } from "@/components/documents/documents-index";
import { WorkspaceSectionPage } from "@/components/workspace/workspace-section-page";

export default function DocumentsIndexPage() {
  return (
    <WorkspaceSectionPage
      title="Notes"
      tagline="Knowledge base"
      description="Capture ideas, briefs, and working documents. Open a note to edit in the BlockNote editor."
      sectionHeading="Your notes"
    >
      <DocumentsIndex />
    </WorkspaceSectionPage>
  );
}
