import { describe, it, expect } from "vitest";
import { parseMockConfig, mockMonthAvailability } from "@/lib/availability-mock";
import { dateKey } from "@/lib/availability";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("parseMockConfig", () => {
  it("is off when unset or falsey", () => {
    expect(parseMockConfig(undefined).mode).toBe("off");
    expect(parseMockConfig("").mode).toBe("off");
    expect(parseMockConfig("0").mode).toBe("off");
    expect(parseMockConfig("false").mode).toBe("off");
  });

  it("is 'all' for truthy keywords", () => {
    expect(parseMockConfig("1").mode).toBe("all");
    expect(parseMockConfig("true").mode).toBe("all");
    expect(parseMockConfig("all").mode).toBe("all");
    expect(parseMockConfig("ON").mode).toBe("all");
  });

  it("parses a comma-separated date list into 'dates' mode", () => {
    const config = parseMockConfig("2026-07-08, 2026-07-09");
    expect(config.mode).toBe("dates");
    if (config.mode !== "dates") throw new Error("expected dates mode");
    expect([...config.dates].sort()).toEqual(["2026-07-08", "2026-07-09"]);
  });

  it("falls back to off when a value has no valid dates", () => {
    expect(parseMockConfig("garbage").mode).toBe("off");
  });
});

describe("mockMonthAvailability", () => {
  it("'all' marks every night of the month Available", () => {
    const result = mockMonthAvailability(2026, 6, { mode: "all" }); // July (0-indexed 6)
    const av = result.campsites!["mock-001"].availabilities;
    expect(Object.keys(av)).toHaveLength(31); // July has 31 days
    expect(av[dateKey(day(2026, 7, 1))]).toBe("Available");
    expect(av[dateKey(day(2026, 7, 31))]).toBe("Available");
  });

  it("'dates' marks only listed dates Available, the rest Reserved", () => {
    const config = parseMockConfig("2026-07-08,2026-07-09");
    const av = mockMonthAvailability(2026, 6, config).campsites!["mock-001"].availabilities;
    expect(av[dateKey(day(2026, 7, 8))]).toBe("Available");
    expect(av[dateKey(day(2026, 7, 9))]).toBe("Available");
    expect(av[dateKey(day(2026, 7, 7))]).toBe("Reserved");
    expect(av[dateKey(day(2026, 7, 10))]).toBe("Reserved");
  });

  it("covers the right number of days for a 30-day month", () => {
    const av = mockMonthAvailability(2026, 5, { mode: "all" }).campsites!["mock-001"].availabilities; // June
    expect(Object.keys(av)).toHaveLength(30);
  });
});
