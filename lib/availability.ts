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
