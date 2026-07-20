import { ExploreMap } from "@/components/ui/explore-map";
import { fetchMapCabins } from "@/lib/cabins";

// Cabins are a frozen one-time dump; cache the render and refresh daily so a
// DB-only re-dump is picked up within 24h. Kept ISR (not dynamic) by reading
// through the cookieless static client. See maps-feature.
export const revalidate = 86400;

export default async function Explore() {
  const cabins = await fetchMapCabins();

  return (
    <div className="fixed inset-0 bg-night">
      <ExploreMap cabins={cabins} />
    </div>
  );
}
