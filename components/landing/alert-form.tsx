"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Search } from "lucide-react";
import { Field } from "@/components/ui/field";
import { TextInput } from "@/components/ui/text-input";
import { CalendarInput } from "@/components/ui/calendar-input";

function formatRange(checkIn: Date | null, checkOut: Date | null): string {
  if (!checkIn) return "";
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!checkOut) return checkIn.toLocaleDateString("en-US", o);
  return `${checkIn.toLocaleDateString("en-US", o)} – ${checkOut.toLocaleDateString("en-US", o)}`;
}

export default function AlertForm() {
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const whenRef = useRef<HTMLDivElement>(null);

  function handleDateChange(newIn: Date | null, newOut: Date | null) {
    setCheckIn(newIn);
    setCheckOut(newOut);
    if (newIn && newOut) setCalOpen(false);
  }

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

  return (
    <div className="w-full p-8 bg-evergreen rounded-2xl shadow-ember-lg">
      <span className="text-data text-wax/70 uppercase tracking-wider">SET AN ALERT</span>

      <div className="mt-8 space-y-6">
        <Field label="WHERE">
          <TextInput
            type="text"
            autoFocus
            placeholder="Eg. Glacier National Park"
            icon={<Search size={16} />}
          />
        </Field>

        {/* WHEN — popover trigger */}
        <div ref={whenRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalOpen((o) => !o)}
              className={[
                "field-control cursor-pointer w-full",
                calOpen
                  ? "border-b-ember"
                  : dateLabel
                  ? "border-b-ember/50 bg-ember/15"
                  : "border-b-wax/20 hover:border-b-wax/40",
              ].join(" ")}
            >
              <Calendar
                size={16}
                className={`shrink-0 transition-colors ${calOpen || dateLabel ? "text-ember" : "text-smoke"}`}
              />
              <span className={`flex-1 text-left text-body transition-colors ${
                calOpen ? "text-ember" : dateLabel ? "text-wax" : "text-wax/40"
              }`}>
                {dateLabel || "Add dates"}
              </span>
            </button>

            {calOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-evergreen border border-wax/10 rounded-xl p-5">
                <CalendarInput
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={handleDateChange}
                />
              </div>
            )}
          </div>
          <p className={`mt-2 text-data uppercase tracking-widest transition-colors ${labelActive ? "text-ember" : "text-smoke"}`}>
            WHEN
          </p>
        </div>
      </div>

      <button className="mt-8 w-full h-14 bg-ember text-wax rounded-md text-body hover:brightness-110">
        Let&apos;s escape
      </button>
    </div>
  );
}
