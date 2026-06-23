import { describe, it, expect } from "vitest";
import {
  monthKey,
  dateKey,
  toDateStr,
  getMonthKeys,
  extractAvailableDates,
  mergeCampsites,
  parseStatus,
  findAvailableWindows,
  type CampsiteData,
} from "@/lib/availability";

// Local-midnight Date for a calendar day (month is 1-indexed here for readability).
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

// A campsite with explicit per-night statuses, e.g. ([2026,7,7,"Closed"], ...).
function withStatus(...nights: [number, number, number, string][]): CampsiteData {
  const availabilities: Record<string, string> = {};
  for (const [y, m, d, status] of nights) availabilities[dateKey(day(y, m, d))] = status;
  return { availabilities };
}

// A campsite that is "Available" on the given calendar days (1-indexed month).
function openOn(...days: [number, number, number][]): CampsiteData {
  return withStatus(...days.map(([y, m, d]) => [y, m, d, "Available"] as [number, number, number, string]));
}

describe("monthKey", () => {
  it("formats year + 0-indexed month as YYYY-MM", () => {
    expect(monthKey(2026, 6)).toBe("2026-07");
    expect(monthKey(2026, 0)).toBe("2026-01");
    expect(monthKey(2026, 11)).toBe("2026-12");
  });
});

describe("dateKey", () => {
  it("formats a date as the rec.gov quantity key", () => {
    expect(dateKey(day(2026, 7, 8))).toBe("2026-07-08T00:00:00Z");
    expect(dateKey(day(2026, 1, 1))).toBe("2026-01-01T00:00:00Z");
  });
});

describe("toDateStr", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(toDateStr(day(2026, 7, 8))).toBe("2026-07-08");
    expect(toDateStr(day(2026, 12, 31))).toBe("2026-12-31");
  });
});

describe("getMonthKeys", () => {
  it("returns the single month for an in-month range", () => {
    expect(getMonthKeys(day(2026, 7, 4), day(2026, 7, 6))).toEqual(["2026-07"]);
  });

  it("spans months when the range crosses a boundary", () => {
    expect(getMonthKeys(day(2026, 7, 30), day(2026, 8, 3))).toEqual(["2026-07", "2026-08"]);
  });

  it("spans three months for a long range", () => {
    expect(getMonthKeys(day(2026, 5, 1), day(2026, 7, 31))).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("crosses a year boundary", () => {
    expect(getMonthKeys(day(2026, 12, 30), day(2027, 1, 2))).toEqual(["2026-12", "2027-01"]);
  });

  it("is empty when checkOut is not after checkIn", () => {
    expect(getMonthKeys(day(2026, 7, 4), day(2026, 7, 4))).toEqual([]);
  });
});

describe("extractAvailableDates", () => {
  it("collects only 'Available' keys across all campsites", () => {
    const cache = {
      "2026-07": {
        campsites: {
          A: withStatus([2026, 7, 5, "Available"], [2026, 7, 6, "Reserved"]),
          B: withStatus([2026, 7, 6, "Available"]),
        },
      },
    };
    const result = extractAvailableDates(cache);
    expect(result.has(dateKey(day(2026, 7, 5)))).toBe(true); // Available on A
    expect(result.has(dateKey(day(2026, 7, 6)))).toBe(true); // Available on B (any campsite)
    expect(result.size).toBe(2); // Jul 6 Reserved on A is not counted
  });

  it("excludes Closed nights even though rec.gov reports quantity 1 for them", () => {
    const cache = {
      "2026-07": {
        campsites: { A: { availabilities: { [dateKey(day(2026, 7, 7))]: "Closed" } } },
      },
    };
    expect(extractAvailableDates(cache).size).toBe(0);
  });

  it("skips months that failed to fetch (null / non-object)", () => {
    const cache = { "2026-07": null, "2026-08": "oops" } as Record<string, unknown>;
    expect(extractAvailableDates(cache).size).toBe(0);
  });
});

describe("mergeCampsites", () => {
  it("combines a campsite's nightly statuses across months", () => {
    const julyJson = {
      campsites: { A: { availabilities: { [dateKey(day(2026, 7, 31))]: "Available" } } },
    };
    const augJson = {
      campsites: { A: { availabilities: { [dateKey(day(2026, 8, 1))]: "Available" } } },
    };
    const merged = mergeCampsites([julyJson, augJson]);
    expect(Object.keys(merged)).toEqual(["A"]);
    expect(merged.A.availabilities[dateKey(day(2026, 7, 31))]).toBe("Available");
    expect(merged.A.availabilities[dateKey(day(2026, 8, 1))]).toBe("Available");
  });

  it("keeps distinct campsites separate and skips bad months", () => {
    const merged = mergeCampsites([
      { campsites: { A: { availabilities: { x: "Available" } } } },
      null,
      { campsites: { B: { availabilities: { y: "Available" } } } },
    ]);
    expect(Object.keys(merged).sort()).toEqual(["A", "B"]);
  });
});

describe("parseStatus", () => {
  it("is 'available' when one campsite is Available every night of the range", () => {
    const campsites = { A: openOn([2026, 7, 5], [2026, 7, 6]) };
    expect(parseStatus(campsites, day(2026, 7, 5), day(2026, 7, 7))).toBe("available");
  });

  it("is not 'available' when a night is Closed — the Trail Creek bug", () => {
    // Jul 8 closed, Jul 9 available -> the stay is not bookable as-is
    const campsites = { A: withStatus([2026, 7, 8, "Closed"], [2026, 7, 9, "Available"]) };
    expect(parseStatus(campsites, day(2026, 7, 8), day(2026, 7, 10))).not.toBe("available");
  });

  it("treats a Closed night as watchable -> 'booked' (offer an alert)", () => {
    const campsites = { A: withStatus([2026, 7, 8, "Closed"], [2026, 7, 9, "Available"]) };
    expect(parseStatus(campsites, day(2026, 7, 8), day(2026, 7, 10))).toBe("booked");
  });

  it("is 'booked' for a fully-closed range (closure may lift; watch it)", () => {
    const campsites = { A: withStatus([2026, 7, 7, "Closed"], [2026, 7, 8, "Closed"]) };
    expect(parseStatus(campsites, day(2026, 7, 7), day(2026, 7, 9))).toBe("booked");
  });

  it("is 'booked' when nights are reserved (cancellation-alert territory)", () => {
    const campsites = { A: withStatus([2026, 7, 5, "Reserved"], [2026, 7, 6, "Reserved"]) };
    expect(parseStatus(campsites, day(2026, 7, 5), day(2026, 7, 7))).toBe("booked");
  });

  it("is 'booked' when nights are reservable but split across campsites", () => {
    const campsites = {
      A: withStatus([2026, 7, 5, "Available"], [2026, 7, 6, "Reserved"]),
      B: withStatus([2026, 7, 5, "Reserved"], [2026, 7, 6, "Available"]),
    };
    expect(parseStatus(campsites, day(2026, 7, 5), day(2026, 7, 7))).toBe("booked");
  });

  it("is 'not-open' when a night is absent from the data entirely", () => {
    const campsites = { A: openOn([2026, 7, 5]) }; // July 6 never appears
    expect(parseStatus(campsites, day(2026, 7, 5), day(2026, 7, 7))).toBe("not-open");
  });
});

describe("findAvailableWindows", () => {
  it("returns a single contiguous run as a checkout-exclusive window", () => {
    const campsites = { A: openOn([2026, 7, 5], [2026, 7, 6], [2026, 7, 7]) };
    expect(findAvailableWindows(campsites, day(2026, 7, 1), day(2026, 7, 31))).toEqual([
      { from: "2026-07-05", to: "2026-07-08" },
    ]);
  });

  it("treats a Closed night as a break, not part of a run", () => {
    const campsites = {
      A: withStatus(
        [2026, 7, 5, "Available"],
        [2026, 7, 6, "Closed"],
        [2026, 7, 7, "Available"]
      ),
    };
    expect(findAvailableWindows(campsites, day(2026, 7, 1), day(2026, 7, 31))).toEqual([
      { from: "2026-07-05", to: "2026-07-06" },
      { from: "2026-07-07", to: "2026-07-08" },
    ]);
  });

  it("splits non-consecutive nights into separate windows", () => {
    const campsites = { A: openOn([2026, 7, 5], [2026, 7, 6], [2026, 7, 10]) };
    expect(findAvailableWindows(campsites, day(2026, 7, 1), day(2026, 7, 31))).toEqual([
      { from: "2026-07-05", to: "2026-07-07" },
      { from: "2026-07-10", to: "2026-07-11" },
    ]);
  });

  it("dedupes identical windows found on different campsites", () => {
    const campsites = {
      A: openOn([2026, 7, 5], [2026, 7, 6]),
      B: openOn([2026, 7, 5], [2026, 7, 6]),
    };
    expect(findAvailableWindows(campsites, day(2026, 7, 1), day(2026, 7, 31))).toEqual([
      { from: "2026-07-05", to: "2026-07-07" },
    ]);
  });

  it("keeps different-length windows from different campsites as distinct openings", () => {
    const campsites = {
      A: openOn([2026, 7, 5], [2026, 7, 6]), // 2 nights -> to 07
      B: openOn([2026, 7, 5], [2026, 7, 6], [2026, 7, 7], [2026, 7, 8]), // 4 nights -> to 09
    };
    expect(findAvailableWindows(campsites, day(2026, 7, 1), day(2026, 7, 31))).toEqual([
      { from: "2026-07-05", to: "2026-07-07" },
      { from: "2026-07-05", to: "2026-07-09" },
    ]);
  });

  it("finds a run that spans a month boundary", () => {
    const campsites = { A: openOn([2026, 7, 30], [2026, 7, 31], [2026, 8, 1]) };
    expect(findAvailableWindows(campsites, day(2026, 7, 1), day(2026, 8, 5))).toEqual([
      { from: "2026-07-30", to: "2026-08-02" },
    ]);
  });

  it("clips a run that reaches the end of the search window", () => {
    const campsites = { A: openOn([2026, 7, 29], [2026, 7, 30]) };
    // search window ends at Aug 1 (exclusive); last open night is July 30 -> checkout July 31
    expect(findAvailableWindows(campsites, day(2026, 7, 28), day(2026, 8, 1))).toEqual([
      { from: "2026-07-29", to: "2026-07-31" },
    ]);
  });

  it("returns nothing when no nights are Available", () => {
    const campsites = { A: withStatus([2026, 7, 5, "Reserved"], [2026, 7, 6, "Closed"]) };
    expect(findAvailableWindows(campsites, day(2026, 7, 1), day(2026, 7, 31))).toEqual([]);
  });
});
