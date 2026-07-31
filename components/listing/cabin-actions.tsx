"use client";

import { useState } from "react";
import { AvailabilityPanel, type PanelSummary } from "@/components/ui/availability-panel";
import AvailabilityDrawer from "./availability-drawer";

type BarState = {
  label: string;
  /** Dates left, status right. Absent only before a range is chosen. */
  context: { dates: string; status: string } | null;
  variant: "primary" | "disabled" | "secondary";
  /** Set when the bar should hand off directly instead of opening the drawer. */
  href?: string;
};

// Mirrors the seven cases in the Figma wireframe. Ordered so the earliest
// exit wins: no range at all, then in-flight, then failure, then outcome.
function barState(summary: PanelSummary | null): BarState {
  if (!summary || !summary.dateRange) {
    return { label: "Check availability", context: null, variant: "primary" };
  }
  const dates = summary.dateRange;
  if (summary.loading) {
    return { label: "Check availability", context: { dates, status: "Checking…" }, variant: "disabled" };
  }
  if (summary.error) {
    return { label: "Try again", context: { dates, status: "Unavailable" }, variant: "secondary" };
  }
  if (summary.status === "available") {
    return {
      label: "Book on Recreation.gov →",
      context: { dates, status: "Available" },
      variant: "primary",
      href: summary.bookUrl,
    };
  }
  if (summary.status === "booked") {
    return { label: "Set up an alert →", context: { dates, status: "Booked" }, variant: "primary" };
  }
  if (summary.status === "not-open") {
    return { label: "Set a reminder →", context: { dates, status: "Not yet open" }, variant: "primary" };
  }
  return { label: "Check availability", context: { dates, status: "" }, variant: "primary" };
}

const VARIANT_CLASSES = {
  primary: "bg-ember text-wax hover:brightness-110",
  disabled: "bg-ember/40 text-wax/60 cursor-not-allowed",
  secondary: "border border-wax/30 text-wax hover:border-ember hover:text-ember",
};

type Props = {
  facilityId: string;
  cabinName: string;
  reservationUrl?: string | null;
  initialMonths?: Record<string, unknown>;
};

/**
 * Owns the mobile availability drawer and the docked bar that opens it. Above lg
 * neither exists: the bar is hidden and the drawer degrades to a plain wrapper,
 * so the panel sits in the cabin grid unchanged.
 *
 * The drawer never opens on its own, even when the user arrives with dates from
 * the home page. Those dates prefill the panel and the availability lookup runs
 * behind the closed drawer, so the bar lands already resolved ("Jul 12 – Jul 14 ·
 * Booked") while the user reads the cabin first.
 */
export default function CabinActions(panelProps: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<PanelSummary | null>(null);

  const bar = barState(summary);
  const classes = `w-full h-12 rounded-lg text-button grid place-items-center transition-colors ${VARIANT_CLASSES[bar.variant]}`;

  return (
    <>
      <AvailabilityDrawer open={open} onOpenChange={setOpen}>
        <AvailabilityPanel {...panelProps} onSummaryChange={setSummary} />
      </AvailabilityDrawer>

      {/* Rounded top corners echo the drawer's own edge, so the bar reads as
          something that will rise rather than a flat footer. */}
      <div className="lg:hidden fixed inset-x-0 bottom-tab-bar z-30 bg-night border-t border-wax/10 rounded-t-2xl px-6 pt-4 pb-4">
        {bar.context && (
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-label text-wax-muted">{bar.context.dates}</span>
            <span className="text-label text-wax-muted">{bar.context.status}</span>
          </div>
        )}

        {bar.href ? (
          <a href={bar.href} target="_blank" rel="noopener noreferrer" className={classes}>
            {bar.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={bar.variant === "disabled"}
            className={classes}
          >
            {bar.label}
          </button>
        )}
      </div>
    </>
  );
}
