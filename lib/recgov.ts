/**
 * Canonical Recreation.gov links for a facility.
 *
 * The URL path depends on the facility's type, which is NOT uniform across our data:
 *
 *   Campground (508)         → /camping/campgrounds/{id}
 *   Permit (2)               → /permits/{id}
 *   Venue Reservations (1)   → /venues/{id}
 *
 * The campground template was previously inlined in five places and applied to every
 * cabin, which produced a raw `{"error":"error fetching campground"}` response for the
 * three non-Campground facilities — including the `bookUrl` in availability emails.
 *
 * The resolved URL is stored per-row in `cabins.reservation_url`, so callers that have
 * loaded the cabin should pass it and never think about path rules. The derived
 * fallback exists for callers that only hold a facility id, and is correct for the 508
 * campgrounds; it is deliberately the same template as before so behaviour is unchanged
 * wherever the stored value hasn't been threaded through yet.
 */

const CAMPGROUND_BASE = "https://www.recreation.gov/camping/campgrounds";

/**
 * Recreation.gov URL for a facility. Prefers the stored `reservation_url` (authoritative,
 * type-aware); falls back to the campground template when the caller only has an id.
 */
export function recGovUrl(facilityId: string, storedUrl?: string | null): string {
  // Deliberately not `??`: an empty or whitespace-only column value is absent, not a URL.
  // `??` would pass it through and render href="" — a dead link on what is, for the
  // explore card, the only explicit affordance.
  const stored = storedUrl?.trim();
  return stored ? stored : `${CAMPGROUND_BASE}/${facilityId}`;
}
