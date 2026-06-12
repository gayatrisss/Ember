"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2, Search as SearchIcon, Calendar, ArrowRight } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { CalendarInput } from "@/components/ui/calendar-input";
import { useCabinSearch, type Cabin } from "@/components/ui/use-cabin-search";
import { formatCabinName } from "@/lib/format";

type Popover = "location" | "dates" | null;

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRange(checkIn: Date | null, checkOut: Date | null): string {
  if (!checkIn || !checkOut) return "Any dates";
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${checkIn.toLocaleDateString("en-US", o)} – ${checkOut.toLocaleDateString("en-US", o)}`;
}

/**
 * Horizontal "joint" search bar shown in the top nav when scrolled: a cabin
 * autocomplete segment + a date-range segment + a submit arrow. Dates are
 * optional — submitting with a cabin alone is valid. On submit it navigates to
 * the cabin page, carrying any chosen dates as `?checkIn`/`?checkOut` params
 * which AvailabilityPanel already reads and pre-selects.
 */
export function NavSearch() {
  const router = useRouter();
  const { query, setQuery, ready, q, visibleResults, hasMore, handleScroll } = useCabinSearch();

  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [popover, setPopover] = useState<Popover>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopover(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function openLocation() {
    setQuery("");
    setPopover("location");
  }

  function selectCabin(cabin: Cabin) {
    setSelectedCabin(cabin);
    setQuery("");
    setPopover(null);
  }

  function handleDateChange(newIn: Date | null, newOut: Date | null) {
    setCheckIn(newIn);
    setCheckOut(newOut);
    if (newIn && newOut) setPopover(null);
  }

  function submit() {
    if (!selectedCabin) return;
    const params =
      checkIn && checkOut ? `?checkIn=${toDateStr(checkIn)}&checkOut=${toDateStr(checkOut)}` : "";
    router.push(`/cabin/${selectedCabin.id}${params}`);
    setPopover(null);
  }

  const searching = popover === "location";

  return (
    <div
      ref={ref}
      className="relative w-full bg-wax rounded-xl py-2 px-3 flex items-center justify-between gap-4"
    >
      {/* Location segment */}
      <div className="relative flex-1 min-w-0">
        {searching ? (
          <CommandPrimitive
            shouldFilter={false}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPopover(null);
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {ready ? (
                <SearchIcon size={24} className="text-slate shrink-0" />
              ) : (
                <Loader2 size={24} className="text-slate shrink-0 animate-spin" />
              )}
              <CommandPrimitive.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Eg: Trail Creek Cabin"
                className="flex-1 min-w-0 bg-transparent outline-none caret-ember text-body text-slate placeholder:text-slate/70"
              />
            </div>

            {q.length > 0 && (
              <div
                onScroll={handleScroll}
                className="absolute left-0 top-full mt-2 w-full z-50 bg-wax border border-night/10 rounded-xl max-h-96 overflow-y-auto shadow-ember-md"
              >
                <CommandPrimitive.List>
                  {q.length === 1 && (
                    <div className="py-5 text-center text-body text-night/40">Keep typing…</div>
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
                          onSelect={() => selectCabin(cabin)}
                          className="flex items-center gap-3 p-3 cursor-pointer outline-none transition-colors hover:bg-ember/30 data-[selected=true]:bg-ember/30"
                        >
                          <div className="size-8 rounded-lg bg-ember/45 flex items-center justify-center shrink-0">
                            <Home size={24} className="text-ember" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-body text-night">{formatCabinName(cabin.name)}</div>
                            {cabin.area && (
                              <div className="text-label text-smoke truncate">{cabin.area}</div>
                            )}
                          </div>
                        </CommandPrimitive.Item>
                      ))}
                      {hasMore && (
                        <div className="py-3 text-center text-label text-smoke/50">
                          Scroll for more
                        </div>
                      )}
                    </CommandPrimitive.Group>
                  )}

                  {q.length >= 2 && visibleResults.length === 0 && (
                    <div className="py-5 text-center text-body text-night/40">
                      No cabins found for &ldquo;{q}&rdquo;
                    </div>
                  )}
                </CommandPrimitive.List>
              </div>
            )}
          </CommandPrimitive>
        ) : (
          <button
            type="button"
            onClick={openLocation}
            className="flex items-center gap-3 min-w-0 w-full"
          >
            <SearchIcon size={24} className="text-slate shrink-0" />
            <span className="text-body text-slate truncate text-left">
              {selectedCabin ? formatCabinName(selectedCabin.name) : "Eg: Trail Creek Cabin"}
            </span>
          </button>
        )}
      </div>

      {/* Right group: dates + submit */}
      <div className="flex items-center gap-6 shrink-0">
        <div>
          <button
            type="button"
            onClick={() => setPopover((p) => (p === "dates" ? null : "dates"))}
            className="border-l border-wax-muted pl-4 flex items-center gap-3"
          >
            <Calendar size={24} className="text-slate shrink-0" />
            <span className="text-body text-slate whitespace-nowrap">
              {formatRange(checkIn, checkOut)}
            </span>
          </button>

          {popover === "dates" && (
            <div className="absolute right-0 top-full mt-2 z-50 w-max bg-wax border border-night/10 rounded-xl p-5 shadow-ember-md">
              <CalendarInput
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={handleDateChange}
                theme="light"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!selectedCabin}
          aria-label="Search"
          className="bg-ember w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
        >
          <ArrowRight size={24} className="text-wax" />
        </button>
      </div>
    </div>
  );
}
