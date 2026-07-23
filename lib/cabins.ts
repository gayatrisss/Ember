import { createStaticClient } from "@/lib/supabase/static";
import { confident, formatAccess, formatCabinName, getCabinType } from "@/lib/format";
import { resolveCapacity, type Fact } from "@/lib/facts";
import { recGovUrl } from "@/lib/recgov";
import type { Cabin } from "@/types/cabin";

/** Card-ready primitives carried on each point. GeoJSON properties must be flat (no nested objects). */
export type CabinFeatureProps = {
  id: string;
  name: string;
  area: string | null;
  sleeps: number | null;
  rate: string | null;
  /**
   * Preview photo URL, carried on the point so the card can start fetching it the instant
   * a dot is selected — instead of waiting on /api/cabins/[id] to even learn the URL. That
   * serial hop (API, then image) was the /explore card's dominant latency, worst on prod
   * where the API leg hits hosted Supabase. Same "best image" ordering as fetchCabinCard,
   * so the photo never changes once the detail request lands.
   */
  imageUrl: string | null;
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
      "facility_id, facility_name, rec_area_name, latitude, longitude, sleeps, nightly_rate, cabin_images(url)"
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

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: row.facility_id,
        name: formatCabinName(row.facility_name),
        area: row.rec_area_name,
        sleeps: row.sleeps,
        rate: row.nightly_rate,
        imageUrl: images?.[0]?.url ?? null,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * The extra detail the /explore card fills in once a dot is selected. The map's GeoJSON
 * carries what paints a dot, the card headline, AND the preview image URL; only the
 * facts that need columns absent from the map payload (capacity, access, canonical URL)
 * are fetched per selection. The photo is deliberately NOT here — it rides on the point
 * so it can start loading without waiting for this request.
 */
export type CabinCard = {
  id: string;
  name: string;
  area: string | null;
  /** Resolved server-side by resolveCapacity so every surface labels it identically. */
  capacity: Fact | null;
  /** Raw numeric string from Postgres; format with formatRate at render. */
  rate: string | null;
  type: string;
  access: string | null;
  elevationFt: number | null;
  /** Canonical Recreation.gov URL — the card's only explicit link. See lib/recgov.ts. */
  recGovUrl: string;
};

type CardRow = Pick<
  Cabin,
  | "facility_id"
  | "facility_name"
  | "rec_area_name"
  | "sleeps"
  | "num_beds"
  | "nightly_rate"
  | "road_access"
  | "road_access_conf"
  | "elevation_ft"
  | "elevation_ft_conf"
  | "reservation_url"
>;

/**
 * Loads one cabin's card detail. The photo is NOT fetched here — it comes from the map
 * payload (CabinFeatureProps.imageUrl), so this is a single lightweight row lookup.
 * Null when the id is unknown.
 */
export async function fetchCabinCard(id: string): Promise<CabinCard | null> {
  const supabase = createStaticClient();

  const { data: cabin, error } = await supabase
    .from("cabins")
    .select(
      "facility_id, facility_name, rec_area_name, sleeps, num_beds, nightly_rate, road_access, road_access_conf, elevation_ft, elevation_ft_conf, reservation_url"
    )
    .eq("facility_id", id)
    .maybeSingle<CardRow>();

  if (error) {
    console.error("[ember] fetchCabinCard error", error.message);
    return null;
  }
  if (!cabin) return null;

  const access = confident(cabin.road_access, cabin.road_access_conf);

  return {
    id: cabin.facility_id,
    name: formatCabinName(cabin.facility_name),
    area: cabin.rec_area_name,
    capacity: resolveCapacity(cabin),
    rate: cabin.nightly_rate,
    type: getCabinType(cabin.facility_name),
    access: access ? formatAccess(access) : null,
    elevationFt: confident(cabin.elevation_ft, cabin.elevation_ft_conf),
    recGovUrl: recGovUrl(cabin.facility_id, cabin.reservation_url),
  };
}
