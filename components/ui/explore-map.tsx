"use client";

import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { EXPLORE_MAP_STYLE, MAPBOX_ACCESS_TOKEN, MONTANA_VIEW } from "@/lib/mapbox";

/**
 * Full-bleed interactive map for the /explore page. Renders nothing but the
 * basemap for now — cabin pins, search, and the floating card land later.
 */
export function ExploreMap() {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn("[ember] explore-map: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
    return null;
  }

  return (
    <Map
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      mapStyle={EXPLORE_MAP_STYLE}
      initialViewState={MONTANA_VIEW}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
