import { NextRequest, NextResponse } from "next/server";
import type { SearchRawResponse } from "@/types/search";

const BASE = "https://ridb.recreation.gov/api/v1";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const key = process.env.RIDB_API_KEY ?? "";

  const [facilitiesRes, areasRes] = await Promise.all([
    fetch(`${BASE}/facilities?query=${encodeURIComponent(q)}&limit=20&apikey=${key}`),
    fetch(`${BASE}/recareas?query=${encodeURIComponent(q)}&limit=5&apikey=${key}`),
  ]);

  if (!facilitiesRes.ok) {
    console.error(
      "[ember] RIDB facilities error",
      facilitiesRes.status,
      await facilitiesRes.text()
    );
  }
  if (!areasRes.ok) {
    console.error("[ember] RIDB areas error", areasRes.status, await areasRes.text());
  }

  const [facilities, areas] = await Promise.all([
    facilitiesRes.ok ? facilitiesRes.json() : { RECDATA: [] },
    areasRes.ok ? areasRes.json() : { RECDATA: [] },
  ]);

  return NextResponse.json({ facilities, areas } satisfies SearchRawResponse);
}
