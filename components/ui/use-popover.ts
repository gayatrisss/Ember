"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Measurement has to happen before paint, otherwise the popover renders in its
 * default position, the effect corrects it, and you see the jump. useLayoutEffect
 * runs synchronously after DOM mutation but before the browser paints, so the
 * first frame the user sees is already correct. It doesn't exist during SSR, so
 * fall back to useEffect on the server to avoid React's warning.
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const GAP = 12; // breathing room between the popover and adjacent chrome
const MIN_HEIGHT = 120; // never cap a scrollable popover below this

type Anchor = RefObject<HTMLElement | null>;
type Placement = "top" | "bottom";

/**
 * The two pieces of fixed chrome a popover must not slide under: the mobile tab
 * bar and the desktop top nav. Each is `display: none` at the breakpoint where it
 * doesn't apply, so a hidden or absent element measures 0 and this stays
 * branch-free rather than duplicating the breakpoint logic in JS.
 */
function reservedChrome() {
  const tabBar = document.querySelector<HTMLElement>("[data-tab-bar]");
  const topNav = document.querySelector<HTMLElement>("[data-top-nav]");
  return {
    below: (tabBar?.getBoundingClientRect().height ?? 0) + GAP,
    above: (topNav?.getBoundingClientRect().height ?? 0) + GAP,
  };
}

function watchViewport(measure: () => void) {
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("scroll", measure, { passive: true });
  return () => {
    window.removeEventListener("resize", measure);
    window.removeEventListener("scroll", measure);
  };
}

/**
 * Caps a *scrollable* popover to the room below its anchor. For content that can
 * be truncated without losing meaning, like a result list. Writes to the node via
 * ref rather than returning a value for `style={{}}`, which conventions rule out.
 */
export function usePopoverMaxHeight(anchorRef: Anchor, popoverRef: Anchor, open: boolean) {
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    return watchViewport(() => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const available =
        window.innerHeight - anchor.getBoundingClientRect().bottom - reservedChrome().below;
      popover.style.maxHeight = `${Math.max(MIN_HEIGHT, available)}px`;
    });
  }, [open, anchorRef, popoverRef]);
}

/**
 * Picks whether a *fixed-height* popover opens downward or upward. For content
 * that has to stay whole — the calendar must show an unbroken month, so capping
 * and scrolling it would split the grid. Prefers opening down, and flips up only
 * when it doesn't fit below and there is genuinely more room above.
 */
export function usePopoverFlip(
  anchorRef: Anchor,
  popoverRef: Anchor,
  open: boolean
): Placement {
  const [placement, setPlacement] = useState<Placement>("bottom");

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    return watchViewport(() => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;

      const rect = anchor.getBoundingClientRect();
      const reserved = reservedChrome();
      const height = popover.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom - reserved.below;
      const spaceAbove = rect.top - reserved.above;

      const next: Placement =
        height > spaceBelow && spaceAbove > spaceBelow ? "top" : "bottom";
      setPlacement((prev) => (prev === next ? prev : next));
    });
  }, [open, anchorRef, popoverRef]);

  return placement;
}
