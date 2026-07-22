import { describe, it, expect } from "vitest";
import { recGovUrl } from "@/lib/recgov";

describe("recGovUrl", () => {
  it("uses the stored URL when there is one", () => {
    expect(recGovUrl("233386", "https://www.recreation.gov/permits/233386")).toBe(
      "https://www.recreation.gov/permits/233386"
    );
  });

  // The bug this module exists to fix. Hemlock Cabin and Sweetwater Cabin are Permit
  // facilities and Skaters Cabin is a Venue Reservation; the campground template returns
  // a raw {"error":"error fetching campground"} for all three. The stored URL must win.
  it.each([
    ["233386", "https://www.recreation.gov/permits/233386"],
    ["4251912", "https://www.recreation.gov/permits/4251912"],
    ["VR2300", "https://www.recreation.gov/venues/VR2300"],
  ])("never falls back to /camping/campgrounds for %s", (id, stored) => {
    const url = recGovUrl(id, stored);
    expect(url).toBe(stored);
    expect(url).not.toContain("/camping/campgrounds/");
  });

  it("falls back to the campground template when no URL is stored", () => {
    expect(recGovUrl("234309", null)).toBe(
      "https://www.recreation.gov/camping/campgrounds/234309"
    );
    expect(recGovUrl("234309")).toBe(
      "https://www.recreation.gov/camping/campgrounds/234309"
    );
  });

  it("treats an empty or whitespace stored value as absent, never a dead href", () => {
    // `??` would pass these through and render href="" on the card's only affordance.
    for (const empty of ["", "   "]) {
      expect(recGovUrl("234309", empty)).toBe(
        "https://www.recreation.gov/camping/campgrounds/234309"
      );
    }
  });
});
