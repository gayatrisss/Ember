"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { Field } from "@/components/ui/field";

type Cabin = { id: string; name: string; location: string };
type Fetched = { query: string; cabins: Cabin[] };

type RIDBFacility = {
  FacilityID: string | number;
  FacilityName: string;
  ParentRecAreaName?: string;
  FacilityDescription: string;
};
type RIDBRaw = { RECDATA: RIDBFacility[] };

function transform(raw: RIDBRaw): Cabin[] {
  return (raw.RECDATA ?? [])
    .filter((f) => f.FacilityDescription.toLowerCase().includes("cabin"))
    .map((f) => ({
      id: String(f.FacilityID),
      name: f.FacilityName,
      location: f.ParentRecAreaName ?? "",
    }));
}

export function CabinSearch() {
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
        const raw: RIDBRaw = await res.json();
        const cabins = transform(raw);
        console.log("[ember] cabin-search", { raw, cabins });
        setFetched({ query: q, cabins });
      } catch {
        setFetched({ query: q, cabins: [] });
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
  const matchedCabins = fetched?.query === activeQuery ? fetched.cabins : null;
  const hasCabins = (matchedCabins?.length ?? 0) > 0;
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
              <Search
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
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-evergreen border border-wax/10 rounded-xl overflow-hidden shadow-ember-md">
              <CommandPrimitive.List>
                {loading && (
                  <div className="py-5 text-center text-body text-wax/40">
                    Searching…
                  </div>
                )}

                {!loading && hasCabins && (
                  <CommandPrimitive.Group>
                    <div className="px-4 pt-4 pb-1 text-data uppercase tracking-widest text-smoke">
                      Cabins
                    </div>
                    {matchedCabins!.map((cabin) => (
                      <CommandPrimitive.Item
                        key={cabin.id}
                        value={`cabin-${cabin.id}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(`/cabin/${cabin.id}`);
                        }}
                        className="flex flex-col px-4 py-3 cursor-pointer outline-none hover:bg-white/5 data-[selected]:bg-white/5"
                      >
                        <span className="text-body text-wax">{cabin.name}</span>
                        {cabin.location && (
                          <span className="text-data text-smoke uppercase tracking-wider mt-0.5">{cabin.location}</span>
                        )}
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                )}

                {!loading && !hasCabins && matchedCabins !== null && (
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
