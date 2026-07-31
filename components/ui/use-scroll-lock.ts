"use client";

import { useIsomorphicLayoutEffect } from "@/components/ui/use-popover";

/**
 * Freezes the page behind an overlay.
 *
 * Uses `position: fixed` on the body rather than `overflow: hidden`, because iOS
 * Safari happily rubber-band scrolls a body that is merely overflow-hidden. The
 * cost of that approach is that fixing the body scrolls it to the top, so the
 * current offset is captured, applied as a negative `top`, and restored on
 * unlock — otherwise closing the drawer would jump the user back to the top of
 * the cabin page.
 *
 * Runs before paint so the lock can't flash a frame of scrollable page.
 */
export function useScrollLock(locked: boolean) {
  useIsomorphicLayoutEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
