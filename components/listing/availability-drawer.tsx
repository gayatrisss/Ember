"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const DISMISS_THRESHOLD = 80; // downward drag before the sheet closes or collapses
const EXPAND_THRESHOLD = 32; // upward drag before it snaps to full height

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

/**
 * Mobile-only bottom sheet for the availability panel. Above lg it collapses to a
 * plain wrapper so the panel sits in the cabin page grid exactly as before.
 *
 * Three positions on one transform axis — dismissed, rest, and dragged-to-full.
 * The sheet is anchored at its full height and only ever moved with translateY,
 * so every transition is GPU-friendly and the drag maps 1:1 to the snap targets.
 *
 * The panel is rendered ONCE and only repositioned, never remounted — closing the
 * sheet must not discard a half-filled alert form, a date selection, or the
 * alerts fetch.
 */
export default function AvailabilityDrawer({ open, onOpenChange, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragY = useRef(0);
  const pushedEntry = useRef(false);
  const [expanded, setExpanded] = useState(false);

  // The two resting insets, read from the tokens so the drag can't drift from CSS.
  function insets() {
    const styles = getComputedStyle(document.documentElement);
    return {
      rest: parseFloat(styles.getPropertyValue("--spacing-drawer-top")) || 72,
      full: parseFloat(styles.getPropertyValue("--spacing-drawer-full")) || 16,
    };
  }

  // Reset happens on the close paths themselves rather than in an effect, so a
  // reopened drawer always starts at rest.
  const requestClose = useCallback(() => {
    if (pushedEntry.current) {
      window.history.back();
    } else {
      setExpanded(false);
      onOpenChange(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ emberDrawer: true }, "");
    pushedEntry.current = true;

    function onPop() {
      pushedEntry.current = false;
      setExpanded(false);
      onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }

    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange, requestClose]);

  // The drag moves `top`, so the sheet grows and shrinks against a pinned bottom
  // rather than sliding as a block. Written to the node rather than via
  // style={{}}, matching how the field popovers apply measured values.
  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null || !sheetRef.current) return;
    const { rest, full } = insets();
    const base = expanded ? full : rest;
    const delta = e.touches[0].clientY - dragStartY.current;
    // Can't rise above the full inset; downward is capped so the sheet doesn't
    // collapse to nothing before the release decides what to do.
    const next = Math.min(rest + 200, Math.max(full, base + delta));

    dragY.current = delta;
    sheetRef.current.style.transition = "none";
    sheetRef.current.style.top = `${next}px`;
  }

  function onTouchEnd() {
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.top = "";
      sheet.style.transition = "";
    }
    const delta = dragY.current;
    dragY.current = 0;
    dragStartY.current = null;

    if (delta > DISMISS_THRESHOLD) {
      // From full, a downward drag collapses to rest before it can dismiss.
      if (expanded) setExpanded(false);
      else requestClose();
      return;
    }
    if (delta < -EXPAND_THRESHOLD) setExpanded(true);
  }

  // Open positions differ only by `top`; dismissal is the one transform.
  function position() {
    if (!open) return "top-drawer-top drawer-hidden";
    return expanded ? "top-drawer-full" : "top-drawer-top";
  }

  return (
    <>
      {/* Scrim covers only the strip of page above the sheet. Deliberately not the
          tab bar, which stays lit and tappable while the drawer is open. */}
      <button
        type="button"
        aria-label="Close availability"
        tabIndex={open ? 0 : -1}
        onClick={requestClose}
        className={`lg:hidden fixed inset-x-0 top-0 z-40 bg-night/70 transition-all duration-200 ${
          expanded ? "h-drawer-full" : "h-drawer-top"
        } ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Availability"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-tab-bar z-40 flex flex-col bg-evergreen rounded-t-2xl px-5 pb-5 transition-all duration-300 ease-out lg:static lg:z-auto lg:rounded-none lg:bg-transparent lg:p-0 lg:transition-none ${position()} ${
          open ? "" : "invisible pointer-events-none lg:visible lg:pointer-events-auto"
        }`}
      >
        {/* Drag handle: up to expand, down to collapse then dismiss. Also the
            sheet's only visual top edge. */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="lg:hidden shrink-0 -mx-5 px-5 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-wax/25" />
        </div>

        <button
          type="button"
          onClick={requestClose}
          aria-label="Close availability"
          className="lg:hidden absolute right-4 top-4 z-10 grid size-6 place-items-center text-wax hover:text-ember transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex-1 min-h-0 lg:contents">{children}</div>
      </div>
    </>
  );
}
