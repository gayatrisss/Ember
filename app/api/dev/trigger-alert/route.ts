import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEmailPayload, deliverEmail, type CabinInfo } from "@/lib/notifications/send";
import type { Opening } from "@/lib/notifications/check";

// Force-sends the availability email for one of YOUR alerts, right now — skipping the
// checker and rec.gov entirely. This is the demo payoff: set an alert, tap the button,
// get the email in seconds (no waiting on the daily cron).
//
// Safe in production: it's auth-gated and only ever sends to the signed-in user's own
// email for an alert they own (RLS enforces ownership on the read). It does NOT write a
// notifications row, so it's repeatable and never pollutes the dedup ledger.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { alertId } = await req.json().catch(() => ({}));
  if (!alertId) {
    return NextResponse.json({ error: "Missing alertId" }, { status: 400 });
  }

  // RLS restricts this to the user's own alerts, so a found row is implicitly owned.
  const { data: alert } = await supabase
    .from("alerts")
    .select("id, facility_id, date_from, date_to")
    .eq("id", alertId)
    .single();
  if (!alert) {
    return NextResponse.json({ error: "alert not found" }, { status: 404 });
  }

  const { data: cabin } = await supabase
    .from("cabins")
    .select("facility_name, rec_area_name, nightly_rate")
    .eq("facility_id", alert.facility_id)
    .single();
  if (!cabin) {
    return NextResponse.json({ error: "cabin not found" }, { status: 404 });
  }

  const opening: Opening = {
    alertId: alert.id,
    userId: user.id,
    facilityId: alert.facility_id,
    email: user.email,
    from: alert.date_from,
    to: alert.date_to,
  };
  const payload = buildEmailPayload(cabin as CabinInfo, opening);

  try {
    await deliverEmail(opening.email, payload);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.log("[ember] dev trigger-alert: send failed", detail);
    return NextResponse.json({ error: "send failed", detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true, email: opening.email, dateRange: payload.dateRange });
}
