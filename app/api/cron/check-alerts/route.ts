import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { liveDeps } from "@/lib/notifications/check";
import { liveSendDeps } from "@/lib/notifications/send";
import { runNotifications, isCronAuthorized } from "@/lib/notifications/run";

// Polls rec.gov for every active cancellation alert and emails users whose watched
// dates have opened up. Scheduled in vercel.json (daily — the Vercel Hobby plan caps
// crons at once/day; on Pro this would run every ~15 min). Also runnable manually in
// dev, and on demand via the dev force-trigger endpoint for demos.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (
    !isCronAuthorized(
      req.headers.get("authorization"),
      process.env.CRON_SECRET,
      process.env.NODE_ENV === "production"
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const summary = await runNotifications(liveDeps(supabase), liveSendDeps(supabase));
  return NextResponse.json({ ok: true, ...summary });
}
