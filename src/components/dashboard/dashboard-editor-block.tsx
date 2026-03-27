"use client";

import { BlockNoteCanvas } from "@/components/editor/blocknote-canvas";

export function DashboardEditorBlock() {
  return (
    <div className="p-0">
      <BlockNoteCanvas kind="local" initialContent='[{"type":"paragraph"}]' />
    </div>
  );
}

