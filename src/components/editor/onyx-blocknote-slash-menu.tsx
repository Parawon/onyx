"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import {
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BarChart2, Link2, TableProperties } from "lucide-react";

/** Slash menu items for the Onyx schema (default BlockNote items + Dual progress). */
export type BacklinkTarget = {
  label: string;
  href: string;
  aliases?: string[];
};

/** Slash menu items for the Onyx schema (default BlockNote items + custom blocks + backlinks). */
export function createOnyxSlashMenuGetItems(
  editor: BlockNoteEditor<any, any, any>,
  backlinkTargets: BacklinkTarget[],
  onOpenBacklinkPicker: () => void,
) {
  return async (query: string) => {
    const defaults = getDefaultReactSlashMenuItems(editor);
    const dualProgressItem: DefaultReactSuggestionItem = {
      title: "Dual progress",
      subtext: "Stacked metrics (p1 vs p2)",
      group: "Onyx",
      aliases: ["progress", "dual", "metrics", "bar"],
      onItemClick: () => {
        const inserted = insertOrUpdateBlockForSlashMenu(editor, {
          type: "dualProgress",
          props: { p1: 50, p2: 50, openPrompt: true },
        });
        // Re-apply after cursor moves / internal updates so the node view sees `openPrompt`.
        window.setTimeout(() => {
          editor.updateBlock(inserted, { props: { openPrompt: true } });
        }, 0);
      },
      icon: <BarChart2 className="size-[18px]" aria-hidden />,
    };
    const taskTrackingItem: DefaultReactSuggestionItem = {
      title: "Task tracking table",
      subtext: "Project tasks with status, urgency, owners",
      group: "Onyx",
      aliases: ["tasks", "table", "tracker", "project", "okr"],
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "taskTrackingTable",
          props: { title: "Project Tasks", tasksJSON: "[]", columnWidthsJSON: "" },
        });
      },
      icon: <TableProperties className="size-[18px]" aria-hidden />,
    };
    const backlinkPickerItem: DefaultReactSuggestionItem = {
      title: "Backlink (link picker)",
      subtext: `Search ${backlinkTargets.length} notes/pages and insert an internal link`,
      group: "Backlinks",
      aliases: ["backlink", "link", "page", "note", "wiki", "reference"],
      onItemClick: () => {
        onOpenBacklinkPicker();
      },
      icon: <Link2 className="size-[18px]" aria-hidden />,
    };
    return filterSuggestionItems(
      [dualProgressItem, taskTrackingItem, backlinkPickerItem, ...defaults],
      query,
    );
  };
}
