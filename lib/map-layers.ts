import type { CircleLayerSpecification, DataDrivenPropertyValueSpecification } from "mapbox-gl";
import { MAP_COLORS, MAP_DOT_BAND_OPACITY } from "@/lib/mapbox";

/**
 * Mapbox GL paint specs for the /explore cabin dots. Kept apart from the map
 * component so the dot treatment can be tuned without touching the map's
 * interaction logic (selection, search, camera).
 *
 * Source of truth: the "map dots" component in Figma (node 4157:4686), which draws
 * each dot as three concentric bands on a 32px box — 18px core, 26px halo, 32px
 * outer band — with the selected state adding an ember glow that bleeds to ~50px.
 * A GL circle layer only paints one fill plus one stroke, so each band is its own
 * layer and the rings come from stacking filled circles largest-first.
 */

/** The id the map marks interactive, so clicks and hovers hit the dots and nothing else. */
export const DOT_LAYER_ID = "cabin-dots";

/**
 * Figma draws the dot at one size. On the map that size is only right up close: at the
 * statewide default (zoom 5.6) 519 dots at full size merge into a smear, so radii scale
 * down to roughly the old 11px footprint when zoomed out and reach the design at zoom 11.
 */
function byZoom(statewide: number, closeUp: number): DataDrivenPropertyValueSpecification<number> {
  return ["interpolate", ["linear"], ["zoom"], 5, statewide, 11, closeUp];
}

/** Band radii, statewide → design. Diameters at close-up: 18px core, 26px halo, 32px outer. */
const CORE_RADIUS = byZoom(3, 9);
const HALO_RADIUS = byZoom(4.5, 13);
const BAND_RADIUS = byZoom(5.5, 16);
/** The selected state's glow, from the -27.5% bleed on the outermost group (~50px). */
const GLOW_RADIUS = byZoom(9, 25);

/**
 * Resting cabin dot: warm-gray core, wax halo, translucent wax outer band.
 * Ordered bottom-up — the outer band is drawn first and the smaller circles sit on
 * top of it, so each ring is the sliver of the layer below that still shows.
 */
export const cabinDotLayers: CircleLayerSpecification[] = [
  {
    // Widest band doubles as the click target, so the whole dot is clickable, not just its core.
    id: DOT_LAYER_ID,
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": BAND_RADIUS,
      "circle-color": MAP_COLORS.wax,
      "circle-opacity": MAP_DOT_BAND_OPACITY,
    },
  },
  {
    id: "cabin-dot-halo",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": HALO_RADIUS,
      "circle-color": MAP_COLORS.wax,
    },
  },
  {
    id: "cabin-dot-core",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": CORE_RADIUS,
      "circle-color": MAP_COLORS.waxDim,
    },
  },
];

/**
 * The selected cabin, redrawn on top in ember. Same three bands as the resting dot plus
 * the outer glow. Every layer here is filtered to the selected id by the map, so all of
 * them render nothing when the selection is empty.
 */
export const selectedDotLayers: CircleLayerSpecification[] = [
  {
    id: "cabin-dot-selected-glow",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": GLOW_RADIUS,
      "circle-color": MAP_COLORS.ember,
      "circle-opacity": 0.35,
      // Feathers the fill out to nothing, standing in for the soft radial bleed in Figma.
      "circle-blur": 0.8,
    },
  },
  {
    id: "cabin-dot-selected-band",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": BAND_RADIUS,
      "circle-color": MAP_COLORS.ember,
      "circle-opacity": MAP_DOT_BAND_OPACITY,
    },
  },
  {
    id: "cabin-dot-selected-halo",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": HALO_RADIUS,
      "circle-color": MAP_COLORS.wax,
    },
  },
  {
    id: "cabin-dot-selected-core",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": CORE_RADIUS,
      "circle-color": MAP_COLORS.ember,
    },
  },
];

/* ------------------------------------------------------------------------- *
 * Superseded by the arrays above, still mounted by explore-map.tsx. Delete
 * both once that file renders the arrays — see the dots/search split.
 * ------------------------------------------------------------------------- */

/** @deprecated Use {@link cabinDotLayers}. */
export const cabinDotLayer: CircleLayerSpecification = {
  id: DOT_LAYER_ID,
  type: "circle",
  source: "cabins",
  paint: {
    "circle-radius": 4,
    "circle-color": MAP_COLORS.smoke,
    "circle-opacity": 0.9,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": MAP_COLORS.wax,
  },
};

/** @deprecated Use {@link selectedDotLayers}. */
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
