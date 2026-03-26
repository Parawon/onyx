import { GoalsEditorSection } from "@/components/editor/goals-editor-section";

export default function GoalsPage() {
  return (
    <div className="flex flex-col bg-background">
      <header className="shrink-0 px-12 pt-12">
        <h1 className="mb-4 text-[3.5rem] font-extrabold leading-[0.9] tracking-tighter text-white">
          Goals
        </h1>
        <div className="border-t border-zinc-800 pt-8">
          <div className="flex items-center gap-4">
            <div className="h-1 w-8 rounded-full bg-sky-500/30" />
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-400">Objectives & OKRs</p>
          </div>
        </div>
      </header>
      <div className="w-full">
        <GoalsEditorSection />
      </div>
    </div>
  );
}