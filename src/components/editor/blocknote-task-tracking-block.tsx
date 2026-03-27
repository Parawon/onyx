"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import { TaskTrackingTableBlockView } from "@/components/editor/task-tracking-table-block-view";
import { useGoalsEditorScope } from "@/components/editor/goals-editor-scope-context";

/* BlockNote’s editor/block generics are instantiated per schema; `any` keeps this wrapper simple. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function TaskTrackingTableBlockInner({
  block,
  editor,
}: {
  /** BlockNote passes the full block here (not a bare id). */
  block: { props: { title: string; tasksJSON: string; columnWidthsJSON: string } };
  editor: BlockNoteEditor<any, any, any>;
}) {
  const goalsScope = useGoalsEditorScope();
  return (
    <TaskTrackingTableBlockView
      block={block as unknown as Parameters<BlockNoteEditor<any, any, any>["updateBlock"]>[0]}
      editor={editor}
      title={block.props.title}
      tasksJSON={block.props.tasksJSON}
      columnWidthsJSON={block.props.columnWidthsJSON}
      goalsScope={goalsScope ?? undefined}
    />
  );
}

/**
 * BlockNote block: task tracking table with JSON-backed rows.
 * Insert from the slash menu as “Task tracking table”.
 */
export const taskTrackingTableBlock = createReactBlockSpec(
  {
    type: "taskTrackingTable",
    propSchema: {
      title: { default: "Project Tasks" },
      /** JSON string: TaskTrackingRow[] */
      tasksJSON: { default: "[]" },
      /** JSON string: (number | "1fr")[] for 8 columns; empty → defaults (Description column is `1fr`). */
      columnWidthsJSON: { default: "" },
    },
    content: "none",
  },
  {
    meta: { selectable: false },
    render: ({ block, editor }) => (
      <TaskTrackingTableBlockInner block={block} editor={editor} />
    ),
  },
);
