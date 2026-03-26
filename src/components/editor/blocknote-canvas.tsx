"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import { useMutation } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

type BlockNoteCanvasProps = {
  documentId: Id<"documents">;
  initialContent: string;
};

const parseBlocks = (content: string): PartialBlock[] | undefined => {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return undefined;
    }
    return parsed as PartialBlock[];
  } catch {
    return undefined;
  }
};

export const BlockNoteCanvas = ({
  documentId,
  initialContent,
}: BlockNoteCanvasProps) => {
  const updateDocument = useMutation(api.documents.update);
  const initialBlocks = useMemo(() => parseBlocks(initialContent), [initialContent]);
  const [serializedContent, setSerializedContent] = useState(initialContent);

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (serializedContent !== initialContent) {
        void updateDocument({
          id: documentId,
          content: serializedContent,
        });
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [documentId, initialContent, serializedContent, updateDocument]);

  return (
    <BlockNoteView
      editor={editor}
      onChange={() => setSerializedContent(JSON.stringify(editor.document))}
    />
  );
};
