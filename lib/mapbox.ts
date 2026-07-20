const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Public token for client-side GL JS + Static Images API. */
export const MAPBOX_ACCESS_TOKEN = MAPBOX_TOKEN;

// Ember editorial topo style (built from mapbox/ember-topo.style.json, tuned in Studio).
const STYLE = "gayatrisabne05/cmr9oszqd000a01rde29wh768";

/**
 * Ember light warm-terrain style for the interactive /explore map
 * (seed at mapbox/ember-explore-light.style.json, tuned + published in Studio).
 */
export const EXPLORE_MAP_STYLE = "mapbox://styles/gayatrisabne05/cmrnyby97000201r984nj8p1e";

/** Default map view: centered on Montana, matching the published style's framing. */
export const MONTANA_VIEW = { longitude: -109.6, latitude: 47.0, zoom: 5.6 };

/**
 * Ember palette hexes mirrored for Mapbox GL paint. GL layers take raw hex, not
 * CSS/Tailwind tokens, so these named constants stand in for the theme.css tokens
 * of the same name (keep in sync). Ember is reserved for the selected pin.
 */
export const MAP_COLORS = {
  smoke: "#5f7a8a",
  wax: "#ede8dc",
  ember: "#d45a20",
  night: "#0f1510",
} as const;

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
 * test update
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
