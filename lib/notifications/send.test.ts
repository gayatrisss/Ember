import { describe, it, expect, vi } from "vitest";
import {
  buildEmailPayload,
  sendOpeningNotification,
  type CabinInfo,
  type SendDeps,
} from "@/lib/notifications/send";
import { formatLongDateRange } from "@/lib/format";
import type { Opening } from "@/lib/notifications/check";

const opening: Opening = {
  alertId: "a1",
  userId: "U1",
  facilityId: "234309",
  email: "camper@example.com",
  from: "2026-07-09",
  to: "2026-07-12",
};

const cabin: CabinInfo = {
  facility_name: "MAXEY CABIN",
  rec_area_name: "Gallatin National Forest",
  nightly_rate: 50,
};

describe("formatLongDateRange", () => {
  it("uses one month name for a same-month range", () => {
    expect(formatLongDateRange("2026-07-09", "2026-07-12")).toBe("July 9th-12th");
  });

  it("spans two month names across a boundary", () => {
    expect(formatLongDateRange("2026-07-30", "2026-08-02")).toBe("July 30th - August 2nd");
  });

  it("applies correct ordinal suffixes", () => {
    expect(formatLongDateRange("2026-07-01", "2026-07-03")).toBe("July 1st-3rd");
    expect(formatLongDateRange("2026-07-21", "2026-07-22")).toBe("July 21st-22nd");
    expect(formatLongDateRange("2026-07-11", "2026-07-13")).toBe("July 11th-13th");
  });
});

describe("buildEmailPayload", () => {
  it("maps a cabin + opening to email props", () => {
    const payload = buildEmailPayload(cabin, opening);
    expect(payload.subject).toBe("Maxey Cabin opened up for your dates");
    expect(payload.cabinName).toBe("Maxey Cabin");
    expect(payload.dateRange).toBe("July 9th-12th");
    expect(payload.price).toBe("$50/night");
    expect(payload.location).toBe("Gallatin National Forest");
    expect(payload.bookUrl).toBe("https://www.recreation.gov/camping/campgrounds/234309");
    expect(payload.manageUrl).toMatch(/\/my-alerts\?alert=a1$/);
    expect(payload.logoUrl).toMatch(/\/email\/logo\.png$/);
  });

  it("omits price when the cabin has no nightly rate", () => {
    expect(buildEmailPayload({ ...cabin, nightly_rate: null }, opening).price).toBeNull();
  });
});

describe("sendOpeningNotification", () => {
  const baseDeps = (over: Partial<SendDeps> = {}): SendDeps => ({
    claim: vi.fn(async () => true),
    loadCabin: vi.fn(async () => cabin),
    deliver: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
    ...over,
  });

  it("sends when the opening is newly claimed", async () => {
    const deps = baseDeps();
    const result = await sendOpeningNotification(deps, opening);
    expect(result).toEqual({ sent: true });
    expect(deps.deliver).toHaveBeenCalledOnce();
    expect(deps.deliver).toHaveBeenCalledWith(
      "camper@example.com",
      expect.objectContaining({ cabinName: "Maxey Cabin", dateRange: "July 9th-12th" })
    );
  });

  it("skips (no send) when the opening was already claimed", async () => {
    const deps = baseDeps({ claim: vi.fn(async () => false) });
    const result = await sendOpeningNotification(deps, opening);
    expect(result).toEqual({ sent: false, reason: "duplicate" });
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it("marks failed when the cabin can't be loaded", async () => {
    const deps = baseDeps({ loadCabin: vi.fn(async () => null) });
    const result = await sendOpeningNotification(deps, opening);
    expect(result).toEqual({ sent: false, reason: "no-cabin" });
    expect(deps.markFailed).toHaveBeenCalledOnce();
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it("marks failed when delivery throws", async () => {
    const deps = baseDeps({
      deliver: vi.fn(async () => {
        throw new Error("resend down");
      }),
    });
    const result = await sendOpeningNotification(deps, opening);
    expect(result).toEqual({ sent: false, reason: "send-failed" });
    expect(deps.markFailed).toHaveBeenCalledOnce();
  });
});
