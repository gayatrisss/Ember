import { createStaticClient } from "@/lib/supabase/static";
import { formatCabinName, formatRate } from "@/lib/format";
import { resolveCapacity } from "@/lib/facts";
import { recGovUrl } from "@/lib/recgov";

/**
 * Everything the /explore card renders, carried on each map point — pre-resolved into
 * flat fields (GeoJSON properties can't nest).
 *
 * The card used to fetch its facts per selection from /api/cabins/[id]. But every field
 * it shows comes from the frozen cabin dump, so there was nothing dynamic to fetch: the
 * same logic that put coordinates and the photo URL here applies to capacity, price and
 * the rec.gov link. Loading it all once (a few KB gzipped for the whole set — the URLs
 * share one prefix and compress away) makes the card instant on selection and deletes
 * the per-card API route, its hook, and its cache.
 *
 * Capacity and the rec.gov URL are resolved server-side (resolveCapacity, recGovUrl) so
 * that logic — including the "Beds vs Occupancy" subtlety — stays off the client. The
 * one thing NOT pre-resolved is the photo: it's an external CDN image, so the client
 * still fades it in when its bytes arrive.
 */
export type CabinFeatureProps = {
  id: string;
  name: string;
  area: string | null;
  imageUrl: string | null;
  /** "Beds" | "Occupancy" | null when neither bed count nor occupancy is known. */
  capacityLabel: string | null;
  /** "4 beds" | "12 people" | null. */
  capacityValue: string | null;
  /** Formatted "$55/night", or null. */
  price: string | null;
  /** Canonical Recreation.gov URL — the card's only explicit link. See lib/recgov.ts. */
  recGovUrl: string;
};

export type CabinFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: CabinFeatureProps;
};

export type CabinFeatureCollection = {
  type: "FeatureCollection";
  features: CabinFeature[];
};

/**
 * US + Alaska + Hawaii bounding box. Wide enough to keep the 154 Alaskan fly-in
 * cabins (off-screen at the Montana default, reachable by pan/search) and Hawaii,
 * while dropping the handful of junk coords in the ocean / off Antarctica.
 */
const US_BBOX = { minLng: -180, maxLng: -66, minLat: 15, maxLat: 72 };

function inBox(lat: number, lng: number): boolean {
  return lng >= US_BBOX.minLng && lng <= US_BBOX.maxLng && lat >= US_BBOX.minLat && lat <= US_BBOX.maxLat;
}

/**
 * Fetches every plottable cabin as a GeoJSON FeatureCollection for the /explore map.
 * The set is small (~519 rows, a frozen one-time dump) and publicly readable, so we
 * load it whole once and let the client pan without further fetches. Uses the
 * cookieless static client so /explore stays ISR-cacheable. See maps-feature.
 */
export async function fetchMapCabins(): Promise<CabinFeatureCollection> {
  const supabase = createStaticClient();
  // Embed the single best image per cabin (limit 1, primary → preview ordering) rather
  // than a flat join: cabin_images has ~3800 rows, past Supabase's 1000-row default cap,
  // whereas the 511-cabin parent query stays well under it.
  const { data, error } = await supabase
    .from("cabins")
    .select(
      "facility_id, facility_name, rec_area_name, latitude, longitude, sleeps, num_beds, nightly_rate, reservation_url, cabin_images(url)"
    )
    .order("is_primary", { referencedTable: "cabin_images", ascending: false })
    .order("is_preview", { referencedTable: "cabin_images", ascending: false })
    .limit(1, { referencedTable: "cabin_images" });

  if (error) {
    console.error("[ember] fetchMapCabins error", error.message);
    return { type: "FeatureCollection", features: [] };
  }

  const features: CabinFeature[] = [];
  for (const row of data ?? []) {
    const { latitude: lat, longitude: lng } = row;
    if (typeof lat !== "number" || typeof lng !== "number" || !inBox(lat, lng)) continue;

    const images = row.cabin_images as { url: string }[] | null;
    const capacity = resolveCapacity({
      num_beds: row.num_beds as number | null,
      sleeps: row.sleeps as number | null,
    });

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: row.facility_id,
        name: formatCabinName(row.facility_name),
        area: row.rec_area_name,
        imageUrl: images?.[0]?.url ?? null,
        capacityLabel: capacity?.label ?? null,
        capacityValue: capacity?.value ?? null,
        price: formatRate(row.nightly_rate as string | null),
        recGovUrl: recGovUrl(row.facility_id, row.reservation_url as string | null),
      },
    });
  }

  return { type: "FeatureCollection", features };
}
