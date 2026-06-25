import { describe, it, expect, vi } from "vitest";
import { isCronAuthorized, runNotifications } from "@/lib/notifications/run";
import type { CheckDeps, CancellationAlert } from "@/lib/notifications/check";
import type { SendDeps, CabinInfo } from "@/lib/notifications/send";
import { dateKey } from "@/lib/availability";

describe("isCronAuthorized", () => {
  it("requires a matching bearer token when a secret is configured", () => {
    expect(isCronAuthorized("Bearer s3cret", "s3cret", true)).toBe(true);
    expect(isCronAuthorized("Bearer wrong", "s3cret", true)).toBe(false);
    expect(isCronAuthorized(null, "s3cret", true)).toBe(false);
  });

  it("allows an unsecured route only outside production", () => {
    expect(isCronAuthorized(null, undefined, false)).toBe(true); // dev
    expect(isCronAuthorized(null, undefined, true)).toBe(false); // prod
  });
});

describe("runNotifications", () => {
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
  const allAvailableJuly = () => {
    const availabilities: Record<string, string> = {};
    for (let d = 1; d <= 31; d++) availabilities[dateKey(day(2026, 7, d))] = "Available";
    return { campsites: { A: { availabilities } } };
  };

  const alert = (id: string, user: string): CancellationAlert => ({
    id,
    user_id: user,
    facility_id: "F1",
    date_from: "2026-07-04",
    date_to: "2026-07-06",
    flexibility: "strict",
  });

  const cabin: CabinInfo = {
    facility_name: "Maxey Cabin",
    rec_area_name: "Gallatin National Forest",
    nightly_rate: 50,
  };

  it("tallies sent / duplicate / failed across openings", async () => {
    // Three matching alerts -> three openings, in order.
    const checkDeps: CheckDeps = {
      loadActiveAlerts: async () => [alert("a1", "U1"), alert("a2", "U2"), alert("a3", "U3")],
      fetchMonth: async () => allAvailableJuly(),
      getEmail: async (u) => `${u}@example.com`,
    };

    const sendDeps: SendDeps = {
      // a1 claims (sent), a2 already claimed (duplicate), a3 claims (then delivery fails)
      claim: vi.fn<SendDeps["claim"]>().mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(true),
      loadCabin: async () => cabin,
      deliver: vi.fn<SendDeps["deliver"]>().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("resend down")),
      markFailed: vi.fn(async () => {}),
    };

    const summary = await runNotifications(checkDeps, sendDeps);

    expect(summary).toEqual({ openings: 3, sent: 1, duplicate: 1, failed: 1 });
    expect(sendDeps.markFailed).toHaveBeenCalledOnce(); // only the delivery failure
  });

  it("returns an all-zero summary when there are no openings", async () => {
    const checkDeps: CheckDeps = {
      loadActiveAlerts: async () => [],
      fetchMonth: async () => null,
      getEmail: async () => null,
    };
    const sendDeps: SendDeps = {
      claim: vi.fn(async () => true),
      loadCabin: async () => cabin,
      deliver: vi.fn(async () => {}),
      markFailed: vi.fn(async () => {}),
    };

    expect(await runNotifications(checkDeps, sendDeps)).toEqual({
      openings: 0,
      sent: 0,
      duplicate: 0,
      failed: 0,
    });
    expect(sendDeps.claim).not.toHaveBeenCalled();
  });
});
