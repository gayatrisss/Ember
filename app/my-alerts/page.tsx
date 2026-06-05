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

  const { data: alerts } = user
    ? await supabase
        .from("alerts")
        .select(`
          id, facility_id, date_from, date_to, type, status, flexibility, created_at,
          cabins ( facility_name, rec_area_name, cabin_images ( url, is_preview ) )
        `)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .returns<AlertRow[]>()
    : { data: null };

  return (
    <div className="min-h-screen bg-night">
      <TopNav />
      <main className="page-container py-8 lg:py-12">
        <h1 className="text-display-fraunces text-wax">Alerts</h1>

        {alerts && alerts.length > 0 ? (
          <div className="mt-8 flex flex-col gap-3">
            {alerts.map((alert) => {
              const images = alert.cabins?.cabin_images ?? [];
              const image = images.find((i) => i.is_preview) ?? images[0] ?? null;
              return (
                <AlertCard
                  key={alert.id}
                  cabinName={alert.cabins?.facility_name ?? alert.facility_id}
                  recAreaName={alert.cabins?.rec_area_name ?? null}
                  dateFrom={alert.date_from}
                  dateTo={alert.date_to}
                  imageUrl={image?.url ?? null}
                  status={alert.status}
                />
              );
            })}
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
