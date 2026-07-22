import { NextResponse } from "next/server";
import { fetchCabinCard } from "@/lib/cabins";

/**
 * Card detail for a single cabin, fetched lazily when a dot on /explore is selected.
 * Public, frozen data — cacheable for a day, matching /explore's own revalidate.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const card = await fetchCabinCard(id);
  if (!card) {
    return NextResponse.json({ error: "Cabin not found" }, { status: 404 });
  }

  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
