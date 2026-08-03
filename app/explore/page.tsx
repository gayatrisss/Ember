import PageEdges from "@/components/ui/page-edges";
import { Suspense } from "react";
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
      {/* Night at both ends: the map is fixed and non-scrolling, so there is no
          footer to match — any bounce should stay on the map's own surface. */}
      <PageEdges bottom="night" />
      {/* ExploreMap reads ?cabin= via useSearchParams. In a prerendered route that
          suspends, and the production build fails without this boundary — it only
          appears to work in dev, where routes render on demand. Keeping the boundary
          here is what lets the page stay ISR instead of going dynamic. */}
      <Suspense fallback={<div className="h-full w-full bg-night" />}>
        <ExploreMap cabins={cabins} />
      </Suspense>
    </div>
  );
}
