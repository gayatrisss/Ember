import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/landing/top-nav";
import Footer from "@/components/landing/footer";
import StatusBar from "@/components/ui/status-bar";
import CabinHeader from "@/components/listing/cabin-header";
import { CabinFacts } from "@/components/listing/cabin-facts";
import TopoImage from "@/components/listing/topo-image";
import FieldNotes from "@/components/listing/field-notes";
import { AvailabilityPanel } from "@/components/ui/availability-panel";
import type { Cabin, CabinImage } from "@/types/cabin";
import { confident, getCabinType, formatRate } from "@/lib/format";

type Params = { id: string };

export default async function CabinPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  const supabase = await createClient();

  const [{ data: cabin }, { data: images }] = await Promise.all([
    supabase.from("cabins").select("*").eq("facility_id", id).single<Cabin>(),
    supabase
      .from("cabin_images")
      .select("*")
      .eq("facility_id", id)
      .order("is_primary", { ascending: false })
      .order("is_preview", { ascending: false })
      .returns<CabinImage[]>(),
  ]);

  if (!cabin) notFound();

  const sleeps = confident(cabin.sleeps, cabin.sleeps_conf);
  const type = getCabinType(cabin.facility_name);
  const rate = formatRate(cabin.nightly_rate);

  return (
    <div className="min-h-screen bg-night flex flex-col">
      <TopNav />
      <StatusBar facilityId={id} />

      <main className="flex-1 page-container pt-8 lg:pt-12 pb-page">
        <CabinHeader cabin={cabin} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 lg:items-stretch">
          <div className="flex flex-col gap-4">
            <CabinFacts
              facts={[
                { label: "Sleeps", value: sleeps ? `${sleeps} people` : "—" },
                { label: "Type", value: type },
                { label: "Signal", value: "—" },
                { label: "Price", value: rate ?? "—" },
              ]}
            />
            {/* aspect-[3/4] is the mobile fallback; on desktop flex-1 fills the remaining column height */}
            <div className="aspect-[3/4] lg:aspect-auto lg:flex-1 lg:min-h-0">
              <TopoImage images={images ?? []} name={cabin.facility_name} />
            </div>
          </div>

          <AvailabilityPanel facilityId={id} cabinName={cabin.facility_name} />
        </div>

        <FieldNotes cabin={cabin} />
      </main>
      <Footer />
    </div>
  );
}
