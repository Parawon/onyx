"use client";

import dynamic from "next/dynamic";
import { useQuery } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

const BlockNoteCanvas = dynamic(
  () => import("./blocknote-canvas").then((mod) => mod.BlockNoteCanvas),
  { ssr: false }
);

type BlockEditorProps = {
  documentId: string;
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
    <div className="h-full min-h-0 p-6">
      <div className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {document.title}
      </div>
      <div className="min-h-[60vh] rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <BlockNoteCanvas
          key={`${document._id}:${document.content}`}
          documentId={document._id}
          initialContent={document.content}
        />
      </div>
    </div>
  );
};
