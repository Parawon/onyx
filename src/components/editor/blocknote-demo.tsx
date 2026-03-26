"use client";

import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { useMemo } from "react";

import { onyxBlockNoteSchema } from "./blocknote-schema";
import { createOnyxSlashMenuGetItems } from "./onyx-blocknote-slash-menu";
import { onyxSlashMenuFloatingOptions } from "./onyx-slash-menu-floating";
import { ScrollableSuggestionMenu } from "./scrollable-suggestion-menu";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

/** Ephemeral BlockNote surface for demos (no persistence). */
export function BlockNoteDemo() {
  const editor = useCreateBlockNote({
    schema: onyxBlockNoteSchema,
  });

  const slashMenuItems = useMemo(() => createOnyxSlashMenuGetItems(editor), [editor]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Demo editor</p>
      <div className="min-h-[220px] [&_.bn-editor]:min-h-[200px]">
        <BlockNoteView editor={editor} theme="dark" slashMenu={false}>
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={slashMenuItems}
            floatingUIOptions={onyxSlashMenuFloatingOptions}
            suggestionMenuComponent={ScrollableSuggestionMenu}
          />
        </BlockNoteView>
      </div>
    </div>
  );
}
