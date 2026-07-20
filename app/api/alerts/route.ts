import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .select(`
      id, facility_id, date_from, date_to, type, status, min_nights, created_at,
      cabins ( facility_name, rec_area_name )
    `)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("[ember] GET /api/alerts error", error.message);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { facilityId, type, dateFrom, dateTo, minNights, notifyWhen, notificationMethod } = body;

  if (!facilityId || !type || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // min_nights is the minimum consecutive available nights that should trigger a
  // cancellation alert. It must be within the watch window (also enforced by the
  // alerts_min_nights_valid DB constraint). Nights = date_to - date_from.
  const windowNights = Math.round(
    (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86_400_000
  );
  if (minNights != null) {
    if (!Number.isInteger(minNights) || minNights < 1 || minNights > windowNights) {
      return NextResponse.json({ error: "invalid_min_nights" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      facility_id: facilityId,
      type,
      date_from: dateFrom,
      date_to: dateTo,
      min_nights: minNights ?? null,
      notify_when: notifyWhen ?? null,
      notification_method: notificationMethod ?? "email",
    })
    .select("id")
    .single();

  if (error) {
    console.log("[ember] POST /api/alerts error", error.code, error.message);
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    if (error.code === "23P01") {
      return NextResponse.json({ error: "overlap" }, { status: 409 });
    }
    if (error.code === "23514") {
      return NextResponse.json({ error: "invalid_min_nights" }, { status: 400 });
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: user.email, alertId: data.id });
}
