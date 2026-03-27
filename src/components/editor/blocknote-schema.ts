import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { dualProgressBlock } from "./blocknote-dual-progress-block";
import { taskTrackingTableBlock } from "./blocknote-task-tracking-block";

/** Default BlockNote blocks plus Onyx custom blocks (e.g. dual progress). */
export const onyxBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    dualProgress: dualProgressBlock(),
    taskTrackingTable: taskTrackingTableBlock(),
  },
});
