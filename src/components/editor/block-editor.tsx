"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { EditorSaveStatusIndicator } from "./editor-save-status-indicator";
import { EditorSaveStateProvider } from "./editor-save-state-provider";
import { Button } from "@/components/ui/button";

const BlockNoteCanvas = dynamic(
  () => import("./blocknote-canvas").then((mod) => mod.BlockNoteCanvas),
  { ssr: false }
);

type BlockEditorProps = {
  documentId: string;
};

type EditorHeaderProps = {
  documentId: Id<"documents">;
  title: string;
};

const EditorHeader = ({ documentId, title }: EditorHeaderProps) => {
  const router = useRouter();
  const updateDocument = useMutation(api.documents.update);
  const removeDocument = useMutation(api.documents.remove);
  const [titleDraft, setTitleDraft] = useState(title);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTitleDraft(title);
  }, [title]);

  const saveTitleIfChanged = async () => {
    const trimmedTitle = titleDraft.trim();
    const normalizedTitle = trimmedTitle.length > 0 ? trimmedTitle : "Untitled";
    if (normalizedTitle === title) {
      if (titleDraft !== normalizedTitle) {
        setTitleDraft(normalizedTitle);
      }
      return;
    }
    try {
      await updateDocument({
        id: documentId,
        title: normalizedTitle,
      });
      setTitleDraft(normalizedTitle);
    } catch {
      // Title save failed; body autosave indicator is separate.
    }
  };

  const handleDelete = async () => {
    const approved = window.confirm("Delete this note permanently?");
    if (!approved) {
      return;
    }
    setIsDeleting(true);
    try {
      await removeDocument({ id: documentId });
      router.push("/");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <input
        value={titleDraft}
        onChange={(event) => setTitleDraft(event.target.value)}
        onBlur={() => void saveTitleIfChanged()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        placeholder="Untitled"
        className="w-full max-w-xl rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-700 focus:bg-transparent"
      />
      <div className="flex items-center gap-2">
        <div className="text-xs text-zinc-400">
          <EditorSaveStatusIndicator />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300"
          disabled={isDeleting}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="size-4" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
};

export const BlockEditor = ({ documentId }: BlockEditorProps) => {
  const document = useQuery(api.documents.getById, {
    id: documentId as Id<"documents">,
  });

  if (document === undefined) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background p-6 text-sm text-zinc-400">
        Loading editor...
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background p-6 text-sm text-red-400">
        Document not found.
      </div>
    );
  }

  return (
    <EditorSaveStateProvider>
      <div className="flex min-h-0 flex-1 flex-col bg-background px-6 pb-6 pt-4">
        <EditorHeader documentId={document._id} title={document.title} />
        <div className="relative min-h-0 flex-1">
          <div className="min-h-full w-full pb-40">
            <BlockNoteCanvas
              key={document._id}
              kind="document"
              documentId={document._id}
              initialContent={document.content}
            />
          </div>
        </div>
      </div>
    </EditorSaveStateProvider>
  );
};
