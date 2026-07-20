import { describe, it, expect, vi } from "vitest";
import { monthsForAlert, matchAlert, checkAlerts, type CancellationAlert } from "@/lib/notifications/check";
import { dateKey, type CampsiteData } from "@/lib/availability";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

// A facility month response with the given nights marked "Available".
function monthJson(...nights: [number, number, number][]): unknown {
  const availabilities: Record<string, string> = {};
  for (const [y, m, d] of nights) availabilities[dateKey(day(y, m, d))] = "Available";
  return { campsites: { A: { availabilities } } };
}

// A merged campsite map (what matchAlert receives) with the given Available nights.
function merged(...nights: [number, number, number][]): Record<string, CampsiteData> {
  const availabilities: Record<string, string> = {};
  for (const [y, m, d] of nights) availabilities[dateKey(day(y, m, d))] = "Available";
  return { A: { availabilities } };
}

const alert = (over: Partial<CancellationAlert>): CancellationAlert => ({
  id: "a1",
  user_id: "U1",
  facility_id: "F1",
  date_from: "2026-07-04",
  date_to: "2026-07-06",
  min_nights: null,
  ...over,
});

describe("monthsForAlert", () => {
  it("just the months the window touches", () => {
    expect(monthsForAlert(alert({ date_from: "2026-07-04", date_to: "2026-07-06" }))).toEqual([
      "2026-07",
    ]);
  });

  it("spans a month boundary", () => {
    expect(monthsForAlert(alert({ date_from: "2026-07-30", date_to: "2026-08-02" }))).toEqual([
      "2026-07",
      "2026-08",
    ]);
  });
});

describe("matchAlert", () => {
  it("min_nights=1: alerts on any open run in the exact window", () => {
    const a = alert({ date_from: "2026-07-04", date_to: "2026-07-10", min_nights: 1 });
    // Jul 5 (1 night) and Jul 7-8 (2 nights) open
    const windows = matchAlert(a, merged([2026, 7, 5], [2026, 7, 7], [2026, 7, 8]));
    expect(windows).toEqual([
      { from: "2026-07-05", to: "2026-07-06" },
      { from: "2026-07-07", to: "2026-07-09" },
    ]);
  });

  it("min_nights=2: ignores runs shorter than 2 nights", () => {
    const a = alert({ date_from: "2026-07-04", date_to: "2026-07-10", min_nights: 2 });
    const windows = matchAlert(a, merged([2026, 7, 5], [2026, 7, 7], [2026, 7, 8]));
    expect(windows).toEqual([{ from: "2026-07-07", to: "2026-07-09" }]);
  });

  it("min_nights == window length requires the whole window (strict-equivalent)", () => {
    const a = alert({ date_from: "2026-07-04", date_to: "2026-07-06", min_nights: 2 });
    expect(matchAlert(a, merged([2026, 7, 4], [2026, 7, 5]))).toEqual([
      { from: "2026-07-04", to: "2026-07-06" },
    ]);
    expect(matchAlert(a, merged([2026, 7, 4]))).toEqual([]); // Jul 5 missing
  });

  it("null min_nights falls back to the whole window", () => {
    const a = alert({ date_from: "2026-07-04", date_to: "2026-07-06", min_nights: null });
    expect(matchAlert(a, merged([2026, 7, 4], [2026, 7, 5]))).toEqual([
      { from: "2026-07-04", to: "2026-07-06" },
    ]);
    expect(matchAlert(a, merged([2026, 7, 4]))).toEqual([]);
  });

  it("only matches runs inside the exact window (no padding)", () => {
    const a = alert({ date_from: "2026-07-08", date_to: "2026-07-10", min_nights: 1 });
    // Jul 5 is outside the window (Jul 8-9); only Jul 9 counts
    const windows = matchAlert(a, merged([2026, 7, 5], [2026, 7, 9]));
    expect(windows).toEqual([{ from: "2026-07-09", to: "2026-07-10" }]);
  });
});

describe("checkAlerts", () => {
  it("batches fetches per facility, caches email per user, attaches openings", async () => {
    const alerts: CancellationAlert[] = [
      alert({ id: "a1", facility_id: "F1", date_from: "2026-07-04", date_to: "2026-07-06" }), // match
      alert({ id: "a2", facility_id: "F1", date_from: "2026-07-20", date_to: "2026-07-22" }), // no match
      alert({ id: "a3", facility_id: "F2", date_from: "2026-07-04", date_to: "2026-07-06" }), // match, same user
    ];

    const fetchMonth = vi.fn(async (facilityId: string) =>
      facilityId === "F1" || facilityId === "F2" ? monthJson([2026, 7, 4], [2026, 7, 5]) : null
    );
    const getEmail = vi.fn(async (userId: string) => (userId === "U1" ? "u1@example.com" : null));

    const openings = await checkAlerts({
      loadActiveAlerts: async () => alerts,
      fetchMonth,
      getEmail,
    });

    expect(openings).toEqual([
      { alertId: "a1", userId: "U1", facilityId: "F1", email: "u1@example.com", from: "2026-07-04", to: "2026-07-06" },
      { alertId: "a3", userId: "U1", facilityId: "F2", email: "u1@example.com", from: "2026-07-04", to: "2026-07-06" },
    ]);
    // F1 and F2 each need only July -> one fetch each (a1 + a2 share F1's July fetch)
    expect(fetchMonth).toHaveBeenCalledTimes(2);
    // U1's email is resolved once and reused across a1 and a3
    expect(getEmail).toHaveBeenCalledTimes(1);
  });

  it("skips a matched alert when the user has no email", async () => {
    const openings = await checkAlerts({
      loadActiveAlerts: async () => [alert({ id: "a1", user_id: "U2" })],
      fetchMonth: async () => monthJson([2026, 7, 4], [2026, 7, 5]),
      getEmail: async () => null,
    });
    expect(openings).toEqual([]);
  });
});
