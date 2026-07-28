"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// Aliased: the default export would otherwise shadow the global Map constructor.
import MapGL, { Source, Layer, Popup, type MapRef } from "react-map-gl/mapbox";
import type { MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EXPLORE_MAP_STYLE, MAPBOX_ACCESS_TOKEN, MONTANA_VIEW } from "@/lib/mapbox";
import { cabinDotLayers, DOT_LAYER_ID, selectedDotLayers } from "@/lib/map-layers";
import { ExploreCard } from "@/components/ui/explore-card";
import { ExploreHeader } from "@/components/ui/explore-header";
import type { Cabin } from "@/components/ui/use-cabin-search";
import type { CabinFeature, CabinFeatureCollection } from "@/lib/cabins";

/** Regional zoom on select: close enough to place the cabin, wide enough to keep its neighbours. */
const SELECT_ZOOM = 10;

/** Pixels to drop the selected dot below centre so its card clears the floating header. */
const HEADER_CLEARANCE = 140;

/**
 * Full-bleed interactive map for the /explore page. Renders the basemap plus every
 * cabin as a gray dot; selecting one (by click or search) opens its detail card.
 *
 * The selected cabin lives in the URL as `?cabin=<facility_id>`, so a selection is
 * shareable and survives a reload. Writes use router.replace rather than push: dot
 * clicks would otherwise stack a history entry each, turning the back button into a
 * trap. Dismissal stays Escape or clicking bare map.
 *
 * The param is read client-side on purpose. Reading it from the page's searchParams
 * would make /explore dynamic and cost the ISR caching the whole page is built on, so
 * page.tsx keeps `revalidate` and wraps this component in Suspense (required for the
 * production build — useSearchParams in a prerendered route suspends).
 */
export function ExploreMap({ cabins }: { cabins: CabinFeatureCollection }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapRef = useRef<MapRef | null>(null);

  const selectedId = searchParams.get("cabin");

  // Index the features once: lookup for the selected card, and the search corpus.
  // The map already holds every cabin, so search indexes what's in memory instead of
  // re-fetching the same rows from the browser.
  const byId = useMemo(() => {
    const m = new Map<string, CabinFeature>();
    for (const f of cabins.features) m.set(f.properties.id, f);
    return m;
  }, [cabins]);

  const corpus = useMemo<Cabin[]>(
    () =>
      cabins.features.map((f) => ({
        id: f.properties.id,
        name: f.properties.name,
        area: f.properties.area,
      })),
    [cabins]
  );

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  // Which side of the pin the card sits on. Computed ONCE when a cabin is selected and
  // then frozen: passing an explicit anchor stops mapbox from re-deciding it on every
  // pan (which made the open card jump around as you dragged the map away from it).
  const [anchor, setAnchor] = useState<"top" | "bottom">("bottom");

  /** Card above the pin ("bottom") when there's room; below ("top") when the pin is high. */
  const anchorForPin = useCallback((lng: number, lat: number): "top" | "bottom" => {
    const map = mapRef.current?.getMap();
    if (!map) return "bottom";
    const { y } = map.project([lng, lat]);
    // The card is ~420px; if the pin sits in the lower ~40% of the map there's room to
    // open it above the pin, otherwise open it below.
    return y > map.getContainer().clientHeight * 0.6 ? "bottom" : "top";
  }, []);

  const setSelected = useCallback(
    (id: string | null) => {
      router.replace(id ? `/explore?cabin=${id}` : "/explore", { scroll: false });
    },
    [router]
  );

  const flyTo = useCallback((lng: number, lat: number) => {
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: SELECT_ZOOM,
      // Land the dot below centre. The card opens above it, so centring exactly would
      // tuck the card's photo behind the floating header — mapbox picks its anchor from
      // the map container and knows nothing about our overlay.
      offset: [0, HEADER_CLEARANCE],
      duration: 1400,
    });
  }, []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      // Clicking bare map deselects.
      if (!feature || feature.geometry.type !== "Point") {
        setSelected(null);
        return;
      }
      // A click doesn't move the map, so compute the anchor from the pin where it is.
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      setAnchor(anchorForPin(lng, lat));
      setSelected((feature.properties as { id: string }).id);
    },
    [setSelected, anchorForPin]
  );

  const handleSearchSelect = useCallback(
    (cabin: Cabin) => {
      const feature = byId.get(cabin.id);
      if (!feature) return;
      const [lng, lat] = feature.geometry.coordinates;
      // The fly lands the pin below centre (HEADER_CLEARANCE), so the card opens above it.
      setAnchor("bottom");
      flyTo(lng, lat);
      setSelected(cabin.id);
    },
    [byId, flyTo, setSelected]
  );

  // Arriving on /explore?cabin=… should actually show the cabin. Without this the card
  // opens but the map sits at the default Montana view, so a deep-linked Alaskan cabin
  // renders its card next to a dot that's off-screen. Fires once, after style load.
  const didInitialFly = useRef(false);
  const handleLoad = useCallback(() => {
    if (didInitialFly.current || !selected) return;
    didInitialFly.current = true;
    const [lng, lat] = selected.geometry.coordinates;
    // Same as search: the fly drops the pin below centre, so the card opens above it.
    setAnchor("bottom");
    flyTo(lng, lat);
  }, [selected, flyTo]);

  // The card has no close control of its own, so Escape is the keyboard equivalent of
  // clicking bare map to dismiss it.
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, setSelected]);

  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn("[ember] explore-map: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
    return null;
  }

  return (
    <div className="relative h-full w-full">
      <ExploreHeader
        corpus={corpus}
        selectedName={selected?.properties.name ?? null}
        onSelect={handleSearchSelect}
      />

      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={EXPLORE_MAP_STYLE}
        initialViewState={MONTANA_VIEW}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={[DOT_LAYER_ID]}
        onLoad={handleLoad}
        onClick={handleClick}
        onMouseEnter={() => {
          const c = mapRef.current?.getCanvas();
          if (c) c.style.cursor = "pointer";
        }}
        onMouseLeave={() => {
          const c = mapRef.current?.getCanvas();
          if (c) c.style.cursor = "";
        }}
      >
        <Source id="cabins" type="geojson" data={cabins}>
          {/* Each dot is three stacked circles (glow → white ring → core). The selected
              set is drawn after so it sits on top, filtered to the current id — with no
              selection the filter matches nothing. See lib/map-layers. */}
          {cabinDotLayers.map((layer) => (
            <Layer key={layer.id} {...layer} />
          ))}
          {selectedDotLayers.map((layer) => (
            <Layer key={layer.id} {...layer} filter={["==", ["get", "id"], selectedId ?? ""]} />
          ))}
        </Source>

        {selected && (
          // `anchor` is set explicitly (computed once at selection) so mapbox keeps the
          // card on the same side of the pin as you pan — leaving it unset makes mapbox
          // re-decide the side on every move, which jumps the open card around.
          // closeOnClick / closeButton are off, so mapbox never closes the popup itself —
          // deselection is driven entirely by our own state (bare-map click, Escape),
          // which unmounts this Popup. So there is deliberately NO onClose handler:
          // react-map-gl fires onClose on unmount too, and when the unmount is caused by
          // the card's link navigating to /cabin/[id], an onClose that called setSelected(null)
          // would router.replace("/explore") mid-navigation and bounce the user right back.
          //
          // offset clears the selected dot's glow plus a visible gap; it also absorbs the
          // ~10px the hidden popup tip used to occupy — see utilities.css.
          <Popup
            longitude={selected.geometry.coordinates[0]}
            latitude={selected.geometry.coordinates[1]}
            anchor={anchor}
            offset={20}
            closeButton={false}
            closeOnClick={false}
            maxWidth="300px"
            className="ember-popup"
          >
            <ExploreCard key={selected.properties.id} seed={selected.properties} />
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
