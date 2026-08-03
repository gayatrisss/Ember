import PageEdges from "@/components/ui/page-edges";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TopNav from "@/components/landing/top-nav";
import Footer from "@/components/landing/footer";
import MobileTabBar from "@/components/landing/mobile-tab-bar";
import CabinActions from "@/components/listing/cabin-actions";
import StatusBar from "@/components/ui/status-bar";
import CabinHeader from "@/components/listing/cabin-header";
import { CabinFacts } from "@/components/listing/cabin-facts";
import CabinPhoto from "@/components/listing/cabin-photo";
import TopoMap from "@/components/ui/topo-map";
import FieldNotes from "@/components/listing/field-notes";
import type { Cabin, CabinImage } from "@/types/cabin";
import { confident, getCabinType, formatCabinName, formatRate, formatAccess } from "@/lib/format";
import { resolveCapacity } from "@/lib/facts";
import { fetchInitialMonths } from "@/lib/availability";

type Params = { id: string };
type Search = { [key: string]: string | string[] | undefined };

export default async function CabinPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const checkIn = typeof sp.checkIn === "string" ? sp.checkIn : null;
  const checkOut = typeof sp.checkOut === "string" ? sp.checkOut : null;

  const supabase = await createClient();

  const [
    { data: cabin },
    { data: images },
    {
      data: { user },
    },
    initialMonths,
  ] = await Promise.all([
    supabase.from("cabins").select("*").eq("facility_id", id).single<Cabin>(),
    supabase
      .from("cabin_images")
      .select("*")
      .eq("facility_id", id)
      .order("is_primary", { ascending: false })
      .order("is_preview", { ascending: false })
      .returns<CabinImage[]>(),
    supabase.auth.getUser(),
    // Prefetch the month(s) the panel opens to so it renders without a loading spinner.
    fetchInitialMonths(id, checkIn, checkOut),
  ]);

  if (!cabin) notFound();

  const capacity = resolveCapacity(cabin);
  const name = formatCabinName(cabin.facility_name);
  const type = getCabinType(cabin.facility_name);
  const rate = formatRate(cabin.nightly_rate);
  const access = confident(cabin.road_access, cabin.road_access_conf);

  return (
    <div className="min-h-screen bg-night flex flex-col">
      <PageEdges />
      <TopNav email={user?.email ?? null} name={user?.user_metadata?.full_name ?? null} />

      {/* The top nav is desktop-only, so below lg the wordmark sits above the
          status row, matching the home page. */}
      <Link
        href="/"
        className="lg:hidden block text-center text-display-fraunces-md text-wax logo-glow-hover pt-5 pb-grouped"
      >
        ember.
      </Link>

      <StatusBar facilityId={id} reservationUrl={cabin.reservation_url} />

      <main className="flex-1 page-container pt-grouped lg:pt-12 pb-major">
        <CabinHeader cabin={cabin} name={name} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-grouped lg:mt-8 lg:items-stretch">
          <div className="flex flex-col gap-grouped lg:gap-4">
            <CabinFacts
              facts={[
                { label: capacity?.label ?? "Beds", value: capacity?.value ?? "—" },
                { label: "Type", value: type },
                { label: "Access", value: access ? formatAccess(access) : "—" },
                { label: "Price", value: rate ?? "—" },
              ]}
            />
            {/* Photo + map read as one unit: no gap, only the outer corners are rounded */}
            <div className="flex flex-col lg:flex-1 lg:min-h-0">
              <CabinPhoto images={images ?? []} name={name} className="rounded-b-none" />
              {/* 170px on mobile; on desktop flex-1 fills the remaining column height */}
              <div className="h-[170px] lg:h-auto lg:flex-1 lg:min-h-0">
                <TopoMap
                  lat={cabin.latitude}
                  lng={cabin.longitude}
                  name={name}
                  className="rounded-t-none"
                />
              </div>
            </div>
          </div>

          {/* Below lg this renders the panel inside the availability drawer and
              shows the docked bar; at lg it degrades to a plain grid child. */}
          <CabinActions
            facilityId={id}
            cabinName={name}
            reservationUrl={cabin.reservation_url}
            initialMonths={initialMonths}
          />
        </div>

        <FieldNotes cabin={cabin} />
      </main>
      <Footer clearance="cabin-actions" />
      <MobileTabBar email={user?.email ?? null} />
    </div>
  );
}
