"use client";

import type { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import {
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { onyxBlockNoteSchema } from "./blocknote-schema";
import { GoalsEditorScopeProvider } from "./goals-editor-scope-context";
import { useEditorSaveState } from "./editor-save-state-provider";
import { createOnyxSlashMenuGetItems } from "./onyx-blocknote-slash-menu";
import { getOnyxSlashMenuFloatingOptions } from "./onyx-slash-menu-floating";
import { ScrollableSuggestionMenu } from "./scrollable-suggestion-menu";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

/** Goals main page uses `"main"`; sub-pages use the URL slug string. */
export type GoalEditorScope = string;

export type BlockNoteCanvasProps = {
  initialContent: string;
} & (
  | { kind: "document"; documentId: Id<"documents"> }
  | { kind: "goals"; goalsScope: GoalEditorScope }
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
  const goalsScope = kind === "goals" ? props.goalsScope : undefined;
  const updateDocument = useMutation(api.documents.update);
  const updateGoalsContent = useMutation(api.goals.updateContent);
  const syncCalendarFromGoalsDoc = useMutation(api.calendarEvents.syncFromGoalsDocument);
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

  const [slashMenuFloatingOptions, setSlashMenuFloatingOptions] = useState(
    getOnyxSlashMenuFloatingOptions,
  );
  useLayoutEffect(() => {
    setSlashMenuFloatingOptions(getOnyxSlashMenuFloatingOptions());
  }, []);

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
    goalsScope,
    kind,
    markError,
    markSaved,
    markSaving,
    serializedContent,
    setAutosaveVisible,
    updateDocument,
    updateGoalsContent,
    syncCalendarFromGoalsDoc,
    goalsScope,
  ]);

  const editorTree = (
    <BlockNoteView
      editor={editor}
      theme="dark"
      slashMenu={false}
      sideMenu={false}
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
      <SideMenuController
        floatingUIOptions={{
          useFloatingOptions: {
            placement: "right-start",
          },
          elementProps: {
            style: { zIndex: 50 },
          },
        }}
      />
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={slashMenuItems}
        floatingUIOptions={slashMenuFloatingOptions}
        suggestionMenuComponent={ScrollableSuggestionMenu}
      />
    </BlockNoteView>
  );

  return (
    <div className="bn-onyx-editor relative z-0 w-full min-h-0">
      {kind === "goals" && goalsScope != null ? (
        <GoalsEditorScopeProvider scope={goalsScope}>{editorTree}</GoalsEditorScopeProvider>
      ) : (
        editorTree
      )}
    </div>
  );
};
