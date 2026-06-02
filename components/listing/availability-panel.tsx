"use client";

import { useState, useEffect, useReducer } from "react";
import { CalendarInput } from "@/components/ui/calendar-input";
import { ToggleOptions } from "@/components/ui/toggle-options";
import { Spinner } from "@/components/ui/spinner";

type View = "calendar" | "alert-setup" | "reminder-setup" | "confirmed";
type AvailabilityStatus = "available" | "booked" | "not-open";
type CampsiteData = { quantities: Record<string, number> };

type AvailState = { loading: boolean; error: boolean; status: AvailabilityStatus | null };
type AvailAction =
  | { type: "loading" }
  | { type: "success"; status: AvailabilityStatus }
  | { type: "error" }
  | { type: "reset" };

function availReducer(_: AvailState, action: AvailAction): AvailState {
  switch (action.type) {
    case "loading": return { loading: true,  error: false, status: null };
    case "success": return { loading: false, error: false, status: action.status };
    case "error":   return { loading: false, error: true,  status: null };
    case "reset":   return { loading: false, error: false, status: null };
  }
}

function extractBookedDates(rawJson: unknown): Set<string> {
  const result = new Set<string>();
  if (!rawJson || typeof rawJson !== "object") return result;
  const campsites = Object.values(
    (rawJson as { campsites?: Record<string, CampsiteData> }).campsites ?? {}
  );
  if (campsites.length === 0) return result;
  const allKeys = new Set<string>();
  for (const c of campsites) {
    for (const key of Object.keys(c.quantities)) allKeys.add(key);
  }
  for (const key of allKeys) {
    const anyAvailable = campsites.some((c) => c.quantities[key] === 1);
    if (!anyAvailable) result.add(key);
  }
  return result;
}

function fmtRange(a: Date | null, b: Date | null): string {
  if (!a || !b) return "—";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${a.toLocaleDateString("en-US", opts)}–${b.toLocaleDateString("en-US", opts)}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 bg-night/40 border-b border-wax/5 last:border-b-0">
      <span className="text-data uppercase text-wax/40">{label}</span>
      <span className="text-label text-wax">{value}</span>
    </div>
  );
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00Z`;
}

function getMonthParams(checkIn: Date, checkOut: Date): string[] {
  const months = new Set<string>();
  const d = new Date(checkIn);
  while (d < checkOut) {
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setDate(d.getDate() + 1);
  }
  return Array.from(months);
}

function parseStatus(
  campsites: Record<string, CampsiteData>,
  checkIn: Date,
  checkOut: Date
): AvailabilityStatus {
  const nights: string[] = [];
  const d = new Date(checkIn);
  while (d < checkOut) {
    nights.push(dateKey(d));
    d.setDate(d.getDate() + 1);
  }
  for (const campsite of Object.values(campsites)) {
    if (nights.every((n) => campsite.quantities[n] === 1)) return "available";
  }
  const allKeys = new Set(
    Object.values(campsites).flatMap((c) => Object.keys(c.quantities))
  );
  if (nights.some((n) => !allKeys.has(n))) return "not-open";
  return "booked";
}

export function AvailabilityPanel({
  facilityId,
  cabinName,
}: {
  facilityId: string;
  cabinName: string;
}) {
  const [view, setView] = useState<View>("calendar");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [avail, dispatch] = useReducer(availReducer, { loading: false, error: false, status: null });
  const [flexibility, setFlexibility] = useState("strict");
  const [notifyMethod, setNotifyMethod] = useState("sms");
  const [notifyWhen, setNotifyWhen] = useState("1week");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawJson, setRawJson] = useState<any>(null);
  const bookedDates = rawJson ? extractBookedDates(rawJson) : undefined;

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/availability?facilityId=${facilityId}&month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        console.log("[ember] availability-panel response", json);
        setRawJson(json);
      })
      .catch((err) => console.log("[ember] availability-panel mount fetch error", err));
  }, [facilityId]);

  function handleDateChange(newIn: Date | null, newOut: Date | null) {
    setCheckIn(newIn);
    setCheckOut(newOut);
    dispatch({ type: "reset" });
  }

  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const controller = new AbortController();
    dispatch({ type: "loading" });
    const months = getMonthParams(checkIn, checkOut);
    Promise.all(
      months.map((month) =>
        fetch(`/api/availability?facilityId=${facilityId}&month=${month}`, {
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null))
      )
    )
      .then((results) => {
        if (results.some((r) => r === null)) { dispatch({ type: "error" }); return; }
        const merged: Record<string, CampsiteData> = {};
        for (const data of results) {
          for (const [id, campsite] of Object.entries(
            (data?.campsites ?? {}) as Record<string, CampsiteData>
          )) {
            if (!merged[id]) merged[id] = { quantities: {} };
            Object.assign(merged[id].quantities, campsite.quantities);
          }
        }
        if (Object.keys(merged).length === 0) { dispatch({ type: "error" }); return; }
        dispatch({ type: "success", status: parseStatus(merged, checkIn, checkOut) });
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") dispatch({ type: "error" });
      });
    return () => controller.abort();
  }, [checkIn, checkOut, facilityId]);

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

  return (
    <div className="bg-evergreen rounded-2xl p-8">
      <p className="text-data uppercase tracking-widest text-ember mb-6">SELECT YOUR TRAVEL DAYS</p>
      <CalendarInput
        checkIn={checkIn}
        checkOut={checkOut}
        onChange={handleDateChange}
        bookedDates={bookedDates}
      />
      {avail.loading && (
        <div className="mt-6 pt-6 border-t border-wax/10 flex justify-center">
          <Spinner size={20} />
        </div>
      )}
      {avail.error && (
        <div className="mt-6 pt-6 border-t border-wax/10">
          <p className="text-label text-smoke text-center">
            Couldn&apos;t load availability. Try different dates.
          </p>
        </div>
      )}
      {!avail.loading && !avail.error && avail.status && (
        <div className="mt-6 pt-6 border-t border-wax/10">
          {avail.status === "available" && (
            <>
              <p className="text-label text-wax/60 text-center">These dates are available to book!</p>
              <a
                href={`https://www.recreation.gov/camping/campgrounds/${facilityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110 text-center"
              >
                Book on Recreation.gov →
              </a>
            </>
          )}
          {avail.status === "booked" && (
            <>
              <p className="text-label text-wax/60 text-center">
                This cabin is booked for {fmtRange(checkIn, checkOut)}.
              </p>
              <button
                onClick={() => setView("alert-setup")}
                className="mt-4 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110"
              >
                Set up an alert →
              </button>
            </>
          )}
          {avail.status === "not-open" && (
            <>
              <p className="text-label text-wax/60 text-center leading-relaxed">
                Booking isn&apos;t open yet for these dates.
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
