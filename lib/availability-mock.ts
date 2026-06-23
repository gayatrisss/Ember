// Dev-only synthetic availability, gated by the EMBER_MOCK_AVAILABILITY env var. When
// active, fetchMonthAvailability returns this instead of calling rec.gov, so the whole
// notifications pipeline (checker -> sender -> email) can run end to end without waiting
// on a real cancellation. See docs/notifications-architecture.md ("Dev mode & demo").
//
// EMBER_MOCK_AVAILABILITY values:
//   unset / "0" / "false" / "off"     -> off (real rec.gov)
//   "1" / "true" / "all" / "on"       -> every night Available (fires every alert)
//   "2026-07-08,2026-07-09"           -> only those dates Available, rest Reserved
//                                        (simulate a precise opening)

import { dateKey, toDateStr, type MonthAvailability } from "@/lib/availability";

export type MockConfig =
  | { mode: "off" }
  | { mode: "all" }
  | { mode: "dates"; dates: Set<string> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseMockConfig(raw: string | undefined): MockConfig {
  if (!raw) return { mode: "off" };
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "0" || v === "false" || v === "off") return { mode: "off" };
  if (v === "1" || v === "true" || v === "all" || v === "on") return { mode: "all" };
  const dates = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => DATE_RE.test(s))
  );
  return dates.size > 0 ? { mode: "dates", dates } : { mode: "off" };
}

export function isMockEnabled(): boolean {
  return parseMockConfig(process.env.EMBER_MOCK_AVAILABILITY).mode !== "off";
}

// A rec.gov-shaped month response built from the mock config. Every night of the month
// is present so missing-night ("not-open") logic doesn't trip; each is Available or
// Reserved per the config. Applies to all facilities uniformly.
export function mockMonthAvailability(
  year: number,
  month: number,
  config: MockConfig
): MonthAvailability {
  const availabilities: Record<string, string> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const open = config.mode === "all" || (config.mode === "dates" && config.dates.has(toDateStr(date)));
    availabilities[dateKey(date)] = open ? "Available" : "Reserved";
  }
  return { campsites: { "mock-001": { availabilities } } };
}
