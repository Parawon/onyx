import { GoalsEditorSection } from "@/components/editor/goals-editor-section";
import { GoalsPageHeader } from "@/components/goals/goals-page-header";

export default function GoalsMarketingPage() {
  return (
    <div className="flex flex-col bg-background">
      <GoalsPageHeader suffix="Marketing" />
      <div className="w-full">
        <GoalsEditorSection scope="marketing" />
      </div>
    </div>
  );
}
