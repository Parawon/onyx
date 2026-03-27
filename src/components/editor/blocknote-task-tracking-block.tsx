"use client";

import { createReactBlockSpec } from "@blocknote/react";

import { TaskTrackingTableBlockView } from "@/components/editor/task-tracking-table-block-view";

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
      /** JSON string: number[] of pixel widths for 8 columns (optional). */
      columnWidthsJSON: { default: "" },
    },
    content: "none",
  },
  {
    meta: { selectable: false },
    render: ({ block, editor }) => (
      <TaskTrackingTableBlockView
        block={block}
        editor={editor}
        title={block.props.title}
        tasksJSON={block.props.tasksJSON}
        columnWidthsJSON={block.props.columnWidthsJSON}
      />
    ),
  },
);
