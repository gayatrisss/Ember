"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2, MapPin, Search as SearchIcon } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { Field } from "@/components/ui/field";
import type { SearchRawResponse } from "@/types/search";

type Cabin = { id: string; name: string };
type Area = { id: string; name: string };
type Fetched = { query: string; cabins: Cabin[]; areas: Area[] };

const LODGING_KEYWORDS = ["cabin", "lookout", "yurt"];

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function relevanceScore(name: string, q: string): number {
  const n = name.toLowerCase();
  const s = q.toLowerCase();
  if (n.startsWith(s)) return 0;
  if (n.includes(s)) return 1;
  return 2;
}

function transform(raw: SearchRawResponse, q: string): { cabins: Cabin[]; areas: Area[] } {
  const cabins = (raw.facilities?.RECDATA ?? [])
    .filter((f) => LODGING_KEYWORDS.some((kw) => f.FacilityDescription.toLowerCase().includes(kw)))
    .sort((a, b) => relevanceScore(a.FacilityName, q) - relevanceScore(b.FacilityName, q))
    .slice(0, 6)
    .map((f) => ({ id: String(f.FacilityID), name: f.FacilityName }));

  const areas = (raw.areas?.RECDATA ?? [])
    .sort((a, b) => relevanceScore(a.RecAreaName, q) - relevanceScore(b.RecAreaName, q))
    .slice(0, 3)
    .map((r) => ({ id: String(r.RecAreaID), name: r.RecAreaName }));

  return { cabins, areas };
}

export function Search() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) return;

    const q = query.trim();
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-ridb?q=${encodeURIComponent(q)}`);
        const raw: SearchRawResponse = await res.json();
        console.log('[ember] raw', raw);
        const { cabins, areas } = transform(raw, q);
        console.log("[ember] cabin-search", { raw, cabins, areas });
        setFetched({ query: q, cabins, areas });
      } catch {
        setFetched({ query: q, cabins: [], areas: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const activeQuery = query.trim();
  const matched = fetched?.query === activeQuery ? fetched : null;
  const hasCabins = (matched?.cabins.length ?? 0) > 0;
  const hasAreas = (matched?.areas.length ?? 0) > 0;
  const showDropdown = open && activeQuery.length > 0;

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
            {loading ? (
              <Loader2 size={16} className="shrink-0 text-ember animate-spin" />
            ) : (
              <SearchIcon
                size={16}
                className={`shrink-0 transition-colors ${
                  open || query ? "text-ember" : "text-smoke"
                }`}
              />
            )}
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              onFocus={() => setOpen(true)}
              placeholder="Eg. Glacier National Park"
              className={`flex-1 min-w-0 bg-transparent outline-none caret-ember text-body transition-colors ${
                open
                  ? "text-ember placeholder:text-ember/50"
                  : query
                  ? "text-wax"
                  : "text-wax/40"
              }`}
            />
          </div>

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-night border border-ember/25 rounded-xl overflow-hidden shadow-ember-md">
              <CommandPrimitive.List>
                {loading && (
                  <div className="py-5 text-center text-body text-wax/40">
                    Searching…
                  </div>
                )}

                {!loading && hasCabins && (
                  <CommandPrimitive.Group>
                    <div className="px-4 pt-4 pb-2 text-data uppercase tracking-widest text-smoke">
                      Cabins
                    </div>
                    {matched!.cabins.map((cabin) => (
                      <CommandPrimitive.Item
                        key={cabin.id}
                        value={`cabin-${cabin.id}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(`/listing/${cabin.id}`);
                        }}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer outline-none hover:bg-ember/7"
                      >
                        <div className="w-7 h-7 rounded-md bg-ember/12 flex items-center justify-center shrink-0">
                          <Home size={14} className="text-ember" />
                        </div>
                        <span className="text-body text-wax">{toTitleCase(cabin.name)}</span>
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                )}

                {!loading && hasAreas && (
                  <CommandPrimitive.Group>
                    <div className={`px-4 pt-4 pb-2 text-data uppercase tracking-widest text-smoke${hasCabins ? " border-t border-wax/8" : ""}`}>
                      Forests &amp; Parks
                    </div>
                    {matched!.areas.map((area) => (
                      <CommandPrimitive.Item
                        key={area.id}
                        value={`area-${area.id}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(`/explore?area=${area.id}`);
                        }}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer outline-none hover:bg-smoke/7"
                      >
                        <div className="w-7 h-7 rounded-md bg-smoke/15 flex items-center justify-center shrink-0">
                          <MapPin size={14} className="text-smoke" />
                        </div>
                        <span className="text-body text-wax">{toTitleCase(area.name)}</span>
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                )}

                {!loading && !hasCabins && !hasAreas && matched !== null && (
                  <div className="py-5 text-center text-body text-wax/40">
                    No results for &ldquo;{activeQuery}&rdquo;
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
