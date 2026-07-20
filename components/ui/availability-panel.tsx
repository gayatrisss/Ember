"use client";

import { useState, useEffect, useReducer, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookingPanel } from "@/components/ui/booking-panel";
import { CalendarInput } from "@/components/ui/calendar-input";
import { ToggleOptions } from "@/components/ui/toggle-options";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Info, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";
import {
  monthKey,
  toDateStr,
  getMonthKeys,
  extractAvailableDates,
  parseStatus,
  mergeCampsites,
  type AvailabilityStatus,
} from "@/lib/availability";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "calendar" | "alert-setup" | "reminder-setup" | "confirmed";

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
  disabled,
  children,
}: {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "block w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110 text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
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

function ConfirmedContent({
  cabinName,
  email,
  alertId,
}: {
  cabinName: string;
  email: string | null;
  // Set only for cancellation alerts — enables the "preview the email" action.
  alertId: string | null;
}) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  async function sendPreview() {
    if (!alertId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/dev/trigger-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          intent: "success",
          title: "Preview sent!",
          description: `Check ${email ?? "your inbox"}.`,
          icon: <Info size={24} />,
        });
      } else {
        toast({
          intent: "error",
          title: "Couldn't send the preview",
          description: data.detail ?? data.error ?? "Something went wrong.",
          icon: <Info size={24} />,
        });
      }
    } catch {
      toast({
        intent: "error",
        title: "Couldn't send the preview",
        description: "Something went wrong.",
        icon: <Info size={24} />,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center h-full">
      <div className="text-5xl">🏕️</div>
      <p className="text-heading text-wax mt-6">Fantastic! The alert is set.</p>
      <p className="text-body text-wax/60 mt-3">
        We&apos;ll reach out the moment {cabinName} opens up.
        {alertId && " Curious what we send? Email yourself a preview."}
      </p>

      {alertId && (
        <button
          type="button"
          onClick={sendPreview}
          disabled={sending}
          className="mt-6 inline-flex items-center gap-2 bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          Trigger test email
          {sending ? <Spinner size={16} /> : <Send size={16} />}
        </button>
      )}
    </div>
  );
}

// ─── AvailabilityPanel ────────────────────────────────────────────────────────

export function AvailabilityPanel({
  facilityId,
  cabinName,
  initialMonths,
}: {
  facilityId: string;
  cabinName: string;
  // Month cache seeded by the server (keyed "YYYY-MM") covering the panel's
  // initial view, so the first paint has data and skips the loading state.
  initialMonths?: Record<string, unknown>;
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
  // null = "not yet touched"; the control defaults to the whole window (see
  // effectiveMinNights below), which reproduces the old "strict" behavior.
  const [minNights, setMinNights] = useState<number | null>(null);
  const [notifyWhen, setNotifyWhen] = useState("1week");
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [confirmedAlertId, setConfirmedAlertId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleConfirm(type: "cancellation" | "reminder") {
    if (!checkIn || !checkOut) return;
    setSubmitError(null);
    setSubmitting(true);

    const payload: Record<string, string | number> = {
      facilityId,
      type,
      dateFrom: toDateStr(checkIn),
      dateTo: toDateStr(checkOut),
    };
    if (type === "cancellation") {
      const windowNights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
      payload.minNights = minNights ?? windowNights;
    }
    if (type === "reminder") payload.notifyWhen = notifyWhen;

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          duplicate: "You're already watching this cabin for those dates.",
          overlap: "You already have an alert covering these dates.",
        };
        setSubmitError(errorMessages[data.error] ?? "Something went wrong. Please try again.");
        return;
      }

      setConfirmedEmail(data.email);
      setConfirmedAlertId(type === "cancellation" ? data.alertId : null);
      setView("confirmed");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Keyed by "YYYY-MM" → raw API response. Source of truth for all availability.
  // Seeded from the server-prefetched initial month(s) so the panel paints with
  // data instead of a spinner; further months are fetched on demand.
  const [monthCache, setMonthCache] = useState<Record<string, unknown>>(initialMonths ?? {});
  // Tracks in-flight requests to prevent duplicate fetches.
  const inFlight = useRef<Set<string>>(new Set());

  function fetchMonth(year: number, month: number) {
    const key = monthKey(year, month);
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

  // Ensure the initially shown month is loaded. Normally it's already seeded from
  // the server (so this no-ops); this only fetches when the server prefetch failed.
  useEffect(() => {
    const initial = checkIn ?? new Date();
    fetchMonth(initial.getFullYear(), initial.getMonth());
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
    const merged = mergeCampsites(monthKeys.map((key) => monthCache[key]));

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
  const windowNights =
    checkIn && checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000) : 0;
  // Default the minimum to the whole window (strict-equivalent); clamp any prior
  // pick to the current window so it can never exceed it.
  const effectiveMinNights = Math.min(minNights ?? windowNights, Math.max(windowNights, 1));
  const nightsOptions = Array.from({ length: Math.max(windowNights, 1) }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} ${i === 0 ? "night" : "nights"}`,
  }));
  let title: string;
  let body: React.ReactNode;
  let cta: React.ReactNode;

  switch (view) {
    case "confirmed":
      title = "";
      body = <ConfirmedContent cabinName={cabinName} email={confirmedEmail} alertId={confirmedAlertId} />;
      cta = null;
      break;

    case "alert-setup":
      title = "Set up your alert";
      body = (
        <SetupContent
          cabinName={cabinName}
          dateRange={dateRange}
          firstToggle={
            <div className="flex flex-wrap items-center gap-2 text-body text-wax">
              <span>Alert me when at least</span>
              <Select
                value={String(effectiveMinNights)}
                options={nightsOptions}
                onChange={(v) => setMinNights(Number(v))}
                ariaLabel="Minimum nights"
              />
              <span>{effectiveMinNights === 1 ? "opens" : "open"} up in your date range.</span>
            </div>
          }
          disclaimer="We'll monitor Recreation.gov around the clock and let you know when a cancellation occurs."
        />
      );
      cta = (
        <>
          {submitError && (
            <p className="text-label text-ember text-center mb-3">{submitError}</p>
          )}
          <CtaButton onClick={() => handleConfirm("cancellation")} disabled={submitting}>
            {submitting ? "Confirming..." : "Confirm alert"}
          </CtaButton>
        </>
      );
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
      cta = (
        <>
          {submitError && (
            <p className="text-label text-ember text-center mb-3">{submitError}</p>
          )}
          <CtaButton onClick={() => handleConfirm("reminder")} disabled={submitting}>
            {submitting ? "Confirming..." : "Confirm reminder"}
          </CtaButton>
        </>
      );
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
          initialMonth={checkIn?.getMonth()}
          initialYear={checkIn?.getFullYear()}
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
