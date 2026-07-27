import type { CircleLayerSpecification, DataDrivenPropertyValueSpecification } from "mapbox-gl";
import { MAP_COLORS } from "@/lib/mapbox";

/**
 * Mapbox GL paint specs for the /explore cabin dots. Kept apart from the map component
 * so the dot treatment can be tuned without touching the interaction logic.
 *
 * Source of truth: the "map dots" component in Figma (node 4157:4686). Colours decoded
 * from the rendered component, not guessed — both states share one structure:
 *
 *   core   (18px) — the accent: navy (#232d33) at rest, ember when selected
 *   ring   (26px) — a WHITE disc with a thin accent stroke at its edge, so a clean white
 *                   halo sits between the core and the stroke
 *   glow   (32px+) — a soft accent bleed: subtle smoke at rest, wider ember when selected
 *
 * A GL circle paints one fill plus one stroke, so the white disc + accent edge is a
 * single layer (fill white, stroke accent); the core and glow are their own circles,
 * stacked largest-first.
 */

/** The id the map marks interactive, so clicks and hovers hit the dots and nothing else. */
export const DOT_LAYER_ID = "cabin-dots";

/**
 * Figma draws the dot at one size. On the map that size is only right up close: at the
 * statewide default (zoom 5.6) 500+ dots at full size merge into a smear, so radii scale
 * down when zoomed out and reach the design at zoom 11.
 */
function byZoom(statewide: number, closeUp: number): DataDrivenPropertyValueSpecification<number> {
  return ["interpolate", ["linear"], ["zoom"], 5, statewide, 11, closeUp];
}

/** Resting radii, statewide → design (close-up diameters: 18px core, 26px ring). */
const CORE_RADIUS = byZoom(3, 9);
const RING_RADIUS = byZoom(4.5, 13);
const GLOW_RADIUS = byZoom(5.5, 16);
/** Selected radii — ~1.35× larger so the chosen cabin reads as bigger, not just glowier. */
const SELECTED_CORE_RADIUS = byZoom(4, 12);
const SELECTED_RING_RADIUS = byZoom(6, 17);
/**
 * The selected glow is two stacked circles, not one: a bright near-glow plus a wide soft
 * bloom. A single mapbox circle can't be a radial gradient, but circle-blur:1 fades a
 * circle from a full-opacity centre to a transparent edge, so two of them at different
 * radii/opacities approximate Figma's soft ember bloom that spreads ~2.5× the dot.
 */
const SELECTED_GLOW_INNER = byZoom(9, 26);
const SELECTED_GLOW_OUTER = byZoom(16, 48);
/** The accent stroke on the white ring — thin up close, thinner still when zoomed out. */
const STROKE_WIDTH = byZoom(0.5, 1.5);

/**
 * Resting cabin dot: navy core, white ring edged in smoke, soft smoke glow.
 * Ordered bottom-up — glow first, then the white ring, then the core on top.
 */
export const cabinDotLayers: CircleLayerSpecification[] = [
  {
    // Widest layer doubles as the click target, so the whole dot is clickable.
    id: DOT_LAYER_ID,
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": GLOW_RADIUS,
      "circle-color": MAP_COLORS.smoke,
      "circle-opacity": 0.16,
      "circle-blur": 0.5,
    },
  },
  {
    id: "cabin-dot-ring",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": RING_RADIUS,
      "circle-color": MAP_COLORS.white,
      "circle-stroke-width": STROKE_WIDTH,
      "circle-stroke-color": MAP_COLORS.smoke,
    },
  },
  {
    id: "cabin-dot-core",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": CORE_RADIUS,
      "circle-color": MAP_COLORS.smoke,
    },
  },
];

/**
 * The selected cabin, redrawn on top in ember. Same core + white-ring structure, with a
 * wider, softer ember glow. Every layer is filtered to the selected id by the map, so
 * they render nothing when the selection is empty.
 */
export const selectedDotLayers: CircleLayerSpecification[] = [
  {
    // Wide soft bloom — the long, faint outer tail of the glow.
    id: "cabin-dot-selected-glow-outer",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": SELECTED_GLOW_OUTER,
      "circle-color": MAP_COLORS.ember,
      "circle-opacity": 0.28,
      "circle-blur": 1,
    },
  },
  {
    // Brighter near-glow — the hotter ember right around the dot.
    id: "cabin-dot-selected-glow-inner",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": SELECTED_GLOW_INNER,
      "circle-color": MAP_COLORS.ember,
      "circle-opacity": 0.5,
      "circle-blur": 1,
    },
  },
  {
    id: "cabin-dot-selected-ring",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": SELECTED_RING_RADIUS,
      "circle-color": MAP_COLORS.white,
      "circle-stroke-width": STROKE_WIDTH,
      "circle-stroke-color": MAP_COLORS.ember,
    },
  },
  {
    id: "cabin-dot-selected-core",
    type: "circle",
    source: "cabins",
    paint: {
      "circle-radius": SELECTED_CORE_RADIUS,
      "circle-color": MAP_COLORS.ember,
    },
  },
];
