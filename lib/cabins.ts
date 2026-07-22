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
  const { data, error } = await supabase
    .from("cabins")
    .select("facility_id, facility_name, rec_area_name, latitude, longitude, sleeps, nightly_rate");

  if (error) {
    console.error("[ember] fetchMapCabins error", error.message);
    return { type: "FeatureCollection", features: [] };
  }

  const features: CabinFeature[] = [];
  for (const row of data ?? []) {
    const { latitude: lat, longitude: lng } = row;
    if (typeof lat !== "number" || typeof lng !== "number" || !inBox(lat, lng)) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: row.facility_id,
        name: formatCabinName(row.facility_name),
        area: row.rec_area_name,
        sleeps: row.sleeps,
        rate: row.nightly_rate,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * The extra detail the /explore card shows once a dot is selected. The map's GeoJSON
 * deliberately carries only what paints a dot plus a card headline; the photo and the
 * remaining facts are fetched per selection so /explore doesn't ship ~519 rows of
 * detail (and ~519 image URLs) on first load.
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
  imageUrl: string | null;
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

/** Loads one cabin's card detail, including its preview photo. Null when the id is unknown. */
export async function fetchCabinCard(id: string): Promise<CabinCard | null> {
  const supabase = createStaticClient();

  const [{ data: cabin, error }, { data: images }] = await Promise.all([
    supabase
      .from("cabins")
      .select(
        "facility_id, facility_name, rec_area_name, sleeps, num_beds, nightly_rate, road_access, road_access_conf, elevation_ft, elevation_ft_conf, reservation_url"
      )
      .eq("facility_id", id)
      .maybeSingle<CardRow>(),
    supabase
      .from("cabin_images")
      .select("url")
      .eq("facility_id", id)
      .order("is_primary", { ascending: false })
      .order("is_preview", { ascending: false })
      .limit(1),
  ]);

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
    imageUrl: images?.[0]?.url ?? null,
    recGovUrl: recGovUrl(cabin.facility_id, cabin.reservation_url),
  };
}
