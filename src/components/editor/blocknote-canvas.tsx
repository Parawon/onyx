"use client";

import type { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { onyxBlockNoteSchema } from "./blocknote-schema";
import { useEditorSaveState } from "./editor-save-state-provider";
import { createOnyxSlashMenuGetItems } from "./onyx-blocknote-slash-menu";

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
  const { markError, markSaved, markSaving } = useEditorSaveState();
  const initialBlocks = useMemo(() => parseBlocks(initialContent), [initialContent]);
  const [serializedContent, setSerializedContent] = useState(initialContent);

  const editor = useCreateBlockNote({
    schema: onyxBlockNoteSchema,
    initialContent: initialBlocks,
  });

  const slashMenuItems = useMemo(() => createOnyxSlashMenuGetItems(editor), [editor]);

  useEffect(() => {
    if (serializedContent === initialContent) {
      return;
    }

    markSaving();
    const timeoutId = window.setTimeout(() => {
      void updateDocument({
        id: documentId,
        content: serializedContent,
      })
        .then(() => {
          markSaved();
        })
        .catch(() => {
          markError();
        });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    documentId,
    initialContent,
    markError,
    markSaved,
    markSaving,
    serializedContent,
    updateDocument,
  ]);

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      slashMenu={false}
      onChange={() => setSerializedContent(JSON.stringify(editor.document))}
    >
      <SuggestionMenuController triggerCharacter="/" getItems={slashMenuItems} />
    </BlockNoteView>
  );
};
