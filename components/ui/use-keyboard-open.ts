"use client";

import { useEffect, useState } from "react";

/**
 * iOS announces the software keyboard by shrinking the VISUAL viewport while the
 * layout viewport (`window.innerHeight`) stays exactly where it was. Anything
 * `position: fixed` is pinned to the visual viewport, so a bottom-anchored bar
 * gets lifted to sit directly on top of the keyboard instead of staying at the
 * bottom of the page — which is how the tab bar ends up covering the field the
 * user just tapped.
 *
 * There is no keyboard event on the web, so the height delta is the signal. The
 * browser's own collapsing toolbar also shrinks the visual viewport, by roughly
 * 50-100px; a keyboard plus its accessory bar takes 300px or more. The threshold
 * sits between the two so toolbar collapse never reads as a keyboard.
 */
const KEYBOARD_MIN_HEIGHT = 160;

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    // Absent on older browsers. Without it there is no way to see the keyboard,
    // so stay at the current behaviour rather than guessing from focus events,
    // which fire for non-typing controls too.
    if (!viewport) return;

    function measure() {
      setOpen(window.innerHeight - viewport!.height > KEYBOARD_MIN_HEIGHT);
    }

    measure();
    viewport.addEventListener("resize", measure);
    // Scrolling with the keyboard up moves the visual viewport without resizing
    // it; re-measuring keeps the two in sync if the keyboard closes mid-scroll.
    viewport.addEventListener("scroll", measure);
    return () => {
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
    };
  }, []);

  return open;
}
