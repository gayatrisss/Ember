"use client";

import { useEffect, useState } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import { createClient } from "@/lib/supabase/client";

export type Cabin = { id: string; name: string; area: string | null };

const supabase = createClient();

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

// Load the cabin list + build the Fuse index once, shared across every consumer
// (the landing search and the nav search both mount on the home page).
let fusePromise: Promise<Fuse<Cabin>> | null = null;

async function buildFuse(): Promise<Fuse<Cabin>> {
  const { data } = await supabase
    .from("cabins")
    .select("facility_id, facility_name, rec_area_name");
  const cabins: Cabin[] = (data ?? []).map((row) => ({
    id: row.facility_id as string,
    name: row.facility_name as string,
    area: row.rec_area_name as string | null,
  }));
  return new Fuse(cabins, FUSE_OPTIONS);
}

function loadFuse(): Promise<Fuse<Cabin>> {
  if (!fusePromise) fusePromise = buildFuse();
  return fusePromise;
}

/**
 * Headless cabin search: loads the cabin list once, builds a Fuse index, and
 * exposes paginated fuzzy results. Presentation (input, dropdown, selection
 * behavior) lives in the consumer — see `search.tsx` and `nav-search.tsx`.
 */
export function useCabinSearch() {
  const [query, setQuery] = useState("");
  const [fuse, setFuse] = useState<Fuse<Cabin> | null>(null);
  // Track { q, count } together so resetting on query change needs no useEffect.
  const [page, setPage] = useState({ q: "", count: PAGE });

  useEffect(() => {
    loadFuse().then(setFuse);
  }, []);

  const q = query.trim();
  const allResults: Cabin[] = fuse && q.length >= 2 ? fuse.search(q).map((r) => r.item) : [];

  // When q changes, count resets to PAGE automatically.
  const visibleCount = page.q === q ? page.count : PAGE;
  const visibleResults = allResults.slice(0, visibleCount);
  const hasMore = visibleCount < allResults.length;

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (hasMore && scrollTop + clientHeight >= scrollHeight - 40) {
      setPage({ q, count: visibleCount + PAGE });
    }
  }

  return {
    query,
    setQuery,
    ready: !!fuse,
    q,
    visibleResults,
    hasMore,
    handleScroll,
  };
}
