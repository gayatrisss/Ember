"use client";

import Map, { Source, Layer } from "react-map-gl/mapbox";
import type { CircleLayerSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EXPLORE_MAP_STYLE, MAPBOX_ACCESS_TOKEN, MAP_COLORS, MONTANA_VIEW } from "@/lib/mapbox";
import type { CabinFeatureCollection } from "@/lib/cabins";

/** Gray dots for the ~519 cabins, drawn in one GL circle layer (ember is reserved for the selected pin). */
const cabinDotLayer: CircleLayerSpecification = {
  id: "cabin-dots",
  type: "circle",
  source: "cabins",
  paint: {
    "circle-radius": 4,
    "circle-color": MAP_COLORS.smoke,
    "circle-opacity": 0.9,
    // Light stroke separates the dots from the warm terrain basemap.
    "circle-stroke-width": 1.5,
    "circle-stroke-color": MAP_COLORS.wax,
  },
};

/**
 * Full-bleed interactive map for the /explore page. Renders the basemap plus every
 * cabin as a gray dot. Selection, the floating card, and search land later.
 */
export function ExploreMap({ cabins }: { cabins: CabinFeatureCollection }) {
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
    >
      <Source id="cabins" type="geojson" data={cabins}>
        <Layer {...cabinDotLayer} />
      </Source>
    </Map>
  );
}
