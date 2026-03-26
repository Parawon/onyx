"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  EditorSaveStateProvider,
  useEditorSaveState,
} from "./editor-save-state-provider";
import { Button } from "@/components/ui/button";

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
    return <span className="text-amber-400">Saving...</span>;
  }

  if (status === "error") {
    return <span className="text-red-400">Save failed</span>;
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

type EditorHeaderProps = {
  documentId: Id<"documents">;
  title: string;
};

const EditorHeader = ({ documentId, title }: EditorHeaderProps) => {
  const router = useRouter();
  const updateDocument = useMutation(api.documents.update);
  const removeDocument = useMutation(api.documents.remove);
  const { markError, markSaved, markSaving } = useEditorSaveState();
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
    markSaving();
    try {
      await updateDocument({
        id: documentId,
        title: normalizedTitle,
      });
      markSaved();
      setTitleDraft(normalizedTitle);
    } catch {
      markError();
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
        className="w-full max-w-xl rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-600 focus:bg-zinc-900/50"
      />
      <div className="flex items-center gap-2">
        <div className="text-xs text-zinc-400">
          <SaveStatusIndicator />
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
    return <div className="p-6 text-sm text-zinc-400">Loading editor...</div>;
  }

  if (document === null) {
    return <div className="p-6 text-sm text-red-400">Document not found.</div>;
  }

  return (
    <EditorSaveStateProvider>
      <div className="h-full min-h-0 p-6">
        <EditorHeader documentId={document._id} title={document.title} />
        <div className="min-h-[60vh] rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <BlockNoteCanvas documentId={document._id} initialContent={document.content} />
        </div>
      </div>
    </EditorSaveStateProvider>
  );
};
