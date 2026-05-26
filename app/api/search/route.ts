import { NextRequest, NextResponse } from "next/server";

const BASE = "https://ridb.recreation.gov/api/v1";

type RecArea = {
  RecAreaID: string | number;
  RecAreaName: string;
};

type RIDBList<T> = { RECDATA: T[] };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const headers = { apikey: process.env.RIDB_API_KEY ?? "" };

  const res = await fetch(
    `${BASE}/recareas?query=${encodeURIComponent(q)}&limit=50`,
    { headers }
  );

  if (!res.ok) {
    console.error("[search] recareas error:", res.status);
    return NextResponse.json({ cabins: [], areas: [] });
  }

  const data: RIDBList<RecArea> = await res.json();
  const lower = q.toLowerCase();
  const areas = (data.RECDATA ?? [])
    .filter((r) => r.RecAreaName.toLowerCase().includes(lower))
    .slice(0, 5)
    .map((r) => ({ id: String(r.RecAreaID), name: r.RecAreaName }));

  return NextResponse.json({ cabins: [], areas });
}
