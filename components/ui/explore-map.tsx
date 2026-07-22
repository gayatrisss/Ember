"use client";

import { useCallback, useEffect, useState } from "react";
import Map, { Source, Layer, Popup } from "react-map-gl/mapbox";
import type { MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EXPLORE_MAP_STYLE, MAPBOX_ACCESS_TOKEN, MONTANA_VIEW } from "@/lib/mapbox";
import { cabinDotLayer, DOT_LAYER_ID, selectedDotLayer } from "@/lib/map-layers";
import { ExploreCard } from "@/components/ui/explore-card";
import type { CabinFeatureCollection, CabinFeatureProps } from "@/lib/cabins";

/**
 * Full-bleed interactive map for the /explore page. Renders the basemap plus every
 * cabin as a gray dot; clicking one selects it and opens the detail card. Search lands later.
 */
/** The clicked cabin plus the coordinates the popup tail has to point at. */
type Selection = { props: CabinFeatureProps; lng: number; lat: number };

export function ExploreMap({ cabins }: { cabins: CabinFeatureCollection }) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [hovering, setHovering] = useState(false);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    // Clicking bare map deselects.
    if (!feature || feature.geometry.type !== "Point") {
      setSelected(null);
      return;
    }
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    setSelected({ props: feature.properties as CabinFeatureProps, lng, lat });
  }, []);

  // The card has no close control of its own, so Escape is the keyboard equivalent of
  // clicking bare map to dismiss it.
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn("[ember] explore-map: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
    return null;
  }

  return (
    <div className="relative h-full w-full">
      <Map
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={EXPLORE_MAP_STYLE}
        initialViewState={MONTANA_VIEW}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={[DOT_LAYER_ID]}
        cursor={hovering ? "pointer" : "auto"}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Source id="cabins" type="geojson" data={cabins}>
          <Layer {...cabinDotLayer} />
          <Layer {...selectedDotLayer} filter={["==", ["get", "id"], selected?.props.id ?? ""]} />
        </Source>

        {selected && (
          // No `anchor` prop on purpose: mapbox picks the side with room and flips the
          // card near a viewport edge, which is the collision handling this needs.
          // closeOnClick is off because deselection is already owned by the map's own
          // click handler above.
          //
          // offset clears the selected dot (radius 7 + 2px stroke) plus a visible gap.
          // It has to absorb the ~10px the hidden tip used to occupy — see utilities.css.
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            offset={20}
            closeButton={false}
            closeOnClick={false}
            onClose={() => setSelected(null)}
            maxWidth="300px"
            className="ember-popup"
          >
            <ExploreCard key={selected.props.id} seed={selected.props} />
          </Popup>
        )}
      </Map>
    </div>
  );
}
