import type { FloatingUIOptions } from "@blocknote/react";

/**
 * Floating popover: column flex + min-height 0 so the inner scroll wrapper can shrink
 * and scroll. `overflow: hidden` on the shell avoids double scrollbars with the inner scroller.
 */
export const onyxSlashMenuFloatingOptions: FloatingUIOptions = {
  elementProps: {
    className: "onyx-bn-slash-popover-shell",
    style: {
      flexDirection: "column",
      alignItems: "stretch",
      minHeight: 0,
      overflow: "hidden",
    },
  },
};
