const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Placeholder: stock Mapbox dark style. Swap for the Ember editorial topo style
// (mapbox://styles/<username>/<id>) once it's built + published in Mapbox Studio.
const STYLE = "mapbox/dark-v11";

type StaticMapOptions = {
  lat: number;
  lng: number;
  /** Higher = more zoomed in. ~12 gives regional terrain context around a cabin. */
  zoom?: number;
  width?: number;
  height?: number;
};

/**
 * Builds a Mapbox Static Images API URL centered on the given coordinates.
 * Because the image is centered on the cabin, the center pixel == the cabin,
 * so a CSS-centered pin overlay lines up exactly. Returns null if no token.
 */
export function staticTopoMapUrl({
  lat,
  lng,
  zoom = 12,
  width = 640,
  height = 400,
}: StaticMapOptions): string | null {
  if (!MAPBOX_TOKEN) return null;

  const center = `${lng},${lat},${zoom},0`;
  const size = `${width}x${height}@2x`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    logo: "false",
    attribution: "false",
  });

  return `https://api.mapbox.com/styles/v1/${STYLE}/static/${center}/${size}?${params}`;
}
