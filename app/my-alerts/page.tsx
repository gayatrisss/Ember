import Link from "next/link";
import TopNav from "@/components/landing/top-nav";
import { createClient } from "@/lib/supabase/server";
import { AlertCard } from "@/components/alerts/alert-card";

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
    <div className="min-h-screen bg-night">
      <TopNav />
      <main className="page-container py-8 lg:py-12">
        <h1 className="text-display-fraunces text-wax">Alerts</h1>

        {hasAlerts ? (
          <div className="mt-30 flex flex-col gap-20">
            {triggered.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Needs Attention</p>
                <div className="mt-section-content flex flex-col gap-6">
                  {triggered.map((alert) => {
                    const images = alert.cabins?.cabin_images ?? [];
                    const image = images.find((i) => i.is_preview) ?? images[0] ?? null;
                    return (
                      <AlertCard
                        key={alert.id}
                        alertId={alert.id}
                        facilityId={alert.facility_id}
                        cabinName={alert.cabins?.facility_name ?? alert.facility_id}
                        recAreaName={alert.cabins?.rec_area_name ?? null}
                        dateFrom={alert.date_from}
                        dateTo={alert.date_to}
                        imageUrl={image?.url ?? null}
                        status={alert.status}
                        flexibility={alert.flexibility}
                      />
                    );
                  })}
                </div>
              </section>
            )}
            {active.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Currently Watching</p>
                <div className="mt-section-content flex flex-col gap-6">
                  {active.map((alert) => {
                    const images = alert.cabins?.cabin_images ?? [];
                    const image = images.find((i) => i.is_preview) ?? images[0] ?? null;
                    return (
                      <AlertCard
                        key={alert.id}
                        alertId={alert.id}
                        facilityId={alert.facility_id}
                        cabinName={alert.cabins?.facility_name ?? alert.facility_id}
                        recAreaName={alert.cabins?.rec_area_name ?? null}
                        dateFrom={alert.date_from}
                        dateTo={alert.date_to}
                        imageUrl={image?.url ?? null}
                        status={alert.status}
                        flexibility={alert.flexibility}
                      />
                    );
                  })}
                </div>
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <p className="text-body text-wax uppercase">Past Alerts</p>
                <div className="mt-section-content flex flex-col gap-6">
                  {cancelled.map((alert) => {
                    const images = alert.cabins?.cabin_images ?? [];
                    const image = images.find((i) => i.is_preview) ?? images[0] ?? null;
                    return (
                      <AlertCard
                        key={alert.id}
                        alertId={alert.id}
                        facilityId={alert.facility_id}
                        cabinName={alert.cabins?.facility_name ?? alert.facility_id}
                        recAreaName={alert.cabins?.rec_area_name ?? null}
                        dateFrom={alert.date_from}
                        dateTo={alert.date_to}
                        imageUrl={image?.url ?? null}
                        status={alert.status}
                        flexibility={alert.flexibility}
                      />
                    );
                  })}
                </div>
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
    </div>
  );
}
