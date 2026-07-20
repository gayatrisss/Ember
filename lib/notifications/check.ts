// The openings checker: given the active cancellation alerts, decide which ones have
// a bookable opening right now and for which dates. This is the "should we notify?"
// half of the pipeline — it performs NO writes and sends NO email (see
// lib/notifications/send.ts for that). The cron wires the two together.
//
// The matching logic (matchAlert / monthsForAlert) is pure and unit-tested directly.
// The orchestration (checkAlerts) takes its I/O as injected dependencies so it can be
// tested with fakes; the live wiring lives in liveDeps().

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getMonthKeys,
  mergeCampsites,
  findAvailableWindows,
  type AvailableWindow,
  type CampsiteData,
} from "@/lib/availability";
import { fetchMonthAvailability } from "@/lib/availability";

// The alert fields the checker needs (subset of the alerts row).
export type CancellationAlert = {
  id: string;
  user_id: string;
  facility_id: string;
  date_from: string; // "YYYY-MM-DD"
  date_to: string; // "YYYY-MM-DD" (checkout, exclusive)
  // Minimum consecutive available nights that should trigger the alert. A null
  // (which shouldn't occur after the backfill) requires the whole window.
  min_nights: number | null;
};

// A resolved opening ready for the sender: an alert matched these dates for this user.
export type Opening = {
  alertId: string;
  userId: string;
  facilityId: string;
  email: string;
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
};

// Injected I/O so checkAlerts is testable without Supabase / rec.gov.
export type CheckDeps = {
  loadActiveAlerts: () => Promise<CancellationAlert[]>;
  fetchMonth: (facilityId: string, year: number, month: number) => Promise<unknown | null>;
  getEmail: (userId: string) => Promise<string | null>;
};

// "YYYY-MM-DD" -> local-midnight Date (matches lib/availability's date handling).
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Nights between two "YYYY-MM-DD" dates (checkout exclusive): 07-04 → 07-06 = 2.
function nightsBetween(fromStr: string, toStr: string): number {
  return Math.round((parseDate(toStr).getTime() - parseDate(fromStr).getTime()) / 86_400_000);
}

// The "YYYY-MM" month keys an alert needs fetched — just the months its exact
// [date_from, date_to) window touches.
export function monthsForAlert(alert: CancellationAlert): string[] {
  return getMonthKeys(parseDate(alert.date_from), parseDate(alert.date_to));
}

// The openings for a single alert: every bookable run of >= min_nights consecutive
// nights within the exact [date_from, date_to) window. min_nights == the window
// length reproduces the old "strict"; a null min_nights (shouldn't occur post-
// backfill) falls back to that whole-window requirement.
export function matchAlert(
  alert: CancellationAlert,
  merged: Record<string, CampsiteData>
): AvailableWindow[] {
  const from = parseDate(alert.date_from);
  const to = parseDate(alert.date_to);
  const min = alert.min_nights ?? nightsBetween(alert.date_from, alert.date_to);
  return findAvailableWindows(merged, from, to).filter((w) => nightsBetween(w.from, w.to) >= min);
}

// Groups alerts by facility so each facility is fetched once, not once per alert.
function groupByFacility(alerts: CancellationAlert[]): Map<string, CancellationAlert[]> {
  const byFacility = new Map<string, CancellationAlert[]>();
  for (const a of alerts) {
    const group = byFacility.get(a.facility_id);
    if (group) group.push(a);
    else byFacility.set(a.facility_id, [a]);
  }
  return byFacility;
}

// Scans all active cancellation alerts and returns every current opening, deduped only
// by what the matcher emits (the DB unique constraint handles cross-run dedup at send
// time). Batches rec.gov fetches per facility and caches email lookups per user.
export async function checkAlerts(deps: CheckDeps): Promise<Opening[]> {
  const alerts = await deps.loadActiveAlerts();
  const byFacility = groupByFacility(alerts);
  const openings: Opening[] = [];
  const emailCache = new Map<string, string | null>();

  for (const [facilityId, group] of byFacility) {
    // Union of every month any alert for this facility needs, fetched once each.
    const monthKeys = new Set<string>();
    for (const a of group) for (const mk of monthsForAlert(a)) monthKeys.add(mk);

    const monthJsons = await Promise.all(
      [...monthKeys].map((mk) => {
        const [y, m] = mk.split("-").map(Number);
        return deps.fetchMonth(facilityId, y, m - 1);
      })
    );
    const merged = mergeCampsites(monthJsons);

    for (const alert of group) {
      const windows = matchAlert(alert, merged);
      if (windows.length === 0) continue;

      if (!emailCache.has(alert.user_id)) {
        emailCache.set(alert.user_id, await deps.getEmail(alert.user_id));
      }
      const email = emailCache.get(alert.user_id) ?? null;
      if (!email) {
        console.log("[ember] check-alerts: no email for user, skipping alert", alert.id);
        continue;
      }

      for (const w of windows) {
        openings.push({
          alertId: alert.id,
          userId: alert.user_id,
          facilityId,
          email,
          from: w.from,
          to: w.to,
        });
      }
    }
  }

  return openings;
}

// Live dependency wiring for the cron, backed by a service-role Supabase client.
export function liveDeps(supabase: SupabaseClient): CheckDeps {
  return {
    loadActiveAlerts: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, user_id, facility_id, date_from, date_to, min_nights")
        .eq("status", "active")
        .eq("type", "cancellation");
      if (error) {
        console.log("[ember] check-alerts: failed to load alerts", error.message);
        return [];
      }
      return (data ?? []) as CancellationAlert[];
    },
    fetchMonth: (facilityId, year, month) => fetchMonthAvailability(facilityId, year, month),
    getEmail: async (userId) => {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) {
        console.log("[ember] check-alerts: failed to resolve email for", userId, error.message);
        return null;
      }
      return data.user?.email ?? null;
    },
  };
}
