export type DateCellState =
  | "default"   // normal in-month date, shows hover treatment on CSS :hover
  | "disabled"  // out-of-month padding cell, non-interactive
  | "day"       // Mo/Tu/We… header labels, non-interactive
  | "hover"     // hovered end of an in-progress range
  | "selected"  // confirmed start, end, or single selection
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

function stateClasses(state: DateCellState, position: DateCellPosition): string {
  const rounding =
    position === "start" ? "rounded-l-lg" :
    position === "end"   ? "rounded-r-lg" :
                           "rounded-lg";

  switch (state) {
    case "default":
      return "text-body text-wax cursor-pointer border-transparent rounded-lg hover:bg-ember-range hover:border-ember-selected";
    case "disabled":
      return "text-body text-smoke border-transparent rounded-lg";
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
