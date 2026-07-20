import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, minNights } = body;

  // Partial update: cancel the alert and/or change its minimum-nights threshold.
  const update: Record<string, unknown> = {};

  if (status !== undefined) {
    if (status !== "cancelled") {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    update.status = "cancelled";
  }

  if (minNights !== undefined) {
    // Lower bound checked here for a clean error; the upper bound (<= window
    // length) is enforced by the alerts_min_nights_valid DB constraint since the
    // window dates aren't in this request body.
    if (!Number.isInteger(minNights) || minNights < 1) {
      return NextResponse.json({ error: "invalid_min_nights" }, { status: 400 });
    }
    update.min_nights = minNights;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("alerts")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.log("[ember] PATCH /api/alerts/[id] error", error.code, error.message);
    if (error.code === "23514") {
      return NextResponse.json({ error: "invalid_min_nights" }, { status: 400 });
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
