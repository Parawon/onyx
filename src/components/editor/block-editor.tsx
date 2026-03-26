"use client";

import type { PartialBlock } from "@blocknote/core";
import { BlockNoteViewRaw as BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useRef } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";

interface BlockEditorProps {
  documentId: Id<"documents">;
  editable?: boolean;
}

export function BlockEditor({ documentId, editable = true }: BlockEditorProps) {
  const document = useQuery(api.documents.getById, { id: documentId });
  const updateDocument = useMutation(api.documents.update);

  if (document === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-zinc-500">Loading document...</div>
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-zinc-500">Document not found</div>
      </div>
    );
  }

  const initialContent = useMemo(() => parseStoredBlocks(document.content), [document.content]);

  const editor = useCreateBlockNote(
    {
      initialContent,
    },
    [documentId],
  );

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = useCallback(() => {
    if (!editable) return;
    const serialized = JSON.stringify(editor.document);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void updateDocument({ id: documentId, content: serialized });
    }, 800);
  }, [documentId, editable, editor, updateDocument]);

  return (
    <div className="min-h-[400px] w-full">
      <BlockNoteView editor={editor} editable={editable} onChange={onChange} theme="light" />
    </div>
  );
}

function parseStoredBlocks(raw: string): PartialBlock[] | undefined {
  if (!raw || raw === "[]") return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    const safe = parsed.filter(
      (block): block is PartialBlock =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        typeof (block as { type?: unknown }).type === "string",
    );
    return safe.length > 0 ? safe : undefined;
  } catch {
    return undefined;
  }
}