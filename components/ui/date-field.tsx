"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { CalendarInput } from "@/components/ui/calendar-input";
import { usePopoverFlip } from "@/components/ui/use-popover";

// A field-styled date-range picker: an input-looking trigger (shares .field-control +
// the placeholder token) that opens a CalendarInput popover. It's a button, not an
// <input> — a picker isn't typeable — so its active states are driven here rather than
// by the input-keyed field CSS. `open` is uncontrolled by default; pass open/onOpenChange
// to control it (e.g. to auto-open after another field is filled).
type DateFieldProps = {
  label: string;
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  placeholder?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const placementClasses = {
  bottom: "top-full mt-1",
  top: "bottom-full mb-1",
};

function formatRange(checkIn: Date | null, checkOut: Date | null): string {
  if (!checkIn) return "";
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!checkOut) return checkIn.toLocaleDateString("en-US", o);
  return `${checkIn.toLocaleDateString("en-US", o)} – ${checkOut.toLocaleDateString("en-US", o)}`;
}

export function DateField({
  label,
  checkIn,
  checkOut,
  onChange,
  placeholder = "Add dates",
  open: openProp,
  onOpenChange,
}: DateFieldProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const open = openProp ?? internalOpen;
  // The calendar keeps its full height and changes direction instead of scrolling:
  // a month grid split across a scroll boundary is unreadable.
  const placement = usePopoverFlip(triggerRef, popoverRef, open);
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Close on outside click while open.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (openProp === undefined) setInternalOpen(false);
        onOpenChange?.(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, openProp, onOpenChange]);

  function handleChange(newIn: Date | null, newOut: Date | null) {
    onChange(newIn, newOut);
    if (newIn && newOut) setOpen(false);
  }

  const dateLabel = formatRange(checkIn, checkOut);
  const labelActive = open || !!(checkIn && checkOut);

  let borderClass = "border-b-wax/20 hover:border-b-wax/40";
  if (dateLabel) borderClass = "border-b-ember/50 bg-ember/15";
  if (open) borderClass = "border-b-ember";

  let textClass = "text-placeholder";
  if (dateLabel) textClass = "text-wax";
  if (open) textClass = "text-ember";

  return (
    <div ref={rootRef}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(!open)}
          className={[
            "field-control cursor-pointer w-full group outline-none focus-visible:border-b-ember",
            borderClass,
          ].join(" ")}
        >
          <Calendar
            size={16}
            className={`shrink-0 transition-colors group-focus-visible:text-ember ${open || dateLabel ? "text-ember" : "text-smoke"}`}
          />
          <span
            className={`flex-1 text-left text-body transition-colors group-focus-visible:text-ember ${textClass}`}
          >
            {dateLabel || placeholder}
          </span>
        </button>

        {open && (
          <div
            ref={popoverRef}
            className={`absolute left-0 right-0 z-50 bg-evergreen border border-wax/10 rounded-xl p-5 ${placementClasses[placement]}`}
          >
            <CalendarInput checkIn={checkIn} checkOut={checkOut} onChange={handleChange} />
          </div>
        )}
      </div>
      <p
        className={`mt-2 text-data uppercase tracking-widest transition-colors ${labelActive ? "text-ember" : "text-smoke"}`}
      >
        {label}
      </p>
    </div>
  );
}
