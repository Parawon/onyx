import { GoalsEditorSection } from "@/components/editor/goals-editor-section";
import { GoalsPageHeader } from "@/components/goals/goals-page-header";

export default function GoalsPartnershipPage() {
  return (
    <div className="flex flex-col bg-background">
      <GoalsPageHeader suffix="Partnership" />
      <div className="w-full">
        <GoalsEditorSection scope="partnership" />
      </div>
    </div>
  );
}
