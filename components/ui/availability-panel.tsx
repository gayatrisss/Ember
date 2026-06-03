"use client";

import { useState, useEffect, useReducer, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookingPanel } from "@/components/ui/booking-panel";
import { CalendarInput } from "@/components/ui/calendar-input";
import { ToggleOptions } from "@/components/ui/toggle-options";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

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

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00Z`;
}

// Returns the set of "YYYY-MM" keys needed to cover a date range.
function getMonthKeys(checkIn: Date, checkOut: Date): string[] {
  const months = new Set<string>();
  const d = new Date(checkIn);
  while (d < checkOut) {
    months.add(toMonthKey(d.getFullYear(), d.getMonth()));
    d.setDate(d.getDate() + 1);
  }
  return Array.from(months);
}

// Extracts dates with quantity === 1 on ANY campsite across all cached months.
// Only these dates are considered available — everything else defaults to unavailable.
function extractAvailableDates(monthCache: Record<string, unknown>): Set<string> {
  const result = new Set<string>();
  for (const data of Object.values(monthCache)) {
    if (!data || typeof data !== "object") continue;
    const campsites = Object.values(
      (data as { campsites?: Record<string, CampsiteData> }).campsites ?? {}
    );
    for (const campsite of campsites) {
      for (const [key, qty] of Object.entries(campsite.quantities)) {
        if (qty === 1) result.add(key);
      }
    }
  }
  return result;
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

function CtaButton({
  onClick,
  href,
  children,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const cls =
    "block w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110 text-center";
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

function SetupContent({
  cabinName,
  dateRange,
  firstToggle,
  disclaimer,
}: {
  cabinName: string;
  dateRange: string;
  firstToggle: React.ReactNode;
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
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read URL params written by handleSetupAlert before the OAuth redirect.
  // Using them as useState initializers avoids calling setState inside an effect.
  const viewParam = searchParams.get("view") as View | null;
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const restoredView: View =
    viewParam === "alert-setup" || viewParam === "reminder-setup" ? viewParam : "calendar";

  const [view, setView] = useState<View>(restoredView);
  const [checkIn, setCheckIn] = useState<Date | null>(
    checkInParam ? new Date(`${checkInParam}T12:00:00`) : null
  );
  const [checkOut, setCheckOut] = useState<Date | null>(
    checkOutParam ? new Date(`${checkOutParam}T12:00:00`) : null
  );
  const [avail, dispatch] = useReducer(availReducer, {
    loading: false,
    error: false,
    status: null,
  });
  const [flexibility, setFlexibility] = useState("strict");
  const [notifyWhen, setNotifyWhen] = useState("1week");

  // Clean up the URL params once state has been restored from the OAuth redirect.
  useEffect(() => {
    if (viewParam) router.replace(`/cabin/${facilityId}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSetupAlert(targetView: "alert-setup" | "reminder-setup") {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const checkInStr = checkIn ? checkIn.toISOString().split("T")[0] : "";
      const checkOutStr = checkOut ? checkOut.toISOString().split("T")[0] : "";
      const next = `/cabin/${facilityId}?view=${targetView}${checkInStr ? `&checkIn=${checkInStr}` : ""}${checkOutStr ? `&checkOut=${checkOutStr}` : ""}`;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      return;
    }

    setView(targetView);
  }

  // Keyed by "YYYY-MM" → raw API response. Source of truth for all availability.
  const [monthCache, setMonthCache] = useState<Record<string, unknown>>({});
  // Tracks in-flight requests to prevent duplicate fetches.
  const inFlight = useRef<Set<string>>(new Set());

  function fetchMonth(year: number, month: number) {
    const key = toMonthKey(year, month);
    if (monthCache[key] !== undefined || inFlight.current.has(key)) return;
    inFlight.current.add(key);
    fetch(`/api/availability?facilityId=${facilityId}&month=${key}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        inFlight.current.delete(key);
        if (json) {
          console.log("[ember] availability-panel cached", key);
          setMonthCache((prev) => ({ ...prev, [key]: json }));
        }
      })
      .catch((err) => {
        inFlight.current.delete(key);
        console.log("[ember] availability-panel fetch error", key, err);
      });
  }

  // Fetch current month on mount.
  useEffect(() => {
    const now = new Date();
    fetchMonth(now.getFullYear(), now.getMonth());
  }, [facilityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive available dates and fetched months from the cache.
  const availableDates = useMemo(() => extractAvailableDates(monthCache), [monthCache]);
  const fetchedMonths = useMemo(() => new Set(Object.keys(monthCache)), [monthCache]);

  function handleDateChange(newIn: Date | null, newOut: Date | null) {
    setCheckIn(newIn);
    setCheckOut(newOut);
    dispatch({ type: "reset" });
  }

  // When the calendar navigates to a new month, fetch its data if not cached.
  function handleMonthChange(year: number, month: number) {
    fetchMonth(year, month);
  }

  // Re-evaluate availability whenever dates or cache change.
  useEffect(() => {
    if (!checkIn || !checkOut) return;

    const monthKeys = getMonthKeys(checkIn, checkOut);

    // Trigger fetches for any uncached months needed by the selected range.
    for (const key of monthKeys) {
      const [y, m] = key.split("-").map(Number);
      fetchMonth(y, m - 1);
    }

    // Wait until all needed months are in cache.
    const allCached = monthKeys.every((key) => monthCache[key] !== undefined);
    if (!allCached) {
      dispatch({ type: "loading" });
      return;
    }

    // Merge campsite data from the relevant cached months.
    const merged: Record<string, CampsiteData> = {};
    for (const key of monthKeys) {
      const data = monthCache[key];
      for (const [id, campsite] of Object.entries(
        (data as { campsites?: Record<string, CampsiteData> }).campsites ?? {}
      )) {
        if (!merged[id]) merged[id] = { quantities: {} };
        Object.assign(merged[id].quantities, (campsite as CampsiteData).quantities);
      }
    }

    if (Object.keys(merged).length === 0) {
      dispatch({ type: "error" });
      return;
    }

    dispatch({ type: "success", status: parseStatus(merged, checkIn, checkOut) });
  }, [checkIn, checkOut, monthCache]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derive slots from view ────────────────────────────────────────────────
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
          <CtaButton onClick={() => handleSetupAlert("alert-setup")}>Set up an alert →</CtaButton>
        </>
      );
    if (avail.status === "not-open")
      return (
        <>
          <p className="text-label text-wax/60 text-center mb-4 leading-relaxed">
            Booking isn&apos;t open yet for these dates.
          </p>
          <CtaButton onClick={() => handleSetupAlert("reminder-setup")}>Set a reminder →</CtaButton>
        </>
      );
    return null;
  };

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
          availableDates={availableDates}
          fetchedMonths={fetchedMonths}
          onMonthChange={handleMonthChange}
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
