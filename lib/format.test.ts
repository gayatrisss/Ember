import { describe, expect, it } from "vitest";
import { formatCabinName } from "@/lib/format";

// The inputs below are real facility_name values from the cabins table — rec.gov's
// casing is inconsistent per ranger district, so the formatter has to normalise all of it.
describe("formatCabinName", () => {
  it("title-cases shouted names", () => {
    expect(formatCabinName("TRAIL CREEK CABIN")).toBe("Trail Creek Cabin");
    expect(formatCabinName("ACKER ROCK LOOKOUT")).toBe("Acker Rock Lookout");
  });

  it("leaves already-formatted names alone (idempotent)", () => {
    expect(formatCabinName("Trail Creek Cabin")).toBe("Trail Creek Cabin");
    expect(formatCabinName(formatCabinName("MCCART LOOKOUT"))).toBe("McCart Lookout");
  });

  it("lowercases minor words inside the name but not at either end", () => {
    expect(formatCabinName("LAKE OF THE WOODS LOOKOUT")).toBe("Lake of the Woods Lookout");
    expect(formatCabinName("West Fork Of Rock Creek Cabin (MT)")).toBe("West Fork of Rock Creek Cabin (MT)");
    expect(formatCabinName("THE CABIN")).toBe("The Cabin");
  });

  it("restores the inner capital in Mc names", () => {
    expect(formatCabinName("MCCART LOOKOUT")).toBe("McCart Lookout");
    expect(formatCabinName("MCKINLEY TRAIL CABIN")).toBe("McKinley Trail Cabin");
    expect(formatCabinName("MCGUIRE MTN. LOOKOUT RENTAL")).toBe("McGuire Mtn. Lookout Rental");
  });

  it("keeps possessives lowercase after the apostrophe", () => {
    expect(formatCabinName("TOM'S LAKE CABIN")).toBe("Tom's Lake Cabin");
    expect(formatCabinName("Fure's Cabin")).toBe("Fure's Cabin");
    expect(formatCabinName("Hopkins Mountain Fireman's Cabin")).toBe("Hopkins Mountain Fireman's Cabin");
    expect(formatCabinName("O'BRIEN CABIN")).toBe("O'Brien Cabin");
    // Typographic apostrophes inside a word are not possessives either.
    expect(formatCabinName("Mestaa’ėhehe Mountain Fire Lookout")).toBe("Mestaa’ėhehe Mountain Fire Lookout");
  });

  it("uppercases state codes at the tail of a parenthetical", () => {
    expect(formatCabinName("BEAVER CREEK CABIN (MT)")).toBe("Beaver Creek Cabin (MT)");
    expect(formatCabinName("Aspen Leaf Cabin (Uncompahgre National Forest, Co)")).toBe(
      "Aspen Leaf Cabin (Uncompahgre National Forest, CO)"
    );
    expect(formatCabinName("Bald Butte Lookout (Fremont-Winema National Forest, OR)")).toBe(
      "Bald Butte Lookout (Fremont-Winema National Forest, OR)"
    );
  });

  it("does not mistake the end of a word for a state code", () => {
    expect(formatCabinName("CABIN CAMP (ALABAMA)")).toBe("Cabin Camp (Alabama)");
    expect(formatCabinName("Haleakala National Park (Cabin Permits)")).toBe(
      "Haleakala National Park (Cabin Permits)"
    );
  });

  it("keeps agency acronyms shouted", () => {
    expect(formatCabinName("Cold Springs Cabin - Ochoco NF (OR)")).toBe("Cold Springs Cabin - Ochoco NF (OR)");
    expect(formatCabinName("cold springs peak cabin - clearwater nf (id)")).toBe(
      "Cold Springs Peak Cabin - Clearwater NF (ID)"
    );
  });

  it("cases both halves of a hyphenated word", () => {
    expect(formatCabinName("Beaver Creek A-Frame Cabin (ID)")).toBe("Beaver Creek A-Frame Cabin (ID)");
    expect(formatCabinName("WHITE MOUNTAINS NATIONAL RECREATION AREA - ALASKA CABINS")).toBe(
      "White Mountains National Recreation Area - Alaska Cabins"
    );
  });

  it("preserves punctuation, digits and directional parentheticals", () => {
    expect(formatCabinName("GUT ISLAND 1 CABIN")).toBe("Gut Island 1 Cabin");
    expect(formatCabinName("BIG CREEK BALDY. LOOKOUT RENTAL")).toBe("Big Creek Baldy. Lookout Rental");
    expect(formatCabinName("YOUNG LAKE (NORTH) CABIN")).toBe("Young Lake (North) Cabin");
    expect(formatCabinName("WEST FORK CABIN (S OF ENNIS)")).toBe("West Fork Cabin (S of Ennis)");
    expect(formatCabinName("Spring Valley Cabin & Bunkhouse")).toBe("Spring Valley Cabin & Bunkhouse");
  });

  it("trims surrounding whitespace", () => {
    expect(formatCabinName("Flag Point Lookout ")).toBe("Flag Point Lookout");
  });
});
