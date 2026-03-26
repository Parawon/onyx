"use client";

import { mergeCSSClasses } from "@blocknote/core";
import {
  useComponentsContext,
  useDictionary,
  type DefaultReactSuggestionItem,
  type SuggestionMenuProps,
} from "@blocknote/react";
import { type JSX, useMemo } from "react";

/**
 * Same behavior as BlockNote’s internal `SuggestionMenu` (not exported from the package).
 * Kept in-repo so we can wrap it in a scroll container.
 */
function BlockNoteSuggestionMenuInner<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>,
) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { items, loadingState, selectedIndex, onItemClick } = props;

  const loader =
    loadingState === "loading-initial" || loadingState === "loading" ? (
      <Components.SuggestionMenu.Loader className="bn-suggestion-menu-loader" />
    ) : null;

  const renderedItems = useMemo<JSX.Element[]>(() => {
    let currentGroup: string | undefined = undefined;
    const renderedItems: JSX.Element[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        renderedItems.push(
          <Components.SuggestionMenu.Label
            className="bn-suggestion-menu-label"
            key={currentGroup}
          >
            {currentGroup}
          </Components.SuggestionMenu.Label>,
        );
      }

      renderedItems.push(
        <Components.SuggestionMenu.Item
          className={mergeCSSClasses(
            "bn-suggestion-menu-item",
            item.size === "small" ? "bn-suggestion-menu-item-small" : "",
          )}
          item={item}
          id={`bn-suggestion-menu-item-${i}`}
          isSelected={i === selectedIndex}
          key={item.title}
          onClick={() => onItemClick?.(item)}
        />,
      );
    }

    return renderedItems;
  }, [Components, items, onItemClick, selectedIndex]);

  return (
    <Components.SuggestionMenu.Root id="bn-suggestion-menu" className="bn-suggestion-menu">
      {renderedItems}
      {renderedItems.length === 0 &&
        (props.loadingState === "loading" || props.loadingState === "loaded") && (
          <Components.SuggestionMenu.EmptyItem className="bn-suggestion-menu-item">
            {dict.suggestion_menu.no_items_title}
          </Components.SuggestionMenu.EmptyItem>
        )}
      {loader}
    </Components.SuggestionMenu.Root>
  );
}

/**
 * Slash menu list with a definite max height and overflow scroll so long lists are fully reachable.
 */
export function ScrollableSuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>,
) {
  return (
    <div
      className="onyx-slash-menu-scroll min-h-0 w-full max-w-[min(100vw-1rem,24rem)] flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]"
      style={{ maxHeight: "min(72vh, calc(100dvh - 4rem))" }}
    >
      <BlockNoteSuggestionMenuInner {...props} />
    </div>
  );
}
