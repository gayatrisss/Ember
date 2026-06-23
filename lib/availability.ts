// Shared Recreation.gov availability access.
//
// Used by two callers:
//  - /api/availability route  → client-driven month navigation in the panel
//  - the cabin page (server)   → prefetch of the initially shown month(s) so the
//    panel paints with data already in hand, skipping the client loading spinner.
//
// Both go through `fetchMonthAvailability`, so the rec.gov URL + headers live in
// one place. fetch() caching (revalidate: 300) dedupes identical month requests
// across the route and the server render within the window.

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

// ─── Availability interpretation (shared by the booking panel + the cron) ──────
//
// rec.gov returns, per campsite, an `availabilities` map of date -> status string.
// These pure functions turn that raw shape into Ember's notion of availability. They
// live here (next to the fetch) so the UI and the notifications cron judge
// availability identically — one source of truth, no drift.
//
// IMPORTANT: bookability comes from `availabilities`, NOT the parallel `quantities`
// map rec.gov also returns. A "Closed" night still reports quantity === 1, so a
// quantity check reads closures as bookable. Only status === "Available" is bookable.

export type AvailabilityStatus = "available" | "booked" | "not-open";
// The rec.gov per-night status values we special-case. Everything else (Closed,
// NYR, "Not Reservable", …) falls through to "not bookable / not open".
const STATUS_AVAILABLE = "Available";
const STATUS_RESERVED = "Reserved";
const STATUS_CLOSED = "Closed";
// Statuses that are "watchable" — currently unbookable, but the site exists and could
// turn Available, so a cancellation-style alert is worth offering. A seasonal closure
// rarely lifts, but the cron polls for "Available" regardless of why it was blocked,
// so the mechanism works. Genuinely not-yet-released / missing nights are NOT here —
// those route to "not-open" (a reminder), since there's no live inventory to watch.
const WATCHABLE_STATUSES = new Set([STATUS_AVAILABLE, STATUS_RESERVED, STATUS_CLOSED]);
// One campsite's nightly status, keyed by the rec.gov date string.
export type CampsiteData = { availabilities: Record<string, string> };
// The slice of a rec.gov month response we care about.
export type MonthAvailability = { campsites?: Record<string, CampsiteData> };
// A bookable stay. `to` is the checkout day (exclusive night), matching the
// alert date_from/date_to convention. Both are "YYYY-MM-DD".
export type AvailableWindow = { from: string; to: string };

// The rec.gov quantity-key format for a calendar date, e.g. "2026-07-08T00:00:00Z".
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00Z`;
}

// A calendar date as "YYYY-MM-DD" — the DB / alert date format.
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The set of "YYYY-MM" month keys a [checkIn, checkOut) range touches.
export function getMonthKeys(checkIn: Date, checkOut: Date): string[] {
  const months = new Set<string>();
  const d = new Date(checkIn);
  while (d < checkOut) {
    months.add(monthKey(d.getFullYear(), d.getMonth()));
    d.setDate(d.getDate() + 1);
  }
  return Array.from(months);
}

// Every date marked "Available" on ANY campsite across all cached months. Used by
// the calendar to dot individually-bookable nights — NOT for multi-night bookability.
export function extractAvailableDates(monthCache: Record<string, unknown>): Set<string> {
  const result = new Set<string>();
  for (const data of Object.values(monthCache)) {
    if (!data || typeof data !== "object") continue;
    const campsites = Object.values((data as MonthAvailability).campsites ?? {});
    for (const campsite of campsites) {
      for (const [key, status] of Object.entries(campsite.availabilities)) {
        if (status === STATUS_AVAILABLE) result.add(key);
      }
    }
  }
  return result;
}

// Merges many months' campsite availability maps into one map keyed by absolute date.
// Same campsite id across months has its nightly statuses combined. Non-object
// entries (e.g. a month that failed to fetch) are skipped.
export function mergeCampsites(months: unknown[]): Record<string, CampsiteData> {
  const merged: Record<string, CampsiteData> = {};
  for (const data of months) {
    if (!data || typeof data !== "object") continue;
    for (const [id, campsite] of Object.entries((data as MonthAvailability).campsites ?? {})) {
      if (!merged[id]) merged[id] = { availabilities: {} };
      Object.assign(merged[id].availabilities, campsite.availabilities);
    }
  }
  return merged;
}

// Status of a specific [checkIn, checkOut) stay:
//   "available" — some single campsite is "Available" every night of the range
//   "not-open"  — some night is not watchable anywhere (not-yet-released or missing
//                 from the data) → offer a reminder
//   "booked"    — every night is watchable (taken or closed), but no single campsite
//                 is available for the whole stay → offer a cancellation alert
export function parseStatus(
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
    if (nights.every((n) => campsite.availabilities[n] === STATUS_AVAILABLE)) return "available";
  }
  const watchableSomewhere = (n: string) =>
    Object.values(campsites).some((c) => WATCHABLE_STATUSES.has(c.availabilities[n]));
  if (nights.some((n) => !watchableSomewhere(n))) return "not-open";
  return "booked";
}

// Every maximal run of consecutive nights bookable on a SINGLE campsite within
// [searchFrom, searchTo). Each run is one distinct bookable stay; identical
// (from, to) windows across campsites are deduped. This is the flexible matching
// path — the cron pads the search window ±7 before calling. (Strict matching uses
// parseStatus on the exact range instead.)
export function findAvailableWindows(
  campsites: Record<string, CampsiteData>,
  searchFrom: Date,
  searchTo: Date
): AvailableWindow[] {
  const nights: Date[] = [];
  const cursor = new Date(searchFrom);
  while (cursor < searchTo) {
    nights.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const seen = new Set<string>();
  const windows: AvailableWindow[] = [];

  const emit = (start: Date, lastNight: Date) => {
    const checkout = new Date(lastNight);
    checkout.setDate(checkout.getDate() + 1);
    const win = { from: toDateStr(start), to: toDateStr(checkout) };
    const k = `${win.from}|${win.to}`;
    if (seen.has(k)) return;
    seen.add(k);
    windows.push(win);
  };

  for (const campsite of Object.values(campsites)) {
    let runStart: Date | null = null;
    for (let i = 0; i < nights.length; i++) {
      const open = campsite.availabilities[dateKey(nights[i])] === STATUS_AVAILABLE;
      if (open && runStart === null) runStart = nights[i];
      if (!open && runStart !== null) {
        emit(runStart, nights[i - 1]);
        runStart = null;
      } else if (open && i === nights.length - 1) {
        emit(runStart as Date, nights[i]);
        runStart = null;
      }
    }
  }

  windows.sort((a, b) => {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.to !== b.to) return a.to < b.to ? -1 : 1;
    return 0;
  });
  return windows;
}

// Fetches raw Recreation.gov availability for a single month (month is 0-indexed).
// Returns the parsed JSON, or null on any failure — callers decide how to surface it.
export async function fetchMonthAvailability(
  facilityId: string,
  year: number,
  month: number
): Promise<unknown | null> {
  const startDate = new Date(Date.UTC(year, month, 1)).toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const url = `https://www.recreation.gov/api/camps/availability/campground/${facilityId}/month?start_date=${encodeURIComponent(startDate)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.log("[ember] availability fetch: rec.gov returned", res.status, "for facility", facilityId);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.log("[ember] availability fetch failed", err);
    return null;
  }
}

// The months the panel needs on first render, given optional check-in/out date
// strings ("YYYY-MM-DD"). Always includes the month the calendar opens to (the
// check-in month, or the current month when no dates are present), plus every
// month the selected range spans — mirroring the panel's night-by-night walk
// (`d < checkOut`) so we seed exactly what the availability check reads.
function monthsForInitialView(
  checkIn: string | null,
  checkOut: string | null
): { year: number; month: number }[] {
  if (!checkIn) {
    const now = new Date();
    return [{ year: now.getFullYear(), month: now.getMonth() }];
  }

  const start = new Date(`${checkIn}T12:00:00`);
  const seen = new Set<string>();
  const months: { year: number; month: number }[] = [];
  const add = (d: Date) => {
    const key = monthKey(d.getFullYear(), d.getMonth());
    if (seen.has(key)) return;
    seen.add(key);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  };

  add(start); // the month the calendar opens to is always shown

  if (checkOut) {
    const end = new Date(`${checkOut}T12:00:00`);
    const d = new Date(start);
    while (d < end) {
      add(d);
      d.setDate(d.getDate() + 1);
    }
  }

  return months;
}

// Server-side prefetch entry point for the cabin page. Returns a partial
// month-cache (keyed "YYYY-MM") covering the panel's initial view, ready to seed
// AvailabilityPanel. Months that fail to fetch are simply omitted, letting the
// client retry them on demand.
export async function fetchInitialMonths(
  facilityId: string,
  checkIn: string | null,
  checkOut: string | null
): Promise<Record<string, unknown>> {
  const months = monthsForInitialView(checkIn, checkOut);
  const results = await Promise.all(
    months.map((m) => fetchMonthAvailability(facilityId, m.year, m.month))
  );

  const cache: Record<string, unknown> = {};
  months.forEach((m, i) => {
    if (results[i] != null) cache[monthKey(m.year, m.month)] = results[i];
  });
  return cache;
}
