// ─── DateCell V2 (Direction D) ────────────────────────────────────────────────
// Experimental rework of components/ui/date-cell.tsx, kept side-by-side for
// comparison in /design. The original is untouched.
//
// The key change vs v1: availability and overlays are two orthogonal axes
// instead of one flat state enum.
//   • availability (mutually exclusive) — how legible/clickable the night is:
//       past   → smoke, non-interactive
//       booked → wax-muted, still clickable (you can set an alert on it)
//       open   → bold wax, pops (bookable now)
//   • overlays (compose on top of availability):
//       alertSet  → faint ember wash behind the number (persistent marker)
//       selection → solid ember fill / range / hover (live interaction)
// Selection wins the text+background; alertSet only paints the wash when the
// cell isn't part of a selection. Borders are reserved for the hover preview
// (they read as "you're about to pick this"), never as a resting marker.

export type DateCellAvailability = "past" | "booked" | "open";
export type DateCellSelection = "none" | "selected" | "range" | "hover";
export type DateCellVariant = "date" | "day-label" | "empty";
export type DateCellPosition = "single" | "start" | "end" | "middle";
export type DateCellTheme = "dark" | "light";

type DateCellV2Props = {
  variant?: DateCellVariant;
  availability?: DateCellAvailability;
  alertSet?: boolean;
  selection?: DateCellSelection;
  position?: DateCellPosition;
  theme?: DateCellTheme;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

// text-body (16px/400) for resting cells, text-calendar-date (20px/500) for
// active (selected/range/hover) — matches the v1 sizing behaviour.
const BASE = "size-12 flex items-center justify-center select-none transition-colors border-2";

const ROUNDING: Record<DateCellPosition, string> = {
  start: "rounded-l-lg",
  end: "rounded-r-lg",
  single: "rounded-lg",
  middle: "rounded-none", // interior of a consecutive run (alert or range)
};

// Per-theme class fragments. Availability tiers are the new part; the ember
// selection/hover fills are carried over unchanged from v1.
const THEME: Record<
  DateCellTheme,
  {
    past: string;
    booked: string;
    open: string;
    restHover: string;
    hoverFill: string;
    selectedFill: string;
    inRangeFill: string;
    alertWash: string;
  }
> = {
  dark: {
    past: "text-smoke",
    booked: "text-wax-muted",
    open: "text-wax font-semibold",
    restHover: "hover:bg-ember-range hover:border-ember-selected",
    hoverFill: "bg-ember-range border-ember-selected",
    selectedFill: "bg-ember-selected",
    inRangeFill: "bg-ember-range",
    alertWash: "bg-ember/15",
  },
  light: {
    past: "text-night/40",
    booked: "text-slate",
    open: "text-night font-semibold",
    restHover: "hover:bg-ember-selected hover:border-ember-bright",
    hoverFill: "bg-ember-selected border-ember-bright",
    selectedFill: "bg-ember",
    inRangeFill: "bg-ember-selected",
    alertWash: "bg-ember/15",
  },
};

function dateClasses(
  availability: DateCellAvailability,
  alertSet: boolean,
  selection: DateCellSelection,
  position: DateCellPosition,
  theme: DateCellTheme
): string {
  const t = THEME[theme];
  const rounding = ROUNDING[position];

  // Selection overlays win over availability text + background.
  if (selection === "selected") {
    return `text-calendar-date text-wax ${t.selectedFill} border-transparent ${rounding}`;
  }
  if (selection === "range") {
    return `text-calendar-date text-wax ${t.inRangeFill} border-transparent`;
  }
  if (selection === "hover") {
    return `text-calendar-date text-wax ${t.hoverFill} ${rounding}`;
  }

  // Resting: text comes from the availability tier.
  const textCls = t[availability];
  const clickable = availability !== "past";
  const cursor = clickable ? "cursor-pointer" : "";
  // hover:rounded-lg overrides the resting `rounding` so a hovered cell is fully
  // rounded even when it's an end/interior cap of an alert run.
  const hover = clickable ? `${t.restHover} hover:rounded-lg` : "";
  // alertSet paints the wash behind an otherwise-resting cell. `rounding`
  // (from position) shapes both the wash pill and the resting hover fill, so a
  // consecutive alert run joins up and a plain hover is rounded, not square.
  const wash = alertSet ? t.alertWash : "";

  return `text-body ${textCls} ${cursor} border-transparent ${wash} ${hover} ${rounding}`;
}

export function DateCellV2({
  variant = "date",
  availability = "open",
  alertSet = false,
  selection = "none",
  position = "single",
  theme = "dark",
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: DateCellV2Props) {
  // Out-of-month padding — occupies the grid slot, shows nothing.
  if (variant === "empty") {
    return <div className={`${BASE} border-transparent`} aria-hidden="true" />;
  }

  // Mo/Tu/We… header labels, non-interactive.
  if (variant === "day-label") {
    return <div className={`${BASE} text-body text-smoke border-transparent`}>{children}</div>;
  }

  const cls = `${BASE} ${dateClasses(availability, alertSet, selection, position, theme)}`;

  // Past dates are shown but never interactive.
  if (availability === "past" && selection === "none") {
    return <div className={cls}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cls}
    >
      {children}
    </button>
  );
}
