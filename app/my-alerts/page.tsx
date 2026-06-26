import Link from "next/link";
import TopNav from "@/components/landing/top-nav";
import { DeepLinkScroll } from "@/components/alerts/deep-link-scroll";
import Footer from "@/components/landing/footer";
import { createClient } from "@/lib/supabase/server";
import { AlertCardList } from "@/components/alerts/alert-card-list";
import { NotificationCard, type NotificationCardProps } from "@/components/alerts/notification-card";
import type { AlertCardProps } from "@/components/alerts/alert-card";
import { formatRate, formatLongDateRange, timeAgo } from "@/lib/format";

type CabinImage = { url: string; is_preview: boolean | null };

type AlertRow = {
  id: string;
  facility_id: string;
  date_from: string;
  date_to: string;
  type: string;
  status: string;
  flexibility: string | null;
  created_at: string;
  cabins: {
    facility_name: string;
    rec_area_name: string | null;
    cabin_images: CabinImage[];
  } | null;
};

type NotificationRow = {
  id: string;
  alert_id: string;
  found_date_from: string;
  found_date_to: string;
  sent_at: string;
  alerts: {
    id: string;
    facility_id: string;
    date_from: string;
    date_to: string;
    flexibility: string | null;
  } | null;
  cabins: {
    facility_name: string;
    rec_area_name: string | null;
    nightly_rate: number | null;
  } | null;
};

function toCardProps(alert: AlertRow): AlertCardProps {
  const images = alert.cabins?.cabin_images ?? [];
  const image = images.find((i) => i.is_preview) ?? images[0] ?? null;
  return {
    alertId: alert.id,
    facilityId: alert.facility_id,
    cabinName: alert.cabins?.facility_name ?? alert.facility_id,
    recAreaName: alert.cabins?.rec_area_name ?? null,
    dateFrom: alert.date_from,
    dateTo: alert.date_to,
    imageUrl: image?.url ?? null,
    status: alert.status,
    flexibility: alert.flexibility,
  };
}

// Builds one notification card from all un-dismissed openings for a single alert.
// `rows` are pre-sorted newest-first, so rows[0] holds the most recent opening.
function toNotificationCardProps(rows: NotificationRow[]): NotificationCardProps {
  const first = rows[0];
  const alert = first.alerts!;
  const cabin = first.cabins;
  return {
    alertId: alert.id,
    facilityId: alert.facility_id,
    cabinName: cabin?.facility_name ?? alert.facility_id,
    recAreaName: cabin?.rec_area_name ?? null,
    price: cabin?.nightly_rate != null ? formatRate(String(cabin.nightly_rate)) : null,
    watchDates: formatLongDateRange(alert.date_from, alert.date_to),
    flexibility: alert.flexibility,
    lastChecked: "—",
    notifiedAgo: timeAgo(first.sent_at),
    windows: rows.map((r) => ({
      notificationId: r.id,
      dates: formatLongDateRange(r.found_date_from, r.found_date_to),
      sentAgo: timeAgo(r.sent_at),
    })),
  };
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ alert?: string }>;
}) {
  const { alert: targetAlertId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Un-dismissed openings (Needs Attention), limited to active alerts.
  const { data: rawNotifications } = user
    ? await supabase
        .from("notifications")
        .select(`
          id, alert_id, found_date_from, found_date_to, sent_at,
          alerts!inner ( id, facility_id, date_from, date_to, flexibility ),
          cabins ( facility_name, rec_area_name, nightly_rate )
        `)
        .eq("user_id", user.id)
        .is("dismissed_at", null)
        .eq("alerts.status", "active")
        .order("sent_at", { ascending: false })
        .returns<NotificationRow[]>()
    : { data: null };

  const { data: rawAlerts } = user
    ? await supabase
        .from("alerts")
        .select(`
          id, facility_id, date_from, date_to, type, status, flexibility, created_at,
          cabins ( facility_name, rec_area_name, cabin_images ( url, is_preview ) )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .returns<AlertRow[]>()
    : { data: null };

  // Group openings by alert.
  const groups = new Map<string, NotificationRow[]>();
  for (const n of rawNotifications ?? []) {
    if (!n.alerts) continue;
    const arr = groups.get(n.alert_id) ?? [];
    arr.push(n);
    groups.set(n.alert_id, arr);
  }
  const notifiedAlertIds = new Set(groups.keys());
  const needsAttention = [...groups.values()].map(toNotificationCardProps);

  // Currently Watching = active alerts WITHOUT a live opening (those show in Needs
  // Attention instead). Past = cancelled.
  const active = (rawAlerts ?? []).filter(
    (a) => a.status === "active" && !notifiedAlertIds.has(a.id)
  );
  const cancelled = (rawAlerts ?? []).filter((a) => a.status === "cancelled");
  const hasAlerts = needsAttention.length > 0 || active.length > 0 || cancelled.length > 0;

  return (
    <div className="min-h-screen bg-night flex flex-col">
      <TopNav email={user?.email ?? null} name={user?.user_metadata?.full_name ?? null} />
      <main className="flex-1 page-container pt-8 lg:pt-12 pb-page">
        <DeepLinkScroll />
        <h1 className="text-display-fraunces text-wax">Alerts</h1>

        {hasAlerts ? (
          <div className="mt-30 flex flex-col gap-20">
            {needsAttention.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Needs Attention</p>
                <div className="mt-section-content flex flex-col gap-6">
                  {needsAttention.map((card) => (
                    <div
                      key={card.alertId}
                      id={`alert-${card.alertId}`}
                      className="rounded-lg transition-shadow duration-700"
                    >
                      <NotificationCard {...card} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {active.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Currently Watching</p>
                <AlertCardList alerts={active.map(toCardProps)} targetAlertId={targetAlertId} />
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Past Alerts</p>
                <AlertCardList alerts={cancelled.map(toCardProps)} targetAlertId={targetAlertId} />
              </section>
            )}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center gap-6 text-center">
            <p className="text-body text-smoke max-w-xs">
              Find a cabin worth waiting for. Set an alert and we&apos;ll do the refreshing for you.
            </p>
            <Link
              href="/"
              className="bg-ember text-wax text-body font-medium px-6 py-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              Explore cabins
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
