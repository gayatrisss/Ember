import { describe, it, expect } from "vitest";
import { resolveCapacity, resolveFieldNotes, FIELD_NOTE_LABELS } from "@/lib/facts";
import { CONF_THRESHOLD } from "@/lib/format";

describe("resolveCapacity", () => {
  it("prefers the bed count when we have one", () => {
    expect(resolveCapacity({ num_beds: 4, sleeps: 15 })).toEqual({
      label: "Beds",
      value: "4 beds",
    });
  });

  it("falls back to occupancy, and relabels so the number is not read as beds", () => {
    const fact = resolveCapacity({ num_beds: null, sleeps: 12 });
    expect(fact).toEqual({ label: "Occupancy", value: "12 people" });
    expect(fact?.label).not.toBe("Beds");
  });

  it("returns null when neither field is known", () => {
    expect(resolveCapacity({ num_beds: null, sleeps: null })).toBeNull();
  });

  it("singularises both branches", () => {
    expect(resolveCapacity({ num_beds: 1, sleeps: null })?.value).toBe("1 bed");
    expect(resolveCapacity({ num_beds: null, sleeps: 1 })?.value).toBe("1 person");
  });

  it("treats a zero or negative count as unknown rather than showing '0 beds'", () => {
    expect(resolveCapacity({ num_beds: 0, sleeps: 8 })).toEqual({
      label: "Occupancy",
      value: "8 people",
    });
    expect(resolveCapacity({ num_beds: 0, sleeps: 0 })).toBeNull();
  });

  // The bug this module exists to prevent: an occupancy cap captioned "Sleeps".
  // Garnet Mountain Fire Lookout is one room on a summit and reports sleeps=15.
  it("never captions an occupancy cap as sleeping capacity", () => {
    const lookout = resolveCapacity({ num_beds: 4, sleeps: 15 });
    expect(lookout?.value).toBe("4 beds");
    expect(lookout?.value).not.toContain("15");
  });
});

/** A cabin with every field-note source absent. Spread over it to set just one. */
const EMPTY = {
  cell_coverage: null,
  season: null,
  season_conf: null,
  elevation_ft: null,
  elevation_ft_conf: null,
  heat_source: null,
  heat_source_conf: null,
  water_access: null,
  water_access_conf: null,
  stay_limit_raw: null,
  checkin_time: null,
  checkout_time: null,
};

describe("resolveFieldNotes", () => {
  it("returns nothing when the cabin has no data", () => {
    expect(resolveFieldNotes(EMPTY)).toEqual([]);
  });

  it("drops values below the confidence threshold", () => {
    const shaky = { ...EMPTY, heat_source: "wood stove", heat_source_conf: CONF_THRESHOLD - 0.1 };
    expect(resolveFieldNotes(shaky)).toEqual([]);

    const solid = { ...EMPTY, heat_source: "wood stove", heat_source_conf: CONF_THRESHOLD };
    expect(resolveFieldNotes(solid)).toEqual([{ label: "Heat", value: "Wood Stove" }]);
  });

  it("formats elevation with a thousands separator", () => {
    const cabin = { ...EMPTY, elevation_ft: 8245, elevation_ft_conf: 1 };
    expect(resolveFieldNotes(cabin)).toEqual([{ label: "Elevation", value: "8,245 ft" }]);
  });

  it("orders by priority, with check-in/out last as fillers", () => {
    const cabin = {
      ...EMPTY,
      checkin_time: "02:00 PM",
      cell_coverage: "4",
      stay_limit_raw: "14 days",
    };
    expect(resolveFieldNotes(cabin).map((n) => n.label)).toEqual([
      "Signal",
      "Stay Limit",
      "Check-in",
    ]);
  });

  it("emits only labels the icon map is required to cover", () => {
    const full = {
      cell_coverage: "4",
      season: "Year-round",
      season_conf: 1,
      elevation_ft: 6710,
      elevation_ft_conf: 1,
      heat_source: "wood stove",
      heat_source_conf: 1,
      water_access: "none",
      water_access_conf: 1,
      stay_limit_raw: "14 days",
      checkin_time: "02:00 PM",
      checkout_time: "11:00 AM",
    };
    const notes = resolveFieldNotes(full);
    expect(notes).toHaveLength(FIELD_NOTE_LABELS.length);
    for (const note of notes) {
      expect(FIELD_NOTE_LABELS).toContain(note.label);
    }
  });
});
