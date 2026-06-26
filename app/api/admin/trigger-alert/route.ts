import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildEmailPayload, deliverEmail, type CabinInfo } from "@/lib/notifications/send";
import type { Opening } from "@/lib/notifications/check";

// Operator tool: force-send the availability email for ANY alert, to its owner (or an
// `email` override), bypassing the checker. Use this to nudge a stuck email during a live
// demo. Distinct from /api/dev/trigger-alert (which is self-serve, own-alert-only): this
// is admin-only and can reach any user, so it uses the service client.
//
// Gate: the caller must be logged in AND their session email must equal EMBER_ADMIN_EMAIL.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.EMBER_ADMIN_EMAIL;
  if (!user?.email || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { alertId, email: emailOverride } = await req.json().catch(() => ({}));
  if (!alertId) {
    return NextResponse.json({ error: "Missing alertId" }, { status: 400 });
  }

  // Service client: read any alert + resolve any user's email (bypasses RLS).
  const service = createServiceClient();

  const { data: alert, error: alertErr } = await service
    .from("alerts")
    .select("id, user_id, facility_id, date_from, date_to")
    .eq("id", alertId)
    .single();
  if (alertErr || !alert) {
    return NextResponse.json({ error: "alert not found" }, { status: 404 });
  }

  let recipient: string | undefined = emailOverride;
  if (!recipient) {
    const { data, error } = await service.auth.admin.getUserById(alert.user_id);
    if (error || !data.user?.email) {
      return NextResponse.json({ error: "could not resolve recipient email" }, { status: 404 });
    }
    recipient = data.user.email;
  }

  const { data: cabin } = await service
    .from("cabins")
    .select("facility_name, rec_area_name, nightly_rate")
    .eq("facility_id", alert.facility_id)
    .single();
  if (!cabin) {
    return NextResponse.json({ error: "cabin not found" }, { status: 404 });
  }

  const opening: Opening = {
    alertId: alert.id,
    userId: alert.user_id,
    facilityId: alert.facility_id,
    email: recipient,
    from: alert.date_from,
    to: alert.date_to,
  };
  const payload = buildEmailPayload(cabin as CabinInfo, opening);

  try {
    await deliverEmail(recipient, payload);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.log("[ember] admin trigger-alert: send failed", detail);
    return NextResponse.json({ error: "send failed", detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true, email: recipient, dateRange: payload.dateRange, alertId });
}
