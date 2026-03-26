import { createReactBlockSpec } from "@blocknote/react";

import { DualProgressBar } from "@/components/goals/dual-progress-bar";

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
    },
    content: "none",
  },
  {
    render: ({ block }) => (
      <DualProgressBar p1={block.props.p1} p2={block.props.p2} className="max-w-xl py-1" />
    ),
  },
);
