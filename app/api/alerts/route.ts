import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { facilityId, type, dateFrom, dateTo, flexibility, notifyWhen, notificationMethod } = body;

  if (!facilityId || !type || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase.from("alerts").insert({
    user_id: user.id,
    facility_id: facilityId,
    type,
    date_from: dateFrom,
    date_to: dateTo,
    flexibility: flexibility ?? null,
    notify_when: notifyWhen ?? null,
    notification_method: notificationMethod ?? "email",
  });

  if (error) {
    console.log("[ember] POST /api/alerts error", error.code, error.message);
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    if (error.code === "23P01") {
      return NextResponse.json({ error: "overlap" }, { status: 409 });
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: user.email });
}
