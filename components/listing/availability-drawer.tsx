"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

const DISMISS_THRESHOLD = 80; // px of downward drag before the sheet closes

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

/**
 * Mobile-only bottom sheet for the availability panel. Above lg it collapses to a
 * plain wrapper so the panel sits in the cabin page grid exactly as before.
 *
 * The panel is rendered ONCE and only repositioned, never remounted — closing the
 * sheet must not discard a half-filled alert form, a date selection, or the
 * alerts fetch. That's why this hides via transform rather than conditional
 * rendering.
 */
export default function AvailabilityDrawer({ open, onOpenChange, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragY = useRef(0);
  // True while our own history entry is on the stack, so we only call back()
  // for entries we pushed.
  const pushedEntry = useRef(false);

  // Closing always routes through history so the hardware back button, the edge
  // swipe, the X and the scrim all take the same path and leave no stray entry.
  const requestClose = useCallback(() => {
    if (pushedEntry.current) {
      window.history.back();
    } else {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ emberDrawer: true }, "");
    pushedEntry.current = true;

    function onPop() {
      pushedEntry.current = false;
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

  // Swipe-down on the handle. Transform is written to the node rather than via
  // style={{}}, matching how the field popovers apply measured values.
  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null || !sheetRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta <= 0) return;
    dragY.current = delta;
    sheetRef.current.style.transform = `translateY(${delta}px)`;
    sheetRef.current.style.transition = "none";
  }
  function onTouchEnd() {
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transform = "";
      sheet.style.transition = "";
    }
    if (dragY.current > DISMISS_THRESHOLD) requestClose();
    dragY.current = 0;
    dragStartY.current = null;
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
        className={`lg:hidden fixed inset-x-0 top-0 h-drawer-top z-40 bg-night/70 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Availability"
        aria-hidden={!open}
        className={`fixed inset-x-0 top-drawer-top bottom-tab-bar z-40 flex flex-col bg-evergreen rounded-t-2xl px-5 pb-5 transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-y-0 lg:rounded-none lg:bg-transparent lg:p-0 lg:transition-none ${
          open
            ? "translate-y-0"
            : "translate-y-full invisible pointer-events-none lg:visible lg:pointer-events-auto"
        }`}
      >
        {/* Drag handle: the grab target, and the sheet's only visual top edge. */}
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
