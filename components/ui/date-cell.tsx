export type DateCellState =
  | "default" // normal in-month date, shows hover treatment on CSS :hover
  | "disabled" // past date or out-of-month padding — non-interactive
  | "unavailable" // booked or booking-not-open — visually marked but still clickable
  | "day" // Mo/Tu/We… header labels, non-interactive
  | "hover" // hovered end of an in-progress range
  | "selected" // confirmed start, end, or single selection
  | "in-range"; // between start and end

export type DateCellPosition = "single" | "start" | "end";

type DateCellProps = {
  state?: DateCellState;
  position?: DateCellPosition;
  children: React.ReactNode;
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

function stateClasses(state: DateCellState, position: DateCellPosition): string {
  const rounding = ROUNDING[position];

  switch (state) {
    case "default":
      return "text-body text-wax cursor-pointer border-transparent hover:bg-ember-range hover:border-ember-selected";
    case "disabled":
      return "text-body text-smoke border-transparent";
    case "unavailable":
      return "text-body text-wax/40 cursor-pointer border-transparent hover:bg-white/5";
    case "day":
      return "text-body text-smoke border-transparent";
    case "hover":
      return `text-calendar-date text-wax bg-ember-range border-ember-selected ${rounding}`;
    case "selected":
      return `text-calendar-date text-wax bg-ember-selected border-transparent ${rounding}`;
    case "in-range":
      return "text-calendar-date text-wax bg-ember-range border-transparent";
  }
}

export function DateCell({
  state = "default",
  position = "single",
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: DateCellProps) {
  const cls = `${BASE} ${stateClasses(state, position)}`;

  // Non-interactive states don't need button semantics
  if (state === "day" || state === "disabled") {
    return <div className={cls}>{children}</div>;
  }

  // Dot beneath the number signals "booked or not yet open — click to set an alert"
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
          <span className="block w-1 h-1 rounded-full bg-smoke/60" />
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
