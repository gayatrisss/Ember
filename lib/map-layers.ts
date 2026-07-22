import type { CircleLayerSpecification } from "mapbox-gl";
import { MAP_COLORS } from "@/lib/mapbox";

/**
 * Mapbox GL paint specs for the /explore cabin dots. Kept apart from the map
 * component so the dot treatment can be tuned without touching the map's
 * interaction logic (selection, search, camera).
 */

/** The id the map marks interactive, so clicks and hovers hit the dots and nothing else. */
export const DOT_LAYER_ID = "cabin-dots";

/** Gray dots for the ~519 cabins, drawn in one GL circle layer (ember is reserved for the selected pin). */
export const cabinDotLayer: CircleLayerSpecification = {
  id: DOT_LAYER_ID,
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

/** The selected cabin, redrawn on top in ember. Filtered to one id (none when nothing is selected). */
export const selectedDotLayer: CircleLayerSpecification = {
  id: "cabin-dot-selected",
  type: "circle",
  source: "cabins",
  paint: {
    "circle-radius": 7,
    "circle-color": MAP_COLORS.ember,
    "circle-stroke-width": 2,
    "circle-stroke-color": MAP_COLORS.wax,
  },
};
