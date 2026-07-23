"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { MapSearch } from "@/components/ui/map-search";
import type { Cabin } from "@/components/ui/use-cabin-search";

type Props = {
  corpus: Cabin[];
  /** Name of the selected cabin, so the search bar reports it at rest. */
  selectedName?: string | null;
  onSelect: (cabin: Cabin) => void;
};

/**
 * The trimmed chrome for /explore: wordmark, cabin search, menu. Deliberately not the
 * full TopNav — the map is the page, so this carries branding and a way home without
 * spending vertical space on nav links.
 *
 * Overlays the map rather than sitting above it, so the basemap still runs full-bleed
 * behind it. pointer-events are released on the wrapper and re-claimed by the controls,
 * so the gaps between them stay draggable map.
 */
export function ExploreHeader({ corpus, selectedName, onSelect }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-6 p-6">
      <Link
        href="/"
        aria-label="Ember home"
        className="pointer-events-auto shrink-0 text-display-fraunces-md logo-glow-hover text-night"
      >
        ember.
      </Link>

      <div className="pointer-events-auto min-w-0 flex-1 max-w-[706px]">
        <MapSearch corpus={corpus} selectedName={selectedName} onSelect={onSelect} />
      </div>

      {/* Stubbed per scope — rendered so the bar is visually complete, wired to nothing yet. */}
      <button
        type="button"
        aria-label="Menu"
        className="pointer-events-auto ml-auto flex h-12 shrink-0 items-center rounded-xl bg-ash px-6 py-3 text-wax transition-colors hover:text-ember"
      >
        <Menu size={24} />
      </button>
    </div>
  );
}
