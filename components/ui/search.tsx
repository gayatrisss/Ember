"use client";

import { useEffect, useRef, useState } from "react";
import { Home, Loader2, Search as SearchIcon } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import Fuse, { type IFuseOptions } from "fuse.js";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Cabin = { id: string; name: string; area: string | null };

const PAGE = 6;

const FUSE_OPTIONS: IFuseOptions<Cabin> = {
  keys: [
    { name: "name", weight: 0.7 },
    { name: "area", weight: 0.3 },
  ],
  threshold: 0.3,
  minMatchCharLength: 2,
  shouldSort: true,
  ignoreLocation: false,
  distance: 200,
};

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Search() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [fuse, setFuse] = useState<Fuse<Cabin> | null>(null);
  // Track { q, count } together so resetting on query change needs no useEffect
  const [page, setPage] = useState({ q: "", count: PAGE });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("cabins")
      .select("facility_id, facility_name, rec_area_name")
      .then(({ data }) => {
        const cabins: Cabin[] = (data ?? []).map((row) => ({
          id: row.facility_id as string,
          name: row.facility_name as string,
          area: row.rec_area_name as string | null,
        }));
        setFuse(new Fuse(cabins, FUSE_OPTIONS));
      });
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim();
  const allResults: Cabin[] = fuse && q.length >= 2 ? fuse.search(q).map((r) => r.item) : [];

  // When q changes, count resets to PAGE automatically
  const visibleCount = page.q === q ? page.count : PAGE;
  const visibleResults = allResults.slice(0, visibleCount);
  const hasMore = visibleCount < allResults.length;

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (hasMore && scrollTop + clientHeight >= scrollHeight - 40) {
      setPage({ q, count: visibleCount + PAGE });
    }
  }

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
            className={[
              "field-control",
              open
                ? "border-b-ember"
                : query
                  ? "border-b-ember/50 bg-ember/15"
                  : "border-b-wax/20 hover:border-b-wax/40",
            ].join(" ")}
          >
            {!fuse ? (
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
              className={`flex-1 min-w-0 bg-transparent outline-none caret-ember text-body transition-colors ${
                open ? "text-ember placeholder:text-ember/50" : query ? "text-wax" : "text-wax/40"
              }`}
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
                          <div className="text-body text-wax">{toTitleCase(cabin.name)}</div>
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
