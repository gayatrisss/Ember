"use client";

// ─── CalendarInput V2 (Direction D) ───────────────────────────────────────────
// Experimental rework of components/ui/calendar-input.tsx, kept side-by-side
// for comparison in /design. The original is untouched.
//
// Changes vs v1:
//   • Monday-first week (spec: Mo Tu We Th Fr Sa Su).
//   • Availability is a 3-way tier (past / booked / open) instead of the single
//     `isUnavailable` boolean.
//   • New `alertedDates` prop threads existing-alert dates through to the cell
//     as the alert-set overlay. NOTE: nothing populates this in the real app
//     yet — that fetch is a deferred follow-up — so it renders empty until wired.

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DateCellV2,
  type DateCellAvailability,
  type DateCellSelection,
  type DateCellPosition,
  type DateCellTheme,
} from "@/components/ui/date-cell-v2";

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
// Monday-first, per the Figma spec.
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

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

// ─── CalendarInputV2 ───────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00Z`;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

type CalendarInputV2Props = {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  // Dates explicitly confirmed as available (quantity === 1). A fetched-month
  // date absent from this set is `booked` (clickable, alertable).
  availableDates?: Set<string>;
  // Months we have fetched data for ("YYYY-MM"). Dates in unfetched months are
  // `booked` by default — we never claim availability without data.
  fetchedMonths?: Set<string>;
  // Dates the current user already has an alert covering. Renders the alert-set
  // overlay. Deferred: nothing populates this in the app yet.
  alertedDates?: Set<string>;
  // Called when the user navigates to a new month so the parent can fetch data.
  onMonthChange?: (year: number, month: number) => void;
  initialMonth?: number;
  initialYear?: number;
  // Adapts colors to a dark (evergreen) or light (wax) surface. Defaults to dark.
  theme?: DateCellTheme;
};

export function CalendarInputV2({
  checkIn,
  checkOut,
  onChange,
  availableDates,
  fetchedMonths,
  alertedDates,
  onMonthChange,
  initialMonth = new Date().getMonth(),
  initialYear = new Date().getFullYear(),
  theme = "dark",
}: CalendarInputV2Props) {
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

  // Build grid: Monday-first, padded with adjacent-month dates (rendered blank).
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // shift so Monday = 0

  const cells: Date[] = [];
  for (let i = startOffset; i > 0; i--) cells.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  // Always pad to 6 rows (42 cells) so the grid height stays fixed across months.
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
          <DateCellV2 key={d} variant="day-label" theme={theme}>
            {d}
          </DateCellV2>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month;

          if (!inMonth) {
            return <DateCellV2 key={i} variant="empty" theme={theme} />;
          }

          const mKey = toMonthKey(date);
          const monthFetched = fetchedMonths?.has(mKey) ?? false;
          const isPast = date < today;
          // Availability tier. Open requires positive confirmation from data;
          // anything future without it is booked (still clickable / alertable).
          const isOpen =
            fetchedMonths != null && monthFetched && (availableDates?.has(toDateKey(date)) ?? false);
          let availability: DateCellAvailability = "booked";
          if (isPast) availability = "past";
          else if (isOpen) availability = "open";

          const alertSet = !isPast && (alertedDates?.has(toDateKey(date)) ?? false);

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

          let selection: DateCellSelection = "none";
          let position: DateCellPosition = "single";

          if (isStart) {
            selection = "selected";
            if (hasActiveRange) position = isReversed ? "end" : "start";
          } else if (isEnd) {
            selection = "selected";
            position = "end";
          } else if (isHoveredEnd) {
            selection = "hover";
            position = isReversed ? "start" : "end";
          } else if (inRange) {
            selection = "range";
          } else if (alertSet) {
            // Join consecutive alert days into one pill (like a range).
            const prevAlert =
              alertedDates?.has(toDateKey(new Date(year, month, date.getDate() - 1))) ?? false;
            const nextAlert =
              alertedDates?.has(toDateKey(new Date(year, month, date.getDate() + 1))) ?? false;
            if (prevAlert && nextAlert) position = "middle";
            else if (nextAlert) position = "start";
            else if (prevAlert) position = "end";
          }

          return (
            <DateCellV2
              key={i}
              availability={availability}
              alertSet={alertSet}
              selection={selection}
              position={position}
              theme={theme}
              onMouseEnter={() => setHoverDate(date)}
              onMouseLeave={() => setHoverDate(null)}
              onClick={() => handleSelect(date)}
            >
              {date.getDate()}
            </DateCellV2>
          );
        })}
      </div>
    </div>
  );
}
