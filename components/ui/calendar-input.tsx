"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

type CalendarInputProps = {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  initialMonth?: number;
  initialYear?: number;
};

export function CalendarInput({
  checkIn,
  checkOut,
  onChange,
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

  // Build grid: Mon–Sun, padding with adjacent-month dates
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0

  const cells: Date[] = [];
  for (let i = startOffset; i > 0; i--) cells.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  let overflow = 1;
  while (cells.length % 7 !== 0) cells.push(new Date(year, month + 1, overflow++));

  // Derive the visual range (handles hover preview + reversed hover direction)
  const effectiveEnd = checkOut ?? (checkIn && hoverDate ? hoverDate : null);
  const isReversed = !!(checkIn && effectiveEnd && effectiveEnd < checkIn);
  const visualStart = isReversed ? effectiveEnd! : checkIn;
  const visualEnd = isReversed ? checkIn! : effectiveEnd;

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="text-wax p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-body text-wax">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="text-wax p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="size-12 flex items-center justify-center text-body text-smoke">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month;
          const isStart = !!checkIn && sameDay(date, checkIn);
          const isEnd = !!checkOut && sameDay(date, checkOut);
          const isHoveredEnd =
            !checkOut &&
            !!checkIn &&
            !!hoverDate &&
            !sameDay(date, checkIn) &&
            sameDay(date, hoverDate);
          const inRange = !!(
            visualStart &&
            visualEnd &&
            date > visualStart &&
            date < visualEnd
          );

          // True when there's an active range (confirmed or hover preview, and not same-day)
          const hasActiveRange = !!(
            checkIn && (
              checkOut ||
              (hoverDate && !sameDay(hoverDate, checkIn))
            )
          );

          // Derive background class and optional hover fallback
          let bgClass = "";
          let hoverBgClass = "";

          if (inRange) {
            bgClass = "bg-ember-range";
          } else if (isStart) {
            let rounding: string;
            if (!hasActiveRange) rounding = "rounded-lg";
            else if (isReversed) rounding = "rounded-r-lg";
            else rounding = "rounded-l-lg";
            bgClass = `bg-ember-selected ${rounding}`;
          } else if (isEnd) {
            bgClass = "bg-ember-selected rounded-r-lg";
          } else if (isHoveredEnd) {
            const rounding = isReversed ? "rounded-l-lg" : "rounded-r-lg";
            bgClass = `bg-ember-range border-2 border-ember-selected ${rounding}`;
          } else if (inMonth) {
            hoverBgClass = "hover:bg-ember-range hover:rounded-lg";
          }

          const textColor = inMonth ? "text-wax" : "text-wax/20";

          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => inMonth && setHoverDate(date)}
              onMouseLeave={() => setHoverDate(null)}
              onClick={() => handleSelect(date)}
              className={[
                "size-12 flex items-center justify-center text-body select-none cursor-pointer transition-colors",
                bgClass,
                hoverBgClass,
                textColor,
              ].filter(Boolean).join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
