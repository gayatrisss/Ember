import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopNav from "@/components/landing/top-nav";
import StatusBar from "@/components/ui/status-bar";
import CabinHeader from "@/components/listing/cabin-header";
import TopoImage from "@/components/listing/topo-image";
import FieldNotes from "@/components/listing/field-notes";
import { AvailabilityPanel } from "@/components/ui/availability-panel";
import type { Cabin, CabinImage } from "@/types/cabin";

type Params = { id: string };

export default async function CabinPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

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

  return (
    <div className="min-h-screen bg-night">
      <TopNav />
      <StatusBar facilityId={id} />

      <main className="page-container py-8 lg:py-12">
        <CabinHeader cabin={cabin} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <TopoImage images={images ?? []} name={cabin.facility_name} />

          <AvailabilityPanel facilityId={id} cabinName={cabin.facility_name} />
        </div>

        <FieldNotes cabin={cabin} />
      </main>
    </div>
  );
}
