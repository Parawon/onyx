"use client";

import type { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { onyxBlockNoteSchema } from "./blocknote-schema";
import { useEditorSaveState } from "./editor-save-state-provider";
import { createOnyxSlashMenuGetItems } from "./onyx-blocknote-slash-menu";
import { onyxSlashMenuFloatingOptions } from "./onyx-slash-menu-floating";
import { ScrollableSuggestionMenu } from "./scrollable-suggestion-menu";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

export type BlockNoteCanvasProps = {
  initialContent: string;
} & (
  | { kind: "document"; documentId: Id<"documents"> }
  | { kind: "goals" }
);

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

export const BlockNoteCanvas = (props: BlockNoteCanvasProps) => {
  const { initialContent, kind } = props;
  const documentId = kind === "document" ? props.documentId : undefined;
  const updateDocument = useMutation(api.documents.update);
  const updateGoalsContent = useMutation(api.goals.updateContent);
  const {
    markError,
    markSaved,
    markSaving,
    resetAutosaveUiForEdit,
    setAutosaveVisible,
  } = useEditorSaveState();
  const initialBlocks = useMemo(() => parseBlocks(initialContent), [initialContent]);
  const [serializedContent, setSerializedContent] = useState(initialContent);
  /** Last persisted value (or server initial); used to skip autosave when unchanged and to hide autosave UI. */
  const baselineRef = useRef(initialContent);

  useEffect(() => {
    baselineRef.current = initialContent;
  }, [initialContent]);

  const editor = useCreateBlockNote({
    schema: onyxBlockNoteSchema,
    initialContent: initialBlocks,
  });

  const slashMenuItems = useMemo(() => createOnyxSlashMenuGetItems(editor), [editor]);

  useEffect(() => {
    if (serializedContent === baselineRef.current) {
      return;
    }

    markSaving();
    const timeoutId = window.setTimeout(() => {
      const save =
        kind === "document"
          ? updateDocument({ id: documentId!, content: serializedContent })
          : updateGoalsContent({ content: serializedContent });
      void save
        .then(() => {
          baselineRef.current = serializedContent;
          setAutosaveVisible(false);
          markSaved();
        })
        .catch(() => {
          markError();
        });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    documentId,
    kind,
    markError,
    markSaved,
    markSaving,
    serializedContent,
    setAutosaveVisible,
    updateDocument,
    updateGoalsContent,
  ]);

  return (
    <div className="bn-onyx-editor w-full min-h-0">
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        onChange={() => {
          const next = JSON.stringify(editor.document);
          setSerializedContent(next);
          if (next !== baselineRef.current) {
            resetAutosaveUiForEdit();
            setAutosaveVisible(true);
            markSaving();
          }
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={slashMenuItems}
          floatingUIOptions={onyxSlashMenuFloatingOptions}
          suggestionMenuComponent={ScrollableSuggestionMenu}
        />
      </BlockNoteView>
    </div>
  );
};
