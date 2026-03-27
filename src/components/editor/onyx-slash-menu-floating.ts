import { autoPlacement, offset, shift, size } from "@floating-ui/react";
import type { Boundary } from "@floating-ui/dom";
import type { FloatingUIOptions } from "@blocknote/react";

/** `DashboardTopBar` is `h-20` (80px); used when `#onyx-main` is not available (SSR). */
const SLASH_MENU_VIEWPORT_TOP_PADDING = 88;

const slashMenuViewportPadding = {
  top: SLASH_MENU_VIEWPORT_TOP_PADDING,
  left: 10,
  right: 10,
  bottom: 10,
} as const;

const tightPadding = { top: 8, right: 8, bottom: 8, left: 8 } as const;

/** Scrollable app `<main>` (below the top bar) — keep the slash menu inside this rect. */
export const ONYX_MAIN_SCROLL_ID = "onyx-main";

function slashMenuBoundary(): Boundary {
  if (typeof document === "undefined") {
    return "clippingAncestors";
  }
  return document.getElementById(ONYX_MAIN_SCROLL_ID) ?? "clippingAncestors";
}

/**
 * Slash menu + BlockNote `GenericPopover` options.
 * Re-call on the client after mount so `boundary` resolves to `#onyx-main`.
 */
export function getOnyxSlashMenuFloatingOptions(): FloatingUIOptions {
  const mainEl = slashMenuBoundary();
  const useMainBoundary = mainEl !== "clippingAncestors";

  /** With a real `<main>` boundary, the menu is already below the header; tight padding is enough. */
  const placementPadding = useMainBoundary ? tightPadding : slashMenuViewportPadding;

  return {
    elementProps: {
      className: "onyx-bn-slash-popover-shell",
      style: {
        flexDirection: "column",
        alignItems: "stretch",
        minHeight: 0,
        overflow: "hidden",
        /** Below app top bar (`z-[100]`); above editor content (`relative z-0`). */
        zIndex: 90,
      },
    },
    useFloatingOptions: {
      middleware: [
        offset(10),
        autoPlacement({
          allowedPlacements: ["bottom-start", "top-start"],
          padding: placementPadding,
          boundary: mainEl,
        }),
        shift({
          padding: placementPadding,
          boundary: mainEl,
        }),
        size({
          apply({ elements, availableHeight }) {
            elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
          },
          padding: placementPadding,
          boundary: mainEl,
        }),
      ],
    },
  };
}

/** @deprecated SSR snapshot; prefer `getOnyxSlashMenuFloatingOptions()` in client code. */
export const onyxSlashMenuFloatingOptions: FloatingUIOptions =
  getOnyxSlashMenuFloatingOptions();
