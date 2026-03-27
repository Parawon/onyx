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
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
      <BlockNoteView editor={editor} theme="dark" />
    </div>
  );
}

