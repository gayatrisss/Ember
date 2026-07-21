// Ties the checker and sender together for the cron route. Kept separate from the
// route handler so the orchestration + auth are unit-testable without an HTTP request.

import { checkAlerts, type CheckDeps } from "@/lib/notifications/check";
import { sendOpeningNotification, type SendDeps } from "@/lib/notifications/send";

export type CronSummary = {
  openings: number;
  sent: number;
  duplicate: number;
  failed: number;
};

// Vercel sets `Authorization: Bearer ${CRON_SECRET}` on cron invocations when the
// CRON_SECRET env var is configured. We require a match when it's set; when it isn't
// set we only allow the route outside production (local dev / preview convenience).
export function isCronAuthorized(
  authHeader: string | null,
  secret: string | undefined,
  isProduction: boolean
): boolean {
  if (secret) return authHeader === `Bearer ${secret}`;
  return !isProduction;
}

// Finds current openings and sends each, tallying the outcomes. Idempotent across runs
// because the sender claims the dedup row before sending (a re-seen opening counts as
// "duplicate" and is not re-sent). Only a genuine conflict counts as "duplicate" — a
// broken claim write lands in "failed", so a summary of all-duplicates always means the
// openings really had been notified before.
export async function runNotifications(
  checkDeps: CheckDeps,
  sendDeps: SendDeps
): Promise<CronSummary> {
  const openings = await checkAlerts(checkDeps);
  const summary: CronSummary = { openings: openings.length, sent: 0, duplicate: 0, failed: 0 };

  for (const opening of openings) {
    const result = await sendOpeningNotification(sendDeps, opening);
    if (result.sent) summary.sent += 1;
    else if (result.reason === "duplicate") summary.duplicate += 1;
    else summary.failed += 1;
  }

  console.log("[ember] cron check-alerts:", summary);
  return summary;
}
