import Link from "next/link";
import TopNav from "@/components/landing/top-nav";
import Footer from "@/components/landing/footer";
import { createClient } from "@/lib/supabase/server";
import { AlertCardList } from "@/components/alerts/alert-card-list";
import type { AlertCardProps } from "@/components/alerts/alert-card";

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

export default async function AlertsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const triggered = rawAlerts?.filter((a) => a.status === "triggered") ?? [];
  const active = rawAlerts?.filter((a) => a.status === "active") ?? [];
  const cancelled = rawAlerts?.filter((a) => a.status === "cancelled") ?? [];
  const hasAlerts = triggered.length > 0 || active.length > 0 || cancelled.length > 0;

  return (
    <div className="min-h-screen bg-night flex flex-col">
      <TopNav email={user?.email ?? null} name={user?.user_metadata?.full_name ?? null} />
      <main className="flex-1 page-container pt-8 lg:pt-12 pb-page">
        <h1 className="text-display-fraunces text-wax">Alerts</h1>

        {hasAlerts ? (
          <div className="mt-30 flex flex-col gap-20">
            {triggered.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Needs Attention</p>
                <AlertCardList alerts={triggered.map(toCardProps)} />
              </section>
            )}
            {active.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Currently Watching</p>
                <AlertCardList alerts={active.map(toCardProps)} />
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Past Alerts</p>
                <AlertCardList alerts={cancelled.map(toCardProps)} />
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
