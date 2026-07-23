"use client";

import { useEffect, useRef, useState } from "react";
import { Home, Loader2, Search as SearchIcon } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { useCabinSearch, type Cabin } from "@/components/ui/use-cabin-search";
import { formatCabinName } from "@/lib/format";

type Props = {
  /** Pre-built cabin list from the map's GeoJSON. Must be referentially stable. */
  corpus: Cabin[];
  /** Name of the currently selected cabin, shown at rest. Derived from ?cabin= upstream. */
  selectedName?: string | null;
  onSelect: (cabin: Cabin) => void;
};

/**
 * Dark cabin search for the /explore map.
 *
 * Unlike NavSearch there is no date segment (nothing to filter on until availability is
 * real) and no submit control: on a map, choosing a result IS the action, so selecting
 * flies to the cabin and opens its card rather than staging a query to submit.
 *
 * Matching still weights rec_area_name, so "Glacier" surfaces cabins in Glacier NP even
 * though only cabins are ever returned.
 */
export function MapSearch({ corpus, selectedName, onSelect }: Props) {
  const { query, setQuery, ready, q, visibleResults, hasMore, handleScroll } =
    useCabinSearch(corpus);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function select(cabin: Cabin) {
    onSelect(cabin);
    setQuery("");
    setOpen(false);
    // Blur so the field falls back to showing the selection rather than an empty
    // focused input; the search is finished at this point.
    setFocused(false);
    inputRef.current?.blur();
  }

  return (
    <div ref={ref} className="relative w-full">
      <CommandPrimitive
        shouldFilter={false}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {/* Focus state follows the field convention already in utilities.css: ember
            border (.field-control-outline:focus-within) plus the icon going slate ->
            ember (.field-icon). shadow-ember-sm is the token documented for exactly
            this — "tight ember glow (inputs, badges)". The transparent resting border
            reserves the space so focusing doesn't shift the row. */}
        <div className="group flex h-12 items-center gap-3 rounded-xl border border-transparent bg-ash px-6 py-3 transition-[border-color,box-shadow] duration-150 focus-within:border-ember focus-within:shadow-ember-sm">
          {ready ? (
            <SearchIcon
              size={24}
              className="shrink-0 text-slate transition-colors group-focus-within:text-ember"
            />
          ) : (
            <Loader2 size={24} className="shrink-0 animate-spin text-slate" />
          )}
          <CommandPrimitive.Input
            ref={inputRef}
            // At rest the field reports the current selection; focusing hands it back
            // for a fresh query. Selection itself lives in ?cabin=, so the bar reflects
            // it rather than owning a second copy of the truth.
            value={focused ? query : (selectedName ?? "")}
            onValueChange={(v) => {
              setQuery(v);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setQuery("");
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            // Cleared on focus so the caret sits in a visibly empty field — the prompt
            // has done its job by the time you're typing. Driven by state rather than a
            // `focus:placeholder:` variant, which Tailwind emitted but didn't apply.
            //
            // Matches the nav search. Trail Creek Cabin is real (234309, Custer
            // Gallatin), so the example returns a result if anyone types it.
            placeholder={focused ? "" : "Eg: Trail Creek Cabin"}
            className="min-w-0 flex-1 bg-transparent text-body text-wax caret-ember outline-none placeholder:text-slate"
          />
        </div>

        {open && q.length > 0 && (
          <div
            onScroll={handleScroll}
            className="absolute left-0 top-full z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-wax/10 bg-ash shadow-ember-md"
          >
            <CommandPrimitive.List>
              {q.length === 1 && (
                <div className="py-5 text-center text-body text-slate">Keep typing…</div>
              )}

              {q.length >= 2 && visibleResults.length > 0 && (
                <CommandPrimitive.Group>
                  <div className="px-3 pt-4 pb-2 text-data uppercase tracking-widest text-smoke">
                    Cabins
                  </div>
                  {visibleResults.map((cabin) => (
                    <CommandPrimitive.Item
                      key={cabin.id}
                      value={`cabin-${cabin.id}`}
                      onSelect={() => select(cabin)}
                      className="flex cursor-pointer items-center gap-3 p-3 outline-none transition-colors hover:bg-ember/30 data-[selected=true]:bg-ember/30"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ember/45">
                        <Home size={24} className="text-ember" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-body text-wax">{formatCabinName(cabin.name)}</div>
                        {cabin.area && (
                          <div className="truncate text-label text-wax-muted">{cabin.area}</div>
                        )}
                      </div>
                    </CommandPrimitive.Item>
                  ))}
                  {hasMore && (
                    <div className="py-3 text-center text-label text-smoke">Scroll for more</div>
                  )}
                </CommandPrimitive.Group>
              )}

              {q.length >= 2 && visibleResults.length === 0 && (
                <div className="py-5 text-center text-body text-slate">
                  No cabins found for &ldquo;{q}&rdquo;
                </div>
              )}
            </CommandPrimitive.List>
          </div>
        )}
      </CommandPrimitive>
    </div>
  );
}
