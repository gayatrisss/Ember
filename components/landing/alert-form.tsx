"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Search } from "@/components/ui/search";
import { CalendarInput } from "@/components/ui/calendar-input";
import { type Cabin } from "@/components/ui/use-cabin-search";

function formatRange(checkIn: Date | null, checkOut: Date | null): string {
  if (!checkIn) return "";
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!checkOut) return checkIn.toLocaleDateString("en-US", o);
  return `${checkIn.toLocaleDateString("en-US", o)} – ${checkOut.toLocaleDateString("en-US", o)}`;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AlertForm() {
  const router = useRouter();
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const whenRef = useRef<HTMLDivElement>(null);

  function handleDateChange(newIn: Date | null, newOut: Date | null) {
    setCheckIn(newIn);
    setCheckOut(newOut);
    if (newIn && newOut) setCalOpen(false);
  }

  // Picking a cabin fills the search input (handled in Search) and immediately
  // opens the calendar so the user is pushed to choose dates next.
  function handleCabinSelect(cabin: Cabin) {
    setSelectedCabin(cabin);
    setCalOpen(true);
  }

  function handleSubmit() {
    if (!selectedCabin || !checkIn || !checkOut) return;
    router.push(
      `/cabin/${selectedCabin.id}?checkIn=${toDateStr(checkIn)}&checkOut=${toDateStr(checkOut)}`
    );
  }

  const canSubmit = !!selectedCabin && !!checkIn && !!checkOut;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (whenRef.current && !whenRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    if (calOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [calOpen]);

  const dateLabel = formatRange(checkIn, checkOut);
  const labelActive = calOpen || !!(checkIn && checkOut);

  let calButtonBorder = "border-b-wax/20 hover:border-b-wax/40";
  if (dateLabel) calButtonBorder = "border-b-ember/50 bg-ember/15";
  if (calOpen) calButtonBorder = "border-b-ember";

  let calSpanText = "text-wax/40";
  if (dateLabel) calSpanText = "text-wax";
  if (calOpen) calSpanText = "text-ember";

  return (
    <div className="w-full p-8 bg-evergreen rounded-2xl shadow-ember-lg">
      <span className="text-data text-wax/70 uppercase tracking-wider">SET AN ALERT</span>

      <div className="mt-8 space-y-6">
        <Search onSelect={handleCabinSelect} />

        {/* WHEN — popover trigger */}
        <div ref={whenRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalOpen((o) => !o)}
              className={["field-control cursor-pointer w-full", calButtonBorder].join(" ")}
            >
              <Calendar
                size={16}
                className={`shrink-0 transition-colors ${calOpen || dateLabel ? "text-ember" : "text-smoke"}`}
              />
              <span
                className={`flex-1 text-left text-body transition-colors ${calSpanText}`}
              >
                {dateLabel || "Add dates"}
              </span>
            </button>

            {calOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-evergreen border border-wax/10 rounded-xl p-5">
                <CalendarInput checkIn={checkIn} checkOut={checkOut} onChange={handleDateChange} />
              </div>
            )}
          </div>
          <p
            className={`mt-2 text-data uppercase tracking-widest transition-colors ${labelActive ? "text-ember" : "text-smoke"}`}
          >
            WHEN
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-8 w-full h-14 bg-ember text-wax rounded-md text-body hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
      >
        Let&apos;s escape
      </button>
    </div>
  );
}
