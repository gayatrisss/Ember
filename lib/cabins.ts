import { createStaticClient } from "@/lib/supabase/static";
import { formatCabinName } from "@/lib/format";

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
