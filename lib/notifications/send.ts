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
import { formatCabinName, formatRate, formatLongDateRange } from "@/lib/format";
import { recGovUrl } from "@/lib/recgov";

export type CabinInfo = {
  facility_name: string;
  rec_area_name: string | null;
  nightly_rate: number | null;
  /** Authoritative, type-aware Recreation.gov URL. See lib/recgov.ts. */
  reservation_url: string | null;
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
  reason?: "duplicate" | "no-cabin" | "send-failed" | "claim-error";
};

// Outcome of the dedup claim. "duplicate" means the opening was already notified and
// must not re-send; "error" means the write itself broke (bad schema, DB down) and the
// opening is still owed an email. Collapsing the two would silently report real
// failures as successful dedup.
export type ClaimOutcome = "claimed" | "duplicate" | "error";

// Injected I/O so the orchestrator is testable without Supabase / Resend.
export type SendDeps = {
  // Insert the notification row ON CONFLICT DO NOTHING. "claimed" iff this call
  // inserted it (i.e. we are the one who should send).
  claim: (opening: Opening) => Promise<ClaimOutcome>;
  loadCabin: (facilityId: string) => Promise<CabinInfo | null>;
  deliver: (to: string, payload: EmailPayload) => Promise<void>;
  markFailed: (opening: Opening) => Promise<void>;
};

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// Builds the email props for an opening + its cabin. Pure.
export function buildEmailPayload(cabin: CabinInfo, opening: Opening): EmailPayload {
  const cabinName = formatCabinName(cabin.facility_name);
  return {
    subject: `${cabinName} opened up for your dates`,
    cabinName,
    dateRange: formatLongDateRange(opening.from, opening.to),
    price: cabin.nightly_rate != null ? formatRate(String(cabin.nightly_rate)) : null,
    location: cabin.rec_area_name ?? null,
    bookUrl: recGovUrl(opening.facilityId, cabin.reservation_url),
    manageUrl: `${siteUrl()}/my-alerts?alert=${opening.alertId}`,
    logoUrl: `${siteUrl()}/email/logo.png`,
  };
}

// Renders the availability email to HTML and sends it via Resend. Throws on failure.
// Shared by the cron sender and the dev force-trigger. Rendering to HTML (rather than
// passing `react:`) sidesteps Resend's broken React renderer with @react-email v1.
export async function deliverEmail(to: string, payload: EmailPayload): Promise<void> {
  const { Resend } = await import("resend");
  const { render } = await import("@react-email/components");
  const { createElement } = await import("react");
  const { AvailabilityAlert } = await import("@/emails/availability-alert");
  const element = createElement(AvailabilityAlert, payload);
  const html = await render(element);
  // Multipart text/plain alongside the HTML. A plain-text part is a transactional
  // signal to inbox providers (and a graceful fallback for text-only clients).
  const text = await render(element, { plainText: true });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMBER_FROM_EMAIL ?? "Ember <onboarding@resend.dev>",
    to,
    subject: payload.subject,
    html,
    text,
  });
  if (error) throw new Error(error.message);
}

// Claims, sends, and records one opening. Safe to call repeatedly for the same opening:
// only the first call (which claims the row) sends.
export async function sendOpeningNotification(
  deps: SendDeps,
  opening: Opening
): Promise<SendResult> {
  const claim = await deps.claim(opening);
  if (claim === "duplicate") return { sent: false, reason: "duplicate" };
  // The claim row never landed, so there is nothing to mark failed — the opening will
  // be retried on the next run once the underlying write is fixed.
  if (claim === "error") return { sent: false, reason: "claim-error" };

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
        // Log the PostgREST code/details too — `message` alone doesn't say whether this
        // is a schema mismatch (PGRST204), an RLS denial, or a connection failure.
        console.log("[ember] send: claim errored", opening.alertId, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return "error";
      }
      return (data?.length ?? 0) > 0 ? "claimed" : "duplicate";
    },
    loadCabin: async (facilityId) => {
      const { data, error } = await supabase
        .from("cabins")
        .select("facility_name, rec_area_name, nightly_rate, reservation_url")
        .eq("facility_id", facilityId)
        .single();
      if (error) {
        console.log("[ember] send: loadCabin failed", facilityId, error.message);
        return null;
      }
      return data as CabinInfo;
    },
    deliver: (to, payload) => deliverEmail(to, payload),
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
