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
  flexibility: "strict",
  ...over,
});

describe("monthsForAlert", () => {
  it("strict: just the months the range touches", () => {
    expect(monthsForAlert(alert({ date_from: "2026-07-04", date_to: "2026-07-06" }))).toEqual([
      "2026-07",
    ]);
  });

  it("strict: spans a month boundary", () => {
    expect(monthsForAlert(alert({ date_from: "2026-07-30", date_to: "2026-08-02" }))).toEqual([
      "2026-07",
      "2026-08",
    ]);
  });

  it("flexible: ±7 days can pull in an adjacent month", () => {
    // Jul 4 - 7 = Jun 27, so June is needed too
    expect(
      monthsForAlert(alert({ date_from: "2026-07-04", date_to: "2026-07-06", flexibility: "flexible" }))
    ).toEqual(["2026-06", "2026-07"]);
  });

  it("flexible: a long range spans every month it touches (± pad)", () => {
    expect(
      monthsForAlert(alert({ date_from: "2026-05-01", date_to: "2026-07-31", flexibility: "flexible" }))
    ).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
  });

  it("treats null flexibility as strict", () => {
    expect(monthsForAlert(alert({ flexibility: null }))).toEqual(["2026-07"]);
  });
});

describe("matchAlert", () => {
  it("strict: returns the exact range when it's available", () => {
    const a = alert({ date_from: "2026-07-04", date_to: "2026-07-06", flexibility: "strict" });
    expect(matchAlert(a, merged([2026, 7, 4], [2026, 7, 5]))).toEqual([
      { from: "2026-07-04", to: "2026-07-06" },
    ]);
  });

  it("strict: returns nothing when a night isn't available", () => {
    const a = alert({ date_from: "2026-07-04", date_to: "2026-07-06", flexibility: "strict" });
    expect(matchAlert(a, merged([2026, 7, 4]))).toEqual([]); // Jul 5 missing
  });

  it("flexible: returns every bookable run within the ±7 window", () => {
    const a = alert({ date_from: "2026-07-08", date_to: "2026-07-10", flexibility: "flexible" });
    // window is Jul 1 - Jul 17; two separate open stretches
    const windows = matchAlert(a, merged([2026, 7, 5], [2026, 7, 6], [2026, 7, 12], [2026, 7, 13]));
    expect(windows).toEqual([
      { from: "2026-07-05", to: "2026-07-07" },
      { from: "2026-07-12", to: "2026-07-14" },
    ]);
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
