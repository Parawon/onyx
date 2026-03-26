"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  EditorSaveStateProvider,
  useEditorSaveState,
} from "./editor-save-state-provider";

const BlockNoteCanvas = dynamic(
  () => import("./blocknote-canvas").then((mod) => mod.BlockNoteCanvas),
  { ssr: false }
);

type BlockEditorProps = {
  documentId: string;
};

const SaveStatusIndicator = () => {
  const { lastSavedAt, status } = useEditorSaveState();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (status === "saving") {
    return <span className="text-amber-600 dark:text-amber-400">Saving...</span>;
  }

  if (status === "error") {
    return <span className="text-red-600 dark:text-red-400">Save failed</span>;
  }

  if (lastSavedAt) {
    const elapsedSeconds = Math.max(0, Math.floor((now - lastSavedAt) / 1000));
    if (elapsedSeconds < 5) {
      return <span>Saved just now</span>;
    }
    return <span>Saved {elapsedSeconds}s ago</span>;
  }

  return <span>Not saved yet</span>;
};

export const BlockEditor = ({ documentId }: BlockEditorProps) => {
  const document = useQuery(api.documents.getById, {
    id: documentId as Id<"documents">,
  });

  if (document === undefined) {
    return <div className="p-6 text-sm text-zinc-500">Loading editor...</div>;
  }

  if (document === null) {
    return <div className="p-6 text-sm text-red-500">Document not found.</div>;
  }

  return (
    <EditorSaveStateProvider>
      <div className="h-full min-h-0 p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {document.title}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <SaveStatusIndicator />
          </div>
        </div>
        <div className="min-h-[60vh] rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <BlockNoteCanvas documentId={document._id} initialContent={document.content} />
        </div>
      </div>
    </EditorSaveStateProvider>
  );
};
