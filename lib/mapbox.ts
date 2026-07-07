const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Ember editorial topo style (built from mapbox/ember-topo.style.json, tuned in Studio).
const STYLE = "gayatrisabne05/cmr9oszqd000a01rde29wh768";

type StaticMapOptions = {
  lat: number;
  lng: number;
  /** Higher = more zoomed in. 13 shows the local road network + smoother contours; 12 frames a wider area. */
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
  zoom = 15,
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
