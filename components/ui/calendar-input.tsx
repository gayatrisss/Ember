"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DateCell, type DateCellState, type DateCellPosition } from "@/components/ui/date-cell";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
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
};

export function CalendarHeader({ month, year, onPrev, onNext }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <button
        type="button"
        onClick={onPrev}
        className="text-wax p-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <ChevronLeft size={24} />
      </button>
      <span className="text-body text-wax">{MONTHS[month]} {year}</span>
      <button
        type="button"
        onClick={onNext}
        className="text-wax p-2 rounded-lg hover:bg-white/5 transition-colors"
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

type CalendarInputProps = {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  bookedDates?: Set<string>;
  initialMonth?: number;
  initialYear?: number;
};

export function CalendarInput({
  checkIn,
  checkOut,
  onChange,
  bookedDates,
  initialMonth = new Date().getMonth(),
  initialYear = new Date().getFullYear(),
}: CalendarInputProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
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

  // Build grid: Mon–Sun, padded with adjacent-month dates
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Mon = 0

  const cells: Date[] = [];
  for (let i = startOffset; i > 0; i--) cells.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  let overflow = 1;
  while (cells.length % 7 !== 0) cells.push(new Date(year, month + 1, overflow++));

  // Derive the visual range (handles hover preview + reversed drag direction)
  const effectiveEnd = checkOut ?? (checkIn && hoverDate ? hoverDate : null);
  const isReversed = !!(checkIn && effectiveEnd && effectiveEnd < checkIn);
  const visualStart = isReversed ? effectiveEnd! : checkIn;
  const visualEnd   = isReversed ? checkIn!      : effectiveEnd;

  return (
    <div className="w-fit mx-auto">
      <CalendarHeader month={month} year={year} onPrev={prevMonth} onNext={nextMonth} />

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <DateCell key={d} state="day">{d}</DateCell>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month;

          if (!inMonth) {
            return <DateCell key={i} state="disabled">{date.getDate()}</DateCell>;
          }

          const isBooked = bookedDates?.has(toDateKey(date)) ?? false;
          const isStart = !!checkIn && sameDay(date, checkIn);
          const isEnd   = !!checkOut && sameDay(date, checkOut);
          const isHoveredEnd =
            !checkOut && !!checkIn && !!hoverDate &&
            !sameDay(date, checkIn) && sameDay(date, hoverDate);
          const inRange = !!(
            visualStart && visualEnd &&
            date > visualStart && date < visualEnd
          );
          const hasActiveRange = !!(
            checkIn && (checkOut || (hoverDate && !sameDay(hoverDate, checkIn)))
          );

          // Map booleans → DateCell state + position
          // isStart/isEnd take priority so a selected booked date still shows as selected
          let cellState: DateCellState;
          let cellPosition: DateCellPosition = "single";

          if (inRange) {
            cellState = "in-range";
          } else if (isStart) {
            cellState = "selected";
            if (hasActiveRange) cellPosition = isReversed ? "end" : "start";
          } else if (isEnd) {
            cellState = "selected";
            cellPosition = "end";
          } else if (isHoveredEnd) {
            cellState = "hover";
            cellPosition = isReversed ? "start" : "end";
          } else if (isBooked) {
            cellState = "disabled";
          } else {
            cellState = "default";
          }

          return (
            <DateCell
              key={i}
              state={cellState}
              position={cellPosition}
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
