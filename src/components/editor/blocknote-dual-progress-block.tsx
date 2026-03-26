"use client";

import { createReactBlockSpec } from "@blocknote/react";

import { DualProgressBlockView } from "@/components/goals/dual-progress-block-view";

/**
 * BlockNote block: stacked dual metrics using {@link DualProgressBar}.
 * Insert from the slash menu as “Dual progress”, or via `insertBlocks` / `updateBlock`.
 */
export const dualProgressBlock = createReactBlockSpec(
  {
    type: "dualProgress",
    propSchema: {
      p1: { default: 50 },
      p2: { default: 50 },
      /** Set true when inserting from slash menu; view opens dialog then clears. */
      openPrompt: { default: false, type: "boolean" },
    },
    content: "none",
  },
  {
    /** Let clicks hit our controls instead of ProseMirror moving the caret / “next line”. */
    meta: { selectable: false },
    render: ({ block, editor }) => (
      <DualProgressBlockView
        block={block}
        editor={editor}
        p1={block.props.p1}
        p2={block.props.p2}
        openPrompt={block.props.openPrompt}
      />
    ),
  },
);
