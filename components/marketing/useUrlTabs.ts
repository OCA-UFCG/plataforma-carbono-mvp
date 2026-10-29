"use client";

import { useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";

// Keyboard and address handling for a tab strip whose open tab lives in the
// address, after the WAI-ARIA tabs pattern (automatic activation, arrow keys
// with wrap-around, Home/End, roving tabindex): the Comunicação tabs and the
// Glossário's terms. The address is the only state: the caller reads the open
// tab back from useSearchParams, and `select` only writes it with
// replaceState, so switching adds no history entry and a link back to the
// bare page (the header's) opens the first tab again.
export function useUrlTabs<T extends string>(ids: readonly T[], href: (current: URL, id: T) => string) {
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  // `null`, not window.history.state: Next.js copies its own entry state over,
  // and skips syncing useSearchParams for a call that already carries it.
  function select(id: T) {
    window.history.replaceState(null, "", href(new URL(window.location.href), id));
  }

  function selectAndFocus(index: number) {
    const id = ids[index];
    select(id);
    tabRefs.current[id]?.focus();
  }

  // The index comes from the tab that got the key, not from the open tab:
  // Next.js applies a replaceState inside a transition, so a second key press
  // before it commits would still see the old tab and be lost. Focus moves
  // synchronously, so the focused tab is always the latest one.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const count = ids.length;
    const current = ids.findIndex((id) => tabRefs.current[id] === event.currentTarget);

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        selectAndFocus((current + 1) % count);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectAndFocus((current - 1 + count) % count);
        break;
      case "Home":
        event.preventDefault();
        selectAndFocus(0);
        break;
      case "End":
        event.preventDefault();
        selectAndFocus(count - 1);
        break;
      default:
        break;
    }
  }

  function tabRef(id: T) {
    return (el: HTMLButtonElement | null) => {
      tabRefs.current[id] = el;
    };
  }

  // Stable, so an effect can depend on it.
  const tab = useCallback((id: T) => tabRefs.current[id], []);

  return { select, handleKeyDown, tabRef, tab };
}
