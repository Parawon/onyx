"use client";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

export function DashboardEditorBlock() {
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Start writing...",
      },
    ],
  });

  return (
    <div className="bn-onyx-editor p-0">
      <BlockNoteView editor={editor} theme="dark" />
    </div>
  );
}

