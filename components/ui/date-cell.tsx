export type DateCellState =
  | "default" // normal in-month date, shows hover treatment on CSS :hover
  | "disabled" // past or before-range-start in-month date — greyed, non-interactive
  | "empty" // out-of-month padding — blank cell, preserves grid alignment
  | "unavailable" // booked or booking-not-open — visually marked but still clickable
  | "day" // Mo/Tu/We… header labels, non-interactive
  | "hover" // hovered end of an in-progress range
  | "selected" // confirmed start, end, or single selection
  | "in-range"; // between start and end

export type DateCellPosition = "single" | "start" | "end";
export type DateCellTheme = "dark" | "light";

type DateCellProps = {
  state?: DateCellState;
  position?: DateCellPosition;
  theme?: DateCellTheme;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

// text-body (16px/400) for inactive cells, text-calendar-date (20px/500) for active — per Figma spec
const BASE = "size-12 flex items-center justify-center select-none transition-colors border-2";

const ROUNDING: Record<DateCellPosition, string> = {
  start: "rounded-l-lg",
  end: "rounded-r-lg",
  single: "rounded-lg",
};

// Per-theme class fragments. Only the values that differ between dark/light live
// here; shared tokens (smoke labels, wax text on ember fills, the smoke dot) are
// inlined in stateClasses below. Light mode uses a brighter ember ramp — selection
// is full `ember` and in-range reuses `ember-selected` — per the Figma spec.
const THEME: Record<
  DateCellTheme,
  {
    primaryText: string;
    defaultHover: string;
    unavailableText: string;
    unavailableHover: string;
    hoverFill: string;
    selectedFill: string;
    inRangeFill: string;
  }
> = {
  dark: {
    primaryText: "text-wax",
    defaultHover: "hover:bg-ember-range hover:border-ember-selected",
    unavailableText: "text-wax/40",
    unavailableHover: "hover:bg-white/5",
    hoverFill: "bg-ember-range border-ember-selected",
    selectedFill: "bg-ember-selected",
    inRangeFill: "bg-ember-range",
  },
  light: {
    primaryText: "text-night",
    defaultHover: "hover:bg-ember-selected hover:border-ember-bright",
    unavailableText: "text-night/40",
    unavailableHover: "hover:bg-black/5",
    hoverFill: "bg-ember-selected border-ember-bright",
    selectedFill: "bg-ember",
    inRangeFill: "bg-ember-selected",
  },
};

function stateClasses(
  state: DateCellState,
  position: DateCellPosition,
  theme: DateCellTheme
): string {
  const rounding = ROUNDING[position];
  const t = THEME[theme];

  switch (state) {
    case "default":
      return `text-body ${t.primaryText} cursor-pointer border-transparent ${rounding} ${t.defaultHover}`;
    case "disabled":
      return "text-body text-smoke border-transparent";
    case "empty":
      return "border-transparent";
    case "unavailable":
      return `text-body ${t.unavailableText} cursor-pointer border-transparent ${t.unavailableHover}`;
    case "day":
      return "text-body text-smoke border-transparent";
    case "hover":
      return `text-calendar-date text-wax ${t.hoverFill} ${rounding}`;
    case "selected":
      return `text-calendar-date text-wax ${t.selectedFill} border-transparent ${rounding}`;
    case "in-range":
      return `text-calendar-date text-wax ${t.inRangeFill} border-transparent`;
  }
}

export function DateCell({
  state = "default",
  position = "single",
  theme = "dark",
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: DateCellProps) {
  const cls = `${BASE} ${stateClasses(state, position, theme)}`;

  // Blank out-of-month padding — occupies the grid slot, shows nothing
  if (state === "empty") {
    return <div className={cls} aria-hidden="true" />;
  }

  // Non-interactive states don't need button semantics
  if (state === "day" || state === "disabled") {
    return <div className={cls}>{children}</div>;
  }

  if (state === "unavailable") {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cls}
      >
        <span className="flex flex-col items-center leading-none gap-0.5">
          <span>{children}</span>
        </span>
      </button>
    );
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
