import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Dismiss a notification (an opening) so it drops out of "Needs Attention". Dismissal
// is visibility-only: the row stays, so the cron's dedup never re-sends it. RLS limits
// the update to the user's own notifications.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { dismissed } = await req.json().catch(() => ({}));
  if (dismissed !== true) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.log("[ember] PATCH /api/notifications/[id] error", error.message);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
