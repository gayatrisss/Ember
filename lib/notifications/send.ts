// The sender: the "deliver it" half of the pipeline. Given an opening from the checker
// it (1) claims the dedup slot in the notifications table, (2) sends the email only if it
// was the one to claim it, (3) records failures. The DB unique constraint on
// (alert_id, found_date_from, found_date_to) is what makes this idempotent across cron
// runs — a re-seen opening fails to claim and is silently skipped.
//
// The pure helpers (formatEmailDateRange, buildEmailPayload) and the orchestrator
// (sendOpeningNotification) are unit-tested with fakes. The Resend + React Email + DB
// wiring lives in liveSendDeps, which lazy-imports the heavy bits so tests stay light.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Opening } from "@/lib/notifications/check";
import { formatCabinName, formatRate } from "@/lib/format";

export type CabinInfo = {
  facility_name: string;
  rec_area_name: string | null;
  nightly_rate: number | null;
};

export type EmailPayload = {
  subject: string;
  cabinName: string;
  dateRange: string;
  price: string | null;
  location: string | null;
  bookUrl: string;
  manageUrl: string;
  logoUrl: string;
};

export type SendResult = {
  sent: boolean;
  reason?: "duplicate" | "no-cabin" | "send-failed";
};

// Injected I/O so the orchestrator is testable without Supabase / Resend.
export type SendDeps = {
  // Insert the notification row ON CONFLICT DO NOTHING. Returns true iff this call
  // inserted it (i.e. we are the one who should send). A conflict returns false.
  claim: (opening: Opening) => Promise<boolean>;
  loadCabin: (facilityId: string) => Promise<CabinInfo | null>;
  deliver: (to: string, payload: EmailPayload) => Promise<void>;
  markFailed: (opening: Opening) => Promise<void>;
};

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

// "2026-07-09","2026-07-12" -> "July 9th–12th" (or "July 30th – August 2nd" across months).
export function formatEmailDateRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromDate = new Date(fy, fm - 1, fd);
  const toDate = new Date(ty, tm - 1, td);
  const monthName = (d: Date) => d.toLocaleString("en-US", { month: "long" });
  const fromPart = `${monthName(fromDate)} ${ordinal(fd)}`;
  if (fy === ty && fm === tm) return `${fromPart}–${ordinal(td)}`;
  return `${fromPart} – ${monthName(toDate)} ${ordinal(td)}`;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// Builds the email props for an opening + its cabin. Pure.
export function buildEmailPayload(cabin: CabinInfo, opening: Opening): EmailPayload {
  const cabinName = formatCabinName(cabin.facility_name);
  return {
    subject: `🏕️ ${cabinName} just opened up`,
    cabinName,
    dateRange: formatEmailDateRange(opening.from, opening.to),
    price: cabin.nightly_rate != null ? formatRate(String(cabin.nightly_rate)) : null,
    location: cabin.rec_area_name ?? null,
    bookUrl: `https://www.recreation.gov/camping/campgrounds/${opening.facilityId}`,
    manageUrl: `${siteUrl()}/my-alerts`,
    logoUrl: `${siteUrl()}/email/logo.png`,
  };
}

// Claims, sends, and records one opening. Safe to call repeatedly for the same opening:
// only the first call (which claims the row) sends.
export async function sendOpeningNotification(
  deps: SendDeps,
  opening: Opening
): Promise<SendResult> {
  const claimed = await deps.claim(opening);
  if (!claimed) return { sent: false, reason: "duplicate" };

  const cabin = await deps.loadCabin(opening.facilityId);
  if (!cabin) {
    console.log("[ember] send: no cabin row for", opening.facilityId);
    await deps.markFailed(opening);
    return { sent: false, reason: "no-cabin" };
  }

  try {
    await deps.deliver(opening.email, buildEmailPayload(cabin, opening));
    return { sent: true };
  } catch (err) {
    console.log("[ember] send: delivery failed for alert", opening.alertId, err);
    await deps.markFailed(opening);
    return { sent: false, reason: "send-failed" };
  }
}

// Live dependency wiring for the cron / dev trigger. Lazy-imports Resend + the email
// template so importing this module (e.g. in tests) doesn't pull them in.
export function liveSendDeps(supabase: SupabaseClient): SendDeps {
  return {
    claim: async (opening) => {
      const { data, error } = await supabase
        .from("notifications")
        .upsert(
          {
            alert_id: opening.alertId,
            user_id: opening.userId,
            facility_id: opening.facilityId,
            found_date_from: opening.from,
            found_date_to: opening.to,
            email_to: opening.email,
            type: "email",
            status: "sent",
          },
          { onConflict: "alert_id,found_date_from,found_date_to", ignoreDuplicates: true }
        )
        .select();
      if (error) {
        console.log("[ember] send: claim failed", opening.alertId, error.message);
        return false;
      }
      return (data?.length ?? 0) > 0;
    },
    loadCabin: async (facilityId) => {
      const { data, error } = await supabase
        .from("cabins")
        .select("facility_name, rec_area_name, nightly_rate")
        .eq("facility_id", facilityId)
        .single();
      if (error) {
        console.log("[ember] send: loadCabin failed", facilityId, error.message);
        return null;
      }
      return data as CabinInfo;
    },
    deliver: async (to, payload) => {
      const { Resend } = await import("resend");
      const { AvailabilityAlert } = await import("@/emails/availability-alert");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.EMBER_FROM_EMAIL ?? "Ember <onboarding@resend.dev>",
        to,
        subject: payload.subject,
        react: AvailabilityAlert(payload),
      });
      if (error) throw new Error(error.message);
    },
    markFailed: async (opening) => {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "failed" })
        .eq("alert_id", opening.alertId)
        .eq("found_date_from", opening.from)
        .eq("found_date_to", opening.to);
      if (error) console.log("[ember] send: markFailed update error", opening.alertId, error.message);
    },
  };
}
