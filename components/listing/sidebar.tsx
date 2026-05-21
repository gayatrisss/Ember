"use client";

import { useState } from "react";
import { CalendarInput } from "@/components/ui/calendar-input";
import { ToggleOptions } from "@/components/ui/toggle-options";

type SidebarView = "calendar" | "alert-setup" | "reminder-setup" | "confirmed";
type AvailabilityStatus = "booked" | "available" | "not-open";

// Mock booking data for demo
const BOOKED = [
  { start: new Date(2023, 0, 4), end: new Date(2023, 0, 7) },
  { start: new Date(2023, 0, 10), end: new Date(2023, 0, 14) },
];
const AVAIL_START = new Date(2023, 0, 20);
const AVAIL_END = new Date(2023, 0, 26);

function getStatus(checkIn: Date, checkOut: Date): AvailabilityStatus {
  for (const r of BOOKED) {
    if (checkIn <= r.end && checkOut >= r.start) return "booked";
  }
  if (checkIn <= AVAIL_END && checkOut >= AVAIL_START) return "available";
  return "not-open";
}

function fmtRange(a: Date | null, b: Date | null): string {
  if (!a || !b) return "—";
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${a.toLocaleDateString("en-US", o)}–${b.toLocaleDateString("en-US", o)}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 bg-night/40 border-b border-wax/5 last:border-b-0">
      <span className="text-data uppercase text-wax/40">{label}</span>
      <span className="text-label text-wax">{value}</span>
    </div>
  );
}

export default function Sidebar({ cabinName }: { cabinName: string }) {
  const [view, setView] = useState<SidebarView>("calendar");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [flexibility, setFlexibility] = useState("strict");
  const [notifyMethod, setNotifyMethod] = useState("sms");
  const [notifyWhen, setNotifyWhen] = useState("1week");

  const status: AvailabilityStatus | null =
    checkIn && checkOut ? getStatus(checkIn, checkOut) : null;

  function handleDateChange(newCheckIn: Date | null, newCheckOut: Date | null) {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
  }

  if (view === "confirmed") {
    return (
      <div className="bg-evergreen rounded-2xl p-8 flex flex-col items-center text-center">
        <div className="mt-8 text-5xl">🏕️</div>
        <p className="text-heading text-wax mt-6">Fantastic! The alert is set.</p>
        <p className="text-body text-wax/60 mt-3">
          We&apos;ll reach out the moment {cabinName} opens up.
        </p>
        <button className="mt-8 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110">
          Find more cabins
        </button>
      </div>
    );
  }

  if (view === "alert-setup") {
    return (
      <div className="bg-evergreen rounded-2xl p-8">
        <p className="text-data uppercase tracking-widest text-ember">SET UP YOUR ALERT</p>

        <div className="mt-6 rounded-lg overflow-hidden">
          <SummaryRow label="CABIN" value={cabinName} />
          <SummaryRow label="DATES" value={fmtRange(checkIn, checkOut)} />
          <SummaryRow label="OTHERS WATCHING" value="3 others" />
        </div>

        <div className="mt-6">
          <p className="text-label text-wax/60 mb-3">Are you flexible with dates at all?</p>
          <ToggleOptions
            options={[{ label: "Strict", value: "strict" }, { label: "± 7 Days", value: "flexible" }]}
            value={flexibility}
            onChange={setFlexibility}
          />
        </div>

        <div className="mt-6">
          <p className="text-label text-wax/60 mb-3">How should we notify you?</p>
          <ToggleOptions
            options={[{ label: "Email", value: "email" }, { label: "SMS", value: "sms" }]}
            value={notifyMethod}
            onChange={setNotifyMethod}
          />
        </div>

        <p className="text-label text-wax/40 mt-6 text-center leading-relaxed">
          We&apos;ll monitor Recreation.gov around the clock and let you know when a cancellation occurs.
        </p>

        <button
          onClick={() => setView("confirmed")}
          className="mt-6 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110"
        >
          Confirm alert
        </button>
      </div>
    );
  }

  if (view === "reminder-setup") {
    return (
      <div className="bg-evergreen rounded-2xl p-8">
        <p className="text-data uppercase tracking-widest text-ember">SET A REMINDER</p>

        <div className="mt-6 rounded-lg overflow-hidden">
          <SummaryRow label="CABIN" value={cabinName} />
          <SummaryRow label="DATES" value={fmtRange(checkIn, checkOut)} />
          <SummaryRow label="OTHERS WATCHING" value="3 others" />
        </div>

        <div className="mt-6">
          <p className="text-label text-wax/60 mb-3">When should we notify you?</p>
          <ToggleOptions
            options={[{ label: "1 day", value: "1day" }, { label: "1 week", value: "1week" }]}
            value={notifyWhen}
            onChange={setNotifyWhen}
          />
        </div>

        <div className="mt-6">
          <p className="text-label text-wax/60 mb-3">How should we notify you?</p>
          <ToggleOptions
            options={[{ label: "Email", value: "email" }, { label: "SMS", value: "sms" }]}
            value={notifyMethod}
            onChange={setNotifyMethod}
          />
        </div>

        <p className="text-label text-wax/40 mt-6 text-center leading-relaxed">
          We&apos;ll be sure to send you a heads up before {cabinName} opens for booking.
        </p>

        <button
          onClick={() => setView("confirmed")}
          className="mt-6 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110"
        >
          Confirm reminder
        </button>
      </div>
    );
  }

  // Calendar view
  return (
    <div className="bg-evergreen rounded-2xl p-8">
      <p className="text-data uppercase tracking-widest text-ember mb-6">SELECT YOUR TRAVEL DAYS</p>

      <CalendarInput
        checkIn={checkIn}
        checkOut={checkOut}
        onChange={handleDateChange}
        initialMonth={0}
        initialYear={2023}
      />

      {checkIn && checkOut && status && (
        <div className="mt-6 pt-6 border-t border-wax/10">
          {status === "booked" && (
            <>
              <p className="text-label text-wax/60 text-center">
                This cabin is booked from {fmtRange(checkIn, checkOut)}.
              </p>
              <button
                onClick={() => setView("alert-setup")}
                className="mt-4 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110"
              >
                Set up an alert →
              </button>
            </>
          )}
          {status === "available" && (
            <>
              <p className="text-label text-wax/60 text-center">
                These dates are available to book!
              </p>
              <button className="mt-4 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110">
                Book on Recreation.gov →
              </button>
            </>
          )}
          {status === "not-open" && (
            <>
              <p className="text-label text-wax/60 text-center leading-relaxed">
                The cabin is not available to book for these dates. Booking opens Feb 12th.
              </p>
              <button
                onClick={() => setView("reminder-setup")}
                className="mt-4 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110"
              >
                Set a reminder →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
