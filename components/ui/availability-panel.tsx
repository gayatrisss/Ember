"use client";

import { useState, useEffect, useReducer } from "react";
import { BookingPanel } from "@/components/ui/booking-panel";
import { CalendarInput } from "@/components/ui/calendar-input";
import { ToggleOptions } from "@/components/ui/toggle-options";
import { Spinner } from "@/components/ui/spinner";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "calendar" | "alert-setup" | "reminder-setup" | "confirmed";
type AvailabilityStatus = "available" | "booked" | "not-open";
type CampsiteData = { quantities: Record<string, number> };

type AvailState = { loading: boolean; error: boolean; status: AvailabilityStatus | null };
type AvailAction =
  | { type: "loading" }
  | { type: "success"; status: AvailabilityStatus }
  | { type: "error" }
  | { type: "reset" };

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function availReducer(_: AvailState, action: AvailAction): AvailState {
  switch (action.type) {
    case "loading":
      return { loading: true, error: false, status: null };
    case "success":
      return { loading: false, error: false, status: action.status };
    case "error":
      return { loading: false, error: true, status: null };
    case "reset":
      return { loading: false, error: false, status: null };
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
  const allKeys = new Set(Object.values(campsites).flatMap((c) => Object.keys(c.quantities)));
  if (nights.some((n) => !allKeys.has(n))) return "not-open";
  return "booked";
}

function fmtRange(a: Date | null, b: Date | null): string {
  if (!a || !b) return "—";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${a.toLocaleDateString("en-US", opts)}–${b.toLocaleDateString("en-US", opts)}`;
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 bg-night/40 border-b border-wax/5 last:border-b-0">
      <span className="text-data uppercase text-wax/40">{label}</span>
      <span className="text-label text-wax">{value}</span>
    </div>
  );
}

function CtaButton({ onClick, href, children }: { onClick?: () => void; href?: string; children: React.ReactNode }) {
  const cls = "block w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110 text-center";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

// Shared layout for alert-setup and reminder-setup — summary rows + two toggles + disclaimer.
function SetupContent({
  cabinName,
  dateRange,
  firstToggle,
  notifyMethod,
  onNotifyChange,
  disclaimer,
}: {
  cabinName: string;
  dateRange: string;
  firstToggle: React.ReactNode;
  notifyMethod: string;
  onNotifyChange: (v: string) => void;
  disclaimer: string;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg overflow-hidden">
        <SummaryRow label="CABIN" value={cabinName} />
        <SummaryRow label="DATES" value={dateRange} />
        <SummaryRow label="OTHERS WATCHING" value="3 others" />
      </div>
      {firstToggle}
      <div>
        <p className="text-label text-wax/60 mb-3">How should we notify you?</p>
        <ToggleOptions
          options={[
            { label: "Email", value: "email" },
            { label: "SMS", value: "sms" },
          ]}
          value={notifyMethod}
          onChange={onNotifyChange}
        />
      </div>
      <p className="text-label text-wax/40 text-center leading-relaxed">{disclaimer}</p>
    </div>
  );
}

function ConfirmedContent({ cabinName }: { cabinName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full">
      <div className="text-5xl">🏕️</div>
      <p className="text-heading text-wax mt-6">Fantastic! The alert is set.</p>
      <p className="text-body text-wax/60 mt-3">
        We&apos;ll reach out the moment {cabinName} opens up.
      </p>
    </div>
  );
}

// ─── AvailabilityPanel ────────────────────────────────────────────────────────

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
  const [avail, dispatch] = useReducer(availReducer, {
    loading: false,
    error: false,
    status: null,
  });
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
        if (results.some((r) => r === null)) {
          dispatch({ type: "error" });
          return;
        }
        const merged: Record<string, CampsiteData> = {};
        for (const data of results) {
          for (const [id, campsite] of Object.entries(
            (data?.campsites ?? {}) as Record<string, CampsiteData>
          )) {
            if (!merged[id]) merged[id] = { quantities: {} };
            Object.assign(merged[id].quantities, campsite.quantities);
          }
        }
        if (Object.keys(merged).length === 0) {
          dispatch({ type: "error" });
          return;
        }
        dispatch({ type: "success", status: parseStatus(merged, checkIn, checkOut) });
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") dispatch({ type: "error" });
      });
    return () => controller.abort();
  }, [checkIn, checkOut, facilityId]);

  // CTA for the calendar view — depends on avail state
  const calendarCta = (): React.ReactNode => {
    if (avail.loading)
      return (
        <div className="flex justify-center">
          <Spinner size={20} />
        </div>
      );
    if (avail.error)
      return (
        <p className="text-label text-smoke text-center">
          Couldn&apos;t load availability. Try different dates.
        </p>
      );
    if (avail.status === "available")
      return (
        <>
          <p className="text-label text-wax/60 text-center mb-4">
            These dates are available to book!
          </p>
          <CtaButton href={`https://www.recreation.gov/camping/campgrounds/${facilityId}`}>
            Book on Recreation.gov →
          </CtaButton>
        </>
      );
    if (avail.status === "booked")
      return (
        <>
          <p className="text-label text-wax/60 text-center mb-4">
            This cabin is booked for {fmtRange(checkIn, checkOut)}.
          </p>
          <CtaButton onClick={() => setView("alert-setup")}>Set up an alert →</CtaButton>
        </>
      );
    if (avail.status === "not-open")
      return (
        <>
          <p className="text-label text-wax/60 text-center mb-4 leading-relaxed">
            Booking isn&apos;t open yet for these dates.
          </p>
          <CtaButton onClick={() => setView("reminder-setup")}>Set a reminder →</CtaButton>
        </>
      );
    return null;
  };

  // ─── Derive slots from view ────────────────────────────────────────────────
  const dateRange = fmtRange(checkIn, checkOut);
  let title: string;
  let body: React.ReactNode;
  let cta: React.ReactNode;

  switch (view) {
    case "confirmed":
      title = "";
      body = <ConfirmedContent cabinName={cabinName} />;
      cta = <CtaButton>Find more cabins</CtaButton>;
      break;

    case "alert-setup":
      title = "Set up your alert";
      body = (
        <SetupContent
          cabinName={cabinName}
          dateRange={dateRange}
          firstToggle={
            <div>
              <p className="text-label text-wax/60 mb-3">Are you flexible with dates at all?</p>
              <ToggleOptions
                options={[
                  { label: "Strict", value: "strict" },
                  { label: "± 7 Days", value: "flexible" },
                ]}
                value={flexibility}
                onChange={setFlexibility}
              />
            </div>
          }
          notifyMethod={notifyMethod}
          onNotifyChange={setNotifyMethod}
          disclaimer="We'll monitor Recreation.gov around the clock and let you know when a cancellation occurs."
        />
      );
      cta = <CtaButton onClick={() => setView("confirmed")}>Confirm alert</CtaButton>;
      break;

    case "reminder-setup":
      title = "Set a reminder";
      body = (
        <SetupContent
          cabinName={cabinName}
          dateRange={dateRange}
          firstToggle={
            <div>
              <p className="text-label text-wax/60 mb-3">When should we notify you?</p>
              <ToggleOptions
                options={[
                  { label: "1 day", value: "1day" },
                  { label: "1 week", value: "1week" },
                ]}
                value={notifyWhen}
                onChange={setNotifyWhen}
              />
            </div>
          }
          notifyMethod={notifyMethod}
          onNotifyChange={setNotifyMethod}
          disclaimer={`We'll be sure to send you a heads up before ${cabinName} opens for booking.`}
        />
      );
      cta = <CtaButton onClick={() => setView("confirmed")}>Confirm reminder</CtaButton>;
      break;

    default: // "calendar"
      title = "Select your travel days";
      body = (
        <CalendarInput
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={handleDateChange}
          bookedDates={bookedDates}
        />
      );
      cta = calendarCta();
  }

  return (
    <BookingPanel title={title} cta={cta}>
      {body}
    </BookingPanel>
  );
}
