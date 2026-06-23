"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DateCell,
  type DateCellState,
  type DateCellPosition,
  type DateCellTheme,
} from "@/components/ui/date-cell";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

type CalendarHeaderProps = {
  month: number; // 0-indexed
  year: number;
  onPrev: () => void;
  onNext: () => void;
  theme?: DateCellTheme;
};

const HEADER_THEME: Record<DateCellTheme, { text: string; hover: string }> = {
  dark: { text: "text-wax", hover: "hover:bg-white/5" },
  light: { text: "text-night", hover: "hover:bg-black/5" },
};

export function CalendarHeader({ month, year, onPrev, onNext, theme = "dark" }: CalendarHeaderProps) {
  const t = HEADER_THEME[theme];
  return (
    <div className="flex items-center justify-between mb-2">
      <button
        type="button"
        onClick={onPrev}
        className={`${t.text} p-2 rounded-lg ${t.hover} transition-colors`}
      >
        <ChevronLeft size={24} />
      </button>
      <span className={`text-body ${t.text}`}>
        {MONTHS[month]} {year}
      </span>
      <button
        type="button"
        onClick={onNext}
        className={`${t.text} p-2 rounded-lg ${t.hover} transition-colors`}
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}

// ─── CalendarInput ───────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00Z`;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

type CalendarInputProps = {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  // Dates explicitly confirmed as available (quantity === 1). Any fetched-month
  // date absent from this set is shown as disabled.
  availableDates?: Set<string>;
  // Months we have fetched data for ("YYYY-MM"). Dates in unfetched months are
  // disabled by default — we never assume availability without data.
  fetchedMonths?: Set<string>;
  // Called when the user navigates to a new month so the parent can fetch data.
  onMonthChange?: (year: number, month: number) => void;
  initialMonth?: number;
  initialYear?: number;
  // Adapts colors to a dark (evergreen) or light (wax) surface. Defaults to dark.
  theme?: DateCellTheme;
};

export function CalendarInput({
  checkIn,
  checkOut,
  onChange,
  availableDates,
  fetchedMonths,
  onMonthChange,
  initialMonth = new Date().getMonth(),
  initialYear = new Date().getFullYear(),
  theme = "dark",
}: CalendarInputProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  function prevMonth() {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newYear, newMonth);
  }

  function nextMonth() {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newYear, newMonth);
  }

  function handleSelect(date: Date) {
    if (!checkIn || (checkIn && checkOut)) {
      onChange(date, null);
    } else if (sameDay(date, checkIn)) {
      onChange(null, null);
    } else if (date < checkIn) {
      onChange(date, checkIn);
    } else {
      onChange(checkIn, date);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build grid: Mon–Sun, padded with adjacent-month dates
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = first.getDay(); // Sun = 0

  const cells: Date[] = [];
  for (let i = startOffset; i > 0; i--) cells.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  // Always pad to 6 rows (42 cells). Months span 4–6 week-rows; rendering a
  // constant 6 keeps the grid height fixed across months so content never jumps.
  // The extra cells are out-of-month, so they render as blank `empty` cells.
  let overflow = 1;
  while (cells.length < 42) cells.push(new Date(year, month + 1, overflow++));

  // Derive the visual range (handles hover preview + reversed drag direction)
  const effectiveEnd = checkOut ?? (checkIn && hoverDate ? hoverDate : null);
  const isReversed = !!(checkIn && effectiveEnd && effectiveEnd < checkIn);
  const visualStart = isReversed ? effectiveEnd! : checkIn;
  const visualEnd = isReversed ? checkIn! : effectiveEnd;

  return (
    <div className="w-fit mx-auto">
      <CalendarHeader month={month} year={year} onPrev={prevMonth} onNext={nextMonth} theme={theme} />

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <DateCell key={d} state="day" theme={theme}>
            {d}
          </DateCell>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month;

          if (!inMonth) {
            return <DateCell key={i} state="empty" theme={theme} />;
          }

          // A date is unavailable when:
          //  - We have data for the month but the date isn't explicitly available, OR
          //  - We haven't fetched the month yet (default to unavailable)
          const mKey = toMonthKey(date);
          const monthFetched = fetchedMonths?.has(mKey) ?? false;
          const isUnavailable =
            fetchedMonths != null && (!monthFetched || !(availableDates?.has(toDateKey(date)) ?? false));

          const isPast = date < today;
          const isStart = !!checkIn && sameDay(date, checkIn);
          const isEnd = !!checkOut && sameDay(date, checkOut);
          const isHoveredEnd =
            !checkOut &&
            !!checkIn &&
            !!hoverDate &&
            !sameDay(date, checkIn) &&
            sameDay(date, hoverDate);
          const inRange = !!(visualStart && visualEnd && date > visualStart && date < visualEnd);
          const hasActiveRange = !!(
            checkIn && (checkOut || (hoverDate && !sameDay(hoverDate, checkIn)))
          );

          let cellState: DateCellState;
          let cellPosition: DateCellPosition = "single";

          if (isStart) {
            cellState = "selected";
            if (hasActiveRange) cellPosition = isReversed ? "end" : "start";
          } else if (isEnd) {
            cellState = "selected";
            cellPosition = "end";
          } else if (isPast) {
            cellState = "disabled";
          } else if (isHoveredEnd) {
            cellState = "hover";
            cellPosition = isReversed ? "start" : "end";
          } else if (inRange) {
            cellState = "in-range";
          } else if (isUnavailable) {
            cellState = "unavailable";
          } else {
            cellState = "default";
          }

          return (
            <DateCell
              key={i}
              state={cellState}
              position={cellPosition}
              theme={theme}
              onMouseEnter={() => setHoverDate(date)}
              onMouseLeave={() => setHoverDate(null)}
              onClick={() => handleSelect(date)}
            >
              {date.getDate()}
            </DateCell>
          );
        })}
      </div>
    </div>
  );
}
