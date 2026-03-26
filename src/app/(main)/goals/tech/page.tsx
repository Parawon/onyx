import { GoalsEditorSection } from "@/components/editor/goals-editor-section";
import { GoalsPageHeader } from "@/components/goals/goals-page-header";

export default function GoalsTechPage() {
  return (
    <div className="flex flex-col bg-background">
      <GoalsPageHeader suffix="Tech" />
      <div className="w-full">
        <GoalsEditorSection scope="tech" />
      </div>
    </div>
  );
}
