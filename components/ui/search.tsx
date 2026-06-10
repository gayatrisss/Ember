"use client";

import { useEffect, useRef, useState } from "react";
import { Home, Loader2, Search as SearchIcon } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { Field } from "@/components/ui/field";
import { useCabinSearch } from "@/components/ui/use-cabin-search";
import { formatCabinName } from "@/lib/format";

export function Search() {
  const { query, setQuery, ready, q, visibleResults, hasMore, handleScroll } = useCabinSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  let inputBorderClass = "border-b-wax/20 hover:border-b-wax/40";
  if (query) inputBorderClass = "border-b-ember/50 bg-ember/15";
  if (open) inputBorderClass = "border-b-ember";

  let inputTextClass = "text-wax/40";
  if (query) inputTextClass = "text-wax";
  if (open) inputTextClass = "text-ember placeholder:text-ember/50";

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showDropdown = open && q.length > 0;

  return (
    <Field label="WHERE">
      <div ref={containerRef} className="relative">
        <CommandPrimitive
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div
            className={["field-control", inputBorderClass].join(" ")}
          >
            {!ready ? (
              <Loader2 size={16} className="shrink-0 text-smoke animate-spin" />
            ) : (
              <SearchIcon
                size={16}
                className={`shrink-0 transition-colors ${open || query ? "text-ember" : "text-smoke"}`}
              />
            )}
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              onFocus={() => setOpen(true)}
              placeholder="Eg. Lost Horse Cabin"
              className={`flex-1 min-w-0 bg-transparent outline-none caret-ember text-body transition-colors ${inputTextClass}`}
            />
          </div>

          {showDropdown && (
            <div
              onScroll={handleScroll}
              className="absolute left-0 right-0 top-full mt-1 z-50 bg-night border border-ember/25 rounded-xl max-h-96 overflow-y-auto shadow-ember-md"
            >
              <CommandPrimitive.List>
                {q.length === 1 && (
                  <div className="py-5 text-center text-body text-wax/40">Keep typing…</div>
                )}

                {q.length >= 2 && visibleResults.length > 0 && (
                  <CommandPrimitive.Group>
                    <div className="px-4 pt-4 pb-2 text-data uppercase tracking-widest text-smoke">
                      Cabins
                    </div>
                    {visibleResults.map((cabin) => (
                      <CommandPrimitive.Item
                        key={cabin.id}
                        value={`cabin-${cabin.id}`}
                        onSelect={() => {
                          setOpen(false);
                          window.open(`/cabin/${cabin.id}`, "_blank");
                        }}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer outline-none transition-colors hover:bg-ember/7 data-[selected=true]:bg-ember/10 data-[selected=true]:text-ember"
                      >
                        <div className="w-7 h-7 rounded-md bg-ember/12 flex items-center justify-center shrink-0">
                          <Home size={14} className="text-ember" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-body text-wax">{formatCabinName(cabin.name)}</div>
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
                  <div className="py-5 text-center text-body text-wax/40">
                    No cabins found for &ldquo;{q}&rdquo;
                  </div>
                )}
              </CommandPrimitive.List>
            </div>
          )}
        </CommandPrimitive>
      </div>
    </Field>
  );
}
